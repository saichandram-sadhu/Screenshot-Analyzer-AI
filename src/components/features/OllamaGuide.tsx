import React, { useState } from 'react';
import { X, Terminal, Monitor, Apple, Command, Copy, Check, Info, Zap, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OllamaGuide = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('linux');
    const [copiedCmd, setCopiedCmd] = useState(null);

    if (!isOpen) return null;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedCmd(text);
        setTimeout(() => setCopiedCmd(null), 2000);
    };

    const CodeBlock = ({ cmd, label }) => (
        <div className="space-y-1">
            {label && <p className="text-xs text-slate-400 ml-1">{label}</p>}
            <div className="bg-slate-950 rounded-lg p-3 font-mono text-sm text-slate-300 border border-slate-700/50 flex items-center justify-between group hover:border-slate-600 transition-colors">
                <span className="truncate mr-4">$ {cmd}</span>
                <button
                    onClick={() => copyToClipboard(cmd)}
                    className="text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-1"
                    title="Copy command"
                >
                    {copiedCmd === cmd ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );

    const tabs = [
        { id: 'linux', label: 'Linux', icon: Terminal },
        { id: 'mac', label: 'macOS', icon: Apple },
        { id: 'windows', label: 'Windows', icon: Monitor },
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-700/50 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Command className="w-5 h-5 text-purple-400" />
                                Setup Local AI (Ollama)
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">Run unlimited, private AI on your own machine.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-900/30">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === tab.id ? 'text-purple-400 bg-slate-800/50' : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/30'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_purple]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 flex-1 bg-slate-900/30">

                        {/* Step 1: Install */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm uppercase tracking-wider">
                                <span className="bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded text-xs">Step 1</span>
                                Install Ollama
                            </div>

                            {activeTab === 'linux' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">Run this command in your terminal:</p>
                                    <CodeBlock cmd="curl -fsSL https://ollama.com/install.sh | sh" />
                                </div>
                            )}

                            {activeTab === 'mac' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">Download and run the installer:</p>
                                    <a
                                        href="https://ollama.com/download/Ollama-darwin.zip"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white text-sm font-medium transition-colors"
                                    >
                                        <Apple className="w-4 h-4" /> Download for macOS
                                    </a>
                                </div>
                            )}

                            {activeTab === 'windows' && (
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">Download and run the installer:</p>
                                    <a
                                        href="https://ollama.com/download/OllamaSetup.exe"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white text-sm font-medium transition-colors"
                                    >
                                        <Monitor className="w-4 h-4" /> Download for Windows
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Step 2: Pull Model */}
                        <div className="space-y-4 pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm uppercase tracking-wider">
                                <span className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-xs">Step 2</span>
                                Download a Vision Model
                            </div>
                            <p className="text-sm text-slate-400">
                                You need a "Vision" capable model to analyze screenshots. Pick one based on your hardware:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/40 p-3 rounded-lg border border-yellow-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        <span className="font-semibold text-white text-sm">Best Overall</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 h-8">Llama 3.2 Vision (11B). High accuracy and good speed. Recommended.</p>
                                    <CodeBlock cmd="ollama pull llama3.2-vision" />
                                </div>

                                <div className="bg-slate-800/40 p-3 rounded-lg border border-purple-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Server className="w-4 h-4 text-purple-400" />
                                        <span className="font-semibold text-white text-sm">Reliable Standard</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 h-8">Llava (7B). The standard open-source vision model. Very reliable.</p>
                                    <CodeBlock cmd="ollama pull llava" />
                                </div>

                                <div className="bg-slate-800/40 p-3 rounded-lg border border-green-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-green-400" />
                                        <span className="font-semibold text-white text-sm">Fast & Light</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 h-8">Moondream. Tiny model, runs on almost anything. Fast but less detailed.</p>
                                    <CodeBlock cmd="ollama pull moondream" />
                                </div>

                                <div className="bg-slate-800/40 p-3 rounded-lg border border-blue-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Server className="w-4 h-4 text-blue-400" />
                                        <span className="font-semibold text-white text-sm">High Performance</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2 h-8">Qwen 2.5 VL. Excellent vision capabilities but requires more VRAM.</p>
                                    <CodeBlock cmd="ollama pull qwen2.5-vl" />
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Run */}
                        <div className="space-y-3 pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 text-green-300 font-semibold text-sm uppercase tracking-wider">
                                <span className="bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded text-xs">Step 3</span>
                                Start Server
                            </div>
                            <p className="text-sm text-slate-400">
                                Ensure Ollama is running in the background. Does not need to be in current terminal.
                            </p>
                            <CodeBlock cmd="ollama serve" />
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OllamaGuide;
