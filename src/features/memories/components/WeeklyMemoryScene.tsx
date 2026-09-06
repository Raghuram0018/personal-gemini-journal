import React, { Suspense, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Sparkles as SparklesIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  History,
  Info
} from 'lucide-react';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Stars, 
  Sparkles,
  Environment,
  Float
} from '@react-three/drei';
import * as THREE from 'three';
import { Memory3DCard } from './Memory3DCard';
import { MemoryItem } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

type AnimationPhase = 
  | 'FORMATION' 
  | 'SPHERE_SHOWCASE' 
  | 'CAROUSEL_TRANSITION' 
  | 'CAROUSEL_FOCUS' 
  | 'SPHERE_REASSEMBLY' 
  | 'RADIAL_DISPERSAL'
  | 'PAUSED';

interface WeeklyMemorySceneProps {
  memories: MemoryItem[];
  onCardSelect: (memory: MemoryItem) => void;
  isLoading?: boolean;
  status: 'in_progress' | 'completed' | 'empty';
  nextDate?: string;
  daysRemaining?: number;
  onOpenArchive?: () => void;
  weekRange?: string;
}

const PHASE_DURATIONS: Record<Exclude<AnimationPhase, 'PAUSED'>, number> = {
  FORMATION: 2200,
  SPHERE_SHOWCASE: 3500,
  CAROUSEL_TRANSITION: 1500,
  CAROUSEL_FOCUS: 6000,
  SPHERE_REASSEMBLY: 2000,
  RADIAL_DISPERSAL: 2800
};

// Fibonacci sphere distribution for stable 3D arrangement
function getFibonacciSpherePos(i: number, count: number, radius: number): [number, number, number] {
  if (count <= 1) return [0, 0, radius * 0.1];
  const phi = Math.acos(1 - 2 * (i + 0.5) / count);
  const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
  
  return [
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi)
  ];
}

// 3D Carousel position with depth falloff and curved path
function getCarouselPos(i: number, activeIndex: number, count: number): [number, number, number] {
  const diff = i - activeIndex;
  // Center card is at 0, 0, 0
  const x = diff * 4.4; // Natural horizontal spacing so neighbor cards are visible
  const z = -Math.abs(diff) * 2.8; // Gentle depth falloff
  const y = 0;
  return [x, y, z];
}

