import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, JournalPrivacyLevel, MediaAttachment } from '../../../types';
import { getSettingsForUser, hashPin, UserSettings } from '../../settings/settingsService';
import { useAuth } from '../../../context/AuthContext';
import {
  BookOpen,
  Lock,
  Calendar,
  Tag,
  Trash2,
  Bookmark,
  Edit,
  Sparkles,
  Eye,
  Mic,
  Send,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  RotateCcw,
  Image as ImageIcon,
  Video,
  Upload,
  Plus,
  Link as LinkIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Check,
  Play,
  Film,
} from 'lucide-react';

interface RecentJournalsProps {
  journals: JournalEntry[];
  loading?: boolean;
  onDeleteJournal: (id: string) => Promise<void>;
  onToggleBookmark?: (id: string) => Promise<void>;
  onUpdateJournal?: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  onCreateFirstEntryClick?: () => void;
  onModalStateChange?: (isOpen: boolean) => void;
  hasPin?: boolean;
  onPromptSetPin?: () => void;
  userSettings?: UserSettings | null;
}

export const RecentJournals: React.FC<RecentJournalsProps> = ({
  journals,
  loading = false,
  onDeleteJournal,
  onToggleBookmark,
  onUpdateJournal,
  onCreateFirstEntryClick,
  onModalStateChange,
  hasPin = false,
  onPromptSetPin,
  userSettings = null,
}) => {
  const { user } = useAuth();
  const settings = userSettings;

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bookmarkingId, setBookmarkingId] = useState<string | null>(null);
  const [pinUnlockId, setPinUnlockId] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [unlockedPrivateIds, setUnlockedPrivateIds] = useState<string[]>([]);

  // Notify parent component whenever any journal modal (Edit, View, PIN Unlock) opens or closes
  useEffect(() => {
    const isAnyModalActive = Boolean(selectedEntry || editingEntry || pinUnlockId);
    if (onModalStateChange) {
      onModalStateChange(isAnyModalActive);
    }
  }, [selectedEntry, editingEntry, pinUnlockId, onModalStateChange]);

  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<JournalEntry['category']>('reflection');
  const [editPrivacy, setEditPrivacy] = useState<JournalPrivacyLevel>('standard');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editMediaAttachments, setEditMediaAttachments] = useState<MediaAttachment[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editIsListening, setEditIsListening] = useState(false);
  const [editDictateStatus, setEditDictateStatus] = useState('');
  const [editShowMediaUrlInput, setEditShowMediaUrlInput] = useState(false);
  const [editMediaUrlInput, setEditMediaUrlInput] = useState('');
  const [editMediaTypeInput, setEditMediaTypeInput] = useState<'image' | 'video'>('image');
  const [editMediaTitleInput, setEditMediaTitleInput] = useState('');
  const [copiedEditToast, setCopiedEditToast] = useState(false);

  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editRecognitionRef = useRef<any>(null);
  const editListeningRef = useRef(false);

  useEffect(() => {
    editListeningRef.current = editIsListening;
  }, [editIsListening]);

  // Open Edit Modal
  const handleOpenEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title || '');
    setEditContent(entry.content || '');
    setEditCategory(entry.category || 'reflection');
    setEditPrivacy(entry.privacy || 'standard');
    setEditTags(entry.tags || []);
    setEditMediaAttachments(entry.mediaAttachments || []);
  };

  const handleCloseEdit = () => {
    if (editIsListening && editRecognitionRef.current) {
      editListeningRef.current = false;
      try {
        editRecognitionRef.current.stop();
      } catch {}
    }
    if (editingEntry) {
      const isPrivate = editingEntry.privacy === 'private' || editingEntry.privacy === 'pin_locked' || editingEntry.isPinLocked;
      if (isPrivate) {
        setUnlockedPrivateIds((prev) => prev.filter((id) => id !== editingEntry.id));
      }
    }
    setEditingEntry(null);
    setEditIsListening(false);
  };

  const handleCloseDetail = () => {
    if (selectedEntry) {
      const isPrivate = selectedEntry.privacy === 'private' || selectedEntry.privacy === 'pin_locked' || selectedEntry.isPinLocked;
      if (isPrivate) {
        setUnlockedPrivateIds((prev) => prev.filter((id) => id !== selectedEntry.id));
      }
      setSelectedEntry(null);
    }
  };

  const applyEditFormat = (prefix: string, suffix: string = '') => {
    if (!editTextareaRef.current) return;
    const textarea = editTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);
    const defaultText = selectedText || 'text';
    const replacement = `${prefix}${defaultText}${suffix}`;
    const newContent = editContent.substring(0, start) + replacement + editContent.substring(end);
    setEditContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const pos = start + prefix.length + defaultText.length;
      textarea.setSelectionRange(pos, pos);
    }, 50);
  };

  const transformEditSelectedText = (transformation: 'uppercase' | 'lowercase' | 'titlecase' | 'clear') => {
    if (!editTextareaRef.current) return;
    const textarea = editTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end);
    if (!selectedText) return;

    let replacement = selectedText;
    if (transformation === 'uppercase') {
      replacement = selectedText.toUpperCase();
    } else if (transformation === 'lowercase') {
      replacement = selectedText.toLowerCase();
    } else if (transformation === 'titlecase') {
      replacement = selectedText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    } else if (transformation === 'clear') {
      replacement = selectedText.replace(/[*_~`#><]|<\/?[^>]+(>|$)/g, '');
    }

    const newContent = editContent.substring(0, start) + replacement + editContent.substring(end);
    setEditContent(newContent);
  };

  const applyEditAlignment = (align: 'left' | 'center' | 'right') => {
    if (!editTextareaRef.current) return;
    const textarea = editTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editContent.substring(start, end) || 'Aligned Content';

    if (align === 'left') return;

    const replacement = `\n<div align="${align}">\n${selectedText}\n</div>\n`;
    const newContent = editContent.substring(0, start) + replacement + editContent.substring(end);
    setEditContent(newContent);
  };

  const toggleEditSpeech = async () => {
    if (editIsListening) {
      editListeningRef.current = false;
      if (editRecognitionRef.current) {
        try {
          editRecognitionRef.current.stop();
        } catch {}
      }
      setEditIsListening(false);
      setEditDictateStatus('');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setEditDictateStatus('🎙 Requesting microphone access...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      console.warn('Microphone permission notice:', err);
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const sampleSpeech = " I have been reflecting deeply on my accomplishments and goals today.";
      setEditContent((prev) => (prev ? prev + ' ' + sampleSpeech : sampleSpeech));
      setEditDictateStatus('✓ Sample voice text inserted (Native speech recognition unavailable in browser).');
      setTimeout(() => setEditDictateStatus(''), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setEditIsListening(true);
        editListeningRef.current = true;
        setEditDictateStatus('🎙 Listening... Speak clearly into microphone.');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (interimTranscript.trim()) {
          setEditDictateStatus(`🎙 Hearing: "${interimTranscript.trim()}..."`);
        }

        if (finalTranscript.trim()) {
          setEditContent((prev) => {
            const spaced = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? prev + ' ' : prev;
            return spaced + finalTranscript.trim();
          });
          setEditDictateStatus('✓ Transcribed speech into content.');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'no-speech') {
          setEditDictateStatus('🎙 Silence detected. Keep speaking...');
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setEditDictateStatus('⚠️ Microphone permission blocked.');
          setEditIsListening(false);
          editListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        if (editListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setEditIsListening(false);
            editListeningRef.current = false;
            setEditDictateStatus('');
          }
        } else {
          setEditIsListening(false);
          setEditDictateStatus('');
        }
      };

      editRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setEditIsListening(false);
      editListeningRef.current = false;
      setEditDictateStatus('⚠️ Could not start speech recognition.');
    }
  };

  // Media Attachment Uploads in Edit Modal
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const resultUrl = event.target?.result as string;
        if (resultUrl) {
          const newMedia: MediaAttachment = {
            id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            type: isVideo ? 'video' : 'image',
            url: resultUrl,
            title: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          };
          setEditMediaAttachments((prev) => [...prev, newMedia]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  const handleEditAddMediaUrl = () => {
    if (!editMediaUrlInput.trim()) return;
    const newMedia: MediaAttachment = {
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: editMediaTypeInput,
      url: editMediaUrlInput.trim(),
      title: editMediaTitleInput.trim() || (editMediaTypeInput === 'image' ? 'Image Attachment' : 'Video Attachment'),
    };
    setEditMediaAttachments((prev) => [...prev, newMedia]);
    setEditMediaUrlInput('');
    setEditMediaTitleInput('');
    setEditShowMediaUrlInput(false);
  };

  const handleEditRemoveMedia = (id: string) => {
    setEditMediaAttachments((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editContent.trim() || !onUpdateJournal) return;

    try {
      setEditSubmitting(true);
      await onUpdateJournal(editingEntry.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        privacy: editPrivacy,
        tags: editTags,
        mediaAttachments: editMediaAttachments,
      });

      handleCloseEdit();
      if (selectedEntry?.id === editingEntry.id) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Failed to update journal:', err);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDeleteJournal(id);
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleBookmarkClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onToggleBookmark) return;
    try {
      setBookmarkingId(id);
      await onToggleBookmark(id);
    } catch (err) {
      console.error('Bookmark toggle error:', err);
    } finally {
      setBookmarkingId(null);
    }
  };

  const handleUnlockPrivate = async (entry: JournalEntry) => {
    if (!settings || !settings.security?.pinHash) {
      if (onPromptSetPin) {
        onPromptSetPin();
      }
      setPinUnlockId(null);
      setPinInput('');
      setPinError(false);
      return;
    }
    const hashed = await hashPin(pinInput.trim());
    if (hashed === settings.security.pinHash) {
      setUnlockedPrivateIds([...unlockedPrivateIds, entry.id]);
      setPinUnlockId(null);
      setPinInput('');
      setPinError(false);
      setSelectedEntry(entry);
    } else {
      setPinError(true);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse space-y-3"
          >
            <div className="h-4 bg-slate-800 rounded w-1/3"></div>
            <div className="h-6 bg-slate-800 rounded w-3/4"></div>
            <div className="h-12 bg-slate-800/60 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // EMPTY STATE
  if (journals.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4 backdrop-blur-2xl my-4">
        <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-xl">
          <BookOpen className="w-8 h-8 text-indigo-400" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-xl font-bold text-white font-display">
            Your story starts here.
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            No entries found matching this filter or search query. Start writing or adjust your filters.
          </p>
        </div>
        {onCreateFirstEntryClick && (
          <button
            onClick={onCreateFirstEntryClick}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Write Your First Entry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {journals.map((entry) => {
          const isPrivateLocked =
            (entry.privacy === 'private' || entry.privacy === 'pin_locked' || entry.isPinLocked) &&
            !unlockedPrivateIds.includes(entry.id);

          const hasMedia = entry.mediaAttachments && entry.mediaAttachments.length > 0;

          return (
            <div
              key={entry.id}
              className="group p-5 rounded-3xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 shadow-xl hover:shadow-2xl hover:shadow-indigo-950/50 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between space-y-4 hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {entry.category || 'reflection'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleBookmarkClick(e, entry.id)}
                      disabled={bookmarkingId === entry.id}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        entry.isBookmarked
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-950/80 text-slate-500 border-slate-800 hover:text-slate-300'
                      }`}
                      title={entry.isBookmarked ? 'Remove Bookmark' : 'Bookmark Entry'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${entry.isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <div className="text-slate-400 text-[11px] font-mono">
                      {entry.privacy === 'private' || entry.isPinLocked ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 text-[10px]">
                          <Lock className="w-2.5 h-2.5" /> Private
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(entry.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Journal Title */}
                <h3 className="text-base font-bold text-white font-display group-hover:text-indigo-300 transition-colors line-clamp-1">
                  {entry.title || 'Untitled Journal'}
                </h3>

                {/* Content or Lock Wall */}
                {isPrivateLocked ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>PIN Protected Entry</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Content encrypted for privacy security.
                    </p>
                    <button
                      onClick={() => setPinUnlockId(entry.id)}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-all"
                    >
                      Unlock Entry
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {entry.content}
                    </p>

                    {/* Attached Media Cards in Entry Feed */}
                    {hasMedia && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {entry.mediaAttachments.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video relative group/media"
                          >
                            {m.type === 'image' ? (
                              <img
                                src={m.url}
                                alt={m.title || 'Media'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <video
                                src={m.url}
                                controls
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.aiSummary && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-200/90 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{entry.aiSummary}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1 flex-wrap max-w-[60%]">
                  {entry.tags?.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[9px] bg-slate-950 text-indigo-300 font-mono border border-slate-800/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isPrivateLocked) {
                        setPinUnlockId(entry.id);
                      } else {
                        setSelectedEntry(entry);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 flex items-center gap-1 cursor-pointer transition-all text-[11px]"
                    title="View Entry Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isPrivateLocked) {
                        setPinUnlockId(entry.id);
                      } else {
                        handleOpenEdit(entry);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition-all text-[11px]"
                    title="Edit Entry"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 cursor-pointer transition-all"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail View Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                {selectedEntry.category}
              </span>
              <button
                onClick={handleCloseDetail}
                className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                {selectedEntry.title || 'Untitled Journal'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Created on {formatDate(selectedEntry.createdAt)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {selectedEntry.content}
            </div>

            {/* Attached Media Display in Detail Modal */}
            {selectedEntry.mediaAttachments && selectedEntry.mediaAttachments.length > 0 && (
              <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <Video className="w-4 h-4 text-purple-400" />
                  <span>Media Attachments</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedEntry.mediaAttachments.map((m) => (
                    <div key={m.id} className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                      {m.type === 'image' ? (
                        <img src={m.url} alt={m.title || 'Attachment'} className="w-full max-h-60 object-cover" />
                      ) : (
                        <video src={m.url} controls className="w-full max-h-60 object-cover" />
                      )}
                      {m.title && <div className="p-2 text-[10px] text-slate-400 truncate bg-slate-950">{m.title}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEntry.aiInsights && selectedEntry.aiInsights.length > 0 && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Gemini Life Insights</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                  {selectedEntry.aiInsights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <div className="flex flex-wrap gap-1.5">
                {selectedEntry.tags?.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-lg text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const entryToEdit = selectedEntry;
                    setSelectedEntry(null);
                    handleOpenEdit(entryToEdit);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Entry</span>
                </button>

                <button
                  onClick={() => {
                    handleDelete(selectedEntry.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Entry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-base">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>Edit Journal Entry</span>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Extended Word Editing Formatting Toolbar */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 text-xs shadow-inner space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => applyEditFormat('**', '**')}
                        title="Bold"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('*', '*')}
                        title="Italic"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('<u>', '</u>')}
                        title="Underline"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('~~', '~~')}
                        title="Strikethrough"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('<mark>', '</mark>')}
                        title="Highlight"
                        className="px-1.5 py-0.5 rounded hover:bg-amber-500/20 text-amber-300 font-bold text-[10px]"
                      >
                        Highlight
                      </button>

                      <div className="h-4 w-px bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => applyEditFormat('# ')}
                        title="Heading 1"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Heading1 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('## ')}
                        title="Heading 2"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Heading2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n- ')}
                        title="Bullet List"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n1. ')}
                        title="Numbered List"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n- [ ] ')}
                        title="Task Checkbox"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>

                      <div className="h-4 w-px bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n> ')}
                        title="Quote"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n> 💡 **Note:** ')}
                        title="Callout Box"
                        className="p-1.5 rounded hover:bg-slate-800 text-amber-400 font-bold text-xs"
                      >
                        💡 Note
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n```\n', '\n```')}
                        title="Code Block"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditFormat('\n---\n')}
                        title="Horizontal Line"
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={toggleEditSpeech}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                        editIsListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{editIsListening ? 'Stop' : '🎙 Dictate'}</span>
                    </button>
                  </div>

                  {/* Second Formatting Row */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center flex-wrap gap-1">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Align:</span>
                      <button
                        type="button"
                        onClick={() => applyEditAlignment('left')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400"
                      >
                        <AlignLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditAlignment('center')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400"
                      >
                        <AlignCenter className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyEditAlignment('right')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400"
                      >
                        <AlignRight className="w-3 h-3" />
                      </button>

                      <div className="h-3 w-px bg-slate-800 mx-1" />

                      <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Case:</span>
                      <button
                        type="button"
                        onClick={() => transformEditSelectedText('uppercase')}
                        className="px-1 py-0.5 rounded hover:bg-slate-800 text-slate-300 text-[10px]"
                      >
                        AA
                      </button>
                      <button
                        type="button"
                        onClick={() => transformEditSelectedText('lowercase')}
                        className="px-1 py-0.5 rounded hover:bg-slate-800 text-slate-300 text-[10px]"
                      >
                        aa
                      </button>
                      <button
                        type="button"
                        onClick={() => transformEditSelectedText('titlecase')}
                        className="px-1 py-0.5 rounded hover:bg-slate-800 text-slate-300 text-[10px]"
                      >
                        Aa
                      </button>

                      <div className="h-3 w-px bg-slate-800 mx-1" />

                      <button
                        type="button"
                        onClick={() => applyEditFormat('[Link Title](', 'https://example.com)')}
                        className="p-1 rounded hover:bg-slate-800 text-slate-300 text-[10px] flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Link</span>
                      </button>
                    </div>

                    {editContent && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editContent);
                          setCopiedEditToast(true);
                          setTimeout(() => setCopiedEditToast(false), 2000);
                        }}
                        className="p-1 rounded bg-slate-900 text-slate-300 text-[10px] flex items-center gap-1"
                      >
                        {copiedEditToast ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEditToast ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {editDictateStatus && (
                  <p className="text-xs text-indigo-300 font-medium px-1">
                    {editDictateStatus}
                  </p>
                )}

                <div className="relative">
                  <textarea
                    ref={editTextareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 custom-scrollbar"
                    required
                  />
                  <div className="absolute bottom-2 right-3 text-[10px] text-slate-500 font-mono pointer-events-none">
                    {editContent.trim() ? editContent.trim().split(/\s+/).length : 0} words | {editContent.length} chars
                  </div>
                </div>
              </div>

              {/* Media Attachments in Edit Modal */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>Media Attachments</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditShowMediaUrlInput(!editShowMediaUrlInput)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>URL</span>
                    </button>
                  </div>
                </div>

                {editShowMediaUrlInput && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={editMediaTypeInput}
                        onChange={(e) => setEditMediaTypeInput(e.target.value as any)}
                        className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <input
                        type="url"
                        value={editMediaUrlInput}
                        onChange={(e) => setEditMediaUrlInput(e.target.value)}
                        placeholder="Image or Video URL..."
                        className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleEditAddMediaUrl}
                        className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {editMediaAttachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {editMediaAttachments.map((m) => (
                      <div key={m.id} className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center">
                        {m.type === 'image' ? (
                          <img src={m.url} alt={m.title || 'Media'} className="w-full h-full object-cover" />
                        ) : (
                          <video src={m.url} controls className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveMedia(m.id)}
                          className="absolute top-1 right-1 p-1 bg-slate-950/80 rounded-full text-rose-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="reflection">Personal Reflection</option>
                    <option value="gratitude">Gratitude & Mood</option>
                    <option value="idea">Ideas & Thoughts</option>
                    <option value="memory">Life Memory</option>
                    <option value="event">Event & Calendar</option>
                    <option value="learning">Book & Learning</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Privacy
                  </label>
                  <select
                    value={editPrivacy}
                    onChange={(e) => {
                      const val = e.target.value as JournalPrivacyLevel;
                      if ((val === 'private' || val === 'pin_locked') && !hasPin) {
                        if (onPromptSetPin) {
                          onPromptSetPin();
                        }
                        setEditPrivacy('standard');
                      } else {
                        setEditPrivacy(val);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <option value="standard">Standard (Isolated UID)</option>
                    <option value="private">Private (PIN Guarded)</option>
                    <option value="pin_locked">Strict PIN Locked</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editContent.trim() || editSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Unlock Modal */}
      {pinUnlockId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Unlock Private Journal
                </h3>
                <p className="text-xs text-slate-400">
                  Enter your 4-digit PIN to access private journal content
                </p>
              </div>
            </div>

            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(false);
              }}
              placeholder="Enter PIN (e.g. 1234)..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-center text-lg font-mono text-white tracking-widest focus:outline-none focus:border-rose-500"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-medium text-center">
                Invalid PIN credential. Please try again.
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPinUnlockId(null);
                  setPinInput('');
                  setPinError(false);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const entry = journals.find((j) => j.id === pinUnlockId);
                  if (entry) handleUnlockPrivate(entry);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
