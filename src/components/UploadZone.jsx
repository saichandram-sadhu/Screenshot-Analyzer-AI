import React, { useCallback } from 'react';
import { UploadCloud, X, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UploadZone = ({ files, setFiles }) => {
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleFiles(droppedFiles);
    }, [files]);

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        handleFiles(selectedFiles);
    };

    const handleFiles = (newFiles) => {
        const newFileObjects = newFiles.map(file => ({
            file,
            id: Math.random().toString(36).substr(2, 9),
            preview: URL.createObjectURL(file),
            status: 'pending' // pending, analyzing, completed, error
        }));
        setFiles(prev => [...prev, ...newFileObjects]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    return (
        <div className="space-y-6">
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center hover:border-primary-500 hover:bg-slate-800/50 transition-all cursor-pointer group"
            >
                <input
                    type="file"
                    id="fileInput"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInput}
                />
                <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
                    <div className="bg-slate-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                        <UploadCloud className="w-10 h-10 text-primary-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Upload Screenshots</h3>
                    <p className="text-slate-400 mb-4">Drag & drop or click to browse</p>
                    <p className="text-sm text-slate-500">Supports PNG, JPG, WEBP</p>
                </label>
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
