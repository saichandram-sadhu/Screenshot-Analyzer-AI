import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../store/settingsStore';
import { SlidersHorizontal, Layout, Type, Palette, MonitorPlay, FileJson, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ControlPanel: React.FC = () => {
    const settings = useSettingsStore();
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="w-full relative z-20">
            {/* Header / Toggle */}
            <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-lg border-b border-border/50 sticky top-0">
                <div className="flex items-center gap-3">
                    <SlidersHorizontal className="w-5 h-5 text-primary animate-pulse-glow" />
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Analysis Control Deck
                    </h2>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(!isOpen)}
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300 gap-2"
                    >
                        {isOpen ? 'Close Controls' : 'Customize Output'}
                        <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Layout className="w-4 h-4" />
                        </motion.div>
                    </Button>
                </motion.div>
            </div>

            {/* Expandable Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-card/50 border-b border-border/50 backdrop-blur-xl"
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">

                            {/* Column 1: Core Strategy */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-primary font-medium mb-2">
                                    <MonitorPlay className="w-4 h-4" />
                                    <h3>Strategy Strategy</h3>
                                </div>

                                <div className="space-y-2">
                                    <Label>Tone Profile</Label>
                                    <Select value={settings.analysisTone} onValueChange={(v: any) => settings.setTone(v)}>
                                        <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/50">
                                            <SelectValue placeholder="Select tone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="analytical">Analytical (Balanced)</SelectItem>
                                            <SelectItem value="technical">Technical (Deep Dive)</SelectItem>
                                            <SelectItem value="executive">Executive (High Level)</SelectItem>
                                            <SelectItem value="casual">Casual (Friendly)</SelectItem>
                                            <SelectItem value="formal">Formal (Report Ready)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Output Style</Label>
                                    <Select value={settings.analysisStyle} onValueChange={(v: any) => settings.setStyle(v)}>
                                        <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/50">
                                            <SelectValue placeholder="Select style" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="step-by-step">Step-by-Step Guide</SelectItem>
                                            <SelectItem value="breakdown">Component Breakdown</SelectItem>
                                            <SelectItem value="developer">Developer Audit</SelectItem>
                                            <SelectItem value="ux-critique">UX Critique</SelectItem>
                                            <SelectItem value="audit">Security/Compliance Audit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Column 2: Depth & Format */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-accent font-medium mb-2">
                                    <Palette className="w-4 h-4" />
                                    <h3>Format & Depth</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <Label>Analysis Depth</Label>
                                        <span className="text-xs text-muted-foreground uppercase">{settings.analysisDepth}</span>
                                    </div>
                                    <Slider
                                        defaultValue={[50]}
                                        max={100}
                                        step={25}
                                        value={settings.analysisDepth === 'basic' ? [0] : settings.analysisDepth === 'medium' ? [33] : settings.analysisDepth === 'deep' ? [66] : [100]}
                                        onValueChange={(val: number[]) => {
                                            const v = val[0];
                                            if (v < 25) settings.setDepth('basic');
                                            else if (v < 50) settings.setDepth('medium');
                                            else if (v < 75) settings.setDepth('deep');
                                            else settings.setDepth('ultra');
                                        }}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Output Format</Label>
                                    <Tabs value={settings.outputFormat} onValueChange={(v: any) => settings.setFormat(v)} className="w-full">
                                        <TabsList className="w-full grid grid-cols-3 bg-secondary/50">
                                            <TabsTrigger value="markdown" className="text-xs"><AlignLeft className="w-3 h-3 mr-1" /> MD</TabsTrigger>
                                            <TabsTrigger value="ui-blocks" className="text-xs"><Layout className="w-3 h-3 mr-1" /> UI</TabsTrigger>
                                            <TabsTrigger value="json" className="text-xs"><FileJson className="w-3 h-3 mr-1" /> JSON</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </div>

                            {/* Column 3: Custom Instructions */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
                                    <Type className="w-4 h-4" />
                                    <h3>Direct Override</h3>
                                </div>

                                <div className="space-y-2">
                                    <Label>Custom Prompt Instructions</Label>
                                    <Textarea
                                        placeholder="E.g. Focus specifically on the color usage and contrast ratios..."
                                        className="h-32 resize-none bg-background/50 border-white/10 focus:border-green-500/50 transition-colors"
                                        value={settings.customInstructions}
                                        onChange={(e) => settings.setInstructions(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">This will be appended to the system prompt.</p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ControlPanel;
