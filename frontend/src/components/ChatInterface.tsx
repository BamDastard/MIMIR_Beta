import React, { useState } from 'react';
import { Send, Mic, MicOff, Paperclip, Camera, Volume2, VolumeX, Plus, Search, Cloud, Calendar, Utensils, Book, MapPin, Terminal, Heart, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { Message } from '@/types';

interface ChatInterfaceProps {
    messages: Message[];
    isLoading: boolean;
    thinkingStatus: string | null;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    cookingMode: boolean;
    input: string;
    setInput: (value: string) => void;
    isListening: boolean;
    conversationMode: boolean;
    setConversationMode: (mode: boolean) => void;
    handleSubmit: (e: React.FormEvent) => void;
    attachedFiles: string[];
    onAttachmentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    startCamera: () => void;
    attachmentInputRef: React.RefObject<HTMLInputElement | null>;
    isMuted: boolean;
    setIsMuted: (muted: boolean) => void;
}

const getToolDisplay = (toolName: string) => {
    switch (toolName) {
        case 'web_search': return { icon: Search, label: 'Searching the web...' };
        case 'get_weather': return { icon: Cloud, label: 'Checking weather...' };
        case 'get_location': return { icon: MapPin, label: 'Locating...' };
        case 'calendar_search': return { icon: Calendar, label: 'Checking calendar...' };
        case 'calendar_create': return { icon: Calendar, label: 'Scheduling event...' };
        case 'calendar_update': return { icon: Calendar, label: 'Updating calendar...' };
        case 'calendar_delete': return { icon: Calendar, label: 'Removing event...' };
        case 'start_cooking': return { icon: Utensils, label: 'Starting cooking mode...' };
        case 'cooking_navigation': return { icon: Utensils, label: 'Navigating recipe...' };
        case 'journal_search': return { icon: Book, label: 'Searching journal...' };
        case 'journal_read': return { icon: Book, label: 'Reading journal...' };
        case 'record_preference': return { icon: Heart, label: 'Remembering preference...' };
        case 'set_home_city': return { icon: Home, label: 'Setting home city...' };
        default: return { icon: Terminal, label: `Using tool: ${toolName}` };
    }
};

export default function ChatInterface({
    messages,
    isLoading,
    thinkingStatus,
    messagesEndRef,
    cookingMode,
    input,
    setInput,
    isListening,
    conversationMode,
    setConversationMode,
    handleSubmit,
    attachedFiles,
    onAttachmentSelect,
    startCamera,
    attachmentInputRef,
    isMuted,
    setIsMuted
}: ChatInterfaceProps) {
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    return (
        // Chat Interface Container
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, idx) => {
                    const isTool = msg.type === 'tool';
                    const toolDisplay = isTool ? getToolDisplay(msg.content) : null;
                    const ToolIcon = toolDisplay?.icon;

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                                msg.role === 'user' ? "self-end items-end" : "self-start items-start"
                            )}
                        >
                            <div className={cn(
                                "px-6 py-3 rounded-2xl backdrop-blur-md shadow-lg border border-white/5",
                                msg.role === 'user'
                                    ? "bg-primary/20 text-white rounded-tr-sm"
                                    : isTool
                                        ? "bg-white/5 text-gray-300 text-sm border-dashed border-white/10 flex items-center gap-2"
                                        : "bg-white/10 text-gray-100 rounded-tl-sm"
                            )}>
                                {isTool && ToolIcon ? (
                                    <>
                                        <ToolIcon size={14} className="text-primary-glow" />
                                        <span className="italic">{toolDisplay.label}</span>
                                    </>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-white/30 mt-1 px-2">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}

                {/* Thinking Indicator */}
                {thinkingStatus && (
                    <div className="self-start flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5 animate-pulse">
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm text-primary-glow font-medium">{thinkingStatus}</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={cn(
                "p-2 md:p-4 transition-all duration-300",
                cookingMode ? "bg-black/40 backdrop-blur-md" : "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            )}>
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex gap-2 md:gap-3 items-end w-full">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={attachmentInputRef}
                        className="hidden"
                        onChange={onAttachmentSelect}
                    />

                    {/* Combined Attachment Button */}
                    <div className="relative shrink-0">
                        <AnimatePresence>
                            {showAttachMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full left-0 mb-2 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl min-w-[140px]"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            attachmentInputRef.current?.click();
                                            setShowAttachMenu(false);
                                        }}
                                        className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg text-sm text-white/80 hover:text-white transition-colors text-left"
                                    >
                                        <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                                            <Paperclip size={16} />
                                        </div>
                                        <span>Upload File</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            startCamera();
                                            setShowAttachMenu(false);
                                        }}
                                        className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg text-sm text-white/80 hover:text-white transition-colors text-left"
                                    >
                                        <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400">
                                            <Camera size={16} />
                                        </div>
                                        <span>Take Photo</span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="button"
                            onClick={() => setShowAttachMenu(!showAttachMenu)}
                            className={cn(
                                "p-3 rounded-full transition-all border shrink-0",
                                showAttachMenu
                                    ? "bg-primary text-white border-primary rotate-45"
                                    : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/5"
                            )}
                            title="Add Attachment"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    {/* Input Field Container */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center p-1.5 gap-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all backdrop-blur-sm min-w-0">

                        {/* Mute Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsMuted(!isMuted)}
                            className={cn(
                                "p-2 rounded-xl transition-all duration-300",
                                isMuted
                                    ? "text-red-400 bg-red-500/10 hover:bg-red-500/20"
                                    : "text-white/70 hover:text-white hover:bg-white/10"
                            )}
                            title={isMuted ? "Unmute Voice" : "Mute Voice"}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Consult the oracle..."}
                            className="flex-1 bg-transparent border-none outline-none text-white px-2 py-2 text-base placeholder:text-white/20 font-light tracking-wide min-w-0"
                            disabled={isLoading}
                        />

                        {/* Voice Mode Toggle */}
                        <button
                            type="button"
                            onClick={() => setConversationMode(!conversationMode)}
                            className={cn(
                                "p-2 rounded-xl transition-all border border-white/5 shrink-0",
                                conversationMode
                                    ? "bg-primary/20 text-primary-glow animate-pulse border-primary/30"
                                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                            )}
                            title={conversationMode ? "Disable Voice Mode" : "Enable Voice Mode"}
                        >
                            {conversationMode ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                    </div>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-3 bg-primary hover:bg-primary/80 text-white rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 shrink-0"
                    >
                        <Send size={20} />
                    </button>
                </form>

                {/* Attached Files Preview */}
                {attachedFiles.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {attachedFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-white/80 whitespace-nowrap">
                                <span className="truncate max-w-[150px]">{file.split('/').pop()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
