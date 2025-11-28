import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Paperclip } from 'lucide-react';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingEvent: any;
    subject: string;
    setSubject: (val: string) => void;
    time: string;
    setTime: (val: string) => void;
    endTime: string;
    setEndTime: (val: string) => void;
    details: string;
    setDetails: (val: string) => void;
    onOpenFile: (path: string) => void;
    onDelete: (id: string) => void;
    onUpdate: () => void;
    onCreate: () => void;
}

export default function EventModal({
    isOpen,
    onClose,
    editingEvent,
    subject,
    setSubject,
    time,
    setTime,
    endTime,
    setEndTime,
    details,
    setDetails,
    onOpenFile,
    onDelete,
    onUpdate,
    onCreate
}: EventModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-panel w-full max-w-md p-6 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-cinzel text-primary-glow">
                                {editingEvent ? 'Edit Event' : 'New Event'}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-foreground/60 mb-1 block">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                                    placeholder="Event title"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-foreground/60 mb-1 block">Start Time (Optional)</label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-foreground/60 mb-1 block">End Time (Optional)</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-foreground/60 mb-1 block">
                                    Details ({details.length}/75)
                                </label>
                                <textarea
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value.slice(0, 75))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors resize-none h-24"
                                    placeholder="Event details (max 75 chars)"
                                />
                            </div>

                            {editingEvent?.attachment && (
                                <div className="flex items-center gap-2 text-sm bg-white/5 p-2 rounded-lg">
                                    <Paperclip size={14} className="text-primary" />
                                    <span className="truncate flex-1 text-white/70">{editingEvent.attachment.split(/[\\/]/).pop()}</span>
                                    <button
                                        onClick={() => onOpenFile(editingEvent.attachment!)}
                                        className="text-primary-glow hover:underline text-xs"
                                    >
                                        Open
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3 mt-2">
                                {editingEvent && (
                                    <button
                                        onClick={() => onDelete(editingEvent.id)}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={editingEvent ? onUpdate : onCreate}
                                    className="flex-1 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary-glow rounded-lg transition-colors font-medium"
                                >
                                    {editingEvent ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
