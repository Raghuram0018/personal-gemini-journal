import React, { useState } from 'react';
import {
  Home,
  Smile,
  BookOpen,
  Music,
  Sparkles,
  Target,
  Calendar,
  Compass,
  Settings,
} from 'lucide-react';

export type DockFeatureId =
  | 'home'
  | 'mood'
  | 'books'
  | 'music'
  | 'assistant'
  | 'goals'
  | 'calendar'
  | 'memories'
  | 'settings';

interface MacDockProps {
  activeFeature: DockFeatureId | null;
  onSelectFeature: (featureId: DockFeatureId) => void;
  hidden?: boolean;
}

interface DockItemDef {
  id: DockFeatureId;
  label: string;
  icon: React.ReactNode;
  isAi?: boolean;
}

export const MacDock: React.FC<MacDockProps> = ({
  activeFeature,
  onSelectFeature,
  hidden = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (hidden) {
    return null;
  }

  const dockItems: DockItemDef[] = [
    {
      id: 'home',
      label: 'Home / Journal',
      icon: <Home className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'mood',
      label: 'Mood Journey',
      icon: <Smile className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'books',
      label: 'Books',
      icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'music',
      label: 'Music',
      icon: <Music className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'assistant',
      label: 'Ask My Journal',
      icon: <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />,
      isAi: true,
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: <Target className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'memories',
      label: 'Memories',
      icon: <Compass className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />,
    },
  ];

  // Magnification scale calculation based on hovered icon index
  const getScaleClass = (index: number) => {
    if (hoveredIndex === null) return 'scale-100';
    const distance = Math.abs(hoveredIndex - index);
    if (distance === 0) return 'scale-135 sm:scale-140 -translate-y-2.5 z-20';
    if (distance === 1) return 'scale-115 sm:scale-120 -translate-y-1 z-10';
    if (distance === 2) return 'scale-105 sm:scale-105 z-0';
    return 'scale-95 opacity-80';
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      {/* Tooltip Floating Display above Dock */}
      <div className="h-7 mb-1 flex items-center justify-center pointer-events-none">
        {hoveredIndex !== null && (
          <div className="px-3 py-1 rounded-xl bg-slate-900/90 text-white text-[11px] font-bold font-display border border-indigo-500/30 shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-1.5">
            {dockItems[hoveredIndex].isAi && (
              <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
            )}
            <span>{dockItems[hoveredIndex].label}</span>
          </div>
        )}
      </div>

      {/* Floating macOS Glass Dock Container */}
      <nav
        aria-label="Mac OS Dock Navigation"
        className="px-3 sm:px-5 py-2.5 sm:py-3 rounded-3xl bg-slate-950/75 border border-white/10 shadow-2xl shadow-indigo-950/80 backdrop-blur-2xl flex items-center justify-center gap-2 sm:gap-3.5 transition-all duration-300"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {dockItems.map((item, index) => {
          const isActive = activeFeature === item.id;
          const scaleClass = getScaleClass(index);

          return (
            <button
              key={item.id}
              onClick={() => onSelectFeature(item.id)}
              onMouseEnter={() => setHoveredIndex(index)}
              className={`relative group p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ease-out cursor-pointer ${scaleClass} ${
                item.isAi
                  ? 'bg-gradient-to-tr from-indigo-600/40 via-purple-600/40 to-pink-500/40 border border-indigo-400/50 text-indigo-200 hover:text-white shadow-lg shadow-indigo-500/25'
                  : isActive
                  ? 'bg-slate-800/90 border border-indigo-500/50 text-white shadow-lg'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title={item.label}
            >
              {/* Icon */}
              <div className="relative">
                {item.icon}
                {item.isAi && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                )}
              </div>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-glow shadow-indigo-400"></span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