const SceneController: React.FC<{
  memories: MemoryItem[];
  phase: AnimationPhase;
  activeIndex: number;
  onPhaseComplete: () => void;
  onActiveIndexChange: (index: number) => void;
  onCardSelect: (m: MemoryItem) => void;
  status: 'in_progress' | 'completed' | 'empty';
  nextDate?: string;
}> = ({ memories, phase, activeIndex, onPhaseComplete, onActiveIndexChange, onCardSelect, status, nextDate }) => {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const phaseStartTime = useRef(Date.now());
  const phaseCompletedRef = useRef(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Default fallback placeholder cards only if user has zero data
  const defaultCards = useMemo(() => 
    Array.from({ length: 18 }).map((_, i) => ({
      id: `default-${i}`,
      userId: 'system',
      title: `Memory Reflection ${i + 1}`,
      snippet: 'Personal Life Continuum',
      summary: 'Personal Life Continuum',
      date: new Date().toISOString(),
      category: 'Milestones',
      sourceType: 'default'
    } as MemoryItem)), []);

  // Normalize memories: ALWAYS use user's authentic Firestore memories in all phases
  const displayMemories = useMemo(() => {
    if (memories && memories.length > 0) {
      const isCarouselPhase = phase === 'CAROUSEL_TRANSITION' || phase === 'CAROUSEL_FOCUS';
      if (isCarouselPhase) {
        return memories;
      }
      if (memories.length >= 14) {
        return memories;
      }
      // For sphere geometry when user has fewer items, tile their real memories with composite keys
      const filled: MemoryItem[] = [];
      const targetCount = 18;
      for (let i = 0; i < targetCount; i++) {
        const base = memories[i % memories.length];
        filled.push({
          ...base,
          id: `${base.id}-node-${i}`
        });
      }
      return filled;
    }

    return defaultCards;
  }, [memories, phase, defaultCards]);

  // Target positions based on phase
  const targetPositions = useMemo(() => {
    const radius = 8;
    return displayMemories.map((_, i) => {
      if (phase === 'FORMATION' || phase === 'SPHERE_SHOWCASE' || phase === 'SPHERE_REASSEMBLY') {
        return getFibonacciSpherePos(i, displayMemories.length, radius);
      } else if (phase === 'CAROUSEL_TRANSITION' || phase === 'CAROUSEL_FOCUS') {
        return getCarouselPos(i, activeIndex, displayMemories.length);
      } else if (phase === 'RADIAL_DISPERSAL') {
        const spherePos = getFibonacciSpherePos(i, displayMemories.length, radius);
        const vec = new THREE.Vector3(...spherePos);
        if (vec.lengthSq() < 0.1) vec.set(0, 0, 1); // Default direction for center card
        vec.normalize().multiplyScalar(50); // Explode outwards
        return [vec.x, vec.y, vec.z] as [number, number, number];
      }
      return [0, 0, 0] as [number, number, number];
    });
  }, [displayMemories.length, phase, activeIndex]);

  useEffect(() => {
    phaseStartTime.current = Date.now();
    phaseCompletedRef.current = false;
  }, [phase, activeIndex]);

  useFrame((state, delta) => {
    const elapsed = Date.now() - phaseStartTime.current;
    const duration = phase !== 'PAUSED' ? (PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS] || 2000) : 1;
    const t = Math.min(elapsed / duration, 1);
    
    // Smooth easing
    const ease = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const progress = ease(t);

    if (groupRef.current) {
      if (phase === 'FORMATION' || phase === 'SPHERE_SHOWCASE' || phase === 'SPHERE_REASSEMBLY') {
        groupRef.current.rotation.y -= delta * 0.15;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, Math.sin(state.clock.getElapsedTime() * 0.3) * 0.05, 0.05);
      } else if (phase === 'CAROUSEL_TRANSITION' || phase === 'CAROUSEL_FOCUS') {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, 0.08);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.08);
      } else if (phase === 'RADIAL_DISPERSAL') {
        groupRef.current.rotation.y += delta * 0.8;
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 2, 0.02));
      } else {
        groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 1, 0.05));
      }
    }

    // Cinematic Camera Lerp - Bring camera closer for carousel
    const targetCamPos = (phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION') 
      ? new THREE.Vector3(0, 0, 10) 
      : new THREE.Vector3(0, 0, 24);
    
    camera.position.lerp(targetCamPos, 0.05);
    (camera as THREE.PerspectiveCamera).fov = THREE.MathUtils.lerp(
      (camera as THREE.PerspectiveCamera).fov, 
      (phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION') ? 38 : 55, 
      0.05
    );
    camera.updateProjectionMatrix();

    // Check phase completion strictly once per phase
    if (t >= 1 && phase !== 'PAUSED' && phase !== 'CAROUSEL_FOCUS' && !phaseCompletedRef.current) {
      phaseCompletedRef.current = true;
      onPhaseComplete();
    }
  });

  return (
    <group ref={groupRef}>
      {displayMemories.map((memory, i) => {
        const isFocused = (phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION') && activeIndex === i;
        
        // Calculate dynamic properties based on phase and progress
        const dist = Math.abs(i - activeIndex);
        let scale = 1;
        let opacity = 1;
        const elapsed = Date.now() - phaseStartTime.current;
        const duration = phase !== 'PAUSED' ? (PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS] || 2000) : 1;
        const t = Math.min(elapsed / duration, 1);
        
        if (phase === 'FORMATION') {
          scale = 0.01 + t * 0.99;
          opacity = t;
        } else if (phase === 'RADIAL_DISPERSAL') {
          scale = Math.max(0.01, 1 - t * 1.5);
          opacity = Math.max(0, 1 - t * 1.2);
        } else if (phase === 'CAROUSEL_TRANSITION' || phase === 'CAROUSEL_FOCUS') {
          const isMobile = size.width < 768;
          // Scale center card dramatically - HUGE focus
          // Desktop: 1.2 -> adjusted down further. Mobile: 1.5 -> adjusted down further
          const baseScale = isMobile ? 1.5 : 1.2;
          scale = i === activeIndex ? baseScale : 0.45 / (1 + dist * 0.5);
          opacity = i === activeIndex ? 1.0 : Math.max(0.35, 1 / (1 + dist * 1.5));
        }

        return (
          <Memory3DCard
            key={memory.id}
            data={memory}
            position={targetPositions[i]}
            scale={scale}
            opacity={opacity}
            isActive={isFocused}
            isHovered={hoveredId === memory.id}
            phase={phase}
            distFromActive={dist}
            onClick={() => {
              if (phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION') {
                onActiveIndexChange(i);
              } else {
                onCardSelect(memory);
              }
            }}
            onPointerOver={() => setHoveredId(memory.id)}
            onPointerOut={() => setHoveredId(null)}
          />
        );
      })}

      {/* Atmospheric Core Glow */}
      {(phase === 'FORMATION' || phase === 'SPHERE_SHOWCASE' || phase === 'SPHERE_REASSEMBLY') && (
        <group>
          <mesh>
            <sphereGeometry args={[2, 64, 64]} />
            <meshStandardMaterial 
              color="#6366f1" 
              emissive="#818cf8" 
              emissiveIntensity={2} 
              transparent 
              opacity={0.05} 
            />
          </mesh>
          <pointLight intensity={10} color="#818cf8" distance={30} />
        </group>
      )}
    </group>
  );
};

