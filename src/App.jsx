import React, { useState } from 'react';
import { Layers, Github, Settings, Moon, Sun } from 'lucide-react';
import KeyManager from './components/KeyManager';
import UploadZone from './components/UploadZone';
import Analyzer from './components/Analyzer';
import ResultEditor from './components/ResultEditor';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [files, setFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Shared State for Analyzer & ResultEditor
  const [analysisMode, setAnalysisMode] = useState('cloud'); // 'cloud' | 'groq' | 'local' | 'cohere'
  const [localModels, setLocalModels] = useState([]);
  const [selectedLocalModel, setSelectedLocalModel] = useState('');

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result);
  };

  const handleReset = () => {
    setFiles([]);
    setAnalysisResult('');
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text font-sans selection:bg-primary-500/30">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-primary-600 to-purple-600 p-2 rounded-lg">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Screenshot Analyzer
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-900/50 text-primary-400' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <a href="#" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar / Settings Area */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, width: 0, x: -20 }}
                animate={{ opacity: 1, width: 'auto', x: 0 }}
                exit={{ opacity: 0, width: 0, x: -20 }}
                className="lg:col-span-4 lg:block overflow-hidden"
              >
                <div className="space-y-6">
                  <KeyManager />

                  <div className="bg-dark-card p-6 rounded-xl border border-slate-700">
                    <h3 className="font-semibold text-white mb-2">About</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Upload screenshots to generate step-by-step documentation automatically using Google Gemini AI.
                      Handles multiple API keys for extended usage limits.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Workflow Area */}
          <div className={`${showSettings ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300`}>
            <div className="space-y-8">

              {!analysisResult ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <UploadZone files={files} setFiles={setFiles} />

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
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-[calc(100vh-12rem)]"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Results</h2>
                    <button
                      onClick={handleReset}
                      className="text-primary-400 hover:text-primary-300 text-sm font-medium hover:underline"
                    >
                      Start New Analysis
                    </button>
                  </div>
                  <ResultEditor
                    content={analysisResult}
                    images={files}
                    analysisMode={analysisMode}
                    selectedLocalModel={selectedLocalModel}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Developer Credit - Premium Floating Badge */}
      <div className="fixed bottom-5 right-5 z-50 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 pointer-events-auto hover:scale-105 transition-all duration-300 cursor-default group hover:shadow-primary-500/20 hover:border-primary-500/30">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75"></div>
          </div>
          <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
            Developed by <span className="bg-gradient-to-r from-primary-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-bold tracking-wide">Saichandram Sadhu</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
