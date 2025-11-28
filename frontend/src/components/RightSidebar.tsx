import React from 'react';
import { User, LogOut, LogIn, Calendar, X } from 'lucide-react';
import { signIn, signOut } from "next-auth/react";
import NewsFeed from '@/components/NewsFeed';
import { cn } from '@/lib/utils';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn_local(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface RightSidebarProps {
    session: any;
    currentUser: string | null;
    cookingMode: boolean;
    setCalendarExpanded: (expanded: boolean) => void;
    selectedDate: Date;
    events: any[];
    openCreateModal: (date: Date) => void;
    openEditModal: (event: any) => void;
    setSelectedJournalDate: (date: string) => void;
    apiBaseUrl: string;
    authenticatedFetch: any;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function RightSidebar({
    session,
    currentUser,
    cookingMode,
    setCalendarExpanded,
    selectedDate,
    events,
    openCreateModal,
    openEditModal,
    setSelectedJournalDate,
    apiBaseUrl,
    authenticatedFetch,
    isOpen,
    onClose
}: RightSidebarProps) {

    if (cookingMode) return null;

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={cn_local(
                "fixed right-0 top-0 h-full w-72 bg-black/95 border-l border-white/10 z-50 p-6 flex flex-col gap-6 transition-transform duration-300 ease-in-out md:right-4 md:top-24 md:h-auto md:w-64 md:bg-transparent md:border-none md:z-40 md:p-0 md:gap-4",
                isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
            )}>
                {/* Mobile Header */}
                <div className="flex items-center justify-between md:hidden">
                    <span className="text-lg font-cinzel text-primary-glow">Profile</span>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Auth Status */}
                <div className="relative w-full md:w-64">
                    {session ? (
                        <div className="w-full glass-panel p-3 rounded-lg flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-full bg-primary/10 text-primary-glow">
                                    <User size={16} />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-medium text-white/90 truncate">{currentUser || session.user?.name}</span>
                                    <span className="text-xs text-white/50 truncate max-w-[120px]">{session.user?.email}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => signIn("google")}
                            className="w-full p-3 rounded-lg flex items-center justify-center gap-2 bg-primary/20 border border-primary/50 hover:bg-primary/30 hover:border-primary-glow transition-all group shadow-lg shadow-primary/10"
                        >
                            <LogIn size={16} className="text-primary-glow group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-primary-glow">Connect to Yggdrasil</span>
                        </button>
                    )}
                </div>

                {/* Minimal Calendar */}
                <button
                    onClick={() => {
                        if (onClose) onClose();
                        setCalendarExpanded(true);
                    }}
                    className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-full md:w-64"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-foreground/80">
                            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                        <Calendar className="w-4 h-4 text-primary" />
                    </div>

                    {/* Minimal Month Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="text-foreground/40">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {Array.from({ length: 35 }).map((_, i) => {
                            const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                            const startDay = date.getDay();
                            const dayNum = i - startDay + 1;
                            const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNum);
                            // Adjust for timezone offset
                            const offset = currentDate.getTimezoneOffset();
                            const adjustedDate = new Date(currentDate.getTime() - (offset * 60 * 1000));
                            const dateStr = adjustedDate.toISOString().split('T')[0];

                            const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth();
                            const hasEvents = events.some(e => e.date === dateStr);
                            const isToday = currentDate.toDateString() === new Date().toDateString();

                            return (
                                <div key={i} className={cn_local(
                                    "h-6 flex items-center justify-center rounded-full relative",
                                    !isCurrentMonth && "opacity-20",
                                    isCurrentMonth && !isToday && "hover:bg-white/5",
                                    isToday && "bg-red-500/20 text-red-400 border border-red-500/50"
                                )}>
                                    {dayNum > 0 && dayNum <= 31 && (
                                        <>
                                            <span>{dayNum}</span>
                                            {hasEvents && (
                                                <div className="absolute bottom-0.5 w-1 h-1 bg-primary rounded-full" />
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </button>

                {/* News Feed */}
                <NewsFeed apiBaseUrl={apiBaseUrl} fetcher={authenticatedFetch} />
            </aside>
        </>
    );
}
