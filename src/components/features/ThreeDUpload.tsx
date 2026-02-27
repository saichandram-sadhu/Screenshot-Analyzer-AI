import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { UploadCloud, FileImage, Sparkles } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { AnalysisFile } from '@/types';

interface ThreeDUploadProps {
    onFilesMap: (files: AnalysisFile[]) => void;
}

const ThreeDUpload: React.FC<ThreeDUploadProps> = ({ onFilesMap }) => {
    const ROTATION_RANGE = 20; // Degrees
    const HALF_ROTATION_RANGE = ROTATION_RANGE / 2;

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xSpring = useSpring(x);
    const ySpring = useSpring(y);

    const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        const mouseX = (e.clientX - rect.left) * ROTATION_RANGE / width - HALF_ROTATION_RANGE;
        const mouseY = (e.clientY - rect.top) * ROTATION_RANGE / height - HALF_ROTATION_RANGE;

        const rX = mouseY * -1;
        const rY = mouseX;

        x.set(rX);
        y.set(rY);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const ref = useRef<HTMLDivElement>(null);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'image/*': [] },
        onDrop: (acceptedFiles) => {
            const newFiles = acceptedFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                id: Math.random().toString(36).substring(7),
                status: 'pending' as const
            }));
            onFilesMap(newFiles);
        }
    });

    const handleCameraCapture = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent dropzone trigger
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera
            });

            if (image.webPath) {
                const response = await fetch(image.webPath);
                const blob = await response.blob();
                const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });

                const newFile = {
                    file,
                    preview: image.webPath,
                    id: Math.random().toString(36).substring(7),
                    status: 'pending' as const
                };
                onFilesMap([newFile]);
            }
        } catch (error) {
            console.error('Camera error:', error);
        }
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transformStyle: "preserve-3d",
                transform,
            }}
            className="relative w-full h-80 perspective-1000"
        >
            <div
                {...getRootProps()}
                className={`w-full h-full rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group backdrop-blur-md overflow-hidden relative
                ${isDragActive ? 'border-primary bg-primary/20' : 'border-white/10 bg-card/30 hover:bg-card/40 hover:border-primary/50'}
                `}
                style={{
                    transform: "translateZ(50px)",
                }}
            >
                <input {...getInputProps()} />

                {/* Animated Background Grid */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* Floating Elements with Parallax */}
                <motion.div
                    className="z-10 bg-black/40 p-6 rounded-full border border-white/10 shadow-xl backdrop-blur-xl mb-6 relative group-hover:scale-110 transition-transform duration-500"
                    style={{ transform: "translateZ(30px)" }}
                >
                    <UploadCloud className={`w-12 h-12 ${isDragActive ? 'text-primary animate-bounce' : 'text-slate-200'}`} />
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>

                <div
                    className="z-10 text-center space-y-4"
                    style={{ transform: "translateZ(20px)" }}
                >
                    <div>
                        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            {isDragActive ? "Drop files now!" : "Upload Screenshots"}
                        </h3>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto px-4 mt-2">
                            Drag & drop images here, or click to browse.
                        </p>
                    </div>

                    {/* Camera Button for Mobile */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleCameraCapture}
                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg text-primary text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto z-50 relative"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                            Take Photo
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 opacity-60">
                        Supports PNG, JPG, WEBP • Max 10MB
                    </p>
                </div>

                {/* Deco Icons */}
                <motion.div
                    className="absolute top-10 left-10 text-primary/20"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transform: "translateZ(10px)" }}
                >
                    <FileImage className="w-8 h-8" />
                </motion.div>

                <motion.div
                    className="absolute bottom-10 right-10 text-accent/20"
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    style={{ transform: "translateZ(40px)" }}
                >
                    <Sparkles className="w-6 h-6" />
                </motion.div>
            </div>
        </motion.div>
    );
};

export default ThreeDUpload;
