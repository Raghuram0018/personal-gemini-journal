import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { 
  BookOpen, 
  Target, 
  Music, 
  Sparkles, 
  Heart,
  Quote,
  Activity,
  Trophy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface Memory3DCardProps {
  position: [number, number, number];
  data: {
    id: string;
    title: string;
    snippet?: string;
    content?: string;
    sourceType?: string;
    category?: string;
    mood?: string;
    artist?: string;
    date: string;
    imageUrl?: string;
  };
  scale: number;
  opacity: number;
  isActive: boolean;
  isHovered: boolean;
  phase: string;
  distFromActive?: number;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  journal: '#818cf8', // indigo
  goal: '#f472b6',    // pink
  book: '#fbbf24',    // amber
  music: '#e879f9',   // fuchsia
  mood: '#fb7185',    // rose
  activity: '#34d399' // emerald
};

const TYPE_ICONS: Record<string, any> = {
  journal: BookOpen,
  goal: Target,
  book: Quote,
  music: Music,
  mood: Heart,
  activity: Activity,
  default: Sparkles
};

export const Memory3DCard: React.FC<Memory3DCardProps> = ({
  position,
  data,
  scale: externalScale,
  opacity: externalOpacity,
  isActive,
  isHovered,
  phase,
  distFromActive,
  onClick,
  onPointerOver,
  onPointerOut
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const targetPosRef = useRef(new THREE.Vector3());
  const cameraPosRef = useRef(new THREE.Vector3());
  const [imageError, setImageError] = React.useState(false);

  const color = data.category === 'Achieved Goals' || data.title?.startsWith('CHAMPION')
    ? '#eab308'
    : data.category === 'AI Weekly Summary'
    ? '#a855f7'
    : data.category === 'Digital Library'
    ? '#38bdf8'
    : (TYPE_COLORS[data.sourceType || 'default'] || TYPE_COLORS.journal);

  const Icon = data.category === 'Achieved Goals' || data.title?.startsWith('CHAMPION')
    ? Trophy
    : data.category === 'AI Weekly Summary'
    ? Sparkles
    : data.category === 'Digital Library'
    ? BookOpen
    : (TYPE_ICONS[data.sourceType || 'default'] || TYPE_ICONS.default);

  // Detect if this is a "Default" or "System" placeholder card
  const isDefault = data.id.startsWith('default-');

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Position lerp using cached target
    targetPosRef.current.set(position[0], position[1], position[2]);
    meshRef.current.position.lerp(targetPosRef.current, 0.12);

    // Rotation logic
    if (phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION' || phase === 'PAUSED') {
      // In carousel, face the camera
      state.camera.getWorldPosition(cameraPosRef.current);
      meshRef.current.lookAt(cameraPosRef.current);
      
      // Add perspective tilt based on horizontal position
      const diff = meshRef.current.position.x;
      const tilt = -diff * 0.04;
      meshRef.current.rotation.y += tilt;
    } else {
      // In sphere mode, face outward from center
      const pos = meshRef.current.position;
      targetPosRef.current.copy(pos).add(pos.clone().normalize());
      meshRef.current.lookAt(targetPosRef.current);
    }
    
    // Subtle floating animation when not focused
    if (!isActive && phase !== 'FORMATION' && phase !== 'RADIAL_DISPERSAL') {
      const time = state.clock.getElapsedTime();
      const offset = isDefault ? Number(data.id.split('-')[1]) : Number(data.id.slice(-1) || '0');
      meshRef.current.position.y += Math.sin(time * 1.5 + offset) * 0.001;
    }
  });

  const scale = isActive ? externalScale : isHovered ? externalScale * 1.1 : externalScale;
  
  // Format date and time
  const dateObj = new Date(data.date);
  const formattedDate = dateObj.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  const formattedTime = dateObj.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Phase 3 Radial Dispersal: replace card with glowing floating "MEMORIE" text
  if (phase === 'RADIAL_DISPERSAL') {
    return (
      <group>
        <mesh
          ref={meshRef}
          scale={[scale, scale, scale]}
        >
          <Html
            transform
            distanceFactor={6}
            position={[0, 0, 0]}
            style={{ opacity: externalOpacity, pointerEvents: 'none' }}
          >
            <div className="flex flex-col items-center justify-center whitespace-nowrap select-none">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-white to-purple-200 uppercase tracking-[0.35em] font-display drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]">
                {data.title || 'MEMORIE'}
              </span>
              <div className="h-[2px] w-12 bg-gradient-to-r from-indigo-500 to-purple-500 mt-2 opacity-80" />
            </div>
          </Html>
        </mesh>
      </group>
    );
  }

  // Performance Optimization: In carousel mode, cards far away from center render lightweight 3D glow plane without HTML DOM overhead
  const isCarouselMode = phase === 'CAROUSEL_FOCUS' || phase === 'CAROUSEL_TRANSITION';
  const isFarAwayInCarousel = isCarouselMode && distFromActive !== undefined && distFromActive > 4;

  if (isFarAwayInCarousel) {
    return (
      <group>
        <mesh
          ref={meshRef}
          scale={[scale, scale, scale]}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onPointerOver();
          }}
          onPointerOut={onPointerOut}
        >
          <planeGeometry args={[1.2, 1.6]} />
          <meshStandardMaterial 
            color={color} 
            transparent 
            opacity={0.35 * externalOpacity} 
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onPointerOver();
        }}
        onPointerOut={onPointerOut}
        scale={[scale, scale, scale]}
      >
        <planeGeometry args={[1.2, 1.6]} />
        <meshStandardMaterial 
          transparent 
          opacity={0}
          alphaTest={0.5}
        />
        
        {/* Decorative background glow */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={isActive ? [1.5, 1.9] : [1.3, 1.7]} />
          <meshBasicMaterial 
            color={isDefault ? '#6366f1' : color} 
            transparent 
            opacity={isActive ? 0.3 * externalOpacity : isHovered ? 0.2 * externalOpacity : 0.05 * externalOpacity} 
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <Html
          transform
          distanceFactor={6}
          position={[0, 0, 0.01]}
          className="pointer-events-auto"
          style={{ opacity: externalOpacity, pointerEvents: externalOpacity < 0.1 ? 'none' : 'auto' }}
        >
          <motion.div
            initial={false}
            animate={{ 
              width: isActive ? 600 : 200,
              height: isActive ? 800 : 260,
              scale: isHovered && !isActive ? 1.05 : 1,
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={`rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors duration-300 will-change-transform ${
              isDefault ? 'bg-gradient-to-br from-indigo-500/80 to-purple-900/90 border-white/20 shadow-[0_0_30px_rgba(99,102,241,0.3)] backdrop-blur-sm' :
              isActive 
                ? 'bg-slate-950/95 border-white/20 ring-1 ring-white/10 p-0 backdrop-blur-md' 
                : 'bg-slate-950/70 border-white/10 p-4 backdrop-blur-sm'
            }`}
            style={{ 
              borderColor: (isHovered || isActive) ? `${color}88` : undefined,
              boxShadow: (isHovered || isActive) ? `0 40px 100px -20px ${color}33` : undefined,
              // Procedural background for default cards
              background: isDefault ? `linear-gradient(135deg, hsl(${Number(data.id.split('-')[1]) * 40}, 70%, 50%), hsl(${(Number(data.id.split('-')[1]) * 40 + 60) % 360}, 80%, 20%))` : undefined
            }}
          >
            {isDefault ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 border-[6px] border-white/10 m-0 rounded-xl">
                <span className="text-3xl font-black text-white/90 font-display italic tracking-tighter text-center uppercase">
                  {data.title}
                </span>
                <div className="h-[2px] w-12 bg-white/30 my-4" />
                <span className="text-[9px] text-white/50 uppercase font-bold tracking-[0.4em]">
                  Memorie {Number(data.id.split('-')[1] || 0) + 1}
                </span>
              </div>
            ) : isActive ? (
              // FULL DETAIL VIEW
              <div className="flex flex-col h-full overflow-hidden">
                {/* Header Section */}
                <div 
                  className="h-24 flex items-end p-6 relative overflow-hidden shrink-0"
                  style={{ background: `linear-gradient(to bottom, ${color}33, transparent)` }}
                >
                  <div className="flex items-center gap-4 z-10">
                    <div 
                      className="p-3 rounded-xl shadow-lg"
                      style={{ backgroundColor: color, color: '#fff' }}
                    >
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">
                        {data.category}
                      </div>
                      <div className="text-white font-mono text-xs flex items-center gap-2">
                        {formattedDate} 
                        <span className="opacity-30">•</span>
                        {formattedTime}
                      </div>
                    </div>
                  </div>
                  {/* Decorative background icon */}
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                    <Icon size={120} />
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                  {data.imageUrl && !imageError && (
                    <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner bg-black/40 border border-white/10">
                      <img 
                        src={data.imageUrl} 
                        alt={data.title} 
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white leading-tight font-display tracking-tight">
                      {data.title}
                    </h3>
                    
                    <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap selection:bg-indigo-500/30">
                      {data.content || data.snippet}
                    </div>
                  </div>

                  {/* Metadata / Tags */}
                  {(data.mood || data.artist || data.category) && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      {data.mood && (
                        <div className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase border border-rose-500/20">
                          Felt {data.mood}
                        </div>
                      )}
                      {data.artist && (
                        <div className="px-3 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-[10px] font-bold uppercase border border-fuchsia-500/20">
                          {data.artist}
                        </div>
                      )}
                      <div className="px-3 py-1 rounded-full bg-white/5 text-white/50 text-[10px] font-bold uppercase border border-white/10">
                        {data.sourceType}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2 py-1">
                    Canonical Record
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      Grounded
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // COMPACT TILE VIEW
              <div className="flex flex-col h-full">
                {data.imageUrl && !imageError ? (
                  <div className="w-full h-24 rounded-lg overflow-hidden mb-2.5 bg-black/40 border border-white/10 shrink-0 relative group/img">
                    <img 
                      src={data.imageUrl} 
                      alt={data.title} 
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500 opacity-90 hover:opacity-100"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div 
                      className="absolute top-1.5 left-1.5 p-1 rounded-md shadow-md backdrop-blur-md"
                      style={{ backgroundColor: `${color}cc`, color: '#fff' }}
                    >
                      <Icon size={12} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-2 shrink-0">
                    <div 
                      className="p-1.5 rounded-lg"
                      style={{ backgroundColor: `${color}22`, color: color }}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">
                      {data.category}
                    </div>
                  </div>
                )}

                <h4 className="text-xs font-bold text-white mb-1.5 line-clamp-2 leading-snug font-display">
                  {data.title}
                </h4>

                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                  {data.snippet}
                </p>

                <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between shrink-0">
                  <span className="text-[8px] text-white/30 uppercase tracking-widest font-medium">
                    {formattedDate}
                  </span>
                  {isHovered && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-white/60 text-xs"
                    >
                      →
                    </motion.span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </Html>
      </mesh>
    </group>
  );
};
