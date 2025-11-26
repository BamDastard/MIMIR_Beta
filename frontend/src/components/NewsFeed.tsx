import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type NewsItem = {
    title: string;
    link: string;
    source: string;
    pubDate: string;
};

type NewsFeedProps = {
    currentUser: string;
    apiBaseUrl: string;
};

export default function NewsFeed({ currentUser, apiBaseUrl }: NewsFeedProps) {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [startIndex, setStartIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNews = async (refresh = false) => {
        setLoading(true);
        try {
            const res = await fetch(`${apiBaseUrl}/news/top${refresh ? '?refresh=true' : ''}`);
            const data = await res.json();
            if (data.news) {
                setNews(data.news);
            }
        } catch (e) {
            console.error("Failed to fetch news:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    // Rotate every minute
    useEffect(() => {
        if (news.length === 0) return;

        const interval = setInterval(() => {
            setStartIndex(prev => (prev + 4) % news.length);
        }, 60000);

        return () => clearInterval(interval);
    }, [news]);

    const handleNewsClick = async (item: NewsItem) => {
        // Open in new tab
        window.open(item.link, '_blank');

        // Log access
        const formData = new FormData();
        formData.append('user_id', currentUser);
        formData.append('title', item.title);
        formData.append('url', item.link);

        try {
            await fetch(`${apiBaseUrl}/news/log`, {
                method: 'POST',
                body: formData
            });
        } catch (e) {
            console.error("Failed to log news access:", e);
        }
    };

    // Get current 4 items
    const visibleNews = [];
    for (let i = 0; i < 4; i++) {
        if (news.length > 0) {
            visibleNews.push(news[(startIndex + i) % news.length]);
        }
    }

    if (news.length === 0 && !loading) return null;

    return (
        <div className="flex flex-col gap-1 w-full mt-1">
            <div className="flex items-center justify-between px-1 mb-0.5">
                <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider">News</span>
                <button
                    onClick={() => fetchNews(true)}
                    disabled={loading}
                    className="text-[9px] flex items-center gap-1 text-primary-glow hover:text-primary transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={8} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex flex-col gap-1">
                <AnimatePresence mode='wait'>
                    {visibleNews.map((item, i) => (
                        <motion.button
                            key={`${item.title}-${startIndex}-${i}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleNewsClick(item)}
                            className="group relative flex flex-col items-start p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 transition-all text-left overflow-hidden backdrop-blur-sm"
                        >
                            <div className="flex items-start justify-between w-full gap-1.5">
                                <span className="text-[10px] font-medium text-white/90 line-clamp-2 leading-3 group-hover:text-primary-glow transition-colors">
                                    {item.title}
                                </span>
                                <ExternalLink size={8} className="text-white/30 group-hover:text-primary shrink-0 mt-0.5" />
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 w-full">
                                <span className="text-[8px] text-primary/80 font-medium px-1 py-0 rounded bg-primary/10">
                                    {item.source}
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
