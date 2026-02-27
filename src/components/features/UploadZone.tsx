import { useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThreeDUpload from './ThreeDUpload';
import { AnalysisFile } from '@/types';

interface UploadZoneProps {
    files: AnalysisFile[];
    setFiles: React.Dispatch<React.SetStateAction<AnalysisFile[]>>;
}

const UploadZone: React.FC<UploadZoneProps> = ({ files, setFiles }) => {

    // Callback from ThreeDUpload
    const handleFilesFrom3D = useCallback((newFiles: AnalysisFile[]) => {
        setFiles(prev => [...prev, ...newFiles]);
    }, [setFiles]);

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="space-y-8">
            <div className="perspective-1000">
                <ThreeDUpload onFilesMap={handleFilesFrom3D} />
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                        {files.map((file, index) => (
                            <motion.div
                                key={file.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-primary-500 transition-colors"
                            >
                                <img
                                    src={file.preview}
                                    alt={`Upload ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="bg-red-500/80 hover:bg-red-600 p-2 rounded-full text-white transition-transform hover:scale-110"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white max-w-[90%] truncate">
                                    {file.file.name}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UploadZone;
