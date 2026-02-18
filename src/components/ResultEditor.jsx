import React, { useState, useEffect } from 'react';
import { Download, FileText, Trash2, Edit3, Image as ImageIcon, ChevronDown, ChevronUp, Type, Plus, GripVertical, FileType, Settings, Wand2, Loader2, Globe } from 'lucide-react';
import { exportToPDF, exportToWord, exportToHTML } from '../utils/export';
import { geminiClient } from '../utils/gemini';
import { groqClient } from '../utils/groq';
import { cohereClient } from '../utils/cohere';
import { localClient } from '../utils/localLLM';
import { analyzeFile } from '../utils/sharedAnalysis';
import { motion, AnimatePresence } from 'framer-motion';

const ResultEditor = ({ content, images, analysisMode, selectedLocalModel }) => {
    const [steps, setSteps] = useState([]);
    const [expandedSteps, setExpandedSteps] = useState({});
    const [docTitle, setDocTitle] = useState("Screenshot Analysis Report");

    // Export Options State
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exportConfig, setExportConfig] = useState({
        headerText: "", // Defaults to docTitle if empty
        footerText: "Screenshot Analyzer",
        brandingText: "Developed by Saichandram Sadhu",
        showPageNumbers: true,
        logoBase64: null,
        theme: "blue" // blue, minimal, purple
    });

    useEffect(() => {
        if (Array.isArray(content)) {
            setSteps(content);
            const initialExpanded = {};
            content.forEach(s => initialExpanded[s.id] = true);
            setExpandedSteps(initialExpanded);
        } else if (typeof content === 'string') {
            setSteps([{ id: 'legacy', title: 'Analysis Result', text: content, preview: null }]);
            setExpandedSteps({ 'legacy': true });
        }
    }, [content]);

    // Update config when title changes to keep header synced by default
    useEffect(() => {
        setExportConfig(prev => ({ ...prev, headerText: docTitle }));
    }, [docTitle]);

    const handleTextChange = (id, newText) => {
        setSteps(steps.map(step => step.id === id ? { ...step, text: newText } : step));
    };

    const handleTitleChange = (id, newTitle) => {
        setSteps(steps.map(step => step.id === id ? { ...step, title: newTitle } : step));
    };

    const handleDeleteStep = (id) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    const handleAddStep = () => {
        const newId = Date.now().toString();
        const newStep = {
            id: newId,
            title: "New Action Step",
            text: "Description of the step...",
            preview: null
        };
        setSteps([...steps, newStep]);
        setExpandedSteps(prev => ({ ...prev, [newId]: true }));
    };

    const toggleExpand = (id) => {
        setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [polishingSteps, setPolishingSteps] = useState({});
    const [isAppending, setIsAppending] = useState(false);

    const handleAppendImages = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsAppending(true);
        const newSteps = [];

        // Convert to file objects with preview
        const fileObjs = files.map((file, index) => ({
            id: `append-${Date.now()}-${index}`,
            file,
            preview: URL.createObjectURL(file)
        }));

        for (const fileObj of fileObjs) {
            try {
                // Determine mode - leveraging passed prop
                const result = await analyzeFile(fileObj, analysisMode, selectedLocalModel, (msg) => console.log(msg));
                newSteps.push(result);
            } catch (error) {
                console.error("Append analysis failed", error);
                alert(`Failed to analyze ${fileObj.file.name}: ${error.message}`);
            }
        }

        setSteps(prev => [...prev, ...newSteps]);
        setIsAppending(false);
        // Clear input
        e.target.value = '';
    };

    const handlePolishStep = async (id, currentText, currentTitle) => {
        setPolishingSteps(prev => ({ ...prev, [id]: true }));
        try {
            const prompt = `Rewrite the following step description to be professional, clear, and concise for technical documentation. Keep it direct.
            
            Original Text: "${currentText}"
            Context/Title: "${currentTitle}"
            
            Return ONLY the rewritten text, no quotes or explanations.`;

            let polishedText = "";

            if (analysisMode === 'groq') {
                polishedText = await groqClient.generateText(prompt);
            } else if (analysisMode === 'cohere') {
                polishedText = await cohereClient.generateText(prompt);
            } else if (analysisMode === 'local') {
                localClient.setModel(selectedLocalModel);
                polishedText = await localClient.generateText(prompt);
            } else {
                polishedText = await geminiClient.generateText(prompt);
            }

            if (polishedText) {
                setSteps(prevSteps => prevSteps.map(s =>
                    s.id === id ? { ...s, text: polishedText.trim() } : s
                ));
            }
        } catch (error) {
            console.error("Polish failed", error);
            alert("Could not check grammar (Internet/Key issue).");
        } finally {
            setPolishingSteps(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleExport = (type) => {
        const options = {
            ...exportConfig,
            headerText: exportConfig.headerText || docTitle
        };

        if (type === 'pdf') {
            exportToPDF(steps, docTitle, options);
        } else if (type === 'html') {
            exportToHTML(steps, docTitle, options);
        } else {
            exportToWord(steps, docTitle, options);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/40 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-white/10 relative">

            {/* Sticky Header */}
            <div className="px-6 py-5 border-b border-slate-700/30 flex flex-col gap-4 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                        <div className="p-3 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl border border-primary-500/20 shadow-inner">
                            <FileText className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex-1 group">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-0.5 mb-1 opacity-70 group-hover:opacity-100 transition-opacity">Document Title</label>
                            <input
                                type="text"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="bg-transparent border-none text-xl font-bold text-white w-full focus:outline-none focus:ring-0 placeholder-slate-600 truncate"
                                placeholder="Enter Report Title..."
                            />
                            <div className="h-0.5 w-full bg-slate-700/50 group-hover:bg-primary-500/50 transition-colors mt-1 rounded-full"></div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className={`p-2.5 rounded-xl border transition-all ${showExportOptions ? 'bg-primary-500/20 border-primary-500/50 text-primary-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                            title="Export Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handleExport('pdf')}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-900/30 transition-all hover:-translate-y-0.5"
                        >
                            <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={() => handleExport('word')}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all hover:-translate-y-0.5"
                        >
                            <FileType className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                            <span>Word</span>
                        </button>
                        <button
                            onClick={() => handleExport('html')}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-900/30 transition-all hover:-translate-y-0.5"
                        >
                            <Globe className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                            <span>Web</span>
                        </button>
                    </div>
                </div>

                {/* Export Options Panel */}
                <AnimatePresence>
                    {showExportOptions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-700/50 pt-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/30 p-4 rounded-xl border border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400">Header Text (Word)</label>
                                    <input
                                        type="text"
                                        value={exportConfig.headerText}
                                        onChange={(e) => setExportConfig({ ...exportConfig, headerText: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                        placeholder="Same as Title"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400">Color Theme</label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'blue', color: 'bg-blue-500', label: "Blue" },
                                            { id: 'purple', color: 'bg-purple-500', label: "Purple" },
                                            { id: 'minimal', color: 'bg-slate-800', label: "Minimal" },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setExportConfig({ ...exportConfig, theme: t.id })}
                                                className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${exportConfig.theme === t.id ? 'bg-slate-800 border-primary-500 ring-1 ring-primary-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                                            >
                                                <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                                                <span className="text-xs font-medium">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400">Footer Branding (Left)</label>
                                    <input
                                        type="text"
                                        value={exportConfig.footerText}
                                        onChange={(e) => setExportConfig({ ...exportConfig, footerText: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400">Cover Page Credit (Center)</label>
                                    <input
                                        type="text"
                                        value={exportConfig.brandingText}
                                        onChange={(e) => setExportConfig({ ...exportConfig, brandingText: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400">Company Logo (Optional)</label>
                                    <div className="flex items-center gap-3">
                                        {exportConfig.logoBase64 && (
                                            <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-700">
                                                <img src={exportConfig.logoBase64} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            </div>
                                        )}
                                        <label className="flex-1 cursor-pointer">
                                            <div className="w-full bg-slate-900 border border-slate-700 border-dashed rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                                                <ImageIcon className="w-4 h-4" />
                                                <span>{exportConfig.logoBase64 ? "Change Logo" : "Upload Logo"}</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setExportConfig({ ...exportConfig, logoBase64: reader.result });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-end pb-2 md:col-span-2 justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={exportConfig.showPageNumbers}
                                            onChange={(e) => setExportConfig({ ...exportConfig, showPageNumbers: e.target.checked })}
                                            className="form-checkbox bg-slate-800 border-slate-600 rounded text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="text-sm">Show Page Numbers</span>
                                    </label>
                                    {exportConfig.logoBase64 && (
                                        <button
                                            onClick={() => setExportConfig({ ...exportConfig, logoBase64: null })}
                                            className="text-xs text-red-400 hover:text-red-300 underline"
                                        >
                                            Remove Logo
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 space-y-5 scroll-smooth custom-scrollbar bg-slate-950/20">
                {steps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-medium text-lg">No content to display.</p>
                        <p className="text-sm opacity-60">Upload screenshots to start.</p>
                        <button
                            onClick={handleAddStep}
                            className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                        >
                            Add Manual Step
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {steps.map((step, index) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25, delay: index * 0.05 }}
                                key={step.id || index}
                                className="bg-slate-900/60 rounded-2xl border border-slate-700/50 hover:border-slate-500/50 transition-colors overflow-hidden group shadow-lg hover:shadow-xl ring-1 ring-white/5"
                            >
                                {/* Step Header */}
                                <div
                                    className={`px-6 py-5 flex items-center justify-between cursor-pointer select-none transition-colors ${expandedSteps[step.id] ? 'bg-slate-800/60' : 'bg-slate-800/30 hover:bg-slate-800/50'
                                        }`}
                                    onClick={() => toggleExpand(step.id)}
                                >
                                    <div className="flex items-center gap-5 flex-1 overflow-hidden">
                                        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 shadow-inner group-hover:border-primary-500/40 transition-colors">
                                            <span className="text-primary-400 font-bold text-base">{index + 1}</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-slate-200 truncate pr-4">
                                            {step.title || `Step ${index + 1} Action`}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Delete step"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <div className={`p-2 text-slate-500 transition-transform duration-300 ${expandedSteps[step.id] ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Step Content */}
                                <AnimatePresence>
                                    {expandedSteps[step.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-slate-700/30 bg-slate-900/20"
                                        >
                                            <div className="p-6 flex flex-col gap-8">

                                                {/* Title Editor */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-primary-400 uppercase tracking-widest pl-1">
                                                        <Type className="w-3 h-3" /> Step Title
                                                    </div>
                                                    <div className="relative group/input">
                                                        <input
                                                            type="text"
                                                            value={step.title || ""}
                                                            onChange={(e) => handleTitleChange(step.id, e.target.value)}
                                                            className="w-full bg-slate-950/50 p-4 pl-5 rounded-xl border border-slate-700/50 text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all placeholder-slate-600 shadow-inner"
                                                            placeholder="e.g., Navigate to Settings"
                                                        />
                                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-transparent opacity-0 group-focus-within/input:opacity-100 pointer-events-none transition-opacity"></div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                                                    {/* Text Editor */}
                                                    <div className="space-y-3 h-full flex flex-col order-2 lg:order-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs font-bold text-primary-400 uppercase tracking-widest pl-1">
                                                                <Edit3 className="w-3 h-3" /> Description
                                                            </div>
                                                            <button
                                                                onClick={() => handlePolishStep(step.id, step.text, step.title)}
                                                                disabled={polishingSteps[step.id] || !step.text}
                                                                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-300 transition-all disabled:opacity-50"
                                                                title="AI Professional Rewrite"
                                                            >
                                                                {polishingSteps[step.id] ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Wand2 className="w-3 h-3" />
                                                                )}
                                                                {polishingSteps[step.id] ? "Polishing..." : "AI Polish"}
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            value={step.text}
                                                            onChange={(e) => handleTextChange(step.id, e.target.value)}
                                                            className="flex-1 w-full bg-slate-950/50 p-5 rounded-xl border border-slate-700/50 text-slate-300 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all placeholder-slate-600 custom-scrollbar min-h-[180px] shadow-inner"
                                                            spellCheck={false}
                                                            placeholder="Describe this step in detail..."
                                                        />
                                                    </div>

                                                    {/* Image Preview */}
                                                    <div className="space-y-3 order-1 lg:order-2">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-primary-400 uppercase tracking-widest pl-1">
                                                            <ImageIcon className="w-3 h-3" /> Screenshot
                                                        </div>
                                                        {step.preview ? (
                                                            <div className="relative group/image rounded-xl overflow-hidden bg-slate-950 border border-slate-700/50 aspect-video flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-[1.01]">
                                                                <img
                                                                    src={step.preview}
                                                                    alt={`Step ${index + 1}`}
                                                                    className="w-full h-full object-contain"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                                                                    <span className="text-white text-xs bg-black/50 px-3 py-1 rounded-full backdrop-blur">View Full</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/30 aspect-video flex flex-col items-center justify-center text-slate-600 gap-2">
                                                                <ImageIcon className="w-8 h-8 opacity-50" />
                                                                <span className="text-xs">No screenshot</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 pb-2">
                    <button
                        onClick={handleAddStep}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-all hover:scale-105 border border-slate-700 shadow-lg"
                    >
                        <Plus className="w-4 h-4" /> Add Manual Step
                    </button>

                    <div className="relative">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleAppendImages}
                            className="hidden"
                            id="append-upload"
                            disabled={isAppending}
                        />
                        <label
                            htmlFor="append-upload"
                            className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-500/30 text-purple-200 rounded-full text-sm font-medium transition-all hover:scale-105 shadow-lg cursor-pointer ${isAppending ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isAppending ? (
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            ) : (
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                            )}
                            <span>{isAppending ? 'Analyzing...' : 'Analyze More Images'}</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultEditor;
