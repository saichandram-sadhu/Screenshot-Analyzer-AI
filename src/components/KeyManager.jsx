
import React, { useState, useEffect } from 'react';
import { Trash2, Key, Plus, ShieldCheck, AlertCircle, RefreshCw, CheckCircle, XCircle, Clock, Zap, Cloud, Eye, EyeOff, Loader2 } from 'lucide-react';
import { geminiClient } from '../utils/gemini';
import { groqClient } from '../utils/groq';
import { cohereClient } from '../utils/cohere';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from 'sonner';

const KeyManager = ({ onKeysUpdated }) => {
    // Tab State: 'gemini' | 'groq' | 'cohere'
    const [activeTab, setActiveTab] = useState('gemini');

    // Gemini State
    const [geminiKeys, setGeminiKeys] = useState([]);
    const [newGeminiKey, setNewGeminiKey] = useState('');
    const [activeGeminiIndex, setActiveGeminiIndex] = useState(0);
    const [geminiStatuses, setGeminiStatuses] = useState({});
    const [isCheckingGemini, setIsCheckingGemini] = useState(false);
    const [isAddingGemini, setIsAddingGemini] = useState(false);
    const [timeToReset, setTimeToReset] = useState('');

    // Groq State
    const [groqKeys, setGroqKeys] = useState([]);
    const [newGroqKey, setNewGroqKey] = useState('');
    const [activeGroqIndex, setActiveGroqIndex] = useState(0);
    const [isAddingGroq, setIsAddingGroq] = useState(false);

    // Cohere State
    const [cohereKeys, setCohereKeys] = useState([]);
    const [newCohereKey, setNewCohereKey] = useState('');
    const [activeCohereIndex, setActiveCohereIndex] = useState(0);
    const [showCohereKey, setShowCohereKey] = useState(false);
    const [isAddingCohere, setIsAddingCohere] = useState(false);

    useEffect(() => {
        refreshKeys();
        const timer = setInterval(updateResetCountdown, 1000);
        updateResetCountdown();
        return () => clearInterval(timer);
    }, []);

    const refreshKeys = () => {
        // Gemini
        const currentGemini = geminiClient.loadApiKeys();
        setGeminiKeys(currentGemini);
        setActiveGeminiIndex(geminiClient.getServiceStatus().currentKeyIndex);

        // Groq
        const currentGroq = groqClient.loadApiKeys();
        setGroqKeys(currentGroq);
        setActiveGroqIndex(groqClient.currentKeyIndex || 0);

        // Cohere
        const currentCohere = cohereClient.loadApiKeys();
        setCohereKeys(currentCohere);
        setActiveCohereIndex(cohereClient.currentKeyIndex || 0);
    };

    const updateResetCountdown = () => {
        const now = new Date();
        const ptString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
        const ptDate = new Date(ptString);
        const target = new Date(ptDate);
        target.setHours(24, 0, 0, 0);
        const diffMs = target - ptDate;

        if (diffMs > 0) {
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
            setTimeToReset(`${hours}h ${minutes}m ${seconds}s`);
        } else {
            setTimeToReset("Now");
        }
    };

    // --- Gemini Handlers ---
    const handleAddGeminiKey = async () => {
        if (!newGeminiKey.trim()) return;
        setIsAddingGemini(true);

        try {
            // Validate first
            const genAI = new GoogleGenerativeAI(newGeminiKey.trim());
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            await model.generateContent("Test");

            // If success
            const updated = [...geminiKeys, newGeminiKey.trim()];
            geminiClient.saveApiKeys(updated);
            setGeminiKeys(updated);
            setNewGeminiKey('');
            if (onKeysUpdated) onKeysUpdated();
            setGeminiStatuses({});
            toast.success("Gemini API Key verified and added!");
        } catch (error) {
            toast.error("Invalid Gemini API Key or Quota Exceeded.");
            console.error(error);
        } finally {
            setIsAddingGemini(false);
        }
    };

    const handleRemoveGeminiKey = (index) => {
        const updated = geminiKeys.filter((_, i) => i !== index);
        geminiClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
        setGeminiStatuses({});
    };

    const checkGeminiKeyStatus = async (key, index) => {
        setGeminiStatuses(prev => ({ ...prev, [index]: 'checking' }));
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            await model.generateContent("Test");
            setGeminiStatuses(prev => ({ ...prev, [index]: 'valid' }));
        } catch (error) {
            if (error.message.includes("429") || error.message.includes("quota")) {
                setGeminiStatuses(prev => ({ ...prev, [index]: 'quota' }));
            } else {
                setGeminiStatuses(prev => ({ ...prev, [index]: 'invalid' }));
            }
        }
    };

    const handleCheckAllGemini = async () => {
        setIsCheckingGemini(true);
        setGeminiStatuses({});
        const promises = geminiKeys.map((key, index) => checkGeminiKeyStatus(key, index));
        await Promise.all(promises);
        setIsCheckingGemini(false);
    };

    // --- Groq Handlers ---
    const handleAddGroqKey = async () => {
        if (!newGroqKey.trim()) return;
        setIsAddingGroq(true);

        try {
            const isValid = await groqClient.validateKey(newGroqKey.trim());
            if (isValid) {
                const updated = [...groqKeys, newGroqKey.trim()];
                groqClient.saveApiKeys(updated);
                setGroqKeys(updated);
                setNewGroqKey('');
                if (onKeysUpdated) onKeysUpdated();
                toast.success("Groq API Key verified and added!");
            } else {
                toast.error("Invalid Groq API Key.");
            }
        } catch (e) {
            toast.error("Error validating Groq key.");
        } finally {
            setIsAddingGroq(false);
        }
    };

    const handleRemoveGroqKey = (index) => {
        const updated = groqKeys.filter((_, i) => i !== index);
        groqClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
    };

    // --- Cohere Handlers ---
    const handleAddCohereKey = async () => {
        if (!newCohereKey.trim()) return;
        setIsAddingCohere(true);

        try {
            const isValid = await cohereClient.validateKey(newCohereKey.trim());
            if (isValid) {
                const updated = [...cohereKeys, newCohereKey.trim()];
                cohereClient.saveApiKeys(updated);
                setCohereKeys(updated);
                setNewCohereKey('');
                if (onKeysUpdated) onKeysUpdated();
                toast.success("Cohere API Key verified and added!");
            } else {
                toast.error("Invalid Cohere API Key.");
            }
        } catch (e) {
            toast.error("Error validating Cohere key.");
        } finally {
            setIsAddingCohere(false);
        }
    };

    const handleRemoveCohereKey = (index) => {
        const updated = cohereKeys.filter((_, i) => i !== index);
        cohereClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
    };

    return (
        <div className="bg-dark-card p-6 rounded-xl border border-slate-700 shadow-xl min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary-500" />
                    <h2 className="text-xl font-semibold text-white">API Keys</h2>
                </div>
            </div>

            {/* Provider Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-700 pb-1">
                <button
                    onClick={() => setActiveTab('gemini')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors border-b-2 ${activeTab === 'gemini'
                        ? 'border-primary-500 text-primary-400 bg-primary-900/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Cloud className="w-4 h-4" /> Gemini
                </button>
                <button
                    onClick={() => setActiveTab('groq')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors border-b-2 ${activeTab === 'groq'
                        ? 'border-orange-500 text-orange-400 bg-orange-900/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Zap className="w-4 h-4" /> Groq
                </button>
                <button
                    onClick={() => setActiveTab('cohere')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors border-b-2 ${activeTab === 'cohere'
                        ? 'border-teal-500 text-teal-400 bg-teal-900/10'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Key className="w-4 h-4" /> Cohere
                </button>
            </div>

            {/* --- GEMINI VIEW --- */}
            {activeTab === 'gemini' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-400">Manage multiple keys for rotation.</p>
                        {geminiKeys.length > 0 && (
                            <button
                                onClick={handleCheckAllGemini}
                                disabled={isCheckingGemini}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3 h-3 ${isCheckingGemini ? 'animate-spin' : ''}`} />
                                {isCheckingGemini ? 'Checking...' : 'Check Limits'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="password"
                            value={newGeminiKey}
                            onChange={(e) => setNewGeminiKey(e.target.value)}
                            placeholder="Add Gemini API Key"
                            className="flex-1 bg-slate-800 border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-slate-500"
                        />
                        <button
                            onClick={handleAddGeminiKey}
                            disabled={!newGeminiKey || isAddingGemini}
                            className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isAddingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary-400 hover:underline">aistudio.google.com</a>.
                    </p>

                    <div className="space-y-2 mt-2 max-h-52 overflow-y-auto pr-1">
                        <AnimatePresence>
                            {geminiKeys.map((key, index) => (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${index === activeGeminiIndex
                                        ? 'bg-primary-900/10 border-primary-500/30'
                                        : 'bg-slate-800/50 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <div className={`w-2 h-2 rounded-full ${index === activeGeminiIndex ? 'bg-primary-400' : 'bg-slate-600'}`} />
                                        <div className="flex flex-col">
                                            <span className="text-slate-300 font-mono text-xs truncate w-32">
                                                {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                            </span>
                                            {index === activeGeminiIndex && (
                                                <span className="text-[10px] text-primary-400">Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {geminiStatuses[index] === 'valid' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                        {geminiStatuses[index] === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
                                        {geminiStatuses[index] === 'quota' && (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 rounded">Limit Hit</span>
                                                <span className="text-[10px] text-slate-500">{timeToReset}</span>
                                            </div>
                                        )}
                                        <button onClick={() => handleRemoveGeminiKey(index)} className="text-slate-500 hover:text-red-400 p-1">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* --- GROQ VIEW --- */}
            {activeTab === 'groq' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 bg-orange-900/10 border border-orange-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Zap className="w-5 h-5 text-orange-400 mt-1" />
                            <div>
                                <h3 className="text-sm font-semibold text-orange-300">Fastest Inference</h3>
                                <p className="text-xs text-orange-200/70 mt-1">
                                    Uses <b>Llama 4 Maverick (17B)</b>. Optimized for speed.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Groq API Keys</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                value={newGroqKey}
                                onChange={(e) => setNewGroqKey(e.target.value)}
                                placeholder="Add Groq API Key (gsk_...)"
                                className="flex-1 bg-slate-800 border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-slate-500 font-mono"
                            />
                            <button
                                onClick={handleAddGroqKey}
                                disabled={!newGroqKey || isAddingGroq}
                                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isAddingGroq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Get a free key at <a href="https://console.groq.com/" target="_blank" className="text-orange-400 hover:underline">console.groq.com</a>.
                        </p>
                    </div>

                    <div className="space-y-2 mt-2 max-h-52 overflow-y-auto pr-1">
                        <AnimatePresence>
                            {groqKeys.map((key, index) => (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${index === activeGroqIndex
                                        ? 'bg-orange-900/10 border-orange-500/30'
                                        : 'bg-slate-800/50 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <div className={`w-2 h-2 rounded-full ${index === activeGroqIndex ? 'bg-orange-400' : 'bg-slate-600'}`} />
                                        <div className="flex flex-col">
                                            <span className="text-slate-300 font-mono text-xs truncate w-32">
                                                {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                            </span>
                                            {index === activeGroqIndex && (
                                                <span className="text-[10px] text-orange-400">Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveGroqKey(index)} className="text-slate-500 hover:text-red-400 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {groqKeys.length === 0 && (
                            <p className="text-xs text-center text-slate-500 italic py-2">No keys added. Please add at least one key.</p>
                        )}
                    </div>
                </div>
            )}

            {/* --- COHERE VIEW --- */}
            {activeTab === 'cohere' && (
                <div className="space-y-4 animate-fadeIn">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-teal-500/20">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-teal-500/20 rounded-lg">
                                <Key className="w-5 h-5 text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Cohere API Keys (Command R+)</h3>
                                <p className="text-xs text-slate-400">Used for "Best Output". Auto-rotates on limit.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Cohere API Keys</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={showCohereKey ? "text" : "password"}
                                    value={newCohereKey}
                                    onChange={(e) => setNewCohereKey(e.target.value)}
                                    placeholder="Add Cohere API Key..."
                                    className="w-full bg-slate-800 border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-teal-500 outline-none transition-all placeholder-slate-500 font-mono pr-10"
                                />
                                <button
                                    onClick={() => setShowCohereKey(!showCohereKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                                >
                                    {showCohereKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={handleAddCohereKey}
                                disabled={!newCohereKey || isAddingCohere}
                                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                            >
                                {isAddingCohere ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Get a key at <a href="https://dashboard.cohere.com/api-keys" target="_blank" className="text-teal-400 hover:underline">dashboard.cohere.com</a>.
                        </p>
                    </div>

                    <div className="space-y-2 mt-2 max-h-52 overflow-y-auto pr-1">
                        <AnimatePresence>
                            {cohereKeys.map((key, index) => (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    key={index}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${index === activeCohereIndex
                                        ? 'bg-teal-900/10 border-teal-500/30'
                                        : 'bg-slate-800/50 border-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <div className={`w-2 h-2 rounded-full ${index === activeCohereIndex ? 'bg-teal-400' : 'bg-slate-600'}`} />
                                        <div className="flex flex-col">
                                            <span className="text-slate-300 font-mono text-xs truncate w-32">
                                                {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                            </span>
                                            {index === activeCohereIndex && (
                                                <span className="text-[10px] text-teal-400">Active</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveCohereKey(index)} className="text-slate-500 hover:text-red-400 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {cohereKeys.length === 0 && (
                            <p className="text-xs text-center text-slate-500 italic py-2">No keys added. Please add at least one key.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KeyManager;
