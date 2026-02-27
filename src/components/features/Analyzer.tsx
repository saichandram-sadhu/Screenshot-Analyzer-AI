import React, { useState, useEffect, useRef } from 'react';
import { localClient } from '../../utils/localLLM';
import { geminiClient } from '../../utils/gemini';
import { groqClient } from '../../utils/groq';
import { cohereClient } from '../../utils/cohere';
import { analyzeFile } from '../../utils/sharedAnalysis';
import OllamaGuide from './OllamaGuide';
import PerformanceHUD from './PerformanceHUD';
import { Play, Loader2, CheckCircle, AlertTriangle, FileText, Cloud, Server, Database, Zap, HelpCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AnalysisFile, AppSettings } from '../../types';

interface AnalyzerProps {
    files: AnalysisFile[];
    setFiles: React.Dispatch<React.SetStateAction<AnalysisFile[]>>;
    onAnalysisComplete: (results: any[]) => void;
    analysisMode: 'cloud' | 'local' | 'groq' | 'cohere';
    setAnalysisMode: (mode: 'cloud' | 'local' | 'groq' | 'cohere') => void;
    localModels: any[];
    setLocalModels: React.Dispatch<React.SetStateAction<any[]>>;
    selectedLocalModel: string;
    setSelectedLocalModel: (model: string) => void;
    settings?: AppSettings;
}

