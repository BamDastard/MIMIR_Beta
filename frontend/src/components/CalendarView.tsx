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
            className="glass-panel p-6 rounded-2xl w-full h-[calc(100vh-8rem)] flex flex-col"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCalendarExpanded(false)}
                        className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-2xl font-cinzel text-primary-glow">
                        {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                            className="p-1 hover:bg-white/5 rounded-full"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                            className="p-1 hover:bg-white/5 rounded-full"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs text-foreground/40 font-mono">
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
                    <button
                        onClick={() => openCreateModal(new Date())}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Event</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/10 overflow-y-auto">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-black/40 p-2 text-center text-sm font-medium text-foreground/60">
                        {day}
                    </div>
                ))}
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
                    const dayEvents = events.filter(e => e.date === dateStr);

                    return (
                        <div
                            key={i}
                            onClick={() => isCurrentMonth && openCreateModal(currentDate)}
                            className={cn_local(
                                "bg-black/20 p-2 min-h-[100px] transition-colors relative group",
                                isCurrentMonth ? "hover:bg-white/5 cursor-pointer" : "opacity-30 pointer-events-none",
                                currentDate.toDateString() === new Date().toDateString() && "bg-red-900/20 border border-red-500/30"
                            )}
                        >
                            {dayNum > 0 && dayNum <= 31 && (
                                <>
                                    <span className={cn_local(
                                        "text-sm font-medium",
                                        currentDate.toDateString() === new Date().toDateString() ? "text-red-400" : "text-foreground/60"
                                    )}>
                                        {dayNum}
                                    </span>
                                    <div className="mt-1 flex flex-col gap-1">
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
                                                className="text-xs text-left px-2 py-1 rounded bg-primary/20 hover:bg-primary/40 truncate transition-colors"
                                            >
                                                {event.start_time && <span className="opacity-70 mr-1">{event.start_time}</span>}
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
