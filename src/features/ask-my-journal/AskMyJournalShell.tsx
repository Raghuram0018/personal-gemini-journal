import React, { useState, useEffect, useRef } from 'react';
import './ask-my-journal.css';
import {
  MessageSquareText,
  Sparkles,
  ShieldCheck,
  Send,
  Mic,
  BookOpen,
  ArrowRight,
  Bot,
  User,
  PlusCircle,
  CheckCircle2,
  Lock,
  Compass,
  Lightbulb,
  Target,
  Calendar,
  Music,
  Book,
} from 'lucide-react';
import { askMyJournalWithGemini } from '../../services/api.client';
import { getJournalsForUser } from '../journal/journalService';
import {
  getGoalsForUser,
  createGoalForUser,
  getBooksForUser,
  getMusicForUser,
  BookItem,
  MusicItem,
} from '../../services/canonicalService';
import { getCalendarEventsForUser } from '../calendar/calendarService';
import { getMoodHistory } from '../mood/moodService';
import { JournalEntry, AskMyJournalMessage, GoalTrack, CalendarEvent, MoodRecord } from '../../types';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';
import { getSettingsForUser } from '../settings/settingsService';

interface AskMyJournalShellProps {
  uid?: string;
  onNavigateHome?: () => void;
  initialQuery?: string;
}