const Analyzer: React.FC<AnalyzerProps> = ({
    files,
    setFiles,
    onAnalysisComplete,
    analysisMode,
    setAnalysisMode,
    localModels,
    setLocalModels,
    selectedLocalModel,
    setSelectedLocalModel,
    settings
}) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [manualPrompt, setManualPrompt] = useState('');
    const [currentFileIndex, setCurrentFileIndex] = useState(-1);
    const [statusMessage, setStatusMessage] = useState('');
    const [activeModelName, setActiveModelName] = useState<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const [isCheckingLocal, setIsCheckingLocal] = useState(false);
    const [showLocalGuide, setShowLocalGuide] = useState(false);

    // Performance Metrics State
    const [metrics, setMetrics] = useState<any>(null);

    useEffect(() => {
        if (analysisMode === 'local') {
            checkLocalModels();
        } else {
            // Fetch Active Model for Cloud Providers
            checkCloudModel();
        }
    }, [analysisMode]);

    const checkCloudModel = () => {
        if (analysisMode === 'cloud') {
            const status = geminiClient.getServiceStatus();
            setActiveModelName(status.activeModel || 'gemini-1.5-flash');
        } else if (analysisMode === 'groq') {
            const status = groqClient.getServiceStatus();
            setActiveModelName(status.activeModel || 'llama-3.2-11b-vision-preview');
        } else if (analysisMode === 'cohere') {
            const status = cohereClient.getServiceStatus();
            setActiveModelName(status.activeModel || 'command-r-plus');
        }
    };

    const checkLocalModels = async () => {
        setIsCheckingLocal(true);
        setStatusMessage("Checking local Ollama instance...");
        const models = await localClient.listVisionModels();
        setLocalModels(models);
        if (models.length > 0) {
            const preferred = models.find((m: any) => m.name.includes('llava')) || models[0];
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
        let interval: NodeJS.Timeout;
        if (isAnalyzing && analysisMode === 'local') {
            interval = setInterval(async () => {
                const info = await localClient.getRunningInfo();
                if (info) {
                    setMetrics((prev: any) => ({
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

    const handleModelSelect = (value: string) => {
        setSelectedLocalModel(value);
        localClient.setModel(value);
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
        let resultsArray: any[] = [];

        // Initialize AbortController
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const newFiles = files.map(f => ({ ...f, status: 'pending' as const, error: null }));
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
                    (msg: string) => setStatusMessage(msg),
                    (_token: string) => {
                        // Streaming Callback
                    },
                    (newMetrics: any) => {
                        setMetrics((prev: any) => ({ ...prev, ...newMetrics }));
                    },
                    signal,
                    { ...settings, manualPrompt } // Pass full settings object with our manual prompt
                );

                resultsArray.push(analyzedStep);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'completed' } : f));

            } catch (error: any) {
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
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            >
                <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/80">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <CardTitle>Analysis Queue</CardTitle>
                            </div>

                            {!isAnalyzing && (
                                <div className="flex p-1 bg-muted rounded-lg border border-border">
                                    <Button
                                        variant={analysisMode === 'cloud' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setAnalysisMode('cloud')}
                                        className="gap-2"
                                    >
                                        <Cloud className="w-4 h-4" /> Gemini
                                    </Button>
                                    <Button
                                        variant={analysisMode === 'groq' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setAnalysisMode('groq')}
                                        className={`gap-2 ${analysisMode === 'groq' ? 'bg-orange-600 hover:bg-orange-500 text-white' : ''}`}
                                    >
                                        <Zap className="w-4 h-4" /> Groq
                                    </Button>
                                    <Button
                                        variant={analysisMode === 'local' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setAnalysisMode('local')}
                                        className={`gap-2 ${analysisMode === 'local' ? 'bg-purple-600 hover:bg-purple-500 text-white' : ''}`}
                                    >
                                        <Server className="w-4 h-4" /> Local
                                    </Button>
                                    <Button
                                        variant={analysisMode === 'cohere' ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setAnalysisMode('cohere')}
                                        className={`gap-2 ${analysisMode === 'cohere' ? 'bg-teal-600 hover:bg-teal-500 text-white' : ''}`}
                                    >
                                        <Cloud className="w-4 h-4" /> Cohere
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Local Model Selection Area */}
                        <AnimatePresence>
                            {analysisMode === 'local' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-muted/50 p-4 rounded-xl border border-purple-500/30 flex flex-col gap-4 overflow-hidden mb-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
                                            <Database className="w-4 h-4" />
                                            <span className="text-sm font-medium">Ollama System:</span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowLocalGuide(true)}
                                            className="gap-2 text-xs h-7 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                        >
                                            <HelpCircle className="w-3 h-3" /> Installation Guide
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {isCheckingLocal ? (
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                                            </div>
                                        ) : localModels.length > 0 ? (
                                            <div className="flex-1">
                                                <Select value={selectedLocalModel} onValueChange={handleModelSelect}>
                                                    <SelectTrigger className="w-full bg-background border-border">
                                                        <SelectValue placeholder="Select a model" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {localModels.map((m: any) => (
                                                            <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-100 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-500/20 flex-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>No vision models found. Click Help Guide!</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Performance HUD */}
                                    <PerformanceHUD
                                        metrics={metrics}
                                        onStop={handleStopAnalysis}
                                        onUnload={handleUnloadModel}
                                        isAnalyzing={isAnalyzing}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>



                        {/* Gemini Info Area */}
                        {analysisMode === 'cloud' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-muted/50 p-4 rounded-xl border border-blue-500/30 flex items-center gap-4 mb-4"
                            >
                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Using <b>{activeModelName || 'gemini-1.5-flash'}</b></span>
                                </div>
                            </motion.div>
                        )}

                        {/* Groq Info Area */}
                        {analysisMode === 'groq' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-muted/50 p-4 rounded-xl border border-orange-500/30 flex items-center gap-4 mb-4"
                            >
                                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm">
                                    <Zap className="w-4 h-4" />
                                    <span>Using <b>{activeModelName || 'Llama 3.2 Vision'}</b>. Extremely fast inference.</span>
                                </div>
                            </motion.div>
                        )}

                        {/* Cohere Info Area */}
                        {analysisMode === 'cohere' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-muted/50 p-4 rounded-xl border border-teal-500/30 flex items-center gap-4 mb-4"
                            >
                                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm">
                                    <Cloud className="w-4 h-4" />
                                    <span>Using <b>{activeModelName || 'Command R+'}</b>. Optimized for visual reasoning.</span>
                                </div>
                            </motion.div>
                        )}

                        {/* Manual Prompt Area */}
                        {!isAnalyzing && files.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 space-y-2"
                            >
                                <Textarea
                                    placeholder="Ask a specific question or provide a manual prompt for these screenshots... (optional)"
                                    value={manualPrompt}
                                    onChange={(e) => setManualPrompt(e.target.value)}
                                    className="resize-none min-h-[80px]"
                                />
                            </motion.div>
                        )}

                        <div className="flex justify-between items-center mt-2">
                            {!isAnalyzing && files.some(f => f.status !== 'completed' && f.status !== 'pending') && (
                                <Button
                                    onClick={startAnalysis}
                                    className="bg-slate-700 hover:bg-slate-600 gap-2"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Retry Failed
                                </Button>
                            )}
                            {!isAnalyzing && files.every(f => f.status === 'pending') && (
                                <Button
                                    onClick={startAnalysis}
                                    disabled={analysisMode === 'local' && localModels.length === 0}
                                    className={`gap-2 shadow-lg w-full md:w-auto ${analysisMode === 'local' ? 'bg-purple-600 hover:bg-purple-500' :
                                        analysisMode === 'groq' ? 'bg-orange-600 hover:bg-orange-500' :
                                            analysisMode === 'cohere' ? 'bg-teal-600 hover:bg-teal-500' :
                                                ''
                                        }`}
                                    size="lg"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Start {analysisMode === 'local' ? 'Local' : analysisMode === 'groq' ? 'Groq' : analysisMode === 'cohere' ? 'Cohere' : 'Gemini'} Analysis
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Progress Bar */}
            {
                (isAnalyzing || progress > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                    >
                        <Progress value={progress} className="h-4" />
                        {statusMessage && (
                            <p className={`text-sm text-center font-mono ${statusMessage.includes('Error') || statusMessage.includes('Failed') ? 'text-destructive' : 'text-muted-foreground animate-pulse'}`}>
                                {statusMessage}
                            </p>
                        )}
                    </motion.div>
                )
            }

            {/* File List Status */}
            <Card className="border-border/50 overflow-hidden backdrop-blur-sm bg-card/60">
                <CardContent className="p-0">
                    <AnimatePresence>
                        {files.map((file, index) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={`flex items-center justify-between p-3 border-b border-border last:border-0 ${index === currentFileIndex ? 'bg-primary/10' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <img src={file.preview} alt="" className="w-10 h-10 object-cover rounded" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{file.file.name}</p>
                                        <p className="text-xs text-muted-foreground">{(file.file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {file.status === 'pending' && <span className="text-xs text-muted-foreground">Pending</span>}
                                    {file.status === 'analyzing' && (
                                        <div className={`flex items-center gap-2 ${analysisMode === 'local' ? 'text-purple-500' :
                                            analysisMode === 'groq' ? 'text-orange-500' :
                                                'text-primary'
                                            }`}>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs">Analyzing...</span>
                                        </div>
                                    )}
                                    {file.status === 'completed' && (
                                        <div className="flex items-center gap-2 text-green-500">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-xs">Done</span>
                                        </div>
                                    )}
                                    {file.status === 'error' && (
                                        <div className="flex items-center gap-2 text-destructive group relative">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span className="text-xs">Failed</span>
                                            <div className="absolute right-0 bottom-full mb-2 w-64 p-2 bg-destructive text-destructive-foreground text-xs rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {file.error || "Unknown error"}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </CardContent>
            </Card>

            <OllamaGuide isOpen={showLocalGuide} onClose={() => setShowLocalGuide(false)} />
        </div >
    );
};

export default Analyzer;
