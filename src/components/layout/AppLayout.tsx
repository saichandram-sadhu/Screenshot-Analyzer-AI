import React from 'react';
import { motion } from 'framer-motion';
import ControlPanel from '../features/ControlPanel';
import FuturisticBackground from '../ui/FuturisticBackground';

interface AppLayoutProps {
    children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-background text-foreground bg-slate-950 overflow-x-hidden relative">
            <FuturisticBackground />

            {/* Main Content */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <ControlPanel />

                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex-1 container mx-auto px-4 py-8"
                >
                    {children}
                </motion.main>

                <footer className="py-6 border-t border-white/5 text-center text-sm text-muted-foreground">
                    <p>Screenshot Analyzer AI <span className="opacity-50 mx-2">|</span> v1.1.0</p>
                </footer>
            </div>
        </div>
    );
};

export default AppLayout;
