import React from 'react';
import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn_local(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface CalendarViewProps {
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    setCalendarExpanded: (expanded: boolean) => void;
    lastUpdated: Date | null;
    fetchEvents: () => void;
    openCreateModal: (date: Date) => void;
    events: any[];
    openEditModal: (event: any) => void;
    setSelectedJournalDate: (date: string) => void;
}

export default function CalendarView({
    selectedDate,
    setSelectedDate,
    setCalendarExpanded,
    lastUpdated,
    fetchEvents,
    openCreateModal,
    events,
    openEditModal,
    setSelectedJournalDate
}: CalendarViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-4 rounded-2xl w-full h-full min-h-0 flex flex-col"
        >
            <div className="flex items-center justify-between mb-2 shrink-0 relative">
                {/* Left: Close Button */}
                <button
                    onClick={() => setCalendarExpanded(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors absolute left-0"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Center: Navigation & Title */}
                <div className="flex items-center justify-center gap-4 w-full">
                    <button
                        onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                        className="p-1 hover:bg-white/5 rounded-full"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <h2 className="text-lg md:text-xl font-cinzel text-primary-glow">
                        {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>

                    <button
                        onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                        className="p-1 hover:bg-white/5 rounded-full"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Right: Refresh & Last Updated */}
                <div className="flex items-center gap-2 absolute right-0">
                    {lastUpdated && (
                        <span className="text-[10px] md:text-xs text-foreground/40 font-mono hidden md:inline">
                            Updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={fetchEvents}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                        title="Refresh Calendar"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-px mb-1 shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] md:text-xs font-medium text-foreground/40 uppercase tracking-wider py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/10 min-h-0">
                {Array.from({ length: 42 }).map((_, i) => {
                    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                    const startDay = date.getDay();
                    const dayNum = i - startDay + 1;
                    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

                    const currentDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNum);
                    // Adjust for timezone offset
                    const offset = currentDate.getTimezoneOffset();
                    const adjustedDate = new Date(currentDate.getTime() - (offset * 60 * 1000));
                    const dateStr = adjustedDate.toISOString().split('T')[0];

                    const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth();
                    const dayEvents = events.filter(e => e.date === dateStr);

                    return (
                        <div
                            key={i}
                            onClick={() => isCurrentMonth && dayNum > 0 && dayNum <= daysInMonth && openCreateModal(currentDate)}
                            className={cn_local(
                                "bg-black/20 p-1 md:p-2 transition-colors relative group flex flex-col min-h-0",
                                isCurrentMonth && dayNum > 0 && dayNum <= daysInMonth ? "hover:bg-white/5 cursor-pointer" : "opacity-30 pointer-events-none",
                                currentDate.toDateString() === new Date().toDateString() && "bg-red-900/20 border border-red-500/30"
                            )}
                        >
                            {dayNum > 0 && dayNum <= daysInMonth && (
                                <>
                                    <span className={cn_local(
                                        "text-xs md:text-sm font-medium mb-1",
                                        currentDate.toDateString() === new Date().toDateString() ? "text-red-400" : "text-foreground/60"
                                    )}>
                                        {dayNum}
                                    </span>
                                    <div className="flex flex-col gap-0.5 md:gap-1 overflow-hidden">
                                        {dayEvents.map(event => (
                                            <button
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (event.subject === "Daily Journal") {
                                                        setSelectedJournalDate(event.date);
                                                    } else {
                                                        openEditModal(event);
                                                    }
                                                }}
                                                className="text-[10px] md:text-xs text-left px-1 py-0.5 md:px-2 md:py-1 rounded bg-primary/20 hover:bg-primary/40 truncate transition-colors w-full"
                                            >
                                                {event.start_time && <span className="opacity-70 mr-1 hidden md:inline">{event.start_time}</span>}
                                                {event.subject}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )
                            }
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}
