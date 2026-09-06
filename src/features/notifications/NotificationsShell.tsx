import React, { useEffect, useState } from 'react';
import './notifications.css';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  CheckSquare,
  Target,
  BookOpen,
  Sparkles,
  Clock,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { AppNotification } from '../../types';
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
} from './notificationService';
import { formatDateLocal } from '../calendar/calendarService';

interface NotificationsShellProps {
  uid: string;
  onNavigateToSource?: (sourceType: string, sourceId?: string) => void;
  onClose?: () => void;
}

export const NotificationsShell: React.FC<NotificationsShellProps> = ({
  uid,
  onNavigateToSource,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'earlier' | 'all'>('all');

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const items = await getNotificationsForUser(uid);
      setNotifications(items);
    } catch (err) {
      console.warn('[NotificationsShell] Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [uid]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(uid, id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'read' as const } : n))
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
  };

  const handleDelete = async (id: string) => {
    await dismissNotification(uid, id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const todayStr = formatDateLocal(new Date());

  // Group notifications into tabs
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'all') return true;

    const itemDate = n.scheduledAt ? n.scheduledAt.split('T')[0] : n.createdAt.split('T')[0];

    if (activeTab === 'today') {
      return itemDate === todayStr;
    }
    if (activeTab === 'upcoming') {
      return itemDate > todayStr;
    }
    if (activeTab === 'earlier') {
      return itemDate < todayStr;
    }
    return true;
  });

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'calendar':
        return <Calendar className="w-4 h-4 text-indigo-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-sky-400" />;
      case 'goal':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-amber-400" />;
      case 'ai_suggestion':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
          Urgent
        </span>
      );
    }
    if (priority === 'important') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
          Important
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
        Normal
      </span>
    );
  };

  return (
    <div id="notifications-shell" className="space-y-6">
      {/* Notifications Header Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 relative">
            <Bell className="w-5 h-5 text-indigo-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 animate-ping"></span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono">
                  {unreadCount} unread
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Scheduled reminders, AI suggestions, and goal milestones</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'today', label: 'Today' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'earlier', label: 'Earlier' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Cards List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
          <span>Loading notifications...</span>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-3 p-8 rounded-2xl bg-slate-950/40 border border-slate-800/80">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-indigo-400 flex items-center justify-center mx-auto border border-slate-800">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">You're all caught up ✨</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No notifications in this view. Scheduled reminders and goal milestones will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
          {filteredNotifications.map((notif) => {
            const isUnread = notif.status === 'unread';

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl transition-all border relative group ${
                  isUnread
                    ? 'bg-slate-900/90 border-indigo-500/30 shadow-lg shadow-indigo-950/20'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Unread Indicator Bar */}
                {isUnread && (
                  <div className="absolute top-4 left-2 w-1.5 h-8 rounded-full bg-indigo-500"></div>
                )}

                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                      {getSourceIcon(notif.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-100">{notif.title}</h4>
                        {getPriorityBadge(notif.priority)}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>

                      <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          {new Date(notif.scheduledAt || notif.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {notif.sourceType && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300 uppercase">
                            {notif.sourceType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onNavigateToSource && notif.sourceType && (
                      <button
                        onClick={() => {
                          if (isUnread) handleMarkAsRead(notif.id);
                          onNavigateToSource(notif.sourceType!, notif.sourceId);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
                        title="Go to source"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
