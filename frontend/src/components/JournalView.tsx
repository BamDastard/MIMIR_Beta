import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import FloatingRunes from './FloatingRunes';

type JournalViewProps = {
    isOpen: boolean;
    date: string;
    apiBaseUrl: string;
    fetcher: (url: string, options?: any) => Promise<Response>;
    onClose: () => void;
    onOpenCooking: (recipe: any) => void;
};

type JournalData = {
    date: string;
    user_id: string;
    summary: string;
    stats: {
        user_messages: number;
        total_tool_calls: number;
        tool_counts: Record<string, number>;
        tool_errors: number;
    };
    recipe: any | null;
};

export default function JournalView({ isOpen, date, apiBaseUrl, fetcher, onClose, onOpenCooking }: JournalViewProps) {
    const [data, setData] = useState<JournalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchJournal = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetcher(`${apiBaseUrl}/journal/${date}`);
                const json = await res.json();

                if (json.error) {
                    setError(json.error);
                } else {
                    setData(json);
                }
            } catch (e) {
                setError("Failed to load journal entry.");
            } finally {
                setLoading(false);
            }
        };

        fetchJournal();
    }, [isOpen, date, apiBaseUrl, fetcher]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
                >
                    {/* Pensieve Animation Background */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {/* Swirling mist/liquid effect */}
                        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-black/60 to-black animate-pulse-slow" />

                        {/* SVG Filter for Liquid Distortion */}
                        <svg className="absolute w-0 h-0">
                            <filter id="liquid-filter">
                                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
                                <feDisplacementMap in="SourceGraphic" in2="noise" scale="20" />
                            </filter>
                        </svg>

                        {/* Floating Runes - Reused Component */}
                        <FloatingRunes count={40} opacity={1} color="text-primary-glow" className="animate-spin-slow" />

                        {/* Deep Liquid Layer */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 pointer-events-none" />
                    </div>

                    {/* Content Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, filter: "blur(10px)" }}
                        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative w-full max-w-4xl h-[85vh] bg-black/40 border border-primary/30 rounded-xl shadow-[0_0_100px_rgba(var(--primary-rgb),0.3)] overflow-hidden flex flex-col backdrop-blur-xl"
                        style={{ boxShadow: "inset 0 0 50px rgba(0,0,0,0.8)" }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 relative z-10">
                            <div>
                                <h2 className="text-3xl font-serif text-primary-glow tracking-widest uppercase drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]">
                                    Daily Chronicle
                                </h2>
                                <p className="text-sm text-primary/60 font-mono tracking-wider">{date}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    <span className="text-primary font-serif animate-pulse tracking-widest">Divining the past...</span>
                                </div>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                                    <p className="font-serif text-lg">{error}</p>
                                    <button onClick={onClose} className="text-sm underline hover:text-red-300">Return to the present</button>
                                </div>
                            ) : data ? (
                                <div className="flex flex-col gap-8 max-w-3xl mx-auto">

                                    {/* Narrative Summary */}
                                    <div className="prose prose-invert prose-primary max-w-none font-serif leading-relaxed text-lg text-white/90 drop-shadow-md">
                                        <ReactMarkdown>{data.summary}</ReactMarkdown>
                                    </div>

                                    {/* Recipe Card (if exists) */}
                                    {data.recipe && (
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="mt-8 p-6 rounded-lg bg-gradient-to-br from-orange-900/20 to-black border border-orange-500/30 relative overflow-hidden group"
                                        >
                                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <ChefHat size={64} />
                                            </div>

                                            <h3 className="text-xl font-medium text-orange-200 mb-2 flex items-center gap-2">
                                                <ChefHat size={20} />
                                                Culinary Creation: {data.recipe.title}
                                            </h3>

                                            <div className="flex gap-4 text-sm text-white/60 mb-4">
                                                <span>{data.recipe.ingredients.length} Ingredients</span>
                                                <span>{data.recipe.steps.length} Steps</span>
                                            </div>

                                            <button
                                                onClick={() => onOpenCooking(data.recipe)}
                                                className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/40 text-orange-200 border border-orange-500/50 rounded-md transition-all flex items-center gap-2"
                                            >
                                                <ChefHat size={16} />
                                                Make it Again
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Stats */}
                                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                                        <div className="flex gap-8 text-sm text-white/40">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase tracking-widest mb-1">Messages</span>
                                                <span className="text-xl text-primary font-mono">{data.stats.user_messages}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase tracking-widest mb-1">Tool Calls</span>
                                                <span className="text-xl text-primary font-mono">{data.stats.total_tool_calls}</span>
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] uppercase tracking-widest mb-1">Errors</span>
                                                <span className="text-xl text-red-400/80 font-mono">{data.stats.tool_errors}</span>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
