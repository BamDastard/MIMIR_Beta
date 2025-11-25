'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Volume2, VolumeX, Upload, Calendar, ChevronLeft, ChevronRight, X, Plus, RefreshCw, ChefHat, ArrowLeft, ArrowRight, Paperclip, Camera, User, Trash2, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE_URL = 'http://127.0.0.1:8000';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

type CalendarEvent = {
  id: string;
  subject: string;
  date: string;
  start_time?: string;
  end_time?: string;
  details?: string;
};

type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'I am MIMIR. The well of wisdom is open. Speak.',
      timestamp: 0,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [personalityIntensity, setPersonalityIntensity] = useState(75);

  // Camera & Attachment State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

  // User Management State
  const [users, setUsers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string>('Matt Burchett');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Conversation Mode State
  const [conversationMode, setConversationMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Calendar State
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [newEventSubject, setNewEventSubject] = useState('');
  const [newEventDetails, setNewEventDetails] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cooking Mode State
  const [cookingMode, setCookingMode] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when toggling cooking mode
  useEffect(() => {
    scrollToBottom();
    if (cookingMode) {
      setConversationMode(true);
    }
  }, [cookingMode]);

  // Clear chat history when user changes
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: 'I am MIMIR. The well of wisdom is open. Speak.',
        timestamp: 0,
      },
    ]);
  }, [currentUser]);

  // Speech Recognition Initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (silenceTimer.current) clearTimeout(silenceTimer.current);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    }
  }, []);

  // Update onresult handler to have latest closure
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        // Clear existing timer
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        // Construct full transcript
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = finalTranscript;

        // Set new timer (1.5s silence)
        silenceTimer.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            recognitionRef.current.stop();
            handleSendMessage(transcriptRef.current);
            transcriptRef.current = ''; // Clear for next time
          }
        }, 1500);
      };
    }
  });

  // Manage Listening State
  useEffect(() => {
    if (conversationMode && !isLoading && !isSpeaking) {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        // Already started or error
      }
    } else {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, [conversationMode, isLoading, isSpeaking]);

  const playAudio = (base64Audio: string) => {
    if (!isAudioEnabled || !base64Audio) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audioRef.current = audio;
    setIsSpeaking(true);

    audio.onended = () => setIsSpeaking(false);

    audio.play().catch(e => {
      console.error("Audio playback failed:", e);
      setIsSpeaking(false);
    });
  };

  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setThinkingStatus("Thinking...");

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          personality_intensity: personalityIntensity,
          user_id: currentUser
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch response');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            console.log("Stream line:", line);
            const data = JSON.parse(line);

            if (data.type === 'status') {
              setThinkingStatus(data.content);
            } else if (data.type === 'response') {
              setThinkingStatus(null);
              const botMessage: Message = {
                role: 'assistant',
                content: data.text,
                timestamp: Date.now(),
              };
              setMessages(prev => [...prev, botMessage]);

              if (data.audio_base64) {
                playAudio(data.audio_base64);
              }

              // Handle Tools
              if (data.tools_used && data.tool_results) {
                // Cooking
                if (data.tools_used.includes('start_cooking')) {
                  const cookingResult = data.tool_results.find((r: any) => r.tool === 'start_cooking');
                  if (cookingResult?.result?.recipe) {
                    setRecipe(cookingResult.result.recipe);
                    setCookingMode(true);
                    setCurrentStep(0);
                  }
                }
                // Navigation
                if (data.tools_used.includes('cooking_navigation')) {
                  const navResult = data.tool_results.find((r: any) => r.tool === 'cooking_navigation');
                  if (navResult?.result) {
                    const action = navResult.result.action;
                    if (action === 'next') setCurrentStep(prev => Math.min((recipe?.steps.length || 1) - 1, prev + 1));
                    if (action === 'prev') setCurrentStep(prev => Math.max(0, prev - 1));
                    if (action === 'goto' && navResult.result.step_index !== undefined) setCurrentStep(navResult.result.step_index);
                  }
                }
                // Calendar
                if (data.tools_used.some((tool: string) => ['calendar_create', 'calendar_update', 'calendar_delete'].includes(tool))) {
                  await wait(100);
                  await fetchEvents();
                }
              }
            }
          } catch (e) {
            console.error('Error parsing stream line:', line, e);
          }
        }
      }

    } catch (error) {
      console.error(error);
      setThinkingStatus(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The threads of fate are tangled. I cannot respond.',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setThinkingStatus(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalContent = input;
    if (attachedFiles.length > 0) {
      const fileMarkers = attachedFiles.map(path => `[FILE: ${path}]`).join(' ');
      finalContent = `${finalContent} ${fileMarkers}`.trim();
    }

    if (!finalContent.trim()) return;

    await handleSendMessage(finalContent);
    setAttachedFiles([]);
  };

  // Calendar Functions
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/calendar/events?user_id=${encodeURIComponent(currentUser)}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      console.log('Fetched events:', data.events);
      setEvents(data.events);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentUser]); // Refetch when user changes

  const handleCreateEvent = async () => {
    if (!newEventSubject || !selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newEventSubject,
          date: dateStr,
          start_time: newEventTime || undefined,
          end_time: newEventEndTime || undefined,
          details: newEventDetails,
          user_id: currentUser
        }),
      });

      if (response.ok) {
        await wait(100);
        await fetchEvents();
        setShowEventModal(false);
        setNewEventSubject('');
        setNewEventDetails('');
        setNewEventTime('');
        setNewEventEndTime('');
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await fetch(`${API_BASE_URL}/calendar/events/${eventId}?user_id=${encodeURIComponent(currentUser)}`, {
        method: 'DELETE',
      });
      await wait(100);
      await fetchEvents();
      setShowEventModal(false);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      await fetch(`${API_BASE_URL}/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newEventSubject,
          details: newEventDetails,
          start_time: newEventTime || undefined,
          end_time: newEventEndTime || undefined,
          user_id: currentUser
        }),
      });

      await wait(100);
      await fetchEvents();
      setShowEventModal(false);
      setEditingEvent(null);
      setNewEventSubject('');
      setNewEventDetails('');
      setNewEventTime('');
      setNewEventEndTime('');
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const openCreateModal = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEventSubject('');
    setNewEventDetails('');
    setNewEventTime('');
    setNewEventEndTime('');
    setShowEventModal(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEventSubject(event.subject);
    setNewEventDetails(event.details || '');
    setNewEventTime(event.start_time || '');
    setNewEventEndTime(event.end_time || '');
    setShowEventModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', currentUser);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.status === 'success') {
        setUploadStatus(`✓ ${data.message}`);
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadStatus(`✗ ${data.message}`);
        setTimeout(() => setUploadStatus(''), 5000);
      }
    } catch (error) {
      setUploadStatus('✗ Upload failed');
      setTimeout(() => setUploadStatus(''), 5000);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Attachment Handling (Temp Upload)
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload_temp`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.path) {
        setAttachedFiles(prev => [...prev, data.path]);
      }
    } catch (error) {
      console.error("Failed to upload attachment:", error);
    }

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  // Fetch Users
  useEffect(() => {
    fetch(`${API_BASE_URL}/users`)
      .then(res => res.json())
      .then(data => {
        if (data.users && data.users.length > 0) {
          setUsers(data.users);
          // Ensure current user is in list, else default to first
          if (!data.users.includes(currentUser)) {
            setCurrentUser(data.users[0]);
          }
        }
      })
      .catch(err => console.error("Failed to fetch users:", err));
  }, []);

  // User Management Functions
  const handleAddUser = async () => {
    if (!newUserName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUserName })
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setCurrentUser(newUserName);
        setShowAddUserModal(false);
        setNewUserName('');
      }
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  const handleDeleteUser = async (userToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userToDelete)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        if (currentUser === userToDelete) {
          setCurrentUser(data.users[0] || 'Default User');
        }
        setShowDeleteConfirm(null);
      } else if (data.error) {
        alert(data.error);
        setShowDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  // Camera Handling
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCameraModal(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', file);

            try {
              const response = await fetch(`${API_BASE_URL}/upload_temp`, {
                method: 'POST',
                body: formData,
              });
              const data = await response.json();
              if (data.path) {
                setAttachedFiles(prev => [...prev, data.path]);
              }
              stopCamera();
            } catch (error) {
              console.error("Failed to upload capture:", error);
            }
          }
        }, 'image/jpeg');
      }
    }
  };

  useEffect(() => {
    if (showCameraModal && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCameraModal, cameraStream]);

  return (
    <main className={cn(
      "flex flex-col items-center justify-between relative",
      cookingMode ? "h-screen overflow-hidden" : "min-h-screen"
    )}>

      {/* Background Video & Overlay */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 z-0 w-full h-full object-cover"
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          video.currentTime = 0.5;
        }}
      >
        <source src="/MIMIRs_Head.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-0 bg-black/70 backdrop-blur-[2px]" /> {/* Dark overlay for readability */}

      {/* Ambient Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[150px] rounded-full opacity-40 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5">
        <div className="w-full items-center justify-between font-mono text-sm flex p-4 pl-6">
          <img
            src="/mimir_logo_v3.png"
            alt="MIMIR"
            className="h-16 w-auto object-contain"
          />
          <div className="flex items-center gap-3">
            {cookingMode && (
              <button
                onClick={() => setCookingMode(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-glow transition-all border border-primary/30"
              >
                <ChefHat className="w-5 h-5" />
                <span className="text-sm font-medium">Exit Cooking Mode</span>
              </button>
            )}
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className="p-3 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white border border-transparent hover:border-white/10"
            >
              {isAudioEnabled ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      {!cookingMode && (
        <aside className="fixed left-4 top-24 z-40 flex flex-col gap-4">
          {/* Personality Intensity Dial */}
          <div className="glass-panel p-4 rounded-lg w-48">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/80">
                  Personality
                </span>
                <span className="text-xs text-primary-glow font-mono">
                  {personalityIntensity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={personalityIntensity}
                onChange={(e) => setPersonalityIntensity(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:hover:bg-primary-glow
                  [&::-webkit-slider-thumb]:transition-colors
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-primary
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:hover:bg-primary-glow
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:transition-colors"
              />
              <div className="flex justify-between text-xs text-foreground/50">
                <span>Subtle</span>
                <span>Full Norse</span>
              </div>
            </div>
          </div>

          {/* Upload Document Tile */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-48"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="w-6 h-6 text-primary group-hover:text-primary-glow transition-colors" />
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                Upload Document
              </span>
              {uploadStatus && (
                <span className="text-xs text-primary-glow mt-1">
                  {uploadStatus}
                </span>
              )}
            </div>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.bmp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </aside>
      )}

      {/* Left Sidebar - Cooking Mode Button */}
      {!cookingMode && (
        <aside className="fixed left-4 top-[26rem] z-40 flex flex-col gap-4">
          <button
            onClick={() => setCookingMode(!cookingMode)}
            className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-48"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <ChefHat className="w-6 h-6 text-primary group-hover:text-primary-glow transition-colors" />
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                Cooking Mode
              </span>
            </div>
          </button>
        </aside>
      )}

      {/* Right Sidebar - Minimal Calendar */}
      {!cookingMode && (
        <aside className="fixed right-4 top-24 z-40 flex flex-col gap-4">
          {/* User Dropdown */}
          <div className="relative w-64">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="w-full glass-panel p-3 rounded-lg flex items-center justify-between hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 text-primary-glow group-hover:bg-primary/20 transition-colors">
                  <User size={16} />
                </div>
                <span className="text-sm font-medium text-white/90">{currentUser}</span>
              </div>
              <ChevronDown size={14} className="text-white/50 group-hover:text-white/80 transition-colors" />
            </button>

            <AnimatePresence>
              {showUserDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-full bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-2 flex flex-col gap-1">
                    {users.map(user => (
                      <div key={user} className="flex items-center justify-between group p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <button
                          onClick={() => {
                            setCurrentUser(user);
                            setShowUserDropdown(false);
                          }}
                          className={cn(
                            "flex-1 text-left text-sm",
                            currentUser === user ? "text-primary-glow font-bold" : "text-white/70"
                          )}
                        >
                          {user}
                        </button>
                        {user !== "Matt Burchett" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(user);
                            }}
                            className="p-1 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete User"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="h-px bg-white/10 my-1" />
                    <button
                      onClick={() => {
                        setShowAddUserModal(true);
                        setShowUserDropdown(false);
                      }}
                      className="flex items-center gap-2 p-2 text-sm text-primary-glow hover:bg-primary/10 rounded-lg transition-colors w-full"
                    >
                      <Plus size={14} />
                      Add New User
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setCalendarExpanded(true)}
            className="glass-panel p-4 rounded-lg hover:border-primary/50 transition-all group w-64"
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
                // Adjust for timezone offset to ensure correct date string comparison
                const offset = currentDate.getTimezoneOffset();
                const adjustedDate = new Date(currentDate.getTime() - (offset * 60 * 1000));
                const dateStr = adjustedDate.toISOString().split('T')[0];

                const isCurrentMonth = currentDate.getMonth() === selectedDate.getMonth();
                const hasEvents = events.some(e => e.date === dateStr);
                const isToday = currentDate.toDateString() === new Date().toDateString();

                return (
                  <div key={i} className={cn(
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
        </aside>
      )}

      {/* Main Content Area */}
      <div className={cn(
        "z-10 flex-1 w-full transition-all duration-500",
        cookingMode ? "max-w-[100%] flex gap-6 h-[calc(100vh-8rem)] overflow-hidden p-4" : "max-w-none p-4 pb-48 pl-60 pr-[297px] overflow-y-auto scrollbar-hide"
      )}>

        {/* Expanded Calendar View - Takes over everything if active */}
        {calendarExpanded ? (
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
                    className={cn(
                      "bg-black/20 p-2 min-h-[100px] transition-colors relative group",
                      isCurrentMonth ? "hover:bg-white/5 cursor-pointer" : "opacity-30 pointer-events-none",
                      currentDate.toDateString() === new Date().toDateString() && "bg-red-900/20 border border-red-500/30"
                    )}
                  >
                    {dayNum > 0 && dayNum <= 31 && (
                      <>
                        <span className={cn(
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
                                openEditModal(event);
                              }}
                              className="text-xs text-left px-2 py-1 rounded bg-primary/20 hover:bg-primary/40 truncate transition-colors"
                            >
                              {event.start_time && <span className="opacity-70 mr-1">{event.start_time}</span>}
                              {event.subject}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Normal View (Chat + Optional Cooking Panel) */
          <>
            {/* Chat Area */}
            <div className={cn(
              "flex flex-col gap-8 transition-all duration-500",
              cookingMode ? "w-1/3 h-full min-h-0 overflow-y-auto scrollbar-hide p-4" : "w-full pb-24"
            )}>
              {/* Header */}

              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.timestamp}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "flex w-full",
                      msg.role === 'user' ? "justify-end mr-4" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
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

                      <div className={cn(
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

            {/* Cooking Panel (Right 2/3) */}
            <AnimatePresence>
              {cookingMode && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-2/3 glass-panel rounded-2xl p-6 flex flex-col h-full shrink-0"
                >
                  {recipe ? (
                    <>
                      {/* Header */}
                      <div className="mb-4 border-b border-white/10 pb-4 text-center">
                        <h2 className="text-2xl font-cinzel text-primary-glow">{recipe.title}</h2>
                      </div>

                      {/* Ingredients Section - Fixed Top 1/3 */}
                      <div className="h-1/3 flex flex-col mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-medium text-primary flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" /> Ingredients
                          </h3>
                          <span className="text-xs text-white/40 font-mono">{recipe.ingredients?.length || 0} items</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-2">
                            {recipe.ingredients?.map((ing, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm text-foreground/80 bg-black/20 p-3 rounded-lg break-inside-avoid">
                                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full shrink-0" />
                                <span>{ing}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Current Step Section - Bottom 2/3 */}
                      <div className="flex-1 flex flex-col bg-black/20 rounded-xl overflow-hidden">
                        {/* Progress Bar */}
                        <div className="w-full h-1 bg-white/5">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${((currentStep + 1) / (recipe.steps?.length || 1)) * 100}%` }}
                          />
                        </div>

                        {/* Step Content - Takes remaining space */}
                        <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={currentStep}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className="text-xl md:text-2xl lg:text-3xl font-light leading-relaxed text-white text-center max-w-4xl"
                            >
                              {recipe.steps?.[currentStep] || "No step details available."}
                            </motion.p>
                          </AnimatePresence>
                        </div>

                        {/* Controls - Fixed at Bottom */}
                        <div className="flex items-center justify-between p-4 border-t border-white/5 bg-black/20">
                          <button
                            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                            disabled={currentStep === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ArrowLeft className="w-5 h-5" /> Previous
                          </button>
                          <span className="font-mono text-sm text-white/40">
                            Step {currentStep + 1} of {recipe.steps?.length || 0}
                          </span>
                          <button
                            onClick={() => setCurrentStep(Math.min((recipe.steps?.length || 1) - 1, currentStep + 1))}
                            disabled={currentStep === (recipe.steps?.length || 1) - 1}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary-glow disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            Next <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-foreground/40">
                      <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg">No recipe loaded.</p>
                      <p className="text-sm mt-2">Ask MIMIR to find a recipe or start cooking.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )
        }
      </div >

      {/* Input Area - Only show when calendar is NOT expanded */}
      {
        !calendarExpanded && (
          <div className={cn(
            "fixed bottom-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-8 z-20",
            cookingMode ? "left-0 w-1/3" : "left-0 right-0"
          )}>
            <form
              onSubmit={handleSubmit}
              className={cn(
                "relative flex items-center gap-4",
                cookingMode ? "max-w-full" : "max-w-3xl mx-auto"
              )}
            >
              <div className="flex-1 glass-panel rounded-full p-2 pl-4 flex items-center gap-2 shadow-lg shadow-primary/5 border-primary/20">
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className={cn(
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
                  onChange={handleAttachmentSelect}
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
                  className={cn(
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
        )
      }

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
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
                  onClick={() => setShowEventModal(false)}
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
                    value={newEventSubject}
                    onChange={(e) => setNewEventSubject(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                    placeholder="Event title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">Start Time (Optional)</label>
                    <input
                      type="time"
                      value={newEventTime}
                      onChange={(e) => setNewEventTime(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/60 mb-1 block">End Time (Optional)</label>
                    <input
                      type="time"
                      value={newEventEndTime}
                      onChange={(e) => setNewEventEndTime(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-foreground/60 mb-1 block">
                    Details ({newEventDetails.length}/75)
                  </label>
                  <textarea
                    value={newEventDetails}
                    onChange={(e) => setNewEventDetails(e.target.value.slice(0, 75))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-foreground focus:border-primary/50 outline-none transition-colors resize-none h-24"
                    placeholder="Event details (max 75 chars)"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  {editingEvent && (
                    <button
                      onClick={() => handleDeleteEvent(editingEvent.id)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
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
      {/* Camera Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-2xl p-6 rounded-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-cinzel text-primary-glow">Take Photo</h3>
                <button
                  onClick={stopCamera}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={captureImage}
                  className="px-8 py-3 bg-primary hover:bg-primary-glow text-black font-bold rounded-full transition-all flex items-center gap-2"
                >
                  <Camera size={20} />
                  Capture
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-6 rounded-2xl flex flex-col gap-4"
            >
              <h3 className="text-xl font-cinzel text-primary-glow">Add New User</h3>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Enter user name"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary/50"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={!newUserName.trim()}
                  className="px-6 py-2 bg-primary hover:bg-primary-glow text-black font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  Add User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-6 rounded-2xl flex flex-col gap-4 border-red-500/30"
            >
              <h3 className="text-xl font-cinzel text-red-400">Delete User?</h3>
              <p className="text-white/70">
                Are you sure you want to delete <strong>{showDeleteConfirm}</strong>? This will permanently erase their memory database. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  className="px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 font-bold rounded-lg transition-all"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main >
  );
}
