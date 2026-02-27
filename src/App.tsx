import { useState, useEffect } from 'react';
import { Settings, Key } from 'lucide-react';
import KeyManager from './components/features/KeyManager';
import UploadZone from './components/features/UploadZone';
import Analyzer from './components/features/Analyzer';
import ResultEditor from './components/features/ResultEditor';
import SettingsModal from './components/features/SettingsModal';
import AppLayout from './components/layout/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnalysisFile } from '@/types';
import { useSettingsStore } from './store/settingsStore';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function App() {
  const [files, setFiles] = useState<AnalysisFile[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Handle Hardware Back Button (Android)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (showSidebar) {
          setShowSidebar(false);
        } else if (showSettingsModal) {
          setShowSettingsModal(false);
        } else if (analysisResult) {
          setAnalysisResult(''); // Go back to upload
        } else if (!canGoBack) {
          CapacitorApp.exitApp();
        }
      });
    }
  }, [showSidebar, showSettingsModal, analysisResult]);

  // Use Global Settings Store
  const settings = useSettingsStore();

  // Shared State for Analyzer & ResultEditor
  const [analysisMode, setAnalysisMode] = useState<'cloud' | 'local' | 'groq' | 'cohere'>('cloud');
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [selectedLocalModel, setSelectedLocalModel] = useState<string>('');

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
  };

  const handleReset = () => {
    setFiles([]);
    setAnalysisResult('');
  };

  return (
    <AppLayout>
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 relative ${Capacitor.isNativePlatform() ? 'pt-safe-top pb-safe-bottom px-safe-left px-safe-right' : ''}`}>

        {/* Sidebar / API Key Manager Area */}
        <AnimatePresence mode="wait">
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: -20 }}
              animate={{ opacity: 1, width: 'auto', x: 0 }}
              exit={{ opacity: 0, width: 0, x: -20 }}
              className="lg:col-span-4 lg:block overflow-hidden"
            >
              <div className="space-y-6">
                <KeyManager onKeysUpdated={() => { }} />

                <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-sm">
                  <h3 className="font-semibold text-foreground mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upload screenshots to generate step-by-step documentation automatically using AI.
                    <br /><br />
                    Customize style, tone, and format in the <b>Control Deck</b> above.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workflow Area */}
        <div className={`${showSidebar ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300`}>

          {/* Top Bar with Toggles */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className={showSidebar ? 'bg-primary/10 text-primary' : ''}
              >
                <Key className="w-4 h-4 mr-2" />
                {showSidebar ? 'Hide Keys' : 'Manage Keys'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsModal(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Global Preferences
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {!analysisResult ? (
                <motion.div
                  key="upload-view"
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div className="perspective-1000">
                    <UploadZone files={files} setFiles={setFiles} />
                  </div>

                  <Analyzer
                    files={files}
                    setFiles={setFiles}
                    onAnalysisComplete={handleAnalysisComplete}
                    analysisMode={analysisMode}
                    setAnalysisMode={setAnalysisMode}
                    localModels={localModels}
                    setLocalModels={setLocalModels}
                    selectedLocalModel={selectedLocalModel}
                    setSelectedLocalModel={setSelectedLocalModel}
                    settings={settings} // Pass store state (compatible with interface)
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="result-view"
                  initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="min-h-[calc(100vh-12rem)]"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                      Analysis Results
                    </h2>
                    <Button variant="link" onClick={handleReset} className="text-primary hover:text-primary/80">
                      Start New Analysis
                    </Button>
                  </div>
                  <ResultEditor
                    content={analysisResult}
                    images={files}
                    analysisMode={analysisMode}
                    selectedLocalModel={selectedLocalModel}
                    settings={settings}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Legacy Settings Modal (Keep for Exports/Prompts) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSave={() => { }} // Store handles saving automatically
      />
    </AppLayout>
  );
}

export default App;
