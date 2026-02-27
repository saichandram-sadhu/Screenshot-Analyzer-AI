import { Activity, Zap, StopCircle, Cpu, Thermometer, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceMetrics {
    tps?: number | string;
    totalTokens?: number;
    duration?: number;
    vram?: number;
    ram?: number;
    gpuPercent?: number;
}

interface PerformanceHUDProps {
    metrics: PerformanceMetrics | null;
    onStop: () => void;
    onUnload: () => void;
    isAnalyzing: boolean;
}

const PerformanceHUD = ({ metrics, onStop, onUnload, isAnalyzing }: PerformanceHUDProps) => {
    if (!metrics && !isAnalyzing) return null;

    const tps = typeof metrics?.tps === 'string' ? parseFloat(metrics.tps) : (metrics?.tps || 0);
    const totalTokens = metrics?.totalTokens || 0;

    // Simulate "Load" based on TPS. 
    // 0-5: Low, 5-20: Med, 20+: High (Simulated GPU Heat)
    const loadPercent = Math.min(Math.max((tps / 30) * 100, 5), 100);

    let loadColor = "text-emerald-400";
    let barColor = "bg-emerald-500";
    let statusText = "System Normal";

    if (tps > 10) {
        loadColor = "text-amber-400";
        barColor = "bg-amber-500";
        statusText = "Heavy Load";
    }
    if (tps > 25) {
        loadColor = "text-red-400";
        barColor = "bg-red-500";
        statusText = "Overheat / Max";
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl relative overflow-hidden"
        >
            {/* Background scanner effect */}
            {isAnalyzing && (
                <motion.div
                    animate={{ top: ['0%', '100%'], opacity: [0, 0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-primary-500/30 blur-sm pointer-events-none"
                />
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary-400 animate-pulse" />
                    <h3 className="text-white font-mono font-semibold">AI_CORE_MONITOR</h3>
                </div>
                {isAnalyzing && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] text-green-400 font-mono tracking-wider animate-pulse">
                        LIVE
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Speed Gauge */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 font-mono mb-1">SPEED</span>
                    <div className="text-2xl font-bold text-white font-mono flex items-baseline gap-1">
                        {isAnalyzing && tps === 0 ? (
                            <span className="text-lg animate-pulse text-yellow-400">Thinking...</span>
                        ) : (
                            <>
                                {tps}
                                <span className="text-xs text-slate-500 font-sans">T/s</span>
                            </>
                        )}
                    </div>
                    <Zap className={`w-4 h-4 mt-1 ${tps > 0 ? 'text-yellow-400 fill-current' : 'text-slate-600'}`} />
                </div>

                {/* Tokens Counter */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-500 font-mono mb-1">TOKENS</span>
                    <div className="text-2xl font-bold text-white font-mono">
                        {totalTokens}
                    </div>
                    <Cpu className="w-4 h-4 mt-1 text-slate-400" />
                </div>

                {/* Duration/Load/Memory */}
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex flex-col items-center justify-center relative group">
                    <span className={`text-xs font-mono mb-1 ${metrics?.vram && metrics.vram > 0 ? "text-purple-400" : "text-blue-400"}`}>
                        {metrics?.vram && metrics.vram > 0
                            ? `GPU VRAM ${metrics?.gpuPercent && metrics.gpuPercent < 100 ? `(${metrics.gpuPercent}%)` : ''}`
                            : "SYSTEM RAM"}
                    </span>
                    <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
                        {metrics?.vram && metrics.vram > 0
                            ? (metrics.vram / 1024 / 1024 / 1024).toFixed(1)
                            : metrics?.ram
                                ? (metrics.ram / 1024 / 1024 / 1024).toFixed(1)
                                : '0.0'
                        }
                        <span className="text-xs text-slate-500 font-sans">GB</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <Database className={`w-4 h-4 ${metrics?.vram && metrics.vram > 0 ? 'text-purple-400' : 'text-blue-500'}`} />
                        {metrics?.vram === 0 && (metrics?.ram || 0) > 0 && (
                            <span className="text-[10px] text-slate-500">(CPU Mode)</span>
                        )}

                        {/* Unload Button */}
                        {((metrics?.vram && metrics.vram > 0) || (metrics?.ram && metrics.ram > 0)) && !isAnalyzing && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onUnload(); }}
                                className="absolute -top-2 -right-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 hover:scale-100 shadow-lg border border-red-500/30"
                                title="Unload Model (Free Memory)"
                            >
                                <StopCircle className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Simulated Load Bar */}
            <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-500 flex items-center gap-1">
                        <Thermometer className="w-3 h-3" /> SYSTEM LOAD
                    </span>
                    <span className={loadColor}>{statusText}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full ${barColor} shadow-[0_0_10px_rgba(var(--tw-colors-primary-500),0.5)]`}
                        animate={{ width: `${loadPercent}%` }}
                        transition={{ type: "spring", stiffness: 50 }}
                    />
                </div>
            </div>

            {/* Stop Button */}
            {isAnalyzing && (
                <button
                    onClick={onStop}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/50 rounded-lg py-2 flex items-center justify-center gap-2 font-medium transition-all group"
                >
                    <StopCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    ABORT ANALYSIS
                </button>
            )}
        </motion.div>
    );
};

export default PerformanceHUD;
