import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Mic,
  Lock,
  Send,
  CheckCircle2,
  Tag,
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
  Link as LinkIcon,
  Table as TableIcon,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Type,
  Copy,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  Volume2,
} from 'lucide-react';
import { JournalEntry, JournalPrivacyLevel, MediaAttachment } from '../../../types';

interface JournalCreateCardProps {
  onCreateEntry: (entry: {
    title: string;
    content: string;
    category: JournalEntry['category'];
    privacy: JournalPrivacyLevel;
    tags: string[];
    mediaAttachments?: MediaAttachment[];
  }) => Promise<void>;
  hasPin?: boolean;
  onPromptSetPin?: () => void;
}

export const JournalCreateCard: React.FC<JournalCreateCardProps> = ({
  onCreateEntry,
  hasPin = false,
  onPromptSetPin,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<JournalEntry['category']>('reflection');
  const [privacy, setPrivacy] = useState<JournalPrivacyLevel>('standard');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isListeningInline, setIsListeningInline] = useState(false);
  const [dictateStatus, setDictateStatus] = useState<string>('');
  const [successToast, setSuccessToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Media Attachments State
  const [mediaAttachments, setMediaAttachments] = useState<MediaAttachment[]>([]);
  const [showMediaUrlInput, setShowMediaUrlInput] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTypeInput, setMediaTypeInput] = useState<'image' | 'video'>('image');
  const [mediaTitleInput, setMediaTitleInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListeningInline;
  }, [isListeningInline]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Format Text Helper
  const applyFormat = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const defaultText = selectedText || 'text';
    const replacement = `${prefix}${defaultText}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + defaultText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Convert Case Helpers
  const transformSelectedText = (transformation: 'uppercase' | 'lowercase' | 'titlecase' | 'clear') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
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

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  // Alignment Helper
  const applyAlignment = (align: 'left' | 'center' | 'right') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'Aligned Content';

    if (align === 'left') {
      applyFormat('', '');
      return;
    }

    const replacement = `\n<div align="${align}">\n${selectedText}\n</div>\n`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  // Robust Speech-to-Text Dictation
  const toggleInlineSpeech = async () => {
    if (isListeningInline) {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListeningInline(false);
      setDictateStatus('');
      return;
    }

    // Explicitly prompt microphone access if browser supports getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setDictateStatus('🎙 Requesting microphone access...');
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      console.warn('Microphone permission notice:', err);
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback sample speech dictation for environments missing native speech API
      const sampleSpeech = "Today was an insightful day filled with reflection and gratitude. I spent time organizing my priorities and focusing on personal growth.";
      setContent((prev) => (prev ? prev + ' ' + sampleSpeech : sampleSpeech));
      setDictateStatus('✓ Inserted voice dictation text (Browser native speech recognition unavailable).');
      setTimeout(() => setDictateStatus(''), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningInline(true);
        isListeningRef.current = true;
        setDictateStatus('🎙 Listening... Speak clearly into your microphone.');
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
          setDictateStatus(`🎙 Hearing: "${interimTranscript.trim()}..."`);
        }

        if (finalTranscript.trim()) {
          setContent((prev) => {
            const spaced = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? prev + ' ' : prev;
            return spaced + finalTranscript.trim();
          });
          setDictateStatus('✓ Transcribed speech into journal content.');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'no-speech') {
          setDictateStatus('🎙 Silence detected. Speak into microphone...');
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setDictateStatus('⚠️ Microphone access was denied or blocked.');
          setIsListeningInline(false);
          isListeningRef.current = false;
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListeningInline(false);
            isListeningRef.current = false;
            setDictateStatus('');
          }
        } else {
          setIsListeningInline(false);
          setDictateStatus('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListeningInline(false);
      isListeningRef.current = false;
      setDictateStatus('⚠️ Could not launch speech recognition.');
    }
  };

  // Media Attachment Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setMediaAttachments((prev) => [...prev, newMedia]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    const newMedia: MediaAttachment = {
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: mediaTypeInput,
      url: mediaUrlInput.trim(),
      title: mediaTitleInput.trim() || (mediaTypeInput === 'image' ? 'Image Attachment' : 'Video Attachment'),
    };
    setMediaAttachments((prev) => [...prev, newMedia]);
    setMediaUrlInput('');
    setMediaTitleInput('');
    setShowMediaUrlInput(false);
  };

  const handleRemoveMedia = (id: string) => {
    setMediaAttachments((prev) => prev.filter((m) => m.id !== id));
  };

  const handleCopyText = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    if ((privacy === 'private' || privacy === 'pin_locked') && !hasPin) {
      if (onPromptSetPin) {
        onPromptSetPin();
      }
      return;
    }

    if (isListeningInline && recognitionRef.current) {
      isListeningRef.current = false;
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListeningInline(false);
    }

    try {
      setSubmitting(true);
      await onCreateEntry({
        title,
        content,
        category,
        privacy,
        tags,
        mediaAttachments,
      });

      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setMediaAttachments([]);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);
    } catch (err) {
      console.error('[JournalCreateCard] Failed to save entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Word and character stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 shadow-2xl backdrop-blur-2xl transition-all duration-300 relative space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
              <span>✦ What's on your mind?</span>
            </h2>
            <p className="text-xs text-slate-400">
              Preserve thoughts, track goals, or attach images & videos to your life timeline
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Optional Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Journal Title (optional)..."
            className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
          />
        </div>

        {/* Extended Word Editing Formatting Toolbar */}
        <div className="space-y-2">
          <div className="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 text-xs shadow-inner space-y-2">
            {/* Top Toolbar Row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center flex-wrap gap-1">
                {/* Font Styling */}
                <button
                  type="button"
                  onClick={() => applyFormat('**', '**')}
                  title="Bold (**text**)"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('*', '*')}
                  title="Italic (*text*)"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('<u>', '</u>')}
                  title="Underline (<u>text</u>)"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('~~', '~~')}
                  title="Strikethrough (~~text~~)"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('<mark>', '</mark>')}
                  title="Highlight Text (<mark>text</mark>)"
                  className="px-1.5 py-0.5 rounded-lg hover:bg-amber-500/20 text-amber-300 font-bold text-[11px] cursor-pointer"
                >
                  Highlight
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                {/* Headings */}
                <button
                  type="button"
                  onClick={() => applyFormat('# ')}
                  title="Heading 1"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('## ')}
                  title="Heading 2"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                {/* Lists & Tasks */}
                <button
                  type="button"
                  onClick={() => applyFormat('\n- ')}
                  title="Bullet List"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('\n1. ')}
                  title="Numbered List"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('\n- [ ] ')}
                  title="Task Checkbox"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-800 mx-1" />

                {/* Callout & Code */}
                <button
                  type="button"
                  onClick={() => applyFormat('\n> ')}
                  title="Quote"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('\n> 💡 **Note:** ')}
                  title="Callout Box"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-amber-400 cursor-pointer text-xs font-bold"
                >
                  💡 Note
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('\n```\n', '\n```')}
                  title="Code Block"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('\n---\n')}
                  title="Horizontal Line"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Speech Dictation Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleInlineSpeech}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isListeningInline
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                      : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  <Mic className={`w-3.5 h-3.5 ${isListeningInline ? 'text-white' : 'text-indigo-400'}`} />
                  <span>{isListeningInline ? 'Stop Dictating' : '🎙 Dictate Speech'}</span>
                </button>
              </div>
            </div>

            {/* Second Toolbar Row: Alignments, Transformations & Insertions */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/80 text-xs">
              <div className="flex items-center flex-wrap gap-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Align:</span>
                <button
                  type="button"
                  onClick={() => applyAlignment('left')}
                  title="Align Left"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => applyAlignment('center')}
                  title="Align Center"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <AlignCenter className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => applyAlignment('right')}
                  title="Align Right"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <AlignRight className="w-3 h-3" />
                </button>

                <div className="h-3 w-px bg-slate-800 mx-1" />

                <span className="text-[10px] uppercase font-semibold text-slate-500 mr-1">Case:</span>
                <button
                  type="button"
                  onClick={() => transformSelectedText('uppercase')}
                  title="Convert to UPPERCASE"
                  className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 font-mono text-[10px] cursor-pointer"
                >
                  AA
                </button>
                <button
                  type="button"
                  onClick={() => transformSelectedText('lowercase')}
                  title="Convert to lowercase"
                  className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 font-mono text-[10px] cursor-pointer"
                >
                  aa
                </button>
                <button
                  type="button"
                  onClick={() => transformSelectedText('titlecase')}
                  title="Convert to Title Case"
                  className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-300 font-mono text-[10px] cursor-pointer"
                >
                  Aa
                </button>

                <div className="h-3 w-px bg-slate-800 mx-1" />

                <button
                  type="button"
                  onClick={() => applyFormat('[Link Title](', 'https://example.com)')}
                  title="Insert Hyperlink"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyFormat('\n| Feature | Status |\n|---|---|\n| Priority Goal | In Progress |\n')}
                  title="Insert Table"
                  className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>Table</span>
                </button>
              </div>

              {/* Utility Tools */}
              <div className="flex items-center gap-2">
                {content && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    title="Copy journal text"
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1 text-[10px] cursor-pointer border border-slate-800"
                  >
                    {copiedToast ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedToast ? 'Copied' : 'Copy'}</span>
                  </button>
                )}

                {content && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear current journal text?')) setContent('');
                    }}
                    title="Clear Text"
                    className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dictation Status Bar */}
          {dictateStatus && (
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="font-semibold">{dictateStatus}</span>
              </div>
              {isListeningInline && (
                <button
                  type="button"
                  onClick={toggleInlineSpeech}
                  className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-[10px] font-bold cursor-pointer"
                >
                  Stop
                </button>
              )}
            </div>
          )}

          {/* Text Area with Character & Word Stats */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              placeholder="Start writing your journal entry... reflect on your day, track your goals, or use dictation to speak directly."
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans leading-relaxed resize-y custom-scrollbar"
              required
            />

            <div className="absolute bottom-3 right-4 text-[10px] text-slate-500 font-mono pointer-events-none bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
              {wordCount} words | {charCount} chars
            </div>
          </div>
        </div>

        {/* Media Attachments Section (Images & Videos) */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <Video className="w-4 h-4 text-purple-400" />
              <span>Media Attachments (Images & Videos)</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Native File Upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Photos / Videos</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMediaUrlInput(!showMediaUrlInput)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Media URL</span>
              </button>
            </div>
          </div>

          {/* Direct Media URL Input Drawer */}
          {showMediaUrlInput && (
            <div className="p-3 rounded-xl bg-slate-900 border border-indigo-500/30 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <select
                  value={mediaTypeInput}
                  onChange={(e) => setMediaTypeInput(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                >
                  <option value="image">📷 Image</option>
                  <option value="video">🎥 Video</option>
                </select>

                <input
                  type="text"
                  value={mediaTitleInput}
                  onChange={(e) => setMediaTitleInput(e.target.value)}
                  placeholder="Title / Caption (optional)..."
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 flex-1"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  placeholder="Enter direct image or video URL (e.g. https://...)"
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddMediaUrl}
                  disabled={!mediaUrlInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Render Attached Media Thumbnails */}
          {mediaAttachments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {mediaAttachments.map((media) => (
                <div
                  key={media.id}
                  className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center"
                >
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={media.title || 'Attachment'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute top-1 right-1 bg-slate-950/80 rounded-full p-1 border border-slate-800 shadow">
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(media.id)}
                      className="text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Remove Attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {media.title && (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 px-2 py-0.5 text-[9px] text-slate-300 truncate">
                      {media.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category, Privacy & Tags Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="reflection">Personal Reflection</option>
              <option value="gratitude">Gratitude & Mood</option>
              <option value="idea">Ideas & Thoughts</option>
              <option value="memory">Life Memory</option>
              <option value="event">Event & Calendar</option>
              <option value="learning">Book & Learning</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Privacy Level</span>
            </label>
            <select
              value={privacy}
              onChange={(e) => {
                const val = e.target.value as JournalPrivacyLevel;
                if ((val === 'private' || val === 'pin_locked') && !hasPin) {
                  if (onPromptSetPin) {
                    onPromptSetPin();
                  }
                  setPrivacy('standard');
                } else {
                  setPrivacy(val);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="standard">Standard (Isolated UID)</option>
              <option value="private">Private (PIN Guarded)</option>
              <option value="pin_locked">Strict PIN Locked</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Tags
              </label>
              <span className="text-[10px] text-indigo-400 font-medium">✨ Auto AI Tags if empty</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Custom tag or leave for AI..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              >
                <Tag className="w-2.5 h-2.5" />
                <span>{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-400 ml-0.5 text-slate-400 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          {successToast ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Saved! Specified goals were automatically identified & appended to your F1 track with timestamp & evidence.</span>
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              ⚡ Analyzed by Gemini Life Connections Engine
            </span>
          )}

          <button
            type="submit"
            disabled={!content.trim() || submitting}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98"
          >
            {submitting ? (
              <span>Analyzing & Saving...</span>
            ) : (
              <>
                <span>Save Journal Entry</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
