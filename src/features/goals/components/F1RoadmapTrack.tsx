import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GoalTrack, GoalMilestone } from '../../../types';
import {
  Flag,
  CheckCircle2,
  Lock,
  Flame,
  Gauge,
  Sparkles,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Trophy,
  Plus,
  ArrowDown,
  ArrowUp,
  Zap,
  Layers,
  Compass,
  FileText,
  BookOpen,
  Calendar,
  Check,
  Trash2,
} from 'lucide-react';

interface F1RoadmapTrackProps {
  goal: GoalTrack;
  allGoals?: GoalTrack[];
  onSelectMilestone: (milestone: GoalMilestone) => void;
  activeMilestoneId?: string;
  onQuickAddMilestone?: (milestoneData: { title: string; description: string; targetDate?: string }) => void;
  isAllCircuitsView?: boolean;
  onToggleMilestoneComplete?: (milestoneId: string, explicitState?: boolean) => void;
  onDeleteGoal?: (goalId: string, goalTitle: string) => void;
}

interface TrackPoint {
  x: number;
  y: number;
  angle: number;
  percentage: number;
  isFinish?: boolean;
}

interface SectorGate {
  name: string;
  subTitle?: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  index: number;
}

export const F1RoadmapTrack: React.FC<F1RoadmapTrackProps> = ({
  goal,
  allGoals = [],
  onSelectMilestone,
  activeMilestoneId,
  onQuickAddMilestone,
  isAllCircuitsView = false,
  onToggleMilestoneComplete,
  onDeleteGoal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom and Pan states
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredMilestoneId, setHoveredMilestoneId] = useState<string | null>(null);
  const [showQuickAddInput, setShowQuickAddInput] = useState<boolean>(false);
  const [quickMilestoneTitle, setQuickMilestoneTitle] = useState<string>('');

  const milestones = goal.milestones || [];
  const totalMilestones = Math.max(1, milestones.length);

  // Procedural Dynamic Dimensions: Track height seamlessly expands infinitely
  const trackWidth = 1420;
  const segmentHeight = 360;
  const trackHeight = useMemo(() => {
    return Math.max(2400, 480 + totalMilestones * segmentHeight + 800);
  }, [totalMilestones, segmentHeight]);

  // Generate smooth procedural serpentine Bezier spline waypoints
  const waypoints = useMemo(() => {
    const points: Array<{ x: number; y: number; angle: number; isMilestone: boolean; milestoneIndex?: number }> = [];

    // Start Grid Waypoint
    points.push({ x: 420, y: 180, angle: 18, isMilestone: false });

    // Milestones Waypoints
    for (let i = 0; i < totalMilestones; i++) {
      const y = 380 + i * segmentHeight;
      const isEven = i % 2 === 0;
      // Procedural alternating apex curve with harmonic variation
      const x = isEven
        ? 980 + Math.sin(i * 1.3) * 35
        : 420 + Math.cos(i * 1.1) * 35;

      points.push({
        x,
        y,
        angle: isEven ? 25 : 155,
        isMilestone: true,
        milestoneIndex: i,
      });
    }

    // Finish Waypoint & Cool-down run-off loop
    const lastY = 380 + (totalMilestones - 1) * segmentHeight;
    const finishY = lastY + 340;
    const finishIsEven = totalMilestones % 2 === 0;
    const finishX = finishIsEven ? 980 : 420;

    points.push({
      x: finishX,
      y: finishY,
      angle: 15,
      isMilestone: false,
    });

    // Extra run-off buffer for infinite circuit continuation
    points.push({
      x: 700,
      y: finishY + 320,
      angle: 90,
      isMilestone: false,
    });

    return points;
  }, [totalMilestones, segmentHeight]);

  // Construct SVG Bezier curve path string dynamically from waypoints
  const trackPathData = useMemo(() => {
    if (waypoints.length < 2) return '';
    let d = `M ${waypoints[0].x} ${waypoints[0].y}`;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const p0 = waypoints[i];
      const p1 = waypoints[i + 1];
      const midY = (p0.y + p1.y) / 2;

      // Cubic Bezier with smooth vertical easing
      const cp1x = p0.x;
      const cp1y = midY;
      const cp2x = p1.x;
      const cp2y = midY;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }

    return d;
  }, [waypoints]);

  // Compute calculated positions & tangent angles for each milestone
  const milestonePoints = useMemo(() => {
    return milestones.map((m, idx) => {
      const frac = totalMilestones > 1 ? (idx + 0.5) / totalMilestones : 0.5;
      const matchedWp = waypoints.find((wp) => wp.isMilestone && wp.milestoneIndex === idx);

      const x = matchedWp?.x || (idx % 2 === 0 ? 980 : 420);
      const y = matchedWp?.y || (380 + idx * segmentHeight);
      const angle = matchedWp?.angle || (idx % 2 === 0 ? 25 : 155);

      return {
        milestone: m,
        point: { x, y, angle, percentage: frac * 100 },
      };
    });
  }, [milestones, waypoints, totalMilestones, segmentHeight]);

  // Dynamic Sector Timing Gates across the circuit
  const sectorGates: SectorGate[] = useMemo(() => {
    const gates: SectorGate[] = [];

    if (isAllCircuitsView) {
      // In All Circuits view, place a distinct Sector Gate whenever the goal changes
      let currentGoalTitle = '';
      let sectorNum = 1;
      const sectorColors = ['#ec4899', '#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#06b6d4'];

      milestones.forEach((m, idx) => {
        const goalTitle = m.goalTitle || 'Circuit Chapter';
        if (goalTitle !== currentGoalTitle) {
          currentGoalTitle = goalTitle;
          const matchedPoint = milestonePoints[idx]?.point;
          if (matchedPoint) {
            gates.push({
              name: `SECTOR ${sectorNum}: ${goalTitle.toUpperCase()}`,
              subTitle: m.goalCategory || 'Grand Prix Stage',
              x: matchedPoint.x,
              y: Math.max(160, matchedPoint.y - 120),
              angle: matchedPoint.angle,
              color: sectorColors[(sectorNum - 1) % sectorColors.length],
              index: idx,
            });
            sectorNum++;
          }
        }
      });
    } else {
      // In Single Circuit view, place Sector 1, DRS Zone, Sector 2
      if (waypoints.length > 2) {
        const s1Index = Math.max(1, Math.floor(waypoints.length * 0.3));
        if (waypoints[s1Index]) {
          gates.push({
            name: 'SECTOR 1 TIMING',
            x: waypoints[s1Index].x,
            y: waypoints[s1Index].y - 90,
            angle: waypoints[s1Index].angle,
            color: '#38bdf8',
            index: s1Index,
          });
        }

        const s2Index = Math.max(2, Math.floor(waypoints.length * 0.6));
        if (waypoints[s2Index]) {
          gates.push({
            name: 'DRS DETECTION ZONE',
            x: waypoints[s2Index].x,
            y: waypoints[s2Index].y - 90,
            angle: waypoints[s2Index].angle,
            color: '#a855f7',
            index: s2Index,
          });
        }

        const s3Index = Math.max(3, Math.floor(waypoints.length * 0.85));
        if (waypoints[s3Index]) {
          gates.push({
            name: 'SECTOR 2 TIMING',
            x: waypoints[s3Index].x,
            y: waypoints[s3Index].y - 90,
            angle: waypoints[s3Index].angle,
            color: '#ec4899',
            index: s3Index,
          });
        }
      }
    }
    return gates;
  }, [waypoints, milestones, milestonePoints, isAllCircuitsView]);

  const completedCount = milestones.filter((m) => m.completed).length;
  const finishWaypoint = waypoints[waypoints.length - 2] || { x: 980, y: 1800, angle: 10 };
  const allMilestonesCompleted = milestones.length > 0 && completedCount === milestones.length;

  // Determine current active milestone (the next incomplete checkpoint to tackle)
  const currentActiveMilestone = useMemo(() => {
    const firstIncomplete = milestones.find((m) => !m.completed);
    if (firstIncomplete) return firstIncomplete;
    return null;
  }, [milestones]);

  // Target coordinates for F1 vehicle - reflects true progress along the circuit
  const activePointInfo = useMemo<TrackPoint>(() => {
    if (allMilestonesCompleted || (totalMilestones > 0 && completedCount >= totalMilestones)) {
      return {
        x: finishWaypoint.x,
        y: finishWaypoint.y,
        angle: finishWaypoint.angle || 15,
        percentage: 100,
        isFinish: true,
      };
    }

    if (completedCount === 0) {
      const startWp = waypoints[0] || { x: 420, y: 180, angle: 18 };
      // Check if first milestone has partial task progress
      const firstM = milestones[0];
      const tasks = firstM?.tasks || [];
      const doneTasks = tasks.filter((t) => t.completed).length;
      if (tasks.length > 0 && doneTasks > 0 && milestonePoints[0]) {
        const fraction = doneTasks / tasks.length;
        const targetPt = milestonePoints[0].point;
        // Interpolate between start and first milestone
        const curX = startWp.x + (targetPt.x - startWp.x) * fraction;
        const curY = startWp.y + (targetPt.y - startWp.y) * fraction;
        return {
          x: curX,
          y: curY,
          angle: targetPt.angle || 25,
          percentage: Math.round(fraction * (100 / Math.max(1, totalMilestones))),
        };
      }
      // Positioned at the starting line grid
      return { x: startWp.x, y: startWp.y, angle: startWp.angle || 18, percentage: 0 };
    }

    // Car has completed at least one milestone: position at the latest completed milestone point
    const lastCompletedIdx = Math.min(completedCount - 1, milestonePoints.length - 1);
    const basePoint = milestonePoints[lastCompletedIdx]?.point;
    const fallbackPoint = waypoints[0] || { x: 420, y: 180, angle: 18 };

    // Check if next milestone has partial tasks completed for smooth forward progression
    const nextIdx = completedCount;
    if (nextIdx < milestonePoints.length && milestonePoints[nextIdx]) {
      const nextM = milestones[nextIdx];
      const nextTasks = nextM?.tasks || [];
      const nextDone = nextTasks.filter((t) => t.completed).length;
      if (nextTasks.length > 0 && nextDone > 0 && basePoint) {
        const fraction = nextDone / nextTasks.length;
        const nextPt = milestonePoints[nextIdx].point;
        const curX = basePoint.x + (nextPt.x - basePoint.x) * (fraction * 0.85);
        const curY = basePoint.y + (nextPt.y - basePoint.y) * (fraction * 0.85);
        return {
          x: curX,
          y: curY,
          angle: nextPt.angle || basePoint.angle,
          percentage: Math.round(((completedCount + fraction) / Math.max(1, totalMilestones)) * 100),
        };
      }
    }

    return (
      basePoint || {
        x: fallbackPoint.x,
        y: fallbackPoint.y,
        angle: fallbackPoint.angle || 18,
        percentage: Math.round((completedCount / Math.max(1, totalMilestones)) * 100),
      }
    );
  }, [allMilestonesCompleted, completedCount, totalMilestones, milestonePoints, finishWaypoint, waypoints, milestones]);

  // Safe Pan boundaries with generous headroom for infinite navigation
  const clampPan = useCallback(
    (targetPanX: number, targetPanY: number, currentZoom: number) => {
      if (!containerRef.current) return { x: targetPanX, y: targetPanY };
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const minX = containerWidth - trackWidth * currentZoom - 300;
      const maxX = 300;
      const minY = containerHeight - trackHeight * currentZoom - 300;
      const maxY = 250;

      return {
        x: Math.max(minX, Math.min(maxX, targetPanX)),
        y: Math.max(minY, Math.min(maxY, targetPanY)),
      };
    },
    [trackWidth, trackHeight]
  );

  // Center view on active vehicle position on initial load, goal change, or milestone completion
  useEffect(() => {
    if (containerRef.current && activePointInfo) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const targetPanX = containerWidth / 2 - activePointInfo.x * zoom;
      const targetPanY = containerHeight / 2 - activePointInfo.y * zoom;

      setPan(clampPan(targetPanX, targetPanY, zoom));
    }
  }, [goal.id, isAllCircuitsView, activePointInfo.x, activePointInfo.y, clampPan, zoom]);

  // Mouse wheel infinite scroll handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom with wheel
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((prev) => {
        const nextZoom = Math.min(1.8, Math.max(0.35, Number((prev * zoomFactor).toFixed(2))));
        return nextZoom;
      });
    } else {
      // Smooth continuous track scroll
      setPan((prev) => {
        const deltaX = -e.deltaX * 1.3;
        const deltaY = -e.deltaY * 1.3;
        return clampPan(prev.x + deltaX, prev.y + deltaY, zoom);
      });
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const nextPanX = e.clientX - dragStart.x;
    const nextPanY = e.clientY - dragStart.y;
    setPan(clampPan(nextPanX, nextPanY, zoom));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => {
      const nextZoom = Math.min(1.8, Math.max(0.35, Number((prev + delta).toFixed(2))));
      setPan((curr) => clampPan(curr.x, curr.y, nextZoom));
      return nextZoom;
    });
  };

  const handleResetZoom = () => {
    setZoom(0.85);
    handleCenterOnVehicle();
  };

  const handleCenterOnVehicle = () => {
    if (containerRef.current && activePointInfo) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const targetPanX = containerWidth / 2 - activePointInfo.x * zoom;
      const targetPanY = containerHeight / 2 - activePointInfo.y * zoom;
      setPan(clampPan(targetPanX, targetPanY, zoom));
    }
  };

  const handleJumpToStart = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const targetPanX = containerWidth / 2 - 420 * zoom;
      const targetPanY = 80;
      setPan(clampPan(targetPanX, targetPanY, zoom));
    }
  };

  const handleJumpToFinish = () => {
    if (containerRef.current && waypoints.length > 0) {
      const lastWp = waypoints[waypoints.length - 2] || waypoints[waypoints.length - 1];
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const targetPanX = containerWidth / 2 - lastWp.x * zoom;
      const targetPanY = containerHeight - lastWp.y * zoom - 120;
      setPan(clampPan(targetPanX, targetPanY, zoom));
    }
  };

  const handleJumpToMilestoneIndex = (index: number) => {
    const targetPoint = milestonePoints[index]?.point;
    if (targetPoint && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const targetPanX = containerWidth / 2 - targetPoint.x * zoom;
      const targetPanY = containerHeight / 2 - targetPoint.y * zoom;
      setPan(clampPan(targetPanX, targetPanY, zoom));
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMilestoneTitle.trim() || !onQuickAddMilestone) return;
    onQuickAddMilestone({
      title: quickMilestoneTitle.trim(),
      description: 'Newly added milestone checkpoint on the circuit roadmap.',
    });
    setQuickMilestoneTitle('');
    setShowQuickAddInput(false);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-[78vh] sm:h-[82vh] overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950 via-[#070913] to-slate-950 border border-indigo-500/20 shadow-2xl select-none cursor-${
        isDragging ? 'grabbing' : 'grab'
      }`}
    >
      {/* Background Asphalt Grid & Glowing Track Circuit Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-slate-950/80 to-black pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40"></div>

      {/* Track HUD Floating Controls (Top Left: Telemetry Progress) */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-xl shadow-xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <Gauge className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <span>{isAllCircuitsView ? 'Master Grand Prix Progress' : 'Circuit Progress'}</span>
              <span className="text-pink-400 font-bold">{goal.progress || 0}%</span>
            </div>
            <div className="text-xs font-bold text-white font-display flex items-center gap-2">
              <span>{completedCount} of {totalMilestones} Checkpoints Passed</span>
              {isAllCircuitsView && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono border border-purple-500/30">
                  ALL CIRCUITS UNIFIED
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Navigator Controls (Top Right: Quick Jump & Add Checkpoint & Delete) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
        {onQuickAddMilestone && (
          <button
            onClick={() => setShowQuickAddInput((prev) => !prev)}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-pink-400 hover:text-pink-300 border border-pink-500/40 shadow-xl backdrop-blur-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 hover:scale-105"
            title="Add Checkpoint to Circuit"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Checkpoint</span>
          </button>
        )}

        {onDeleteGoal && !isAllCircuitsView && (
          <button
            onClick={() => onDeleteGoal(goal.id, goal.title)}
            className="px-3.5 py-2 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/80 shadow-xl backdrop-blur-xl transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 hover:scale-105"
            title={`Delete "${goal.title}" Circuit`}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Delete Circuit</span>
          </button>
        )}

        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-700/80 backdrop-blur-xl shadow-xl">
          <button
            onClick={handleJumpToStart}
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Jump to Start Grid"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleCenterOnVehicle}
            className="p-2 rounded-xl text-pink-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Jump to Current F1 Car"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            onClick={handleJumpToFinish}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Jump to Finish Line"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vertical Mini-Track Checkpoint Navigator Bar (Left Rail) */}
      {totalMilestones > 4 && (
        <div className="absolute top-24 left-4 z-30 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 backdrop-blur-xl shadow-xl max-h-[50vh] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pointer-events-auto">
          <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1 text-center">
            CPs ({totalMilestones})
          </div>
          {milestones.map((m, idx) => {
            const isCompleted = m.completed;
            const isActive = currentActiveMilestone?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleJumpToMilestoneIndex(idx)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/50 scale-110 ring-2 ring-pink-400'
                    : isCompleted
                    ? 'bg-emerald-600/80 text-white hover:bg-emerald-500'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title={`Jump to CP ${idx + 1}: ${m.title}`}
              >
                {isCompleted ? '✓' : idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Inline Quick Add Checkpoint Popover (if triggered) */}
      {showQuickAddInput && (
        <div className="absolute top-16 right-4 z-40 p-4 rounded-3xl bg-slate-900/95 border border-pink-500/40 backdrop-blur-2xl shadow-2xl w-80 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Extend Circuit Checkpoint</span>
            </span>
            <button
              onClick={() => setShowQuickAddInput(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleQuickAddSubmit} className="space-y-2.5">
            <input
              type="text"
              value={quickMilestoneTitle}
              onChange={(e) => setQuickMilestoneTitle(e.target.value)}
              placeholder="e.g. Master PyTorch Tensor Operations"
              autoFocus
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
            >
              Append to Circuit Road
            </button>
          </form>
        </div>
      )}

      {/* Floating Zoom & Camera Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(0.15)}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-xl backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Reset Zoom (85%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenterOnVehicle}
          className="p-3 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/30 backdrop-blur-xl transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Focus on F1 Car"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Transformable Infinite Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          width: `${trackWidth}px`,
          height: `${trackHeight}px`,
        }}
        className="absolute top-0 left-0 pointer-events-auto"
      >
        {/* SVG Circuit Canvas Layer */}
        <svg
          ref={svgRef}
          width={trackWidth}
          height={trackHeight}
          viewBox={`0 0 ${trackWidth} ${trackHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Track Glowing Filter */}
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Asphalt Texture Pattern */}
            <pattern id="asphalt-pattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#0f172a" />
              <circle cx="2" cy="2" r="0.8" fill="#1e293b" opacity="0.6" />
              <circle cx="5" cy="5" r="0.8" fill="#334155" opacity="0.4" />
            </pattern>

            {/* Checkered Finish Line Pattern */}
            <pattern id="finish-checkers" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#ffffff" />
              <rect x="10" y="0" width="10" height="10" fill="#000000" />
              <rect x="0" y="10" width="10" height="10" fill="#000000" />
              <rect x="10" y="10" width="10" height="10" fill="#ffffff" />
            </pattern>
          </defs>

          {/* 1. Track Outer Ambient Shadow / Ground Halo */}
          <path
            d={trackPathData}
            fill="none"
            stroke="#6366f1"
            strokeWidth="120"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            filter="url(#neon-glow)"
          />

          {/* 2. Red & White Curbs (Racing Kerbs on Outer Boundaries) */}
          <path
            d={trackPathData}
            fill="none"
            stroke="#e11d48"
            strokeWidth="98"
            strokeDasharray="18 18"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          <path
            d={trackPathData}
            fill="none"
            stroke="#f8fafc"
            strokeWidth="98"
            strokeDasharray="18 18"
            strokeDashoffset="18"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* 3. Main Asphalt Circuit Track Body */}
          <path
            d={trackPathData}
            fill="none"
            stroke="url(#asphalt-pattern)"
            strokeWidth="86"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shadow-2xl"
          />

          {/* 4. Glowing Neon Circuit Boundaries */}
          <path
            d={trackPathData}
            fill="none"
            stroke="#818cf8"
            strokeWidth="86"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
          <path
            d={trackPathData}
            fill="none"
            stroke="#ec4899"
            strokeWidth="80"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.12"
          />

          {/* 5. Center Lane Dashed White Line */}
          <path
            d={trackPathData}
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeDasharray="16 20"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* 6. Start Grid Line */}
          <g transform="translate(370, 140) rotate(18)">
            <rect x="-10" y="0" width="100" height="14" fill="#38ef7d" opacity="0.9" rx="3" />
            <text
              x="40"
              y="-10"
              fill="#38ef7d"
              fontSize="12"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              START GRID 🚦
            </text>
          </g>

          {/* 7. Sector Timing & Telemetry Gates */}
          {sectorGates.map((gate, i) => (
            <g key={i} transform={`translate(${gate.x}, ${gate.y}) rotate(${gate.angle})`}>
              <line x1="-55" y1="0" x2="55" y2="0" stroke={gate.color} strokeWidth="3.5" strokeDasharray="8 5" opacity="0.85" />
              <rect x="-70" y="-22" width="140" height="18" fill="#030712" rx="4" stroke={gate.color} strokeWidth="1" opacity="0.9" />
              <text
                x="0"
                y="-9"
                fill={gate.color}
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {gate.name}
              </text>
            </g>
          ))}

          {/* 8. Checkered Finish Line Gantry at End */}
          <g transform={`translate(${finishWaypoint.x - 45}, ${finishWaypoint.y - 10}) rotate(${finishWaypoint.angle || 10})`}>
            <rect x="0" y="0" width="100" height="22" fill="url(#finish-checkers)" stroke="#ffffff" strokeWidth="1.5" rx="3" />
            <text
              x="50"
              y="-10"
              fill="#fbbf24"
              fontSize="13"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              FINISH LINE 🏁
            </text>
          </g>
        </svg>

        {/* Checkpoint Nodes & Detailed Interactive Labels along the procedural curve */}
        {milestonePoints.map(({ milestone, point }, index) => {
          const isCompleted = milestone.completed;
          const isActive = currentActiveMilestone?.id === milestone.id;
          const isHovered = hoveredMilestoneId === milestone.id;

          // Compute subtasks stats
          const totalTasks = milestone.tasks?.length || 0;
          const doneTasks = milestone.tasks?.filter((t) => t.completed).length || 0;

          // Label placement offset to avoid overlap with track
          const isEven = index % 2 === 0;
          const labelOffsetX = isEven ? 80 : -390;
          const labelOffsetY = -60;

          // Has evidence
          const hasEvidence = Boolean(milestone.evidence && milestone.evidence.trim().length > 0);

          return (
            <div
              key={milestone.id}
              style={{
                left: `${point.x}px`,
                top: `${point.y}px`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
              onMouseEnter={() => setHoveredMilestoneId(milestone.id)}
              onMouseLeave={() => setHoveredMilestoneId(null)}
            >
              {/* Checkpoint Outer Pulsing Aura when Active */}
              {isActive && (
                <div className="absolute -inset-6 rounded-full bg-pink-500/30 blur-md animate-ping pointer-events-none"></div>
              )}

              {/* Checkpoint Pinhead Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMilestone(milestone);
                }}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-display font-extrabold text-sm shadow-2xl transition-all duration-300 cursor-pointer ${
                  isCompleted
                    ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white border-2 border-emerald-300 ring-4 ring-emerald-500/30 scale-105 hover:scale-115 shadow-emerald-500/50'
                    : isActive
                    ? 'bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-500 text-white border-2 border-pink-300 ring-4 ring-pink-500/40 scale-110 hover:scale-125 shadow-pink-500/60 animate-pulse'
                    : 'bg-slate-900/90 text-slate-300 border-2 border-slate-700 hover:border-indigo-400 hover:text-white hover:scale-110 shadow-slate-950'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                ) : isActive ? (
                  <Flame className="w-6 h-6 text-amber-300 animate-bounce" />
                ) : (
                  <span>{index + 1}</span>
                )}

                {/* Mini Checkpoint Badge Flag */}
                <div className="absolute -top-2 -right-1 p-1 rounded-full bg-slate-950 border border-slate-700 text-[10px] text-white">
                  {isCompleted ? '🏆' : `CP${index + 1}`}
                </div>
              </button>

              {/* Connected Milestone Label Card Beside Pin with Prominent Evidence Display */}
              <div
                style={{
                  transform: `translate(${labelOffsetX}px, ${labelOffsetY}px)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectMilestone(milestone);
                }}
                className={`absolute w-80 sm:w-92 p-4 sm:p-4.5 rounded-3xl backdrop-blur-2xl border shadow-2xl transition-all duration-300 cursor-pointer ${
                  isHovered || isActive
                    ? 'bg-slate-900/95 border-pink-500/60 shadow-pink-950/80 scale-105 z-30 ring-2 ring-pink-500/20'
                    : isCompleted
                    ? 'bg-slate-900/85 border-emerald-500/40 shadow-emerald-950/50'
                    : 'bg-slate-950/85 border-slate-800/90 hover:border-indigo-500/50'
                }`}
              >
                {/* Header with Circuit Badge + Status Badge */}
                <div className="flex flex-col gap-1.5 mb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold font-mono uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isActive
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 animate-pulse'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isCompleted ? '✓ Completed Lap' : isActive ? '⚡ In Progress Lap' : 'Upcoming Checkpoint'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {milestone.targetDate || `CP #${index + 1}`}
                    </span>
                  </div>

                  {/* Circuit Identifier if in All Circuits view or available */}
                  {(isAllCircuitsView || milestone.goalTitle) && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-500/20 truncate">
                      <Flag className="w-3 h-3 text-pink-400 shrink-0" />
                      <span className="truncate font-semibold">{milestone.goalTitle || goal.title}</span>
                    </div>
                  )}
                </div>

                {/* Milestone Title */}
                <h4 className="text-xs sm:text-sm font-bold text-white font-display line-clamp-1 group-hover:text-pink-300 transition-colors">
                  {milestone.title}
                </h4>

                {/* Milestone Description Snippet */}
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {milestone.description}
                </p>

                {/* PROMINENT EVIDENCE SECTION (Visible Directly on the Track) */}
                {hasEvidence ? (
                  <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 text-[11px] text-slate-200 space-y-1 shadow-inner">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono font-bold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>VERIFIED JOURNAL EVIDENCE</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                        LINKED
                      </span>
                    </div>
                    <div className="font-mono text-slate-300 text-[10px] leading-relaxed line-clamp-3 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                      {milestone.evidence}
                    </div>
                  </div>
                ) : milestone.aiExplanation ? (
                  <div className="mt-2 p-2 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-[10px] text-indigo-300 flex items-start gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{milestone.aiExplanation}</span>
                  </div>
                ) : null}

                {/* Tasks & Action Link Bar */}
                <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-800/80 text-[10px]">
                  <span className="text-slate-400 font-mono">
                    {totalTasks > 0 ? `${doneTasks}/${totalTasks} Tasks Done` : 'Ready to Inspect'}
                  </span>
                  <div className="flex items-center gap-2">
                    {onToggleMilestoneComplete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleMilestoneComplete(milestone.id);
                        }}
                        className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white border border-slate-700'
                        }`}
                        title={isCompleted ? 'Click to reopen milestone' : 'Click to mark milestone complete'}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isCompleted ? '✓ Completed' : 'Complete Lap'}</span>
                      </button>
                    )}
                    <span className="text-indigo-400 group-hover:text-pink-400 font-bold flex items-center gap-0.5">
                      <span>Inspect</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* F1 RACE CAR VEHICLE (Positioned at Active Milestone Coordinates or Finish Line) */}
        <div
          style={{
            left: `${activePointInfo.x}px`,
            top: `${activePointInfo.y}px`,
            transform: `translate(-50%, -50%) rotate(${activePointInfo.angle}deg)`,
            transition: 'all 1.4s cubic-bezier(0.34, 1.4, 0.64, 1)',
          }}
          className="absolute z-30 pointer-events-none group"
        >
          {/* Victory Celebration / Trophy Badge when Car reaches Finish Line */}
          {activePointInfo.isFinish && (
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce z-40">
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black text-[11px] font-mono shadow-2xl shadow-yellow-500/80 border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
                <Trophy className="w-3.5 h-3.5 fill-current" />
                <span>P1 VICTORY • FINISH LINE</span>
              </div>
              <div className="w-2 h-2 rotate-45 bg-yellow-400 -mt-1"></div>
            </div>
          )}

          {/* Exhaust / Fume Particles Animation Trail behind Car */}
          <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-90">
            <div className={`w-3 h-3 rounded-full ${activePointInfo.isFinish ? 'bg-amber-400' : 'bg-gradient-to-r from-amber-400 to-rose-500'} blur-[2px] animate-ping`}></div>
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 blur-[3px] animate-pulse"></div>
            <div className="w-6 h-6 rounded-full bg-indigo-500/40 blur-[5px]"></div>
          </div>

          {/* Car Pulsing Glow Aura */}
          <div className={`absolute -inset-8 rounded-full ${activePointInfo.isFinish ? 'bg-gradient-to-r from-amber-400/50 via-yellow-400/40 to-pink-500/30 ring-4 ring-yellow-400/40' : 'bg-gradient-to-r from-pink-500/40 via-purple-500/30 to-indigo-500/20'} blur-xl animate-pulse`}></div>

          {/* Aerodynamic Sleek F1 Race Car SVG */}
          <svg
            width="90"
            height="46"
            viewBox="0 0 100 52"
            className="w-20 h-10 sm:w-24 sm:h-12 drop-shadow-[0_10px_20px_rgba(236,72,153,0.6)]"
          >
            <defs>
              <linearGradient id="f1-chassis" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="45%" stopColor="#9333ea" />
                <stop offset="85%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="f1-halo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="tire-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#090d16" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Rear Wheels */}
            <rect x="14" y="2" width="18" height="10" rx="3" fill="url(#tire-grad)" stroke="#ec4899" strokeWidth="1" />
            <rect x="14" y="40" width="18" height="10" rx="3" fill="url(#tire-grad)" stroke="#ec4899" strokeWidth="1" />

            {/* Front Wheels */}
            <rect x="70" y="4" width="15" height="9" rx="2.5" fill="url(#tire-grad)" stroke="#06b6d4" strokeWidth="1" />
            <rect x="70" y="39" width="15" height="9" rx="2.5" fill="url(#tire-grad)" stroke="#06b6d4" strokeWidth="1" />

            {/* Rear Wing & DRS Assembly */}
            <rect x="6" y="10" width="8" height="32" rx="2" fill="#e11d48" stroke="#ffffff" strokeWidth="0.8" />
            <line x1="8" y1="12" x2="8" y2="40" stroke="#fbbf24" strokeWidth="1.5" />

            {/* Main Aerodynamic Chassis Body */}
            <path
              d="M 12 18 
                 C 25 16, 45 14, 60 19 
                 C 72 23, 85 24, 96 26 
                 C 85 28, 72 29, 60 33 
                 C 45 38, 25 36, 12 34 
                 Z"
              fill="url(#f1-chassis)"
              stroke="#ffffff"
              strokeWidth="1.2"
            />

            {/* Cockpit & Halo Titanium Ring */}
            <ellipse cx="50" cy="26" rx="9" ry="5.5" fill="url(#f1-halo)" stroke="#38bdf8" strokeWidth="1.2" />
            <circle cx="50" cy="26" r="3" fill="#facc15" />

            {/* Front Wing Spoiler */}
            <path
              d="M 90 12 L 98 26 L 90 40 L 93 26 Z"
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth="1"
            />

            {/* Racing Driver Number */}
            <text
              x="32"
              y="29"
              fill="#ffffff"
              fontSize="9"
              fontWeight="900"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              01
            </text>
          </svg>
        </div>

        {/* Dynamic Track Extension Button at Bottom of Road */}
        {onQuickAddMilestone && (
          <div
            style={{
              left: `${finishWaypoint.x}px`,
              top: `${finishWaypoint.y + 160}px`,
            }}
            className="absolute -translate-x-1/2 z-20"
          >
            <button
              onClick={() => setShowQuickAddInput(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600/90 to-purple-600/90 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-2xl shadow-pink-950/80 border border-pink-400/40 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Extend Circuit with Next Checkpoint</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
