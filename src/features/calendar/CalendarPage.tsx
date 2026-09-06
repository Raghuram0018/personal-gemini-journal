import React, { useState, useEffect, useMemo } from 'react';
import './calendar.css';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MapPin,
  Tag,
  Repeat,
  Bell,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Target,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';
import { CalendarEvent, CalendarTask, GoalTrack, BookMemory, DailyRoutineTask, JournalEntry } from '../../types';
import {
  getCalendarEventsForUser,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarTasksForUser,
  createCalendarTask,
  updateCalendarTask,
  deleteCalendarTask,
  detectCalendarConflicts,
  ConflictPair,
  formatDateLocal,
} from './calendarService';
import {
  getDailyRoutinesForUser,
  createDailyRoutineTask,
  updateDailyRoutineTask,
  deleteDailyRoutineTask,
  toggleDailyRoutineCompletionToday,
  syncDailyRoutineNotifications,
} from './dailyRoutineService';
import { getGoalsForUser } from '../goals/goalsService';
import { getJournalsForUser } from '../journal/journalService';

interface CalendarPageProps {
  uid: string;
  onBackToHome?: () => void;
  onNavigateToGoal?: (goalId: string) => void;
  onNavigateToBook?: (bookId: string) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  uid,
  onBackToHome,
  onNavigateToGoal,
  onNavigateToBook,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [goals, setGoals] = useState<GoalTrack[]>([]);
  const [routines, setRoutines] = useState<DailyRoutineTask[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View state: 'month' | 'week' | 'day' | 'routine'
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'routine'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'event' | 'task' | 'routine'>('event');

  // Event Form State
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDateStr, setEventDateStr] = useState(formatDateLocal(new Date()));
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventCategory, setEventCategory] = useState('Meeting');
  const [eventReminder, setEventReminder] = useState('30_min');
  const [eventRepeat, setEventRepeat] = useState('none');
  const [eventRelatedGoalId, setEventRelatedGoalId] = useState('');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(formatDateLocal(new Date()));
  const [taskDueTime, setTaskDueTime] = useState('14:00');
  const [taskPriority, setTaskPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [taskRelatedGoalId, setTaskRelatedGoalId] = useState('');

  // Daily Routine Form State
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineCategory, setRoutineCategory] = useState<'Morning' | 'Afternoon' | 'Evening' | 'Health' | 'Mindfulness' | 'Study' | 'General'>('Morning');
  const [routineTime, setRoutineTime] = useState('08:00');
  const [routinePriority, setRoutinePriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [routineActive, setRoutineActive] = useState<boolean>(true);

  // Gemini Smart Scheduling State
  const [smartQuery, setSmartQuery] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState<{
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
  } | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedEvts, fetchedTasks, fetchedGoals, fetchedRoutines, fetchedJournals] = await Promise.all([
        getCalendarEventsForUser(uid),
        getCalendarTasksForUser(uid),
        getGoalsForUser(uid),
        getDailyRoutinesForUser(uid),
        getJournalsForUser(uid),
      ]);
      setEvents(fetchedEvts);
      setTasks(fetchedTasks);
      setGoals(fetchedGoals);
      setRoutines(fetchedRoutines);
      setJournals(fetchedJournals || []);

      // Auto-sync daily routine notifications for today
      await syncDailyRoutineNotifications(uid);
    } catch (err) {
      console.warn('[CalendarPage] Error loading calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uid]);

  // Conflict Detection
  const conflicts = useMemo(() => {
    return detectCalendarConflicts(events);
  }, [events]);

  // High Load / Density Days (3+ events)
  const highDensityDays = useMemo(() => {
    const days: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      if (!e.date) return;
      if (!days[e.date]) days[e.date] = [];
      days[e.date].push(e);
    });
    return Object.entries(days)
      .filter(([_, list]) => list.length >= 3)
      .map(([date, list]) => ({ date, count: list.length, list }));
  }, [events]);

  // Scoring event priorities for smart advisors
  const getEventPriorityScore = (evt: CalendarEvent): number => {
    const cat = (evt.category || '').toLowerCase();
    const title = (evt.title || '').toLowerCase();
    
    if (title.includes('interview') || title.includes('exam') || title.includes('test') || title.includes('meeting')) {
      return 100;
    }
    if (cat === 'meeting' || cat === 'work' || cat === 'health') {
      return 80;
    }
    if (cat === 'personal') {
      return 50;
    }
    if (cat === 'study' || cat === 'routine') {
      return 30;
    }
    return 40;
  };

  // Automatically reschedule lower-priority items by 2 hours
  const handleSmartReschedule = async (eventToMove: CalendarEvent) => {
    try {
      const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h + (m || 0) / 60;
      };
      const formatTime = (hours: number) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const startH = parseTime(eventToMove.startTime || '09:00');
      const endH = parseTime(eventToMove.endTime || '10:00');
      const duration = endH - startH;

      let newStartH = startH + 2;
      if (newStartH > 22) newStartH = 14; // fallback safety
      let newEndH = newStartH + duration;

      const newStartTime = formatTime(newStartH);
      const newEndTime = formatTime(newEndH);

      await updateCalendarEvent(uid, eventToMove.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });

      setSuccessToast(`Successfully optimized! Rescheduled "${eventToMove.title}" to ${newStartTime} - ${newEndTime}.`);
      setTimeout(() => setSuccessToast(null), 4000);
      loadData();
    } catch (err) {
      console.error('[CalendarPage] Smart Reschedule failed:', err);
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (currentView === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (currentView === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (currentView === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (currentView === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Create Event Submit
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!eventTitle.trim()) {
      setFormError('Please enter an event title');
      return;
    }
    if (!eventDateStr) {
      setFormError('Please select an event date');
      return;
    }
    if (eventStartTime && eventEndTime && eventEndTime <= eventStartTime) {
      setFormError('End time must be after start time');
      return;
    }

    try {
      const created = await createCalendarEvent(uid, {
        title: eventTitle.trim(),
        description: eventDesc.trim() || undefined,
        date: eventDateStr,
        startTime: eventStartTime || undefined,
        endTime: eventEndTime || undefined,
        location: eventLocation.trim() || undefined,
        category: eventCategory,
        reminder: eventReminder as any,
        repeat: eventRepeat as any,
        relatedGoalIds: eventRelatedGoalId ? [eventRelatedGoalId] : [],
      });

      setEvents((prev) => [created, ...prev]);
      setShowModal(false);
      setEventTitle('');
      setEventDesc('');
      setSuccessToast(`Event "${created.title}" scheduled successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create event');
    }
  };

  // Create Task Submit
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!taskTitle.trim()) {
      setFormError('Please enter a task title');
      return;
    }
    if (!taskDueDate) {
      setFormError('Please select a due date');
      return;
    }

    try {
      const created = await createCalendarTask(uid, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        dueDate: taskDueDate,
        dueTime: taskDueTime || undefined,
        priority: taskPriority,
        status: 'pending',
        reminder: '15_min',
        relatedGoalIds: taskRelatedGoalId ? [taskRelatedGoalId] : [],
      });

      setTasks((prev) => [created, ...prev]);
      setShowModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setSuccessToast(`Task "${created.title}" created successfully!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create task');
    }
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (task: CalendarTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated = await updateCalendarTask(uid, task.id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
  };

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    await deleteCalendarEvent(uid, id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    await deleteCalendarTask(uid, id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Create Routine Submit
  const handleCreateRoutineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!routineTitle.trim()) {
      setFormError('Please enter a daily routine task title');
      return;
    }

    try {
      const created = await createDailyRoutineTask(uid, {
        title: routineTitle.trim(),
        category: routineCategory,
        scheduledTime: routineTime,
        priority: routinePriority,
        isActive: routineActive,
      });

      setRoutines((prev) => [...prev, created]);
      setShowModal(false);
      setRoutineTitle('');
      setSuccessToast(`Daily Routine "${created.title}" created with daily notifications!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create daily routine task');
    }
  };

  // Toggle Routine Completion for Today
  const handleToggleRoutineCompletion = async (routineId: string) => {
    try {
      const updated = await toggleDailyRoutineCompletionToday(uid, routineId);
      setRoutines((prev) => prev.map((r) => (r.id === routineId ? updated : r)));
    } catch (err) {
      console.warn('Failed to toggle routine completion:', err);
    }
  };

  // Toggle Routine Active Switch (Daily Notifications)
  const handleToggleRoutineActive = async (routine: DailyRoutineTask) => {
    try {
      const updated = await updateDailyRoutineTask(uid, routine.id, { isActive: !routine.isActive });
      setRoutines((prev) => prev.map((r) => (r.id === routine.id ? updated : r)));
      if (updated.isActive) {
        setSuccessToast(`Daily notifications active for "${routine.title}"!`);
      } else {
        setSuccessToast(`Daily notifications paused for "${routine.title}".`);
      }
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.warn('Failed to toggle routine active state:', err);
    }
  };

  // Delete Routine
  const handleDeleteRoutine = async (routineId: string) => {
    try {
      await deleteDailyRoutineTask(uid, routineId);
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch (err) {
      console.warn('Failed to delete routine task:', err);
    }
  };

  // Manual Sync Routine Notifications
  const handleManualSyncRoutineNotifs = async () => {
    const count = await syncDailyRoutineNotifications(uid);
    setSuccessToast(`Synchronized daily routine notifications! (${count} notification(s) added for today)`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Gemini Smart Scheduling Request
  const handleSmartScheduleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartQuery.trim()) return;

    setSmartLoading(true);
    setSmartSuggestion(null);

    try {
      const resp = await fetch('/api/gemini/smart-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: smartQuery,
          existingEvents: events,
          existingTasks: tasks,
          existingGoals: goals,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.suggestion) {
          setSmartSuggestion(data.suggestion);
        } else {
          // Fallback client analyzer
          generateClientSmartSuggestion();
        }
      } else {
        generateClientSmartSuggestion();
      }
    } catch {
      generateClientSmartSuggestion();
    } finally {
      setSmartLoading(false);
    }
  };

  const generateClientSmartSuggestion = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateLocal(tomorrow);

    setSmartSuggestion({
      title: smartQuery.length > 30 ? smartQuery.slice(0, 30) + '...' : smartQuery,
      date: tomorrowStr,
      startTime: '19:00',
      endTime: '20:00',
      description: `Smart suggestion for "${smartQuery}" during your optimal 1-hour study slot`,
    });
  };

  const handleConfirmSmartSuggestion = async () => {
    if (!smartSuggestion) return;
    try {
      const created = await createCalendarEvent(uid, {
        title: smartSuggestion.title,
        description: smartSuggestion.description,
        date: smartSuggestion.date,
        startTime: smartSuggestion.startTime,
        endTime: smartSuggestion.endTime,
        category: 'Study',
        reminder: '15_min',
      });
      setEvents((prev) => [created, ...prev]);
      setSmartSuggestion(null);
      setSmartQuery('');
      setSuccessToast(`Smart event "${created.title}" scheduled!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.warn('Smart schedule creation error:', err);
    }
  };

  // Month Grid Calculation
  const monthYearStr = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedDateIso = formatDateLocal(selectedDate);

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay();

  const monthCells = useMemo(() => {
    const cells = [];
    // Padding
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const iso = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter((e) => e.date === iso);
      const dayTasks = tasks.filter((t) => t.dueDate === iso);
      cells.push({ day, iso, date: d, dayEvents, dayTasks });
    }
    return cells;
  }, [selectedDate, events, tasks, firstDayOfWeek, daysInMonth]);

  return (
    <div id="calendar-page-root" className="space-y-6 w-full min-h-screen pb-24">
      <FeatureNavigation
        title="Personal Life Calendar & Smart Scheduling"
        onBack={onBackToHome || (() => {})}
        onClose={onBackToHome || (() => {})}
      />

      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Toolbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-3">
          {currentView !== 'month' && (
            <button
              onClick={() => setCurrentView('month')}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Return to Full Month Calendar View"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Calendar</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
              Isolated /users/{uid.slice(0, 8)}...
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">Events, tasks, deadlines & routines</span>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Day / Week / Month / Daily Routines Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                  currentView === v
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v}
              </button>
            ))}
            <button
              onClick={() => setCurrentView('routine')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'routine'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                  : 'text-purple-400 hover:text-purple-300 font-semibold'
              }`}
            >
              <Repeat className="w-3.5 h-3.5 text-purple-400" />
              <span>Routines</span>
            </button>
          </div>

          <button
            onClick={() => {
              setModalTab('event');
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event / Task</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Navigator */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-white px-2">{monthYearStr}</span>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-sans font-semibold cursor-pointer hover:bg-indigo-500/30"
            >
              Today
            </button>
          </div>

          {/* Add Event / Task / Routine Buttons */}
          <button
            onClick={() => {
              setModalTab('event');
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>

          <button
            onClick={() => {
              setModalTab('task');
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-sky-400" />
            <span>Add Task</span>
          </button>

          <button
            onClick={() => {
              setModalTab('routine');
              setShowModal(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Repeat className="w-4 h-4 text-purple-400" />
            <span>+ Routine Task</span>
          </button>
        </div>
      </div>

      {/* Smart Prioritization & Conflict Advisor */}
      {(conflicts.length > 0 || highDensityDays.length > 0) && (
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm font-display">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>AI Prioritization & Conflict Resolution Advisor</span>
          </div>

          {conflicts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Overlapping Events Detected ({conflicts.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {conflicts.map((pair, idx) => {
                  const p1 = getEventPriorityScore(pair.event1);
                  const p2 = getEventPriorityScore(pair.event2);
                  const priorityEvent = p1 >= p2 ? pair.event1 : pair.event2;
                  const flexibleEvent = priorityEvent.id === pair.event1.id ? pair.event2 : pair.event1;

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-3">
                      <div className="text-[11px] font-semibold text-amber-200">
                        ⚠️ Conflict on {pair.event1.date}
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-300 flex justify-between">
                          <span>• {pair.event1.title}</span>
                          <span className="font-mono text-[10px] text-amber-400">({pair.event1.startTime}-{pair.event1.endTime})</span>
                        </div>
                        <div className="text-xs text-slate-300 flex justify-between">
                          <span>• {pair.event2.title}</span>
                          <span className="font-mono text-[10px] text-amber-400">({pair.event2.startTime}-{pair.event2.endTime})</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-500/10 space-y-2">
                        <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>AI Recommendation: Prioritize "{priorityEvent.title}"</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          "{priorityEvent.title}" matches critical work or milestone triggers. We suggest rescheduling the study or flexible routine event "{flexibleEvent.title}" to clear your schedule.
                        </p>
                        <button
                          onClick={() => handleSmartReschedule(flexibleEvent)}
                          className="w-full mt-1 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Auto-Reschedule "{flexibleEvent.title}" (+2 hrs)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {highDensityDays.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                High Load Daily Density Alerts ({highDensityDays.length})
              </h4>
              <div className="space-y-2">
                {highDensityDays.map((day, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-indigo-300">📅 {day.date} has {day.count} scheduled events</span>
                      <p className="text-[11px] text-slate-400">
                        Prioritize your critical tasks early in the morning and space out meetings to prevent burnout.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold self-start sm:self-auto font-mono">
                      High Load Density
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gemini Smart Scheduling Input Box */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs font-display">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Gemini Smart Scheduling Assistant</span>
        </div>

        <form onSubmit={handleSmartScheduleRequest} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={smartQuery}
            onChange={(e) => setSmartQuery(e.target.value)}
            placeholder="e.g. 'When should I study SQL tomorrow?' or 'Find a free 1-hour slot for reading'"
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 focus:border-indigo-500 text-white text-xs placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={smartLoading || !smartQuery.trim()}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {smartLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Analyze Availability</span>
          </button>
        </form>

        {/* Gemini Suggestion Response Banner */}
        {smartSuggestion && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  Proposed Smart Slot
                </span>
                <h4 className="text-sm font-bold text-white mt-1">{smartSuggestion.title}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{smartSuggestion.description}</p>
                <div className="flex items-center gap-3 text-xs font-mono text-indigo-300 mt-2">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5" /> {smartSuggestion.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {smartSuggestion.startTime} - {smartSuggestion.endTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmSmartSuggestion}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Schedule</span>
                </button>
                <button
                  onClick={() => setSmartSuggestion(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RENDER CALENDAR VIEW (MONTH / WEEK / DAY) */}
      {currentView === 'month' && (
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-4">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          {/* Month Grid Cells */}
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty_${idx}`} className="h-28 rounded-2xl bg-slate-950/20 border border-slate-900"></div>;
              }

              const isToday = cell.iso === formatDateLocal(new Date());

              return (
                <div
                  key={cell.iso}
                  onClick={() => {
                    setSelectedDate(cell.date);
                    setCurrentView('day');
                  }}
                  className={`h-28 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isToday
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday ? 'w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center font-mono' : 'text-slate-300'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {(cell.dayEvents.length > 0 || cell.dayTasks.length > 0) && (
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                        {cell.dayEvents.length + cell.dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Badges preview */}
                  <div className="space-y-1 overflow-hidden">
                    {cell.dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate"
                      >
                        {evt.startTime && `${evt.startTime} `}{evt.title}
                      </div>
                    ))}
                    {cell.dayTasks.slice(0, 1).map((t) => (
                      <div
                        key={t.id}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30 truncate"
                      >
                        ✓ {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentView === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Timeline for Selected Day */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('month')}
                  className="px-3 py-1.5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm group"
                  title="Back to Month View Calendar"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Back to Calendar</span>
                </button>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <span>Timeline for {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto">
                {events.filter((e) => e.date === selectedDateIso).length} events
              </span>
            </div>

            {/* Events Timeline */}
            <div className="space-y-3">
              {events.filter((e) => e.date === selectedDateIso).length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-semibold">Your calendar is clear for this day.</p>
                  <button
                    onClick={() => {
                      setEventDateStr(selectedDateIso);
                      setModalTab('event');
                      setShowModal(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-bold underline cursor-pointer"
                  >
                    + Schedule an Event
                  </button>
                </div>
              ) : (
                events
                  .filter((e) => e.date === selectedDateIso)
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {evt.category || 'Event'}
                            </span>
                            <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                          </div>

                          {evt.description && <p className="text-xs text-slate-300 mt-1">{evt.description}</p>}

                          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 font-mono">
                            {evt.startTime && (
                              <span className="flex items-center gap-1 text-indigo-300">
                                <Clock className="w-3.5 h-3.5" /> {evt.startTime} - {evt.endTime || 'End'}
                              </span>
                            )}
                            {evt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" /> {evt.location}
                              </span>
                            )}
                          </div>

                          {/* Verified Journal Evidence */}
                          {evt.relatedJournalIds && evt.relatedJournalIds.length > 0 && (() => {
                            const matched = journals.filter(j => evt.relatedJournalIds?.includes(j.id));
                            if (matched.length === 0) return null;
                            return (
                              <div className="mt-3 p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                                <span className="text-[10px] text-indigo-400 font-mono font-bold flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Verified Journal Evidence</span>
                                </span>
                                {matched.map(mj => (
                                  <div key={mj.id} className="text-[11px] text-slate-300">
                                    <div className="font-bold text-slate-200">{mj.title || 'Untitled Entry'}</div>
                                    <p className="text-[10px] text-slate-400 mt-0.5 italic leading-relaxed">
                                      "{mj.content.length > 180 ? mj.content.slice(0, 180) + '...' : mj.content}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Right Col: Tasks Checklist for Selected Day */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-sky-400" />
                <span>Tasks Checklist</span>
              </h3>
              <button
                onClick={() => {
                  setTaskDueDate(selectedDateIso);
                  setModalTab('task');
                  setShowModal(true);
                }}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                + New Task
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {tasks.filter((t) => t.dueDate === selectedDateIso).length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No tasks due on this date.</p>
              ) : (
                tasks
                  .filter((t) => t.dueDate === selectedDateIso)
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        task.status === 'completed'
                          ? 'bg-slate-950/40 border-slate-900 opacity-60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                            task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 hover:border-sky-400'
                          }`}
                        >
                          {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <h5
                            className={`text-xs font-bold text-slate-200 ${
                              task.status === 'completed' ? 'line-through text-slate-500' : ''
                            }`}
                          >
                            {task.title}
                          </h5>
                          {task.description && <p className="text-[11px] text-slate-400">{task.description}</p>}
                          {task.dueTime && <span className="text-[10px] font-mono text-sky-300">Due {task.dueTime}</span>}

                          {/* Verified Journal Evidence */}
                          {task.relatedJournalIds && task.relatedJournalIds.length > 0 && (() => {
                            const matched = journals.filter(j => task.relatedJournalIds?.includes(j.id));
                            if (matched.length === 0) return null;
                            return (
                              <div className="mt-2 p-2 rounded-lg bg-sky-950/20 border border-sky-500/20 space-y-1 max-w-xs">
                                <span className="text-[9px] text-sky-400 font-mono font-bold flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-sky-400" />
                                  <span>Source Evidence</span>
                                </span>
                                {matched.map(mj => (
                                  <div key={mj.id} className="text-[10px] text-slate-300">
                                    <div className="font-semibold text-slate-200 truncate">{mj.title || 'Untitled Entry'}</div>
                                    <p className="text-[9px] text-slate-400 mt-0.5 italic line-clamp-2 leading-relaxed">
                                      "{mj.content}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Bottom Action / Return Bar for Day View */}
          <div className="lg:col-span-3 flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl text-xs">
            <button
              onClick={() => setCurrentView('month')}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Month Calendar</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEventDateStr(selectedDateIso);
                  setModalTab('event');
                  setShowModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event on {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </button>
              <button
                onClick={() => {
                  setTaskDueDate(selectedDateIso);
                  setModalTab('task');
                  setShowModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Add Task on {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === 'week' && (
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('month')}
                className="px-3 py-1.5 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Month Calendar</span>
              </button>
              <h3 className="text-sm font-bold text-white font-display">Week View Schedule</h3>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-3 text-xs">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - d.getDay() + i);
              const iso = formatDateLocal(d);
              const dayEvts = events.filter((e) => e.date === iso);

              return (
                <div key={iso} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 min-h-[200px]">
                  <div className="text-center font-bold text-slate-300 border-b border-slate-800 pb-1">
                    <div>{d.toLocaleDateString([], { weekday: 'short' })}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{d.getDate()}</div>
                  </div>

                  <div className="space-y-1.5">
                    {dayEvts.map((e) => (
                      <div key={e.id} className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px]">
                        <div className="font-bold text-indigo-300 truncate">{e.title}</div>
                        {e.startTime && <div className="text-slate-400 font-mono">{e.startTime}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DAILY ROUTINES VIEW */}
      {currentView === 'routine' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Summary Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
                  <Repeat className="w-4 h-4 text-purple-400" />
                  <span>AUTOMATIC DAILY NOTIFICATION ENGINE</span>
                </div>
                <h2 className="text-xl font-bold text-white font-display mt-1">Daily Routine Tasks</h2>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Every active routine task automatically triggers daily notifications in your Notification Hub. Complete your habits daily and build positive consistency!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCurrentView('month')}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 shadow flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Return to Full Month Calendar View"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Calendar</span>
                </button>

                <button
                  onClick={handleManualSyncRoutineNotifs}
                  className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>Sync Today's Notifications</span>
                </button>

                <button
                  onClick={() => {
                    setModalTab('routine');
                    setShowModal(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>New Routine Task</span>
                </button>
              </div>
            </div>

            {/* Today's Routine Progress */}
            {(() => {
              const todayStr = formatDateLocal(new Date());
              const total = routines.length;
              const completedCount = routines.filter((r) => r.completedDates.includes(todayStr)).length;
              const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

              return (
                <div className="pt-2 border-t border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>Today's Routine Progress</span>
                    <span className="font-bold text-purple-300">{completedCount} of {total} completed ({percent}%)</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-purple-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Routine Task Items List */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Your Active Daily Schedule</span>
            </h3>

            {routines.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Repeat className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold">No daily routine tasks found.</p>
                <button
                  onClick={() => {
                    setModalTab('routine');
                    setShowModal(true);
                  }}
                  className="text-purple-400 hover:text-purple-300 text-xs font-bold underline cursor-pointer"
                >
                  + Add Your First Daily Routine Task
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {routines.map((routine) => {
                  const todayStr = formatDateLocal(new Date());
                  const isDoneToday = routine.completedDates.includes(todayStr);

                  return (
                    <div
                      key={routine.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative group ${
                        isDoneToday
                          ? 'bg-slate-950/40 border-slate-900 opacity-75'
                          : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleRoutineCompletion(routine.id)}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                              isDoneToday
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-600 hover:border-purple-400'
                            }`}
                            title={isDoneToday ? 'Mark as incomplete today' : 'Mark as completed today'}
                          >
                            {isDoneToday && <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {routine.category}
                              </span>
                              <h4
                                className={`text-sm font-bold text-white ${
                                  isDoneToday ? 'line-through text-slate-400' : ''
                                }`}
                              >
                                {routine.title}
                              </h4>
                            </div>

                            <div className="flex items-center gap-3 pt-1.5 text-xs font-mono text-slate-400">
                              <span className="flex items-center gap-1 text-purple-300 font-bold">
                                <Clock className="w-3.5 h-3.5" /> Everyday at {routine.scheduledTime}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                🔥 Done {routine.completedDates.length} day(s)
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteRoutine(routine.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Routine Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Daily Notification Switch */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <Bell className={`w-3.5 h-3.5 ${routine.isActive ? 'text-purple-400' : 'text-slate-600'}`} />
                          <span>Daily Notification:</span>
                        </span>

                        <button
                          onClick={() => handleToggleRoutineActive(routine)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                            routine.isActive
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${routine.isActive ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`}></span>
                          <span>{routine.isActive ? 'Active (Notifies Daily)' : 'Paused'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE EVENT / TASK / ROUTINE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setModalTab('event')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    modalTab === 'event' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Event
                </button>
                <button
                  onClick={() => setModalTab('task')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    modalTab === 'task' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Task
                </button>
                <button
                  onClick={() => setModalTab('routine')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    modalTab === 'routine' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Daily Routine
                </button>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            {modalTab === 'event' ? (
              <form onSubmit={handleCreateEventSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Event Title *</label>
                  <input
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    placeholder="e.g. Data Analyst Role Interview"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    rows={2}
                    placeholder="Agenda, prep notes, or details..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                    <input
                      type="date"
                      value={eventDateStr}
                      onChange={(e) => setEventDateStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
                    <input
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">End Time</label>
                    <input
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={eventCategory}
                      onChange={(e) => setEventCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="Meeting">Meeting</option>
                      <option value="Study">Study</option>
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Health">Health</option>
                      <option value="Goal">Goal Milestone</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Reminder</label>
                    <select
                      value={eventReminder}
                      onChange={(e) => setEventReminder(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="none">No Reminder</option>
                      <option value="at_time">At time of event</option>
                      <option value="5_min">5 minutes before</option>
                      <option value="15_min">15 minutes before</option>
                      <option value="30_min">30 minutes before</option>
                      <option value="1_hour">1 hour before</option>
                      <option value="1_day">1 day before</option>
                    </select>
                  </div>
                </div>

                {/* Related Goal Selector */}
                {goals.length > 0 && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Link Related Goal Track</label>
                    <select
                      value={eventRelatedGoalId}
                      onChange={(e) => setEventRelatedGoalId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="">-- Optional Goal Link --</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          🎯 {g.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer shadow-lg shadow-indigo-600/30"
                  >
                    Save Event
                  </button>
                </div>
              </form>
            ) : modalTab === 'task' ? (
              <form onSubmit={handleCreateTaskSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Complete SQL Assignment Queries"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description</label>
                  <textarea
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    rows={2}
                    placeholder="Details or subtasks..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Due Date *</label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Due Time</label>
                    <input
                      type="time"
                      value={taskDueTime}
                      onChange={(e) => setTaskDueTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer shadow-lg shadow-sky-600/30"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateRoutineSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Routine Task Title *</label>
                  <input
                    type="text"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    placeholder="e.g. Daily Morning Workout & Mindfulness"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Scheduled Time *</label>
                    <input
                      type="time"
                      value={routineTime}
                      onChange={(e) => setRoutineTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={routineCategory}
                      onChange={(e) => setRoutineCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Health">Health / Fitness</option>
                      <option value="Study">Study / Learning</option>
                      <option value="Mindfulness">Mindfulness</option>
                      <option value="General">General Habit</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={routinePriority}
                    onChange={(e) => setRoutinePriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5 text-purple-400" /> Automatic Daily Notifications:
                  </p>
                  <p className="text-slate-300">
                    A notification for this routine task will be posted every day in your Notification Hub at the designated time.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-lg shadow-purple-600/30"
                  >
                    Save Routine Task
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
