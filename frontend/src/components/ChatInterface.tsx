import React from 'react';
import { Send, Mic, MicOff, Paperclip, Camera, Volume2, VolumeX } from 'lucide-react';
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
    return (
        // Chat Interface Container
        <div className="flex flex-col h-full relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, idx) => (
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
                                : "bg-white/10 text-gray-100 rounded-tl-sm"
                        )}>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                        <span className="text-xs text-white/30 mt-1 px-2">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

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
                "p-4 transition-all duration-300",
                cookingMode ? "bg-black/40 backdrop-blur-md" : "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            )}>
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex gap-3 items-end">
                    {/* Hidden File Input */}
                    <input
                        type="file"
                        ref={attachmentInputRef}
                        className="hidden"
                        onChange={onAttachmentSelect}
                    />

                    {/* Attachment Button */}
                    <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5 shrink-0"
                        title="Attach File"
                    >
                        <Paperclip size={20} />
                    </button>

                    {/* Camera Button */}
                    <button
                        type="button"
                        onClick={startCamera}
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/5 shrink-0"
                        title="Use Camera"
                    >
                        <Camera size={20} />
                    </button>

                    {/* Input Field Container */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl flex items-center p-1.5 gap-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all backdrop-blur-sm">

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
