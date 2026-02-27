import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, FileText, Trash2, Edit3, Image as ImageIcon, ChevronDown, Type, Plus, FileType, Settings, Wand2, Loader2, Globe } from 'lucide-react';
import { exportToPDF, exportToWord, exportToHTML } from '../../utils/export';
import { geminiClient } from '../../utils/gemini';
import { groqClient } from '../../utils/groq';
import { cohereClient } from '../../utils/cohere';
import { localClient } from '../../utils/localLLM';
import { analyzeFile } from '../../utils/sharedAnalysis';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AppSettings, AnalysisFile } from '@/types';

interface Step {
    id: string;
    title: string;
    text: string;
    preview?: string;
}

interface ExportConfig {
    headerText: string;
    footerText: string;
    brandingText: string;
    showPageNumbers: boolean;
    logoBase64: string | null;
    theme: "blue" | "purple" | "minimal";
    fontFamily: "Inter" | "Times" | "Courier" | string;
    headerColor: string;
}

interface ResultEditorProps {
    content: Step[] | string;
    images?: AnalysisFile[]; // Not directly used but might be needed
    analysisMode: 'cloud' | 'local' | 'groq' | 'cohere';
    selectedLocalModel: string;
    settings?: AppSettings;
}

const ResultEditor: React.FC<ResultEditorProps> = ({ content, analysisMode, selectedLocalModel, settings }) => {
    const [steps, setSteps] = useState<Step[]>([]);
    const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({});
    const [docTitle, setDocTitle] = useState("Screenshot Analysis Report");

    const [showExportOptions, setShowExportOptions] = useState(false);
    const [exportConfig, setExportConfig] = useState<ExportConfig>({
        headerText: "",
        footerText: settings?.exportInfo?.footerText || "Screenshot Analyzer",
        brandingText: "Developed by Saichandram Sadhu",
        showPageNumbers: true,
        logoBase64: settings?.exportInfo?.logoUrl || null,
        theme: "blue",
        fontFamily: settings?.exportInfo?.fontFamily || 'Inter',
        headerColor: settings?.exportInfo?.headerColor || '#3b82f6'
    });

    useEffect(() => {
        if (settings?.exportInfo) {
            setExportConfig(prev => ({
                ...prev,
                footerText: settings.exportInfo.footerText,
                logoBase64: settings.exportInfo.logoUrl,
                headerColor: settings.exportInfo.headerColor,
                fontFamily: settings.exportInfo.fontFamily
            }));
        }
    }, [settings]);

    useEffect(() => {
        if (Array.isArray(content)) {
            // Ensure preview is string | undefined
            const sanitizedContent = content.map(s => ({
                ...s,
                preview: s.preview === null ? undefined : s.preview
            }));
            setSteps(sanitizedContent);
            const initialExpanded: { [key: string]: boolean } = {};
            content.forEach(s => initialExpanded[s.id] = true);
            setExpandedSteps(initialExpanded);
        } else if (typeof content === 'string') {
            setSteps([{ id: 'legacy', title: 'Analysis Result', text: content, preview: undefined }]);
            setExpandedSteps({ 'legacy': true });
        }
    }, [content]);

    useEffect(() => {
        setExportConfig(prev => ({ ...prev, headerText: docTitle }));
    }, [docTitle]);

    const handleTextChange = (id: string, newText: string) => {
        setSteps(steps.map(step => step.id === id ? { ...step, text: newText } : step));
    };

    const handleTitleChange = (id: string, newTitle: string) => {
        setSteps(steps.map(step => step.id === id ? { ...step, title: newTitle } : step));
    };

    const handleDeleteStep = (id: string) => {
        setSteps(steps.filter(step => step.id !== id));
    };

    const handleAddStep = () => {
        const newId = Date.now().toString();
        const newStep: Step = {
            id: newId,
            title: "New Action Step",
            text: "Description of the step...",
            preview: undefined
        };
        setSteps([...steps, newStep]);
        setExpandedSteps(prev => ({ ...prev, [newId]: true }));
    };

    const toggleExpand = (id: string) => {
        setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const [polishingSteps, setPolishingSteps] = useState<{ [key: string]: boolean }>({});
    const [isAppending, setIsAppending] = useState(false);

    const handleAppendImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsAppending(true);
        const newSteps: any[] = [];

        const fileObjs: AnalysisFile[] = files.map((file, index) => ({
            id: `append-${Date.now()}-${index}`,
            file,
            preview: URL.createObjectURL(file)
        }));

        for (const fileObj of fileObjs) {
            try {
                const result = await analyzeFile(
                    fileObj,
                    analysisMode,
                    selectedLocalModel,
                    (msg) => console.log(msg),
                    undefined,
                    undefined,
                    undefined,
                    settings?.prompts
                );
                newSteps.push(result);
            } catch (error: any) {
                console.error("Append analysis failed", error);
                toast.error(`Failed to analyze ${fileObj.file.name}: ${error.message}`);
            }
        }

        setSteps(prev => [...prev, ...newSteps]);
        setIsAppending(false);
        e.target.value = '';
    };

    const handlePolishStep = async (id: string, currentText: string, currentTitle: string) => {
        setPolishingSteps(prev => ({ ...prev, [id]: true }));
        try {
            const customInstruct = settings?.prompts?.polishPrompt || "Rewrite the following text to be professional, concise, and grammatically correct.";

            const prompt = `You are a professional technical editor.
            Instruction: ${customInstruct}
            
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
            toast.error("Could not check grammar (Internet/Key issue).");
        } finally {
            setPolishingSteps(prev => ({ ...prev, [id]: false }));
        }
    };

    const handleExport = async (type: 'pdf' | 'html' | 'word') => {
        try {
            console.log(`Exporting to ${type}...`, exportConfig);
            const options = {
                ...exportConfig,
                headerText: exportConfig.headerText || docTitle
            };

            if (type === 'pdf') {
                await exportToPDF(steps, docTitle, options as any);
            } else if (type === 'html') {
                await exportToHTML(steps, docTitle, options as any);
            } else {
                await exportToWord(steps, docTitle, options as any);
            }
        } catch (error) {
            console.error(`Export to ${type} failed:`, error);
            toast.error(`Export failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900/40 rounded-3xl border border-slate-700/50 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-white/10 relative">

            {/* Sticky Header */}
            <div className="px-6 py-5 border-b border-border bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-inner">
                            <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-0.5">Document Title</Label>
                            <Input
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                className="bg-transparent border-none text-xl font-bold text-foreground w-full focus-visible:ring-0 p-0 h-auto placeholder:text-muted-foreground truncate shadow-none"
                                placeholder="Enter Report Title..."
                                aria-label="Document Title"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowExportOptions(!showExportOptions)}
                            className={showExportOptions ? 'bg-primary/20 border-primary/50 text-primary' : ''}
                            title="Export Settings"
                            aria-label="Export Settings"
                        >
                            <Settings className="w-5 h-5" />
                        </Button>
                        <Button
                            onClick={() => handleExport('pdf')}
                            className="bg-red-600 hover:bg-red-500 text-white gap-2 shadow-lg shadow-red-900/20"
                            aria-label="Export as PDF"
                        >
                            <Download className="w-4 h-4" /> PDF
                        </Button>
                        <Button
                            onClick={() => handleExport('word')}
                            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shadow-lg shadow-blue-900/20"
                            aria-label="Export as Word"
                        >
                            <FileType className="w-4 h-4" /> Word
                        </Button>
                        <Button
                            onClick={() => handleExport('html')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-900/20"
                            aria-label="Export as HTML"
                        >
                            <Globe className="w-4 h-4" /> Web
                        </Button>

                        {/* Mobile Share Button */}
                        <Button
                            onClick={async () => {
                                try {
                                    const { Share } = await import('@capacitor/share');
                                    await Share.share({
                                        title: docTitle,
                                        text: `Check out this analysis: ${docTitle}`,
                                        dialogTitle: 'Share Analysis',
                                    });
                                } catch (err) {
                                    toast.error("Sharing failed or not supported on this device.");
                                    console.error(err);
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-lg shadow-indigo-900/20 hidden md:hidden lg:hidden xl:hidden [.capacitor-platform-ios_&]:flex [.capacitor-platform-android_&]:flex"
                            aria-label="Share"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                            Share
                        </Button>
                    </div>
                </div>

                {/* Export Options Panel */}
                <AnimatePresence>
                    {showExportOptions && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-border pt-4 mt-4"
                        >
                            <Card className="bg-slate-950/30 border-slate-800">
                                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Header Text (Word)</Label>
                                        <Input
                                            value={exportConfig.headerText}
                                            onChange={(e) => setExportConfig({ ...exportConfig, headerText: e.target.value })}
                                            className="bg-slate-900 border-slate-700"
                                            placeholder="Same as Title"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Color Theme</Label>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'blue', color: 'bg-blue-500', label: "Blue" },
                                                { id: 'purple', color: 'bg-purple-500', label: "Purple" },
                                                { id: 'minimal', color: 'bg-slate-800', label: "Minimal" },
                                            ].map(t => (
                                                <Button
                                                    key={t.id}
                                                    variant="outline"
                                                    onClick={() => setExportConfig({ ...exportConfig, theme: t.id as any })}
                                                    className={`flex-1 gap-2 ${exportConfig.theme === t.id ? 'border-primary ring-1 ring-primary bg-slate-800' : 'bg-slate-900 border-slate-700'}`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                                                    <span className="text-xs font-medium">{t.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Footer Branding (Left)</Label>
                                        <Input
                                            value={exportConfig.footerText}
                                            onChange={(e) => setExportConfig({ ...exportConfig, footerText: e.target.value })}
                                            className="bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Cover Page Credit (Center)</Label>
                                        <Input
                                            value={exportConfig.brandingText}
                                            onChange={(e) => setExportConfig({ ...exportConfig, brandingText: e.target.value })}
                                            className="bg-slate-900 border-slate-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Company Logo (Optional)</Label>
                                        <div className="flex items-center gap-3">
                                            {exportConfig.logoBase64 && (
                                                <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-700">
                                                    <img src={exportConfig.logoBase64} alt="Logo" className="max-w-full max-h-full object-contain" />
                                                </div>
                                            )}
                                            <Label className="flex-1 cursor-pointer">
                                                <div className="w-full bg-slate-900 border border-slate-700 border-dashed rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span>{exportConfig.logoBase64 ? "Change Logo" : "Upload Logo"}</span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => {
                                                                if (reader.result) {
                                                                    setExportConfig({ ...exportConfig, logoBase64: reader.result as string });
                                                                }
                                                            };
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                            </Label>
                                        </div>
                                    </div>
                                    <div className="flex items-end pb-2 md:col-span-2 justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={exportConfig.showPageNumbers}
                                                onChange={(e) => setExportConfig({ ...exportConfig, showPageNumbers: e.target.checked })}
                                                className="form-checkbox bg-slate-800 border-slate-600 rounded text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm">Show Page Numbers</span>
                                        </label>
                                        {exportConfig.logoBase64 && (
                                            <Button
                                                variant="link"
                                                size="sm"
                                                onClick={() => setExportConfig({ ...exportConfig, logoBase64: null })}
                                                className="text-destructive hover:text-destructive/80"
                                            >
                                                Remove Logo
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 space-y-5 scroll-smooth custom-scrollbar bg-slate-950/20">
                {steps.length === 0 && !isAppending ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-medium text-lg">No content to display.</p>
                        <p className="text-sm opacity-60">Upload screenshots to start.</p>
                        <Button
                            onClick={handleAddStep}
                            variant="secondary"
                            className="mt-6"
                        >
                            Add Manual Step
                        </Button>
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
                                className="bg-card rounded-2xl border border-border/50 hover:border-border transition-colors overflow-hidden group shadow-lg hover:shadow-xl ring-1 ring-white/5"
                            >
                                {/* Step Header */}
                                <div
                                    className={`px-6 py-5 flex items-center justify-between cursor-pointer select-none transition-colors ${expandedSteps[step.id] ? 'bg-muted/60' : 'bg-muted/30 hover:bg-muted/50'}`}
                                    onClick={() => toggleExpand(step.id)}
                                    role="button"
                                    aria-expanded={expandedSteps[step.id]}
                                    aria-controls={`step-content-${step.id}`}
                                >
                                    <div className="flex items-center gap-5 flex-1 overflow-hidden">
                                        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 shadow-inner group-hover:border-primary/40 transition-colors">
                                            <span className="text-primary font-bold text-base">{index + 1}</span>
                                        </div>
                                        <h3 className="text-base font-semibold text-foreground truncate pr-4">
                                            {step.title || `Step ${index + 1} Action`}
                                        </h3>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                                            title="Delete step"
                                            aria-label="Delete step"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <div className={`p-2 text-muted-foreground transition-transform duration-300 ${expandedSteps[step.id] ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Step Content */}
                                <AnimatePresence>
                                    {expandedSteps[step.id] && (
                                        <motion.div
                                            id={`step-content-${step.id}`}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-border/50 bg-background/20"
                                        >
                                            <div className="p-6 flex flex-col gap-8">
                                                {/* Title Editor */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pl-1">
                                                        <Type className="w-3 h-3" /> Step Title
                                                        {settings?.outputFormat && (
                                                            <span className="ml-2 px-1.5 py-0.5 rounded bg-primary/10 text-[10px] border border-primary/20">
                                                                {settings.outputFormat}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Input
                                                        value={step.title || ""}
                                                        onChange={(e) => handleTitleChange(step.id, e.target.value)}
                                                        className="w-full bg-slate-950/50 text-lg font-semibold h-auto p-4 border-slate-700/50 shadow-inner"
                                                        placeholder="e.g., Navigate to Settings"
                                                        aria-label="Step Title"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                                                    {/* Text Editor */}
                                                    <div className="space-y-3 h-full flex flex-col order-2 lg:order-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pl-1">
                                                                <Edit3 className="w-3 h-3" /> Description
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handlePolishStep(step.id, step.text, step.title)}
                                                                disabled={polishingSteps[step.id] || !step.text}
                                                                className="h-6 text-[10px] font-bold gap-1.5 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                                                                title="AI Professional Rewrite"
                                                                aria-label="AI Polish"
                                                            >
                                                                {polishingSteps[step.id] ? (
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <Wand2 className="w-3 h-3" />
                                                                )}
                                                                {polishingSteps[step.id] ? "Polishing..." : "AI Polish"}
                                                            </Button>
                                                        </div>
                                                        <Textarea
                                                            value={step.text}
                                                            onChange={(e) => handleTextChange(step.id, e.target.value)}
                                                            className={`flex-1 bg-slate-950/50 text-sm leading-relaxed resize-none min-h-[180px] shadow-inner border-slate-700/50 ${settings?.outputFormat === 'json' ? 'font-mono' : 'font-sans'}`}
                                                            spellCheck={false}
                                                            placeholder="Describe this step in detail..."
                                                            aria-label="Step Description"
                                                        />
                                                    </div>

                                                    {/* Image Preview */}
                                                    <div className="space-y-3 order-1 lg:order-2">
                                                        <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest pl-1">
                                                            <ImageIcon className="w-3 h-3" /> Screenshot
                                                        </div>
                                                        {step.preview ? (
                                                            <div className="relative group/image rounded-xl overflow-hidden bg-slate-950 border border-border/50 aspect-video flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-[1.01]">
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
                                                            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 aspect-video flex flex-col items-center justify-center text-muted-foreground gap-2">
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

                {isAppending && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-2xl border border-border/50 p-6 space-y-4"
                    >
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-40 w-full rounded-lg" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="aspect-video w-full rounded-lg" />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 pb-2">
                    <Button
                        onClick={handleAddStep}
                        className="gap-2 rounded-full shadow-lg"
                        variant="secondary"
                    >
                        <Plus className="w-4 h-4" /> Add Manual Step
                    </Button>

                    <div className="relative">
                        <Input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleAppendImages}
                            className="hidden"
                            id="append-upload"
                            disabled={isAppending}
                        />
                        <Label
                            htmlFor="append-upload"
                            className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-900/40 to-blue-900/40 hover:from-purple-900/60 hover:to-blue-900/60 border border-purple-500/30 text-purple-200 rounded-full text-sm font-medium transition-all hover:scale-105 shadow-lg cursor-pointer ${isAppending ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            {isAppending ? (
                                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                            ) : (
                                <ImageIcon className="w-4 h-4 text-purple-400" />
                            )}
                            <span>{isAppending ? 'Analyzing...' : 'Analyze More Images'}</span>
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultEditor;
