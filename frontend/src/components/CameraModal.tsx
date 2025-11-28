import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    cameraStream: MediaStream | null;
    onCapture: (blob: Blob) => void;
}

export default function CameraModal({
    isOpen,
    onClose,
    cameraStream: initialStream,
    onCapture
}: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(initialStream);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    useEffect(() => {
        setStream(initialStream);
    }, [initialStream]);

    useEffect(() => {
        if (isOpen && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isOpen, stream]);

    useEffect(() => {
        // Check for multiple video inputs
        navigator.mediaDevices.enumerateDevices().then(devices => {
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setHasMultipleCameras(videoDevices.length > 1);
        });
    }, []);

    const switchCamera = async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode }
            });
            setStream(newStream);
        } catch (err) {
            console.error("Error switching camera:", err);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        onCapture(blob);
                    }
                }, 'image/jpeg');
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-panel w-full max-w-2xl p-6 rounded-2xl flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-cinzel text-primary-glow">Take Photo</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {hasMultipleCameras && (
                                <button
                                    onClick={switchCamera}
                                    className="absolute top-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors backdrop-blur-sm"
                                >
                                    <SwitchCamera size={24} />
                                </button>
                            )}
                        </div>

                        <div className="flex justify-center gap-4">
                            <button
                                onClick={handleCapture}
                                className="px-8 py-3 bg-primary hover:bg-primary-glow text-black font-bold rounded-full transition-all flex items-center gap-2"
                            >
                                <Camera size={20} />
                                Capture
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
