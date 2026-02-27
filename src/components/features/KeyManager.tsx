import React, { useState, useEffect } from 'react';
import { Trash2, Key, Plus, RefreshCw, CheckCircle, XCircle, Zap, Cloud, Eye, EyeOff, Loader2, Bot } from 'lucide-react';
import { geminiClient } from '../../utils/gemini';
import { groqClient } from '../../utils/groq';
import { cohereClient } from '../../utils/cohere';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface KeyManagerProps {
    onKeysUpdated?: () => void;
}

const KeyManager: React.FC<KeyManagerProps> = ({ onKeysUpdated }) => {
    // Tab State: 'gemini' | 'groq' | 'cohere'
    const [activeTab, setActiveTab] = useState<'gemini' | 'groq' | 'cohere'>('gemini');

    // Gemini State
    const [geminiKeys, setGeminiKeys] = useState<string[]>([]);
    const [newGeminiKey, setNewGeminiKey] = useState('');
    const [activeGeminiIndex, setActiveGeminiIndex] = useState(0);
    const [geminiStatuses, setGeminiStatuses] = useState<Record<number, string>>({});
    const [geminiLatency, setGeminiLatency] = useState<Record<number, number>>({});
    const [isCheckingGemini, setIsCheckingGemini] = useState(false);
    const [isAddingGemini, setIsAddingGemini] = useState(false);
    const [timeToReset, setTimeToReset] = useState('');
    const [selectedGeminiModel, setSelectedGeminiModel] = useState<string>(geminiClient.preferredModel);

    // Groq State
    const [groqKeys, setGroqKeys] = useState<string[]>([]);
    const [newGroqKey, setNewGroqKey] = useState('');
    const [activeGroqIndex, setActiveGroqIndex] = useState(0);
    const [isAddingGroq, setIsAddingGroq] = useState(false);
    const [groqStatus, setGroqStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [groqLatency, setGroqLatency] = useState<number | null>(null);
    const [selectedGroqModel, setSelectedGroqModel] = useState<string>(localStorage.getItem('groq_preferred_model') || "llama-3.2-11b-vision-preview");

    // Cohere State
    const [cohereKeys, setCohereKeys] = useState<string[]>([]);
    const [newCohereKey, setNewCohereKey] = useState('');
    const [activeCohereIndex, setActiveCohereIndex] = useState(0);
    const [showCohereKey, setShowCohereKey] = useState(false);
    const [isAddingCohere, setIsAddingCohere] = useState(false);
    const [cohereStatus, setCohereStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [cohereLatency, setCohereLatency] = useState<number | null>(null);
    const [selectedCohereModel, setSelectedCohereModel] = useState<string>(localStorage.getItem('cohere_preferred_model') || "command-r-plus");


    // Model Verification State
    const [geminiModelStatus, setGeminiModelStatus] = useState<'idle' | 'verifying' | 'available' | 'unavailable'>('idle');
    const [geminiError, setGeminiError] = useState<string>("");
    const [groqModelStatus, setGroqModelStatus] = useState<'idle' | 'verifying' | 'available' | 'unavailable'>('idle');
    const [cohereModelStatus, setCohereModelStatus] = useState<'idle' | 'verifying' | 'available' | 'unavailable'>('idle');

    useEffect(() => {
        refreshKeys();
        const timer = setInterval(updateResetCountdown, 1000);
        updateResetCountdown();
        return () => clearInterval(timer);
    }, []);

    // Verification Effects
    useEffect(() => {
        if (geminiKeys.length > 0) verifyGeminiModel();
    }, [selectedGeminiModel, geminiKeys.length]);

    useEffect(() => {
        if (groqKeys.length > 0) verifyGroqModel();
    }, [selectedGroqModel, groqKeys.length]);

    useEffect(() => {
        if (cohereKeys.length > 0) verifyCohereModel();
    }, [selectedCohereModel, cohereKeys.length]);

    const verifyGeminiModel = async () => {
        setGeminiModelStatus('verifying');
        setGeminiError("");
        // Check with the first available key or active key
        // For now, check with the first 3 keys to see if ANY support it
        const keysToCheck = geminiKeys.slice(0, 3);
        let isAvailable = false;
        let lastError = "";

        for (const key of keysToCheck) {
            const result = await geminiClient.verifyModel(key, selectedGeminiModel);
            if (result.valid) {
                isAvailable = true;
                break;
            } else {
                lastError = result.error || "Unknown error";
            }
        }
        setGeminiModelStatus(isAvailable ? 'available' : 'unavailable');
        if (!isAvailable) setGeminiError(lastError);
    };

    const verifyGroqModel = async () => {
        setGroqModelStatus('verifying');
        const keysToCheck = groqKeys.slice(0, 3);
        let isAvailable = false;

        for (const key of keysToCheck) {
            const result = await groqClient.verifyModel(key, selectedGroqModel);
            if (result.valid) {
                isAvailable = true;
                break;
            }
        }
        setGroqModelStatus(isAvailable ? 'available' : 'unavailable');
    };

    const verifyCohereModel = async () => {
        setCohereModelStatus('verifying');
        const keysToCheck = cohereKeys.slice(0, 3);
        let isAvailable = false;

        for (const key of keysToCheck) {
            const result = await cohereClient.verifyModel(key, selectedCohereModel);
            if (result.valid) {
                isAvailable = true;
                break;
            }
        }
        setCohereModelStatus(isAvailable ? 'available' : 'unavailable');
    };

    const refreshKeys = () => {
        // Gemini
        const currentGemini = geminiClient.loadApiKeys();
        setGeminiKeys(currentGemini);
        setActiveGeminiIndex(geminiClient.getServiceStatus().currentKeyIndex);
        setSelectedGeminiModel(localStorage.getItem('gemini_preferred_model') || "gemini-1.5-flash");

        // Groq
        const currentGroq = groqClient.loadApiKeys();
        setGroqKeys(currentGroq);
        setActiveGroqIndex(groqClient.currentKeyIndex || 0);
        setSelectedGroqModel(localStorage.getItem('groq_preferred_model') || "llama-3.2-11b-vision-preview");

        // Cohere
        const currentCohere = cohereClient.loadApiKeys();
        setCohereKeys(currentCohere);
        setActiveCohereIndex(cohereClient.currentKeyIndex || 0);
        setSelectedCohereModel(localStorage.getItem('cohere_preferred_model') || "command-r-plus");
    };

    const updateResetCountdown = () => {
        const now = new Date();
        const ptString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
        const ptDate = new Date(ptString);
        const target = new Date(ptDate);
        target.setHours(24, 0, 0, 0);
        const diffMs = target.getTime() - ptDate.getTime();

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
            const result = await geminiClient.validateKey(newGeminiKey.trim());

            if (result.valid) {
                const updated = [...geminiKeys, newGeminiKey.trim()];
                geminiClient.saveApiKeys(updated);
                setGeminiKeys(updated);
                setNewGeminiKey('');
                if (onKeysUpdated) onKeysUpdated();
                setGeminiStatuses({});
                toast.success(`Success! Key valid.`);
                refreshKeys(); // Update model if auto-detected
            } else {
                toast.error("Invalid Gemini API Key or Quota Exceeded.");
            }
        } catch (error) {
            toast.error("Error validating key.");
            console.error(error);
        } finally {
            setIsAddingGemini(false);
        }
    };

    const handleRemoveGeminiKey = (index: number) => {
        const updated = geminiKeys.filter((_, i) => i !== index);
        geminiClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
        setGeminiStatuses({});
    };

    const checkGeminiKeyStatus = async (key: string, index: number) => {
        setGeminiStatuses(prev => ({ ...prev, [index]: 'checking' }));
        const start = Date.now();
        const result = await geminiClient.validateKey(key);
        const latency = Date.now() - start;
        setGeminiLatency(prev => ({ ...prev, [index]: latency }));

        if (result.valid) {
            setGeminiStatuses(prev => ({ ...prev, [index]: 'valid' }));
        } else {
            //@ts-ignore - error property added to return type
            if (result.error === 'quota') {
                setGeminiStatuses(prev => ({ ...prev, [index]: 'quota' }));
            } else {
                setGeminiStatuses(prev => ({ ...prev, [index]: 'invalid' }));
            }
        }
    };

    const handleCheckAllGemini = async () => {
        setIsCheckingGemini(true);
        setGeminiStatuses({});
        setGeminiLatency({});
        const promises = geminiKeys.map((key, index) => checkGeminiKeyStatus(key, index));
        await Promise.all(promises);
        setIsCheckingGemini(false);
    };

    const handleGeminiModelChange = (model: string) => {
        geminiClient.setModel(model);
        setSelectedGeminiModel(model);
        toast.info(`Gemini model set to ${model}`);
    };

    // --- Groq Handlers ---
    const handleAddGroqKey = async () => {
        if (!newGroqKey.trim()) return;
        setIsAddingGroq(true);

        try {
            const result = await groqClient.validateKey(newGroqKey.trim());
            if (result.valid) {
                const updated = [...groqKeys, newGroqKey.trim()];
                groqClient.saveApiKeys(updated);
                setGroqKeys(updated);
                setNewGroqKey('');
                if (onKeysUpdated) onKeysUpdated();
                toast.success(`Groq Key Verified!`);
                refreshKeys();
            } else {
                toast.error("Invalid Groq API Key.");
            }
        } catch (e) {
            toast.error("Error validating Groq key.");
        } finally {
            setIsAddingGroq(false);
        }
    };

    const handleRemoveGroqKey = (index: number) => {
        const updated = groqKeys.filter((_, i) => i !== index);
        groqClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
    };

    const handleTestGroq = async () => {
        if (groqKeys.length === 0) return;
        setGroqStatus('checking');
        const start = Date.now();
        // Use current key
        const key = groqKeys[activeGroqIndex];
        const result = await groqClient.validateKey(key);
        const latency = Date.now() - start;
        setGroqLatency(latency);
        if (result.valid) {
            setGroqStatus('valid');
            toast.success(`Groq Connected (${latency}ms)`);
        } else {
            setGroqStatus('invalid');
            toast.error("Groq Connection Failed");
        }
    };

    const handleGroqModelChange = (model: string) => {
        groqClient.setModel(model);
        setSelectedGroqModel(model);
        toast.info(`Groq model set to ${model}`);
    };

    // --- Cohere Handlers ---
    const handleAddCohereKey = async () => {
        if (!newCohereKey.trim()) return;
        setIsAddingCohere(true);

        try {
            const result = await cohereClient.validateKey(newCohereKey.trim());
            if (result.valid) {
                const updated = [...cohereKeys, newCohereKey.trim()];
                cohereClient.saveApiKeys(updated);
                setCohereKeys(updated);
                setNewCohereKey('');
                if (onKeysUpdated) onKeysUpdated();
                toast.success(`Cohere Key Verified!`);
                refreshKeys();
            } else {
                toast.error("Invalid Cohere API Key.");
            }
        } catch (e) {
            toast.error("Error validating Cohere key.");
        } finally {
            setIsAddingCohere(false);
        }
    };

    const handleRemoveCohereKey = (index: number) => {
        const updated = cohereKeys.filter((_, i) => i !== index);
        cohereClient.saveApiKeys(updated);
        refreshKeys();
        if (onKeysUpdated) onKeysUpdated();
    };

    const handleTestCohere = async () => {
        if (cohereKeys.length === 0) return;
        setCohereStatus('checking');
        const start = Date.now();
        const key = cohereKeys[activeCohereIndex];
        const result = await cohereClient.validateKey(key);
        const latency = Date.now() - start;
        setCohereLatency(latency);
        if (result.valid) {
            setCohereStatus('valid');
            toast.success(`Cohere Connected (${latency}ms)`);
        } else {
            setCohereStatus('invalid');
            toast.error("Cohere Connection Failed");
        }
    };

    const handleCohereModelChange = (model: string) => {
        cohereClient.setModel(model);
        setSelectedCohereModel(model);
        toast.info(`Cohere model set to ${model}`);
    };

    // Helper for Status Badge
    const renderModelStatus = (status: 'idle' | 'verifying' | 'available' | 'unavailable', errorMsg?: string) => {
        if (status === 'idle') return null;
        if (status === 'verifying') return <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</span>;
        if (status === 'available') return <span className="text-[10px] text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Available</span>;
        if (status === 'unavailable') {
            return (
                <span title={errorMsg} className="text-[10px] text-destructive flex items-center gap-1 cursor-help underline decoration-dotted">
                    <XCircle className="w-3 h-3" /> Unavailable
                </span>
            );
        }
    };

    return (
        <Card className="min-h-[400px] shadow-lg border-border/50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl">API Keys & Models</CardTitle>
                    </div>
                </div>

                {/* Provider Tabs */}
                <div className="flex gap-2 mt-4 border-b border-border pb-1">
                    <Button
                        variant={activeTab === 'gemini' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('gemini')}
                        className={`gap-2 ${activeTab === 'gemini' ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                        <Cloud className="w-4 h-4" /> Gemini
                    </Button>
                    <Button
                        variant={activeTab === 'groq' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('groq')}
                        className={`gap-2 ${activeTab === 'groq' ? 'text-orange-500' : 'text-muted-foreground'}`}
                    >
                        <Zap className="w-4 h-4" /> Groq
                    </Button>
                    <Button
                        variant={activeTab === 'cohere' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('cohere')}
                        className={`gap-2 ${activeTab === 'cohere' ? 'text-teal-500' : 'text-muted-foreground'}`}
                    >
                        <Bot className="w-4 h-4" /> Cohere
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* --- GEMINI VIEW --- */}
                {activeTab === 'gemini' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Model Selector & Test */}
                        <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded-lg border border-border">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs">Active Model:</Label>
                                    <Select value={selectedGeminiModel} onValueChange={handleGeminiModelChange}>
                                        <SelectTrigger className="w-[200px] h-8 text-xs bg-background">
                                            <SelectValue placeholder="Select Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {geminiClient.getAvailableModels().map(m => (
                                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {geminiKeys.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCheckAllGemini}
                                        disabled={isCheckingGemini}
                                        className="h-7 text-xs gap-2"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${isCheckingGemini ? 'animate-spin' : ''}`} />
                                        {isCheckingGemini ? 'Testing...' : 'Test All Keys'}
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Model Status:</Label>
                                {renderModelStatus(geminiModelStatus, geminiError)}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Input
                                type="password"
                                value={newGeminiKey}
                                onChange={(e) => setNewGeminiKey(e.target.value)}
                                placeholder="Add Gemini API Key"
                                className="flex-1"
                            />
                            <Button
                                onClick={handleAddGeminiKey}
                                disabled={!newGeminiKey || isAddingGemini}
                                size="icon"
                            >
                                {isAddingGemini ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Get a free key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline">aistudio.google.com</a>.
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
                                            ? 'bg-primary/10 border-primary/30'
                                            : 'bg-muted/50 border-border'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <div className={`w-2 h-2 rounded-full ${index === activeGeminiIndex ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                            <div className="flex flex-col">
                                                <span className="text-foreground/80 font-mono text-xs truncate w-32">
                                                    {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                                </span>
                                                <div className="flex gap-2 items-center">
                                                    {index === activeGeminiIndex && (
                                                        <span className="text-[10px] text-primary">Active</span>
                                                    )}
                                                    {geminiLatency[index] && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> {geminiLatency[index]}ms
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {geminiStatuses[index] === 'valid' && <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 shadow-none border-green-500/20">Working</Badge>}
                                            {geminiStatuses[index] === 'invalid' && <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 shadow-none border-red-500/20">Error</Badge>}
                                            {geminiStatuses[index] === 'quota' && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 rounded">Limit Hit</span>
                                                    <span className="text-[10px] text-muted-foreground">{timeToReset}</span>
                                                </div>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveGeminiKey(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* --- GROQ VIEW --- */}
                {activeTab === 'groq' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Model Selector & Test */}
                        <div className="flex flex-col gap-2 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-orange-600 dark:text-orange-400">Groq Model:</Label>
                                    <Select value={selectedGroqModel} onValueChange={handleGroqModelChange}>
                                        <SelectTrigger className="w-[200px] h-8 text-xs bg-background border-orange-500/30 focus:ring-orange-500">
                                            <SelectValue placeholder="Select Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {groqClient.getAvailableModels().map(m => (
                                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {groqKeys.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestGroq}
                                        disabled={groqStatus === 'checking'}
                                        className="h-7 text-xs gap-2 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${groqStatus === 'checking' ? 'animate-spin' : ''}`} />
                                        {groqStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                )}
                            </div>
                            <div className="flex justify-start pl-20">
                                {renderModelStatus(groqModelStatus)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Groq API Keys</label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={newGroqKey}
                                    onChange={(e) => setNewGroqKey(e.target.value)}
                                    placeholder="Add Groq API Key (gsk_...)"
                                    className="flex-1 font-mono"
                                />
                                <Button
                                    onClick={handleAddGroqKey}
                                    disabled={!newGroqKey || isAddingGroq}
                                    size="icon"
                                    className="bg-orange-600 hover:bg-orange-500"
                                >
                                    {isAddingGroq ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Get a free key at <a href="https://console.groq.com/" target="_blank" className="text-orange-500 hover:underline">console.groq.com</a>.
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
                                            ? 'bg-orange-500/10 border-orange-500/30'
                                            : 'bg-muted/50 border-border'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <div className={`w-2 h-2 rounded-full ${index === activeGroqIndex ? 'bg-orange-500' : 'bg-muted-foreground'}`} />
                                            <div className="flex flex-col">
                                                <span className="text-foreground/80 font-mono text-xs truncate w-32">
                                                    {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {index === activeGroqIndex && (
                                                        <span className="text-[10px] text-orange-500">Active</span>
                                                    )}
                                                    {index === activeGroqIndex && groqLatency && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> {groqLatency}ms
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {index === activeGroqIndex && groqStatus === 'valid' && <Badge variant="outline" className="text-green-500 border-green-500/30">Connected</Badge>}
                                            {index === activeGroqIndex && groqStatus === 'invalid' && <Badge variant="destructive">Error</Badge>}

                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveGroqKey(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {groqKeys.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground italic py-2">No keys added. Please add at least one key.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* --- COHERE VIEW --- */}
                {activeTab === 'cohere' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Model Selector & Test */}
                        <div className="flex flex-col gap-2 bg-teal-500/10 p-3 rounded-lg border border-teal-500/20">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-xs text-teal-600 dark:text-teal-400">Cohere Model:</Label>
                                    <Select value={selectedCohereModel} onValueChange={handleCohereModelChange}>
                                        <SelectTrigger className="w-[200px] h-8 text-xs bg-background border-teal-500/30 focus:ring-teal-500">
                                            <SelectValue placeholder="Select Model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cohereClient.getAvailableModels().map(m => (
                                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {cohereKeys.length > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleTestCohere}
                                        disabled={cohereStatus === 'checking'}
                                        className="h-7 text-xs gap-2 border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${cohereStatus === 'checking' ? 'animate-spin' : ''}`} />
                                        {cohereStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                                    </Button>
                                )}
                            </div>
                            <div className="flex justify-start pl-20">
                                {renderModelStatus(cohereModelStatus)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Cohere API Keys</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showCohereKey ? "text" : "password"}
                                        value={newCohereKey}
                                        onChange={(e) => setNewCohereKey(e.target.value)}
                                        placeholder="Add Cohere API Key..."
                                        className="font-mono pr-10"
                                    />
                                    <button
                                        onClick={() => setShowCohereKey(!showCohereKey)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                                    >
                                        {showCohereKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <Button
                                    onClick={handleAddCohereKey}
                                    disabled={!newCohereKey || isAddingCohere}
                                    size="icon"
                                    className="bg-teal-600 hover:bg-teal-500"
                                >
                                    {isAddingCohere ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Get a key at <a href="https://dashboard.cohere.com/api-keys" target="_blank" className="text-teal-500 hover:underline">dashboard.cohere.com</a>.
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
                                            ? 'bg-teal-500/10 border-teal-500/30'
                                            : 'bg-muted/50 border-border'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                                            <div className={`w-2 h-2 rounded-full ${index === activeCohereIndex ? 'bg-teal-500' : 'bg-muted-foreground'}`} />
                                            <div className="flex flex-col">
                                                <span className="text-foreground/80 font-mono text-xs truncate w-32">
                                                    {key.substring(0, 8)}...{key.substring(key.length - 4)}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {index === activeCohereIndex && (
                                                        <span className="text-[10px] text-teal-500">Active</span>
                                                    )}
                                                    {index === activeCohereIndex && cohereLatency && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Zap className="w-3 h-3" /> {cohereLatency}ms
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {index === activeCohereIndex && cohereStatus === 'valid' && <Badge variant="outline" className="text-green-500 border-green-500/30">Connected</Badge>}
                                            {index === activeCohereIndex && cohereStatus === 'invalid' && <Badge variant="destructive">Error</Badge>}

                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveCohereKey(index)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {cohereKeys.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground italic py-2">No keys added. Please add at least one key.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default KeyManager;
