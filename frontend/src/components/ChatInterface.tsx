import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Paperclip, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils'; // Assuming we'll move cn utility or define it here
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function cn_local(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

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
    attachmentInputRef
}: ChatInterfaceProps) {
    return (
        <>
            {/* Chat Area */}
            <div className={cn_local(
                "flex flex-col gap-8 transition-all duration-500",
                cookingMode ? "w-full md:w-1/3 h-full min-h-0 overflow-y-auto scrollbar-hide p-4" : "w-full pb-24"
            )}>
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.timestamp}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={cn_local(
                                "flex w-full",
                                msg.role === 'user' ? "justify-end mr-4" : "justify-start"
                            )}
                        >
                            <div
                                className={cn_local(
                                    "max-w-[85%] p-6 rounded-2xl backdrop-blur-md shadow-2xl border relative overflow-hidden",
                                    msg.role === 'user'
                                        ? "bg-primary/10 border-primary/30 text-white rounded-tr-sm"
                                        : "bg-black/60 border-white/10 text-gray-100 rounded-tl-sm runic-border"
                                )}
                            >
                                {/* Subtle inner glow for assistant */}
                                {msg.role === 'assistant' && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent pointer-events-none" />
                                )}

                                <div className={cn_local(
                                    "text-lg leading-relaxed relative z-10 markdown-content",
                                    msg.role === 'assistant' && "font-display tracking-wide text-white/90"
                                )}>
                                    <ReactMarkdown
                                        components={{
                                            strong: ({ node, ...props }) => <span className="font-bold text-primary-glow" {...props} />,
                                            em: ({ node, ...props }) => <span className="italic text-white/80" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                                        }}
                                    >
                                        {msg.content.replace(/\[FILE: .*?\]/g, '').trim()}
                                    </ReactMarkdown>
                                    {(!msg.content.replace(/\[FILE: .*?\]/g, '').trim()) && (
                                        <span className="italic text-white/50 block">Sent an attachment</span>
                                    )}
                                    {msg.content.match(/\[FILE: .*?\]/) && (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-primary-glow/70 bg-primary/10 px-2 py-1 rounded w-fit">
                                            <Paperclip size={12} />
                                            <span>Attachment included</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs text-white/30 mt-3 block font-mono relative z-10">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start w-full"
                        >
                            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3 backdrop-blur-sm">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-sm text-primary-glow font-mono animate-pulse">
                                    {thinkingStatus || "Thinking..."}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={cn_local(
                "fixed bottom-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 z-20",
                cookingMode ? "left-0 w-full md:w-1/3" : "left-0 right-0"
            )}>
                <form
                    onSubmit={handleSubmit}
                    className={cn_local(
                        "relative flex items-center gap-4",
                        cookingMode ? "max-w-full" : "max-w-3xl mx-auto"
                    )}
                >
                    <div className="flex-1 glass-panel rounded-full p-2 pl-4 flex items-center gap-2 shadow-lg shadow-primary/5 border-primary/20">
                        <button
                            type="button"
                            onClick={() => attachmentInputRef.current?.click()}
                            className={cn_local(
                                "p-2 rounded-full transition-all duration-300",
                                attachedFiles.length > 0
                                    ? "bg-primary/20 text-primary-glow shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] animate-pulse"
                                    : "hover:bg-white/10 text-white/60 hover:text-white"
                            )}
                            title={attachedFiles.length > 0 ? `${attachedFiles.length} file(s) attached` : "Attach File"}
                        >
                            <Paperclip size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={startCamera}
                            className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                            title="Take Photo"
                        >
                            <Camera size={20} />
                        </button>
                        <input
                            type="file"
                            ref={attachmentInputRef}
                            onChange={onAttachmentSelect}
                            className="hidden"
                            accept=".doc,.docx,.txt,.csv,.pdf,.jpg,.jpeg,.png"
                        />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Consult the oracle..."}
                            className="flex-1 bg-transparent border-none outline-none text-white px-2 py-3 text-lg placeholder:text-white/20 font-light tracking-wide"
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setConversationMode(!conversationMode)}
                            className={cn_local(
                                "p-3 rounded-full transition-all border border-white/5",
                                conversationMode ? "bg-primary/20 text-primary-glow animate-pulse" : "bg-white/5 hover:bg-white/10 text-white/90"
                            )}
                        >
                            {conversationMode ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="p-3 bg-white/5 hover:bg-white/10 text-white/90 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/5"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
