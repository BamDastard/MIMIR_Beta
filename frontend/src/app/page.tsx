'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { cn } from '@/lib/utils';
import { Menu, User } from 'lucide-react';
import OnboardingModal from '@/components/OnboardingModal';
import JournalView from '@/components/JournalView';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import ChatInterface from '@/components/ChatInterface';
import CookingView from '@/components/CookingView';
import CalendarView from '@/components/CalendarView';
import EventModal from '@/components/EventModal';
import CameraModal from '@/components/CameraModal';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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
  attachment?: string;
};

type Recipe = {
  title: string;
  ingredients: string[];
  steps: string[];
};

export default function Home() {
  const { data: session, status } = useSession();
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
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Journal State
  const [selectedJournalDate, setSelectedJournalDate] = useState<string | null>(null);

  // User Management State (New)
  const [currentUser, setCurrentUser] = useState<string | null>(null); // Display Name
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      const response = await authenticatedFetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          personality_intensity: personalityIntensity,
          // user_id removed, handled by auth token
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
      const response = await authenticatedFetch(`${API_BASE_URL}/calendar/events?t=${Date.now()}`, { cache: 'no-store' });
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
      const response = await authenticatedFetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newEventSubject,
          date: dateStr,
          start_time: newEventTime || undefined,
          end_time: newEventEndTime || undefined,
          details: newEventDetails,
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
      await authenticatedFetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
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
      await authenticatedFetch(`${API_BASE_URL}/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: newEventSubject,
          details: newEventDetails,
          start_time: newEventTime || undefined,
          end_time: newEventEndTime || undefined,
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

  const handleOpenFile = async (path: string) => {
    const formData = new FormData();
    formData.append('path', path);
    try {
      await authenticatedFetch(`${API_BASE_URL}/open_file`, {
        method: 'POST',
        body: formData
      });
    } catch (e) {
      console.error("Failed to open file:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload`, {
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
  };

  // Attachment Handling (Temp Upload)
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload_temp`, {
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

  // Authenticated Fetch Helper
  const authenticatedFetch = async (url: string, options: any = {}) => {
    // If no session (e.g. dev mode without auth), we might still want to try if backend is permissive
    // But for now, let's assume we need token if session exists
    const headers = {
      ...options.headers,
    };

    if (session && (session as any).idToken) {
      headers['Authorization'] = `Bearer ${(session as any).idToken}`;
    }

    return fetch(url, { ...options, headers });
  };

  // Check Onboarding Status
  useEffect(() => {
    if (status === 'authenticated' && session) {
      authenticatedFetch(`${API_BASE_URL}/user/me`)
        .then(async (res) => {
          if (res.status === 404 || res.status === 403) {
            setShowOnboarding(true);
          } else if (res.ok) {
            const profile = await res.json();
            setCurrentUser(profile.display_name);
            setShowOnboarding(false);
          }
        })
        .catch(err => console.error("Failed to check user status:", err));
    } else if (status === 'unauthenticated') {
      setCurrentUser(null);
    }
  }, [status, session]);

  const handleOnboardingComplete = (displayName: string) => {
    setCurrentUser(displayName);
    setShowOnboarding(false);
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

  const captureImage = async (blob: Blob) => {
    const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/upload_temp`, {
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
  };

  // Mobile Sidebar State
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);

  // ... existing code ...

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
        <source src="/mimir_loop.webm" type="video/webm" />
      </video>
      <div className="fixed inset-0 z-0 bg-black/70 backdrop-blur-[2px]" /> {/* Dark overlay for readability */}

      {/* Ambient Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[150px] rounded-full opacity-40 animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/10 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="w-full items-center justify-between font-mono text-sm flex p-4 pl-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLeftSidebar(true)}
              className="md:hidden p-2 text-white/80 hover:text-white"
            >
              <Menu size={24} />
            </button>
            <img
              src="/mimir_logo_v3.png"
              alt="MIMIR"
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Mobile Right Sidebar Toggle */}
          <button
            onClick={() => setShowRightSidebar(true)}
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            <User size={24} />
          </button>
        </div>
      </header>

      {/* Left Sidebar */}
      <LeftSidebar
        personalityIntensity={personalityIntensity}
        setPersonalityIntensity={setPersonalityIntensity}
        uploadStatus={uploadStatus}
        onFileUpload={handleFileUpload}
        cookingMode={cookingMode}
        setCookingMode={setCookingMode}
        isOpen={showLeftSidebar}
        onClose={() => setShowLeftSidebar(false)}
      />

      {/* Right Sidebar */}
      <RightSidebar
        session={session}
        currentUser={currentUser}
        cookingMode={cookingMode}
        setCalendarExpanded={setCalendarExpanded}
        selectedDate={selectedDate}
        events={events}
        openCreateModal={openCreateModal}
        openEditModal={openEditModal}
        setSelectedJournalDate={setSelectedJournalDate}
        apiBaseUrl={API_BASE_URL}
        authenticatedFetch={authenticatedFetch}
        isOpen={showRightSidebar}
        onClose={() => setShowRightSidebar(false)}
      />

      {/* Main Content Area */}
      <div className={cn(
        "z-10 flex-1 w-full transition-all duration-500",
        cookingMode ? "max-w-[100%] flex gap-6 h-[calc(100vh-8rem)] overflow-hidden p-4" : "max-w-none p-4 pb-48 md:pl-60 md:pr-[297px] overflow-y-auto scrollbar-hide"
      )}>

        {/* Expanded Calendar View */}
        {calendarExpanded ? (
          <CalendarView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            setCalendarExpanded={setCalendarExpanded}
            lastUpdated={lastUpdated}
            fetchEvents={fetchEvents}
            openCreateModal={openCreateModal}
            events={events}
            openEditModal={openEditModal}
            setSelectedJournalDate={setSelectedJournalDate}
          />
        ) : (
          /* Normal View (Chat + Optional Cooking Panel) */
          <>
            {/* Chat Interface - Hidden on mobile during cooking mode */}
            <div className={cn(
              "w-full h-full flex flex-col",
              cookingMode ? "hidden md:flex md:w-1/3" : "flex"
            )}>
              <ChatInterface
                messages={messages}
                isLoading={isLoading}
                thinkingStatus={thinkingStatus}
                messagesEndRef={messagesEndRef}
                cookingMode={cookingMode}
                input={input}
                setInput={setInput}
                isListening={isListening}
                conversationMode={conversationMode}
                setConversationMode={setConversationMode}
                handleSubmit={handleSubmit}
                attachedFiles={attachedFiles}
                onAttachmentSelect={handleAttachmentSelect}
                startCamera={startCamera}
                attachmentInputRef={attachmentInputRef}
              />
            </div>

            {/* Mobile Cooking Controls Overlay - Only Input Bar */}
            {cookingMode && (
              <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
                <ChatInterface
                  messages={[]} // Hide messages
                  isLoading={isLoading}
                  thinkingStatus={null}
                  messagesEndRef={messagesEndRef}
                  cookingMode={cookingMode}
                  input={input}
                  setInput={setInput}
                  isListening={isListening}
                  conversationMode={conversationMode}
                  setConversationMode={setConversationMode}
                  handleSubmit={handleSubmit}
                  attachedFiles={attachedFiles}
                  onAttachmentSelect={handleAttachmentSelect}
                  startCamera={startCamera}
                  attachmentInputRef={attachmentInputRef}
                />
              </div>
            )}

            <CookingView
              recipe={recipe}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              cookingMode={cookingMode}
              onClose={() => setCookingMode(false)}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        editingEvent={editingEvent}
        subject={newEventSubject}
        setSubject={setNewEventSubject}
        time={newEventTime}
        setTime={setNewEventTime}
        endTime={newEventEndTime}
        setEndTime={setNewEventEndTime}
        details={newEventDetails}
        setDetails={setNewEventDetails}
        onOpenFile={handleOpenFile}
        onDelete={handleDeleteEvent}
        onUpdate={handleUpdateEvent}
        onCreate={handleCreateEvent}
      />

      <CameraModal
        isOpen={showCameraModal}
        onClose={stopCamera}
        cameraStream={cameraStream}
        onCapture={captureImage}
      />

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        apiClient={{ post: (url: string, body: any) => authenticatedFetch(API_BASE_URL + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }}
      />

      {/* Journal View Modal */}
      {selectedJournalDate && (
        <JournalView
          date={selectedJournalDate}
          apiBaseUrl={API_BASE_URL}
          fetcher={authenticatedFetch}
          onClose={() => setSelectedJournalDate(null)}
          onOpenCooking={(recipe) => {
            setRecipe(recipe);
            setCurrentStep(0);
            setCookingMode(true);
            setCalendarExpanded(false); // Ensure we see the cooking panel
            setSelectedJournalDate(null);
          }}
        />
      )}
    </main>
  );
}