export const AskMyJournalShell: React.FC<AskMyJournalShellProps> = ({
  uid,
  onNavigateHome,
  initialQuery,
}) => {
  const [messages, setMessages] = useState<AskMyJournalMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: "Hello! I'm your Personal Gemini Assistant. Ask me anything about your historical journal entries, life reflections, goal progress, reading library, music soundtrack, or calendar events.",
      timestamp: new Date().toISOString(),
      sources: [],
    },
  ]);

  const [input, setInput] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [musicItems, setMusicItems] = useState<MusicItem[]>([]);
  const [moodRecords, setMoodRecords] = useState<MoodRecord[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [approvedActionToast, setApprovedActionToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasTriggeredInitial = useRef(false);

  // Suggested prompts
  const starterPrompts = [
    'What goals and F1 circuit achievements have I completed so far?',
    'Summarize my life across Music, Books, Goals, Calendar, and Journal entries',
    'What progress have I made on my F1 goal circuit checkpoints?',
    'How do my reading habits and music soundtracks connect to my mood?',
  ];

  // Trigger initial query if provided
  useEffect(() => {
    if (initialQuery && !hasTriggeredInitial.current && uid && journals.length > 0) {
      hasTriggeredInitial.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery, uid, journals]);

  // Load user data across all 6 canonical life domains with Fail-Closed AI permissions
  useEffect(() => {
    if (!uid) return;
    const loadData = async () => {
      try {
        const [settingsData, j, g, c, b, m, mood] = await Promise.all([
          getSettingsForUser(uid),
          getJournalsForUser(uid),
          getGoalsForUser(uid),
          getCalendarEventsForUser(uid),
          getBooksForUser(uid),
          getMusicForUser(uid),
          getMoodHistory(uid),
        ]);

        const permissions = settingsData.aiPermissions;
        const loadedJ = permissions.journal ? j : [];
        const loadedG = permissions.goals ? g : [];
        const loadedC = permissions.calendar ? c : [];
        const loadedB = permissions.books ? b : [];
        const loadedM = permissions.music ? m : [];
        const loadedMood = permissions.mood ? mood : [];

        setJournals(loadedJ);
        setGoals(loadedG);
        setCalendarEvents(loadedC);
        setBooks(loadedB);
        setMusicItems(loadedM);
        setMoodRecords(loadedMood);

        // Update welcome message with dynamic default summary and insights
        const totalRecords = loadedJ.length + loadedG.length + loadedC.length + loadedB.length + loadedM.length + loadedMood.length;
        const defaultSummary = `Welcome to Ask My Journal! Your central life hub currently aggregates ${loadedJ.length} journal entries, ${loadedG.length} active goals, ${loadedC.length} calendar events, and ${loadedB.length + loadedM.length + loadedMood.length} library, music & mood records.`;
        const defaultInsights = [
          loadedG.length > 0 ? `Active Goals tracked: ${loadedG.map(goal => goal.title).slice(0, 3).join(', ')}` : 'No active goals recorded yet.',
          loadedMood.length > 0 ? `Latest Mood: ${loadedMood[0].mood} (${loadedMood[0].intensity}/10)` : 'No mood patterns recorded yet.',
          loadedC.length > 0 ? `Upcoming Calendar Events: ${loadedC.map(ev => `${ev.title} (${ev.date})`).slice(0, 2).join(', ')}` : 'No upcoming calendar events scheduled.',
        ];
        const defaultTips = [
          'Ask any question about your past reflections, goal progress, or schedule.',
          'Click any suggested prompt below or type your own question to chat with Gemini.'
        ];

        setMessages([
          {
            id: 'welcome-msg',
            sender: 'ai',
            text: "Hello! I'm your Personal Gemini Assistant. Ask me anything about your historical journal entries, life reflections, goal progress, reading library, music soundtrack, or calendar events.",
            timestamp: new Date().toISOString(),
            summary: defaultSummary,
            insights: defaultInsights,
            tips: defaultTips,
            sources: [
              ...loadedG.slice(0, 2).map(g => ({ id: g.id, title: g.title, type: 'goal' as const })),
              ...loadedC.slice(0, 2).map(c => ({ id: c.id, title: c.title, type: 'calendar' as const })),
              ...loadedJ.slice(0, 2).map(j => ({ id: j.id, title: j.title || 'Journal Entry', type: 'journal' as const })),
            ],
          },
        ]);
      } catch (err) {
        console.warn('Error loading user data for Ask My Journal:', err);
      }
    };
    loadData();
  }, [uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    setInput('');

    // Add user message
    const userMsg: AskMyJournalMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toISOString(),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      // Load fresh settings immediately before API transaction to enforce instant permission toggling
      const freshSettings = await getSettingsForUser(uid);
      const permissions = freshSettings.aiPermissions;

      // Send history and permitted non-private journals to Gemini endpoint
      const nonPrivateJournals = (journals || []).filter(
        (j) => j.privacy !== 'private' && j.privacy !== 'pin_locked'
      );

      const response = await askMyJournalWithGemini({
        query: queryText,
        conversationHistory: updatedHistory.slice(-8), // send last 8 messages
        journals: permissions.journal ? nonPrivateJournals : [],
        goals: permissions.goals ? goals : [],
        calendarEvents: permissions.calendar ? calendarEvents : [],
        books: permissions.books ? books : [],
        musicItems: permissions.music ? musicItems : [],
        moodRecords: permissions.mood ? moodRecords : [],
      });

      const assistantMsg: AskMyJournalMessage = {
        id: 'ast_' + Date.now(),
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toISOString(),
        sources: response.sources || [],
        summary: response.summary,
        insights: response.insights || [],
        tips: response.tips || [],
        actionSuggestion: response.actionSuggestion,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Ask My Journal error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'ai',
          text: 'I ran into an issue reflecting on your journals and life data. Please verify your connection and try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAction = async (action: any) => {
    if (!uid || !action) return;

    if (action.type === 'create_goal') {
      try {
        await createGoalForUser(uid, action.title, action.category || 'Career & Growth');
        setApprovedActionToast(`Created goal: "${action.title}"`);
        setTimeout(() => setApprovedActionToast(null), 3500);
      } catch (err) {
        console.error('Failed to create suggested goal:', err);
      }
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  return (
    <div className="w-full min-h-screen pb-24">
      <FeatureNavigation
        title="Ask My Journal & AI Assistant"
        onBack={onNavigateHome || (() => {})}
        onClose={onNavigateHome || (() => {})}
      />
      <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 pt-4">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/30 shadow-2xl backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
            <MessageSquareText className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-2">
              <span>Ask My Journal</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Grounded Gemini 3.8
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Conversational Q&A grounded strictly in your permitted life entries & canonical goals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>UID Isolated Data</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-purple-300 font-mono text-[11px] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Secrets & PINs Omitted</span>
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {approvedActionToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{approvedActionToast}</span>
        </div>
      )}

      {/* Chat Conversation Area */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl min-h-[420px] flex flex-col justify-between space-y-4">
        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl space-y-2.5 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-tr-none shadow-xl'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-inner'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* AI Cross-Life Synthesis Summary, Insights, and Tips */}
                {msg.summary && (
                  <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-bold uppercase text-[10px] tracking-wider">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Cross-Life Synthesis Summary</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-medium">{msg.summary}</p>
                  </div>
                )}

                {msg.insights && msg.insights.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold uppercase text-[10px] tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>AI Insights & Life Patterns</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {msg.insights.map((ins, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0">•</span>
                          <span>{ins}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.tips && msg.tips.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase text-[10px] tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>Actionable Guidance & Tips</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {msg.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 shrink-0">➔</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Grounded Source References across domains */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      <span>Grounded Life Evidence ({msg.sources.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src) => {
                        const icon =
                          src.type === 'goal'
                            ? '🎯 Goal: '
                            : src.type === 'calendar'
                            ? '📅 Calendar: '
                            : src.type === 'book'
                            ? '📚 Book: '
                            : src.type === 'music'
                            ? '🎵 Music: '
                            : src.type === 'mood'
                            ? '📊 Mood: '
                            : '📖 Journal: ';
                        return (
                          <span
                            key={src.id}
                            className="px-2.5 py-1 rounded-lg text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium"
                          >
                            {icon}{src.title}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* AI Action Suggestion (Human-in-control) */}
                {msg.actionSuggestion && (
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 text-purple-300 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>AI Suggestion: {msg.actionSuggestion.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Gemini detected a potential new goal from your recent journals. Would you like to save this to your goals?
                    </p>
                    <button
                      onClick={() => handleApproveAction(msg.actionSuggestion)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Approve & Save Goal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing / Thinking Indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-purple-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Searching your memory log & analyzing context...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 2 && (
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Suggested Questions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 pt-3 border-t border-slate-800/80"
        >
          <button
            type="button"
            onClick={toggleVoiceInput}
            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 animate-pulse'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Voice Command Input"
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-rose-400' : ''}`} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your journal (e.g. 'What was I worried about last month?')..."
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  </div>
);
};
