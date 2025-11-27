import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Download, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type JournalViewProps = {
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

export default function JournalView({ date, apiBaseUrl, fetcher, onClose, onOpenCooking }: JournalViewProps) {
    const [data, setData] = useState<JournalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchJournal = async () => {
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
    }, [date, apiBaseUrl, fetcher]);

    // Runes for background animation
    const runes = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛈ", "ᛇ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
            {/* Pensive Animation Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Swirling mist/liquid effect using CSS/SVG */}
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent animate-pulse-slow" />

                {/* Floating Runes */}
                {runes.map((rune, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-primary/20 font-serif text-2xl select-none"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                            opacity: 0
                        }}
                        animate={{
                            x: [Math.random() * window.innerWidth, Math.random() * window.innerWidth],
                            y: [Math.random() * window.innerHeight, Math.random() * window.innerHeight],
                            opacity: [0.1, 0.3, 0.1],
                            rotate: [0, 360]
                        }}
                        transition={{
                            duration: 20 + Math.random() * 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    >
                        {rune}
                    </motion.div>
                ))}
            </div>

            {/* Content Container */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-4xl h-[85vh] bg-black/40 border border-primary/30 rounded-xl shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)] overflow-hidden flex flex-col backdrop-blur-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div>
                        <h2 className="text-2xl font-serif text-primary-glow tracking-wide">Daily Chronicle</h2>
                        <p className="text-sm text-white/50">{date}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-primary animate-pulse">
                            Divining the past...
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2">
                            <p>{error}</p>
                            <button onClick={onClose} className="text-sm underline hover:text-red-300">Return</button>
                        </div>
                    ) : data ? (
                        <div className="flex flex-col gap-8 max-w-3xl mx-auto">

                            {/* Narrative Summary */}
                            <div className="prose prose-invert prose-primary max-w-none">
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
                            <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                                <div className="flex gap-6 text-sm text-white/40">
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase tracking-wider">Messages</span>
                                        <span className="text-xl text-white/80 font-mono">{data.stats.user_messages}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase tracking-wider">Tool Calls</span>
                                        <span className="text-xl text-white/80 font-mono">{data.stats.total_tool_calls}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs uppercase tracking-wider">Errors</span>
                                        <span className="text-xl text-red-400/80 font-mono">{data.stats.tool_errors}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    ) : null}
                </div>
            </motion.div>
        </motion.div>
    );
}
