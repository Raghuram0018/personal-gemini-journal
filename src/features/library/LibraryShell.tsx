import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import {
  Book,
  BookChapter,
  BookNote,
  BookLearning,
  BookReadingSession,
  BookHighlight,
  BookJournalLink,
  BookGoalLink,
  JournalEntry,
  GoalTrack
} from '../../types';
import {
  getBooksForUser,
  saveBook,
  deleteBook,
  searchBooks,
  generateHighlightLearning,
  chatAboutBooks,
  convertBundledBookToBook
} from './booksService';
import { getBundledBooks, BundledBookData } from '../../data/bundledBooks';
import { getJournalsForUser, updateJournalForUser } from '../journal/journalService';
import { getGoalsForUser, updateGoalTrack } from '../goals/goalsService';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Play,
  Square,
  Sparkles,
  Clock,
  ArrowLeft,
  Bookmark,
  Award,
  CheckCircle,
  Check,
  Loader2,
  Calendar,
  TrendingUp,
  Send,
  Heart,
  ListTodo,
  Share2,
  X,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Library,
  BookMarked,
  Highlighter,
  FileText,
  Lightbulb,
  Sun,
  Moon,
  RotateCcw,
  PenTool,
  Tag
} from 'lucide-react';

export const LibraryShell: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid || 'authenticated-user-uid';

  // Core Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'shelf' | 'discover' | 'reader' | 'chat'>('shelf');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [bookDetailSubTab, setBookDetailSubTab] = useState<'overview' | 'chapters' | 'highlights' | 'notes' | 'learnings' | 'sessions' | 'connections'>('overview');

  // Reader State
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light' | 'sepia' | 'midnight'>('dark');
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [selectedText, setSelectedText] = useState<string>('');
  const readerContentRef = useRef<HTMLDivElement>(null);

  // Search/Discover State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<Book[]>([]);

  // Active Reading Stopwatch
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [showLogSessionModal, setShowLogSessionModal] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Note & Learning Creation Modals/Forms
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>('');
  const [showAddLearningModal, setShowAddLearningModal] = useState<boolean>(false);
  const [learningInput, setLearningInput] = useState<string>('');

  // Highlight Capture State
  const [highlightInput, setHighlightInput] = useState<string>('');
  const [highlightNoteInput, setHighlightNoteInput] = useState<string>('');
  const [synthesizingHighlight, setSynthesizingHighlight] = useState<boolean>(false);
  const [showHighlightModal, setShowHighlightModal] = useState<boolean>(false);

  // AI Companion Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string; sources?: any[] }>>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your Gemini Personal Book Companion. I can analyze your reading progress, explain chapters, synthesize key highlights, and discuss learnings across your digital shelf. What would you like to explore today?"
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Shelf Filter
  const [shelfFilter, setShelfFilter] = useState<'all' | 'reading' | 'completed' | 'want_to_read'>('all');

  // Load user books, journals, and goals on mount
  useEffect(() => {
    async function loadAllData() {
      if (!uid) return;
      try {
        setLoadingData(true);
        const [fetchedBooks, fetchedJournals, fetchedGoals] = await Promise.all([
          getBooksForUser(uid),
          getJournalsForUser(uid),
          getGoalsForUser(uid)
        ]);

        setBooks(fetchedBooks);
        setJournals(fetchedJournals);
        setGoals(fetchedGoals);

        // Initialize discovery search with bundled books
        const bundled = searchBooks('', 'all');
        setSearchResults(bundled.books);
      } catch (err) {
        console.error('[LibraryShell] Data load error:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadAllData();
  }, [uid]);

  // Active book helper
  const activeBook = books.find((b) => b.id === selectedBookId);

  // Sync current chapter index when selected book changes
  useEffect(() => {
    if (activeBook) {
      setCurrentChapterIndex(activeBook.currentChapterIndex || 0);
    }
  }, [selectedBookId]);

  // Stopwatch timer ticking
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading]);

  // Text selection listener inside Reader
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setSelectedText(selection.toString().trim());
    }
  };

  // Trigger search over local bundled catalog
  const handleSearchTrigger = (queryStr: string = searchQuery, catStr: string = selectedCategory) => {
    const res = searchBooks(queryStr, catStr);
    setSearchResults(res.books);
  };

  // Add bundled book to user's persistent shelf in Firestore
  const handleAddBookToShelf = async (book: Book, initialStatus: 'reading' | 'completed' | 'want_to_read' = 'want_to_read') => {
    try {
      const existing = books.find(b => b.id === book.id);
      if (existing) {
        setSelectedBookId(existing.id);
        setActiveTab('shelf');
        return;
      }

      const isCompleted = initialStatus === 'completed';
      const isReading = initialStatus === 'reading';

      const newBook: Book = {
        ...book,
        userId: uid,
        readingStatus: initialStatus,
        progress: isCompleted ? 100 : (isReading ? 10 : 0),
        currentPage: isCompleted ? (book.chapters?.length || 1) : 0,
        currentChapterIndex: 0,
        readingPosition: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        notes: [],
        learnings: [],
        readingSessions: [],
        highlights: [],
        journalLinks: [],
        goalLinks: []
      };

      await saveBook(uid, newBook);
      setBooks((prev) => [newBook, ...prev]);
      setSelectedBookId(newBook.id);
      setActiveTab('shelf');
    } catch (err) {
      console.error('[LibraryShell] Error adding book to shelf:', err);
    }
  };

  // Open book in actual Reader
  const handleOpenReader = (book: Book, startChapter: number = 0) => {
    let bookToOpen = books.find(b => b.id === book.id);
    if (!bookToOpen) {
      // Auto-add to shelf if not present
      handleAddBookToShelf(book, 'reading');
      bookToOpen = book;
    } else if (bookToOpen.readingStatus === 'want_to_read') {
      // Auto transition to reading
      handleUpdateBookStatus(bookToOpen.id, 'reading');
    }

    setSelectedBookId(bookToOpen.id);
    setCurrentChapterIndex(startChapter || bookToOpen.currentChapterIndex || 0);
    setActiveTab('reader');
  };

  // Update book status in Firestore
  const handleUpdateBookStatus = async (bookId: string, status: 'reading' | 'completed' | 'want_to_read') => {
    const target = books.find(b => b.id === bookId);
    if (!target) return;

    const isCompleted = status === 'completed';
    const updated: Book = {
      ...target,
      readingStatus: status,
      progress: isCompleted ? 100 : (status === 'want_to_read' ? 0 : target.progress || 10),
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === bookId ? updated : b));
    await saveBook(uid, updated);
  };

  // Remove book from Shelf
  const handleRemoveBook = async (bookId: string) => {
    if (!window.confirm('Are you sure you want to remove this book from your digital shelf?')) return;
    try {
      await deleteBook(uid, bookId);
      setBooks(prev => prev.filter(b => b.id !== bookId));
      if (selectedBookId === bookId) setSelectedBookId(null);
    } catch (err) {
      console.error('[LibraryShell] Error deleting book:', err);
    }
  };

  // Navigate chapters in Reader and record reading position & progress
  const handleChapterChange = async (newChapterIndex: number) => {
    if (!activeBook || !activeBook.chapters || activeBook.chapters.length === 0) return;

    const totalChaps = activeBook.chapters.length;
    const clampedIndex = Math.max(0, Math.min(newChapterIndex, totalChaps - 1));
    setCurrentChapterIndex(clampedIndex);

    const calculatedProgress = Math.min(100, Math.round(((clampedIndex + 1) / totalChaps) * 100));
    const isCompleted = calculatedProgress === 100;

    const updatedBook: Book = {
      ...activeBook,
      currentChapterIndex: clampedIndex,
      progress: calculatedProgress,
      currentPage: clampedIndex + 1,
      readingStatus: isCompleted ? 'completed' : 'reading',
      completedAt: isCompleted ? (activeBook.completedAt || new Date().toISOString()) : undefined,
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    await saveBook(uid, updatedBook);

    // Scroll reader to top
    if (readerContentRef.current) {
      readerContentRef.current.scrollTop = 0;
    }
  };

  // Log active stopwatch reading session
  const saveLoggedReadingSession = async () => {
    if (!activeBook) return;
    try {
      const sessionDuration = timerSeconds;
      const currentCh = currentChapterIndex + 1;

      const newSession: BookReadingSession = {
        id: `session-${Date.now()}`,
        startedAt: new Date(Date.now() - sessionDuration * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        duration: sessionDuration,
        progressBefore: activeBook.progress,
        progressAfter: activeBook.progress,
        notes: sessionNotes,
        createdAt: new Date().toISOString()
      };

      const updatedSessions = [...(activeBook.readingSessions || []), newSession];
      const updatedBook: Book = {
        ...activeBook,
        readingSessions: updatedSessions,
        updatedAt: new Date().toISOString()
      };

      setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
      await saveBook(uid, updatedBook);

      setShowLogSessionModal(false);
      setTimerActive(false);
      setTimerSeconds(0);
      setSessionNotes('');
    } catch (err) {
      console.error('[LibraryShell] Error saving reading session:', err);
    }
  };

  // Capture highlight & generate AI synthesis
  const handleSaveHighlight = async (textToHighlight: string, userNote: string = '') => {
    if (!activeBook || !textToHighlight.trim()) return;

    try {
      setSynthesizingHighlight(true);
      const currentChap = activeBook.chapters?.[currentChapterIndex];
      const chapterLabel = currentChap?.title || `Chapter ${currentChapterIndex + 1}`;

      const synthesis = await generateHighlightLearning({
        text: textToHighlight,
        bookTitle: activeBook.title,
        bookAuthor: activeBook.authors.join(', ')
      });

      const newHighlight: BookHighlight = {
        id: `hl-${Date.now()}`,
        text: textToHighlight,
        chapter: chapterLabel,
        createdAt: new Date().toISOString(),
        userNote: userNote || undefined,
        aiLearningNote: synthesis,
        aiTags: synthesis.tags
      };

      const updatedHighlights = [...(activeBook.highlights || []), newHighlight];
      const updatedBook: Book = {
        ...activeBook,
        highlights: updatedHighlights,
        updatedAt: new Date().toISOString()
      };

      setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
      await saveBook(uid, updatedBook);

      setSelectedText('');
      setHighlightInput('');
      setHighlightNoteInput('');
      setShowHighlightModal(false);
    } catch (err) {
      console.error('[LibraryShell] Error saving highlight:', err);
    } finally {
      setSynthesizingHighlight(false);
    }
  };

  // Add personal Note to book
  const handleSaveNote = async (text: string) => {
    if (!activeBook || !text.trim()) return;

    const currentChap = activeBook.chapters?.[currentChapterIndex];
    const newNote: BookNote = {
      id: `note-${Date.now()}`,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChap?.title || `Chapter ${currentChapterIndex + 1}`,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [...(activeBook.notes || []), newNote];
    const updatedBook: Book = {
      ...activeBook,
      notes: updatedNotes,
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    await saveBook(uid, updatedBook);

    setNoteInput('');
    setShowAddNoteModal(false);
  };

  // Add Learning ("What I Learned")
  const handleSaveLearning = async (text: string) => {
    if (!activeBook || !text.trim()) return;

    const currentChap = activeBook.chapters?.[currentChapterIndex];
    const newLearning: BookLearning = {
      id: `learn-${Date.now()}`,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChap?.title || `Chapter ${currentChapterIndex + 1}`,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedLearnings = [...(activeBook.learnings || []), newLearning];
    const updatedBook: Book = {
      ...activeBook,
      learnings: updatedLearnings,
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    await saveBook(uid, updatedBook);

    setLearningInput('');
    setShowAddLearningModal(false);
  };

  // Bi-directional connections to Journal & Goal
  const handleLinkJournal = async (journalId: string) => {
    if (!activeBook || !journalId) return;
    const target = journals.find(j => j.id === journalId);
    if (!target) return;

    if (activeBook.journalLinks?.some(l => l.journalEntryId === journalId)) return;

    const newLink: BookJournalLink = {
      id: `link-j-${Date.now()}`,
      journalEntryId: journalId,
      journalTitle: target.title,
      relationshipType: 'explicit',
      createdAt: new Date().toISOString()
    };

    const updatedBook: Book = {
      ...activeBook,
      journalLinks: [...(activeBook.journalLinks || []), newLink],
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    await saveBook(uid, updatedBook);

    // Sync journal
    const linked = target.linkedBookIds || [];
    if (!linked.includes(activeBook.id)) {
      await updateJournalForUser(uid, journalId, { linkedBookIds: [...linked, activeBook.id] });
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, linkedBookIds: [...linked, activeBook.id] } : j));
    }
  };

  const handleLinkGoal = async (goalId: string) => {
    if (!activeBook || !goalId) return;
    const target = goals.find(g => g.id === goalId);
    if (!target) return;

    if (activeBook.goalLinks?.some(l => l.goalId === goalId)) return;

    const newLink: BookGoalLink = {
      id: `link-g-${Date.now()}`,
      goalId: goalId,
      goalTitle: target.title,
      relationshipType: 'user_added',
      createdAt: new Date().toISOString()
    };

    const updatedBook: Book = {
      ...activeBook,
      goalLinks: [...(activeBook.goalLinks || []), newLink],
      updatedAt: new Date().toISOString()
    };

    setBooks(prev => prev.map(b => b.id === activeBook.id ? updatedBook : b));
    await saveBook(uid, updatedBook);

    // Sync goal
    const related = target.relatedBookIds || [];
    if (!related.includes(activeBook.id)) {
      await updateGoalTrack(uid, goalId, { relatedBookIds: [...related, activeBook.id] });
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, relatedBookIds: [...related, activeBook.id] } : g));
    }
  };

  // Conversational AI Book Companion Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await chatAboutBooks({
        message: userMsg,
        books
      });

      setChatMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: response.text,
          sources: response.sources
        }
      ]);
    } catch (err) {
      console.error('[LibraryShell] AI Companion error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Format stopwatch seconds
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reader Theme Color Classes
  const getThemeStyles = () => {
    switch (readerTheme) {
      case 'light':
        return 'bg-amber-50 text-slate-900 border-amber-200';
      case 'sepia':
        return 'bg-[#f8f1e5] text-[#433422] border-[#e8d7be]';
      case 'midnight':
        return 'bg-[#0b0f19] text-[#e2e8f0] border-slate-800';
      case 'dark':
      default:
        return 'bg-slate-950 text-slate-100 border-slate-800';
    }
  };

  // Filtered shelf books
  const filteredShelfBooks = books.filter(b => {
    if (shelfFilter === 'all') return true;
    return b.readingStatus === shelfFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-purple-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                Digital Library
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Bundled Public Domain Books • Active Reader • Highlights & AI Companion
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('shelf')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'shelf'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>My Shelf</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
                {books.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'discover'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Browse Catalog</span>
            </button>

            {activeBook && (
              <button
                onClick={() => setActiveTab('reader')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'reader'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                    : 'text-purple-400 hover:text-purple-300 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Reader</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'chat'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Companion</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Loading your digital shelf & books...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* 1. MY SHELF TAB */}
            {activeTab === 'shelf' && (
              <motion.div
                key="tab-shelf"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Shelf Filters & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">Filter Status:</span>
                    {(['all', 'reading', 'completed', 'want_to_read'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setShelfFilter(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
                          shelfFilter === st
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {st === 'all' ? 'All Books' : st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setActiveTab('discover')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Browse Public Catalog</span>
                  </button>
                </div>

                {/* Empty State */}
                {filteredShelfBooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-800 gap-4">
                    <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-200">No books found on your shelf</h3>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Select a public domain classic from our built-in library to start reading immediately.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                    >
                      Browse Catalog
                    </button>
                  </div>
                ) : (
                  /* Shelf Books Grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredShelfBooks.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          setSelectedBookId(b.id);
                          setBookDetailSubTab('overview');
                        }}
                        className={`group relative flex flex-col justify-between bg-slate-900/70 hover:bg-slate-900 border p-5 rounded-2xl transition-all cursor-pointer shadow-xl ${
                          selectedBookId === b.id
                            ? 'border-amber-500/60 ring-2 ring-amber-500/20 bg-slate-900/90'
                            : 'border-slate-800/90 hover:border-slate-700'
                        }`}
                      >
                        {/* Status Tag */}
                        <div className="absolute top-4 right-4 z-10">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.readingStatus === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : b.readingStatus === 'reading'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {b.readingStatus.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Top Book Info */}
                        <div className="flex gap-4">
                          <img
                            src={b.coverUrl}
                            alt={b.title}
                            className="w-20 h-28 object-cover rounded-xl shadow-md border border-slate-700/50 group-hover:scale-105 transition-transform"
                          />
                          <div className="flex-1 min-w-0 pr-16">
                            <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-2">
                              {b.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{b.authors.join(', ')}</p>

                            <div className="flex flex-wrap gap-1 mt-2">
                              {b.categories.slice(0, 2).map((c, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700/60"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar & Actions */}
                        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                              <span>Reading Progress</span>
                              <span className="text-amber-400 font-bold">{b.progress}%</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${b.progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReader(b, b.currentChapterIndex || 0);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-all"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{b.progress > 0 ? 'Continue Reading' : 'Start Reading'}</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveBook(b.id);
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove from shelf"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Book Workspace / Details Panel */}
                {activeBook && (
                  <div className="mt-8 bg-slate-900/80 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl backdrop-blur-xl">
                    {/* Header Banner */}
                    <div className="flex flex-col md:flex-row items-start gap-6 border-b border-slate-800 pb-6">
                      <img
                        src={activeBook.coverUrl}
                        alt={activeBook.title}
                        className="w-32 h-44 object-cover rounded-2xl shadow-2xl border border-slate-700/80"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Public Domain Classic
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                            {activeBook.chapters?.length || 0} Chapters
                          </span>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-100">{activeBook.title}</h2>
                        <p className="text-sm font-medium text-amber-400/90">{activeBook.authors.join(', ')}</p>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">{activeBook.description}</p>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            onClick={() => handleOpenReader(activeBook, activeBook.currentChapterIndex || 0)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20 transition-all"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{activeBook.progress > 0 ? 'Continue Reading' : 'Read Now'}</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveTab('chat');
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>AI Companion</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Book Detail Sub-Tabs */}
                    <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
                      {(['overview', 'chapters', 'highlights', 'notes', 'learnings', 'sessions', 'connections'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setBookDetailSubTab(tab)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                            bookDetailSubTab === tab
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          {tab === 'learnings' ? 'What I Learned' : tab}
                        </button>
                      ))}
                    </div>

                    {/* Sub-Tab Contents */}
                    <div className="pt-2">
                      {/* Overview */}
                      {bookDetailSubTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <span className="text-xs text-slate-400">Total Highlights</span>
                            <p className="text-2xl font-bold text-amber-400">{activeBook.highlights?.length || 0}</p>
                          </div>
                          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <span className="text-xs text-slate-400">Personal Notes</span>
                            <p className="text-2xl font-bold text-cyan-400">{activeBook.notes?.length || 0}</p>
                          </div>
                          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                            <span className="text-xs text-slate-400">Learnings Saved</span>
                            <p className="text-2xl font-bold text-emerald-400">{activeBook.learnings?.length || 0}</p>
                          </div>
                        </div>
                      )}

                      {/* Chapters List */}
                      {bookDetailSubTab === 'chapters' && (
                        <div className="space-y-3">
                          {activeBook.chapters?.map((ch, idx) => (
                            <div
                              key={ch.id}
                              onClick={() => handleOpenReader(activeBook, idx)}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                activeBook.currentChapterIndex === idx
                                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400">
                                  {idx + 1}
                                </span>
                                <h4 className="text-sm font-semibold">{ch.title}</h4>
                              </div>
                              <button className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300">
                                <span>Read</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Highlights */}
                      {bookDetailSubTab === 'highlights' && (
                        <div className="space-y-4">
                          {(!activeBook.highlights || activeBook.highlights.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">No highlights recorded yet. Select text in the Reader to capture quotes!</p>
                          ) : (
                            activeBook.highlights.map((hl) => (
                              <div key={hl.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                                <p className="text-sm text-amber-200/90 italic font-serif">"{hl.text}"</p>
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{hl.chapter || 'Chapter Quote'}</span>
                                  <span>{new Date(hl.createdAt).toLocaleDateString()}</span>
                                </div>
                                {hl.aiLearningNote && (
                                  <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                                    <p className="font-bold">AI Takeaway: {hl.aiLearningNote.learningTakeaway}</p>
                                    <p className="text-slate-300">{hl.aiLearningNote.explanation}</p>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {bookDetailSubTab === 'notes' && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setShowAddNoteModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Personal Note</span>
                          </button>

                          {(!activeBook.notes || activeBook.notes.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">No personal notes recorded yet.</p>
                          ) : (
                            activeBook.notes.map((nt) => (
                              <div key={nt.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                                <p className="text-sm text-slate-200">{nt.text}</p>
                                <div className="text-[11px] text-slate-500">
                                  {nt.chapterTitle || 'General Note'} • {new Date(nt.createdAt).toLocaleString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Learnings */}
                      {bookDetailSubTab === 'learnings' && (
                        <div className="space-y-4">
                          <button
                            onClick={() => setShowAddLearningModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                          >
                            <Lightbulb className="w-4 h-4" />
                            <span>Record What I Learned</span>
                          </button>

                          {(!activeBook.learnings || activeBook.learnings.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">No key learnings saved yet.</p>
                          ) : (
                            activeBook.learnings.map((lr) => (
                              <div key={lr.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                                <p className="text-sm text-emerald-300 font-medium">{lr.text}</p>
                                <div className="text-[11px] text-slate-500">
                                  {lr.chapterTitle || 'Chapter Reflection'} • {new Date(lr.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Sessions */}
                      {bookDetailSubTab === 'sessions' && (
                        <div className="space-y-3">
                          {(!activeBook.readingSessions || activeBook.readingSessions.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">No active reading stopwatch sessions recorded yet.</p>
                          ) : (
                            activeBook.readingSessions.map((s) => (
                              <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                                <div>
                                  <span className="font-bold text-amber-400">{formatTimer(s.duration || 0)} spent</span>
                                  {s.notes && <p className="text-slate-300 mt-1">{s.notes}</p>}
                                </div>
                                <span className="text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Life Connections */}
                      {bookDetailSubTab === 'connections' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Linked Journals */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Linked Journals</h4>
                            <div className="space-y-2">
                              {journals.slice(0, 4).map((j) => {
                                const isLinked = activeBook.journalLinks?.some((l) => l.journalEntryId === j.id);
                                return (
                                  <div key={j.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                                    <span className="text-slate-200 truncate max-w-[200px]">{j.title || 'Untitled Journal'}</span>
                                    <button
                                      onClick={() => handleLinkJournal(j.id)}
                                      disabled={isLinked}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                        isLinked
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                      }`}
                                    >
                                      {isLinked ? 'Linked' : 'Link'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Linked Goals */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Linked Goals</h4>
                            <div className="space-y-2">
                              {goals.slice(0, 4).map((g) => {
                                const isLinked = activeBook.goalLinks?.some((l) => l.goalId === g.id);
                                return (
                                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                                    <span className="text-slate-200 truncate max-w-[200px]">{g.title}</span>
                                    <button
                                      onClick={() => handleLinkGoal(g.id)}
                                      disabled={isLinked}
                                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                        isLinked
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                                      }`}
                                    >
                                      {isLinked ? 'Linked' : 'Link'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. BROWSE CATALOG TAB */}
            {activeTab === 'discover' && (
              <motion.div
                key="tab-discover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Search Bar & Categories */}
                <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          handleSearchTrigger(e.target.value, selectedCategory);
                        }}
                        placeholder="Search built-in public domain classics by title or author..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
                      />
                    </div>
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['all', 'Classic Literature', 'Fantasy', 'Mystery', 'Romance', 'Sci-Fi', 'Children'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          handleSearchTrigger(searchQuery, cat);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === cat
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat === 'all' ? 'All Genres' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catalog Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((b) => {
                    const isSaved = books.some((bk) => bk.id === b.id);
                    return (
                      <div
                        key={b.id}
                        className="bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 p-5 rounded-2xl flex flex-col justify-between transition-all space-y-4"
                      >
                        <div className="flex gap-4">
                          <img
                            src={b.coverUrl}
                            alt={b.title}
                            className="w-24 h-32 object-cover rounded-xl shadow-lg border border-slate-700/50"
                          />
                          <div className="flex-1 space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Public Domain
                            </span>
                            <h3 className="text-sm font-bold text-slate-100 line-clamp-2 mt-1">{b.title}</h3>
                            <p className="text-xs text-slate-400">{b.authors.join(', ')}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{b.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={() => handleAddBookToShelf(b, 'want_to_read')}
                            disabled={isSaved}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                              isSaved
                                ? 'bg-slate-800/80 text-emerald-400 border border-slate-700'
                                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                            }`}
                          >
                            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{isSaved ? 'In Your Shelf' : 'Add to Shelf'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenReader(b, 0)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Now</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 3. ACTUAL IN-APP READER TAB */}
            {activeTab === 'reader' && activeBook && (
              <motion.div
                key="tab-reader"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4"
              >
                {/* Reader Controls Toolbar */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('shelf')}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Back to Shelf"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 line-clamp-1">{activeBook.title}</h2>
                      <p className="text-xs text-amber-400 font-medium">
                        {activeBook.chapters?.[currentChapterIndex]?.title || `Chapter ${currentChapterIndex + 1}`}
                      </p>
                    </div>
                  </div>

                  {/* Chapter Navigation & Reader Settings */}
                  <div className="flex items-center gap-3">
                    {/* Chapter Select Dropdown */}
                    <select
                      value={currentChapterIndex}
                      onChange={(e) => handleChapterChange(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500/60"
                    >
                      {activeBook.chapters?.map((ch, idx) => (
                        <option key={ch.id} value={idx}>
                          {ch.title}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => handleChapterChange(currentChapterIndex - 1)}
                        disabled={currentChapterIndex === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-bold text-amber-400 px-2">
                        {currentChapterIndex + 1} / {activeBook.chapters?.length || 1}
                      </span>
                      <button
                        onClick={() => handleChapterChange(currentChapterIndex + 1)}
                        disabled={currentChapterIndex >= (activeBook.chapters?.length || 1) - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Font Size & Theme Toggles */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setReaderFontSize(Math.max(14, readerFontSize - 2))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300"
                      >
                        A-
                      </button>
                      <button
                        onClick={() => setReaderFontSize(Math.min(26, readerFontSize + 2))}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300"
                      >
                        A+
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      {(['dark', 'light', 'sepia', 'midnight'] as const).map((th) => (
                        <button
                          key={th}
                          onClick={() => setReaderTheme(th)}
                          className={`w-6 h-6 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            readerTheme === th ? 'ring-2 ring-amber-500 scale-105' : 'opacity-60 hover:opacity-100'
                          } ${
                            th === 'light'
                              ? 'bg-amber-100 text-slate-900'
                              : th === 'sepia'
                              ? 'bg-[#f8f1e5] text-[#433422]'
                              : th === 'midnight'
                              ? 'bg-[#0b0f19] text-white'
                              : 'bg-slate-900 text-white'
                          }`}
                          title={`Theme: ${th}`}
                        >
                          {th[0]}
                        </button>
                      ))}
                    </div>

                    {/* Stopwatch Reading Session */}
                    <div className="flex items-center gap-2">
                      {!timerActive ? (
                        <button
                          onClick={() => setTimerActive(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Timer</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowLogSessionModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 animate-pulse"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>{formatTimer(timerSeconds)} Log</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Floating Selection Action Bar */}
                {selectedText && (
                  <div className="bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs font-medium italic line-clamp-1">"{selectedText}"</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setHighlightInput(selectedText);
                          setShowHighlightModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-950 text-amber-300 hover:bg-slate-900"
                      >
                        Highlight & Synthesize
                      </button>
                      <button
                        onClick={() => setSelectedText('')}
                        className="p-1 hover:bg-amber-600 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Reader Main Content Paper Container */}
                <div
                  ref={readerContentRef}
                  onMouseUp={handleTextSelection}
                  className={`p-8 md:p-12 rounded-3xl border shadow-2xl min-h-[600px] transition-all font-serif leading-relaxed ${getThemeStyles()}`}
                  style={{ fontSize: `${readerFontSize}px` }}
                >
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="border-b pb-4 mb-8 border-current/20 flex items-center justify-between font-sans text-xs opacity-70">
                      <span>{activeBook.title}</span>
                      <span>{activeBook.chapters?.[currentChapterIndex]?.title}</span>
                    </div>

                    <h2 className="text-2xl font-bold font-sans tracking-tight mb-6 opacity-90">
                      {activeBook.chapters?.[currentChapterIndex]?.title}
                    </h2>

                    <div className="whitespace-pre-line space-y-4">
                      {activeBook.chapters?.[currentChapterIndex]?.content}
                    </div>

                    {/* Chapter Bottom Navigation */}
                    <div className="pt-12 mt-12 border-t border-current/20 flex items-center justify-between font-sans">
                      <button
                        onClick={() => handleChapterChange(currentChapterIndex - 1)}
                        disabled={currentChapterIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-current/10 hover:bg-current/20 disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous Chapter</span>
                      </button>

                      <button
                        onClick={() => handleChapterChange(currentChapterIndex + 1)}
                        disabled={currentChapterIndex >= (activeBook.chapters?.length || 1) - 1}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                      >
                        <span>Next Chapter</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. AI COMPANION TAB */}
            {activeTab === 'chat' && (
              <motion.div
                key="tab-chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl space-y-6 shadow-2xl min-h-[600px] flex flex-col justify-between"
              >
                <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">AI Book Companion</h3>
                      <p className="text-xs text-slate-400">Discuss chapters, highlights & learnings from your digital library</p>
                    </div>
                  </div>
                </div>

                {/* Conversation Scroll Area */}
                <div className="flex-1 space-y-4 overflow-y-auto max-h-[450px] pr-2">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-amber-500 text-slate-950 font-medium'
                            : 'bg-slate-950/80 text-slate-200 border border-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini Companion is analyzing your library context...</span>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Gemini about your books, key chapters, or captured highlights..."
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-5 py-3 rounded-2xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>Ask</span>
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Log Session Modal */}
      {showLogSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Log Reading Session</h3>
            <p className="text-xs text-amber-400 font-semibold">Time Spent: {formatTimer(timerSeconds)}</p>

            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Add optional notes about what you read during this session..."
              className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500/60"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowLogSessionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={saveLoggedReadingSession}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
              >
                Save Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlight & AI Synthesis Modal */}
      {showHighlightModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Save Highlight & AI Learning Note</h3>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs italic text-amber-200">
              "{highlightInput}"
            </div>

            <input
              type="text"
              value={highlightNoteInput}
              onChange={(e) => setHighlightNoteInput(e.target.value)}
              placeholder="Add optional personal note..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500/60"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowHighlightModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveHighlight(highlightInput, highlightNoteInput)}
                disabled={synthesizingHighlight}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 flex items-center gap-2"
              >
                {synthesizingHighlight && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Synthesize & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Add Personal Note</h3>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write your note for this book..."
              className="w-full h-28 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60"
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowAddNoteModal(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400">
                Cancel
              </button>
              <button
                onClick={() => handleSaveNote(noteInput)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Learning Modal */}
      {showAddLearningModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">Record What I Learned</h3>
            <textarea
              value={learningInput}
              onChange={(e) => setLearningInput(e.target.value)}
              placeholder="What core concept or lesson did you take away from this reading?"
              className="w-full h-28 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500/60"
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setShowAddLearningModal(false)} className="px-4 py-2 rounded-xl text-xs text-slate-400">
                Cancel
              </button>
              <button
                onClick={() => handleSaveLearning(learningInput)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                Save Learning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
