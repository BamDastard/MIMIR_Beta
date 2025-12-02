import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface FloatingRunesProps {
    count?: number;
    color?: string;
    opacity?: number;
    className?: string;
    size?: string;
}

export default function FloatingRunes({
    count = 20,
    color = "text-primary",
    opacity = 0.5,
    className = "",
    size = "text-2xl"
}: FloatingRunesProps) {
    const [mounted, setMounted] = useState(false);
    // Elder Futhark Runes
    const runes = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᚾ", "ᛁ", "ᛃ", "ᛈ", "ᛇ", "ᛉ", "ᛊ", "ᛏ", "ᛒ", "ᛖ", "ᛗ", "ᛚ", "ᛜ", "ᛞ", "ᛟ"];

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <motion.div
                    key={i}
                    className={`absolute font-serif ${size} select-none ${color} text-glow`}
                    initial={{
                        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                        y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                        opacity: 0,
                        scale: 0.5 + Math.random() * 0.5
                    }}
                    animate={{
                        x: [
                            Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                            Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                            Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)
                        ],
                        y: [
                            Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                            Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                            Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000)
                        ],
                        opacity: [0, opacity, opacity * 0.5, 0],
                        rotate: [0, 180, 360]
                    }}
                    transition={{
                        duration: 20 + Math.random() * 30,
                        repeat: Infinity,
                        ease: "linear",
                        times: [0, 0.5, 1]
                    }}
                >
                    {runes[Math.floor(Math.random() * runes.length)]}
                </motion.div>
            ))}
        </div>
    );
}
