import React, { useState, useEffect, useRef } from 'react';
import { geminiClient } from '../utils/gemini';
import { localClient } from '../utils/localLLM';
import { groqClient } from '../utils/groq';
import { analyzeFile } from '../utils/sharedAnalysis';
import OllamaGuide from './OllamaGuide';
import PerformanceHUD from './PerformanceHUD';
import { Play, Loader2, CheckCircle, AlertTriangle, FileText, Info, Cloud, Server, Database, Zap, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Analyzer = ({
    files,
    setFiles,
    onAnalysisComplete,
    analysisMode,
    setAnalysisMode,
    localModels,
    setLocalModels,
    selectedLocalModel,
    setSelectedLocalModel
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentFileIndex, setCurrentFileIndex] = useState(-1);
    const [statusMessage, setStatusMessage] = useState('');
    const abortControllerRef = useRef(null);

    const [isCheckingLocal, setIsCheckingLocal] = useState(false);
    const [showLocalGuide, setShowLocalGuide] = useState(false);

    // Performance Metrics State
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        if (analysisMode === 'local') {
            checkLocalModels();
        }
    }, [analysisMode]);

    const checkLocalModels = async () => {
        setIsCheckingLocal(true);
        setStatusMessage("Checking local Ollama instance...");
        const models = await localClient.listVisionModels();
        setLocalModels(models);
        if (models.length > 0) {
            const preferred = models.find(m => m.name.includes('llava')) || models[0];
            setSelectedLocalModel(preferred.name);
            localClient.setModel(preferred.name);
            setStatusMessage(`Found local models. Selected: ${preferred.name}`);
        } else {
            setStatusMessage("");
        }
        setIsCheckingLocal(false);
    };

    // Polling for VRAM (Ollama PS)
    useEffect(() => {
        let interval;
        if (isAnalyzing && analysisMode === 'local') {
            interval = setInterval(async () => {
                const info = await localClient.getRunningInfo();
                if (info) {
                    setMetrics(prev => ({
                        ...prev,
                        vram: info.size_vram,
                        ram: info.size,
                        gpuPercent: info.gpu_percent
                    }));
                }
            }, 1000); // Check every second
        }
        return () => clearInterval(interval);
    }, [isAnalyzing, analysisMode]);

    const handleModelSelect = (e) => {
        const model = e.target.value;
        setSelectedLocalModel(model);
        localClient.setModel(model);
    };

    const handleStopAnalysis = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsAnalyzing(false);
            setStatusMessage("Aborting and Unloading Model...");

            // Give the abort signal a moment to propagate before unloading
            setTimeout(() => {
                handleUnloadModel();
            }, 100);
        }
    };

    const handleUnloadModel = async () => {
        if (selectedLocalModel) {
            setStatusMessage(`Unloading ${selectedLocalModel}...`);
            const success = await localClient.unloadModel(selectedLocalModel);
            if (success) {
                setMetrics(null); // Clear metrics immediately
                setStatusMessage("Model Unloaded. Memory Freed.");
                setTimeout(() => setStatusMessage(""), 3000);
            } else {
                setStatusMessage("Failed to unload model.");
            }
        }
    };



    const startAnalysis = async () => {
        if (files.length === 0) return;

        setIsAnalyzing(true);
        setProgress(0);
        setMetrics(null); // Reset metrics
        let resultsArray = [];

        // Initialize AbortController
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const newFiles = files.map(f => ({ ...f, status: 'pending', error: null }));
        setFiles(newFiles);

        for (let i = 0; i < newFiles.length; i++) {
            if (signal.aborted) break;

            setCurrentFileIndex(i);
            const fileObj = newFiles[i];

            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'analyzing' } : f));

            try {
                // Use Shared Analysis Logic
                const analyzedStep = await analyzeFile(
                    fileObj,
                    analysisMode,
                    selectedLocalModel,
                    (msg) => setStatusMessage(msg),
                    (token) => {
                        // Streaming Callback (Optional: You could update a preview here)
                        // console.log("Stream:", token);
                    },
                    (newMetrics) => {
                        setMetrics(prev => ({ ...prev, ...newMetrics }));
                    },
                    signal
                );

                resultsArray.push(analyzedStep);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'completed' } : f));

            } catch (error) {
                if (error.message === 'Analysis aborted') {
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: 'Aborted' } : f));
                    break;
                }
                console.error("Analysis failed:", error);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: error.message } : f));
                setStatusMessage(`Error: ${error.message}`);
            }

            setProgress(((i + 1) / newFiles.length) * 100);
        }

        setIsAnalyzing(false);
        setCurrentFileIndex(-1);
        abortControllerRef.current = null;

        if (resultsArray.length > 0) {
            setStatusMessage('Analysis Complete!');
            onAnalysisComplete(resultsArray);
        } else {
            if (!signal.aborted) setStatusMessage('Analysis Failed.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-400" />
                        Analysis Queue
                    </h2>

                    {!isAnalyzing && (
                        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                            <button
                                onClick={() => setAnalysisMode('cloud')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${analysisMode === 'cloud'
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                title="Use Google Gemini (High Quality)"
                            >
                                <Cloud className="w-4 h-4" /> Gemini
                            </button>
                            <button
                                onClick={() => setAnalysisMode('groq')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${analysisMode === 'groq'
                                    ? 'bg-orange-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                title="Use Groq Llama 4 (Fastest)"
                            >
                                <Zap className="w-4 h-4" /> Groq
                            </button>
                            <button
                                onClick={() => setAnalysisMode('local')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${analysisMode === 'local'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                title="Use Local Ollama (Unlimited)"
                            >
                                <Server className="w-4 h-4" /> Local
                            </button>
                            <button
                                onClick={() => setAnalysisMode('cohere')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${analysisMode === 'cohere'
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                title="Use Cohere Command R+ (Best Logic)"
                            >
                                <Cloud className="w-4 h-4" /> Cohere
                            </button>
                        </div>
                    )}
                </div>

                {/* Local Model Selection Area */}
                <AnimatePresence>
                    {analysisMode === 'local' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-slate-800/50 p-4 rounded-xl border border-purple-500/30 flex flex-col gap-4 overflow-hidden"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-300">
                                    <Database className="w-4 h-4" />
                                    <span className="text-sm font-medium">Ollama System:</span>
                                </div>
                                <button
                                    onClick={() => setShowLocalGuide(true)}
                                    className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded-lg transition-colors border border-purple-500/20"
                                >
                                    <HelpCircle className="w-3 h-3" /> Installation Guide
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                {isCheckingLocal ? (
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                                    </div>
                                ) : localModels.length > 0 ? (
                                    <select
                                        value={selectedLocalModel}
                                        onChange={handleModelSelect}
                                        className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 outline-none flex-1"
                                    >
                                        {localModels.map(m => (
                                            <option key={m.name} value={m.name}>{m.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-500/20 flex-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>No vision models found. Click Help Guide!</span>
                                    </div>
                                )}
                            </div>

                            {/* Performance HUD (Only shows during analysis or if metrics exist) */}
                            <PerformanceHUD
                                metrics={metrics}
                                onStop={handleStopAnalysis}
                                onUnload={handleUnloadModel}
                                isAnalyzing={isAnalyzing}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Groq Info Area */}
                {analysisMode === 'groq' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-800/50 p-4 rounded-xl border border-orange-500/30 flex items-center gap-4"
                    >
                        <div className="flex items-center gap-2 text-orange-400 text-sm">
                            <Zap className="w-4 h-4" />
                            <span>Using <b>Llama 4 Maverick (17B)</b>. Extremely fast inference. Good for standard screenshots.</span>
                        </div>
                    </motion.div>
                )}

                {/* Cohere Info Area */}
                {analysisMode === 'cohere' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-800/50 p-4 rounded-xl border border-teal-500/30 flex items-center gap-4"
                    >
                        <div className="flex items-center gap-2 text-teal-400 text-sm">
                            <Cloud className="w-4 h-4" />
                            <span>Using <b>Command A Vision (07-2025)</b>. Optimized for visual reasoning.</span>
                        </div>
                    </motion.div>
                )}

                <div className="flex justify-between items-center mt-2">
                    {!isAnalyzing && files.some(f => f.status !== 'completed' && f.status !== 'pending') && (
                        <button
                            onClick={startAnalysis}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105"
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Retry Failed
                        </button>
                    )}
                    {!isAnalyzing && files.every(f => f.status === 'pending') && (
                        <button
                            onClick={startAnalysis}
                            disabled={analysisMode === 'local' && localModels.length === 0}
                            className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-lg ${analysisMode === 'local' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/20' :
                                analysisMode === 'groq' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20' :
                                    'bg-primary-600 hover:bg-primary-500 shadow-primary-900/20'
                                } text-white disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed`}
                        >
                            <Play className="w-5 h-5 fill-current" />
                            Start {analysisMode === 'local' ? 'Local' : analysisMode === 'groq' ? 'Groq' : analysisMode === 'cohere' ? 'Cohere' : 'Gemini'} Analysis
                        </button>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {(isAnalyzing || progress > 0) && (
                <div className="bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700 relative">
                    <motion.div
                        className={`h-full bg-gradient-to-r ${statusMessage.includes('Failed') ? 'from-red-600 to-red-500' :
                            analysisMode === 'local' ? 'from-purple-600 to-pink-500' :
                                analysisMode === 'groq' ? 'from-orange-600 to-yellow-500' :
                                    'from-primary-600 to-green-500'
                            }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            )}

            {statusMessage && (
                <p className={`text-sm text-center font-mono ${statusMessage.includes('Error') || statusMessage.includes('Failed') ? 'text-red-400' : 'text-slate-300 animate-pulse'}`}>
                    {statusMessage}
                </p>
            )}

            {/* File List Status */}
            <div className="bg-dark-card rounded-xl border border-slate-700 overflow-hidden">
                {files.map((file, index) => (
                    <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 border-b border-slate-700 last:border-0 ${index === currentFileIndex ? 'bg-primary-900/10' : ''
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <img src={file.preview} alt="" className="w-10 h-10 object-cover rounded" />
                            <div>
                                <p className="text-sm font-medium text-slate-200 truncate max-w-[200px]">{file.file.name}</p>
                                <p className="text-xs text-slate-500">{(file.file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {file.status === 'pending' && <span className="text-xs text-slate-500">Pending</span>}
                            {file.status === 'analyzing' && (
                                <div className={`flex items-center gap-2 ${analysisMode === 'local' ? 'text-purple-400' :
                                    analysisMode === 'groq' ? 'text-orange-400' :
                                        'text-primary-400'
                                    }`}>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs">Analyzing...</span>
                                </div>
                            )}
                            {file.status === 'completed' && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs">Done</span>
                                </div>
                            )}
                            {file.status === 'error' && (
                                <div className="flex items-center gap-2 text-red-400 group relative">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-xs">Failed</span>
                                    <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-red-900/90 text-white text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-red-500/50">
                                        {file.error || "Unknown error"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <OllamaGuide isOpen={showLocalGuide} onClose={() => setShowLocalGuide(false)} />
        </div>
    );
};

export default Analyzer;