export const WeeklyMemoryScene: React.FC<WeeklyMemorySceneProps> = ({ 
  memories, 
  onCardSelect,
  isLoading,
  status,
  nextDate,
  daysRemaining,
  onOpenArchive,
  weekRange
}) => {
  const [phase, setPhase] = useState<AnimationPhase>('CAROUSEL_FOCUS');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePhaseComplete = useCallback(() => {
    if (isPaused) return;

    setPhase((prev) => {
      switch (prev) {
        case 'FORMATION': return 'SPHERE_SHOWCASE';
        case 'SPHERE_SHOWCASE': return 'CAROUSEL_TRANSITION';
        case 'CAROUSEL_TRANSITION': return 'CAROUSEL_FOCUS';
        case 'CAROUSEL_FOCUS': return 'SPHERE_REASSEMBLY';
        case 'SPHERE_REASSEMBLY': return 'RADIAL_DISPERSAL';
        case 'RADIAL_DISPERSAL': {
          setActiveIndex(0);
          return 'FORMATION';
        }
        default: return 'CAROUSEL_FOCUS';
      }
    });
  }, [isPaused]);

  // Handle Carousel item-by-item rotation smoothly
  useEffect(() => {
    const displayCount = memories.length > 0 ? memories.length : 1;
    if (phase === 'CAROUSEL_FOCUS' && !isPaused) {
      timerRef.current = setTimeout(() => {
        setActiveIndex(prev => (prev + 1) % displayCount);
      }, PHASE_DURATIONS.CAROUSEL_FOCUS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, activeIndex, memories.length, isPaused]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#05060a]">
        <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <p className="text-slate-400 font-display animate-pulse tracking-[0.3em] text-[10px] uppercase">Retrieving timeline data...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-[#05060a] overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={38} />
        
        {/* High performance native Three.js lighting with zero network delay */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 15, 10]} intensity={1.0} color="#ffffff" />
        <pointLight position={[-15, -15, -10]} intensity={0.8} color="#c084fc" />
        <pointLight position={[15, 10, 10]} intensity={0.6} color="#818cf8" />
        <spotLight position={[0, 15, 15]} angle={0.3} penumbra={0.8} intensity={1.2} color="#ffffff" />
        
        <Suspense fallback={null}>
          <SceneController 
            memories={memories}
            phase={isPaused ? 'PAUSED' : phase}
            activeIndex={activeIndex}
            onPhaseComplete={handlePhaseComplete}
            onActiveIndexChange={setActiveIndex}
            onCardSelect={onCardSelect}
            status={status}
            nextDate={nextDate}
          />
          
          <Stars radius={100} depth={50} count={3500} factor={3} saturation={0} fade speed={1.2} />
          <Sparkles count={100} scale={25} size={1.2} speed={0.3} opacity={0.15} color="#6366f1" />
        </Suspense>

        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={8} 
          maxDistance={40}
          enableRotate={phase === 'SPHERE_SHOWCASE' || phase === 'PAUSED'}
        />
      </Canvas>

      {/* Dynamic Status Badges - Scaled Small */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 z-10 scale-75 origin-bottom">
        <AnimatePresence mode="wait">
          {status === 'in_progress' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-3 py-1.5 rounded-full bg-amber-500/5 border border-amber-500/10 backdrop-blur-md flex items-center gap-2 shadow-2xl"
            >
              <Info size={12} className="text-amber-400" />
              <span className="text-[9px] text-amber-200/80 uppercase tracking-[0.2em] font-bold font-mono">
                {daysRemaining} Days Remaining
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Minimal Control Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-md px-4 pointer-events-auto">
        <div className="flex flex-col items-center gap-2 bg-slate-950/80 backdrop-blur-2xl border border-white/10 px-4 py-3 rounded-2xl shadow-2xl">
          {/* Top Row: Mode Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/5">
            <button
              onClick={() => {
                setPhase('SPHERE_SHOWCASE');
                setIsPaused(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                phase === 'SPHERE_SHOWCASE' || phase === 'FORMATION' || phase === 'SPHERE_REASSEMBLY'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sphere
            </button>
            <button
              onClick={() => {
                setPhase('CAROUSEL_FOCUS');
                setIsPaused(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Carousel
            </button>
            <button
              onClick={() => {
                setPhase('RADIAL_DISPERSAL');
                setIsPaused(true);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all ${
                phase === 'RADIAL_DISPERSAL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Disperse
            </button>
          </div>

          {/* Bottom Row: Navigation & Playback */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  setPhase('FORMATION');
                  setActiveIndex(0);
                  setIsPaused(false);
                }}
                title="Restart Animation Cycle"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all group"
              >
                <RotateCcw size={14} className="group-hover:rotate-[-45deg] transition-transform" />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button 
                onClick={() => {
                  if (phase !== 'CAROUSEL_FOCUS') setPhase('CAROUSEL_FOCUS');
                  setIsPaused(true);
                  setActiveIndex(prev => (prev - 1 + (memories.length || 1)) % (memories.length || 1));
                }}
                title="Previous Card"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center flex-1 mx-3 overflow-hidden">
              <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.15em] mb-1 truncate">
                {phase === 'CAROUSEL_FOCUS' ? `Card ${activeIndex + 1} of ${memories.length}` : phase.replace(/_/g, ' ')}
              </div>
              <div className="flex items-center gap-1 max-w-[160px] overflow-x-auto no-scrollbar py-0.5">
                {[...Array(memories.length || 1)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPhase('CAROUSEL_FOCUS');
                      setIsPaused(true);
                      setActiveIndex(i);
                    }}
                    title={`Jump to card ${i + 1}`}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      activeIndex === i ? 'w-4 bg-indigo-500' : 'w-1 bg-white/20 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => {
                  if (phase !== 'CAROUSEL_FOCUS') setPhase('CAROUSEL_FOCUS');
                  setIsPaused(true);
                  setActiveIndex(prev => (prev + 1) % (memories.length || 1));
                }}
                title="Next Card"
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button 
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume Auto-Play' : 'Pause'}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isPaused ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:bg-white/10 text-indigo-400'
                }`}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} fill="currentColor" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

