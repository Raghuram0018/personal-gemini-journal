import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { MemoryItem } from '../../../types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Layers,
  Sparkles,
  Maximize2,
  RotateCw,
  Compass,
} from 'lucide-react';

interface Memory3DExperienceProps {
  memories: MemoryItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenDetail: (memory: MemoryItem) => void;
}

export const Memory3DExperience: React.FC<Memory3DExperienceProps> = ({
  memories,
  selectedIndex,
  onSelectIndex,
  onOpenDetail,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation & View Mode State
  const [viewMode, setViewMode] = useState<'sphere' | 'carousel'>('sphere');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Internal Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cardMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const sphereRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetSphereRotationRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewTransitionRef = useRef<number>(0); // 0 = sphere, 1 = carousel
  const autoPlayTimerRef = useRef<number>(0);

  // Keep track of latest memories & selected index in refs for animation loop
  const memoriesRef = useRef<MemoryItem[]>(memories);
  memoriesRef.current = memories;
  const selectedIndexRef = useRef<number>(selectedIndex);
  selectedIndexRef.current = selectedIndex;
  const viewModeRef = useRef<'sphere' | 'carousel'>(viewMode);
  viewModeRef.current = viewMode;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  // Generate Card Canvas Texture
  const createCardTexture = useCallback((memory: MemoryItem, isFocused: boolean): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    // Category Colors
    let gradientStart = '#1e1b4b'; // deep indigo
    let gradientEnd = '#0f172a'; // slate 900
    let accentColor = '#818cf8'; // indigo 400
    let badgeBg = 'rgba(99, 102, 241, 0.2)';

    const cat = (memory.category || '').toLowerCase();
    if (cat.includes('achievement')) {
      gradientStart = '#1e1b4b';
      accentColor = '#38bdf8'; // sky
      badgeBg = 'rgba(56, 189, 248, 0.25)';
    } else if (cat.includes('learning')) {
      gradientStart = '#064e3b'; // emerald
      accentColor = '#34d399';
      badgeBg = 'rgba(52, 211, 153, 0.25)';
    } else if (cat.includes('emotional') || cat.includes('peace')) {
      gradientStart = '#4c1d95'; // purple
      accentColor = '#c084fc';
      badgeBg = 'rgba(192, 132, 252, 0.25)';
    } else if (cat.includes('milestone')) {
      gradientStart = '#701a75'; // fuchsia
      accentColor = '#f472b6';
      badgeBg = 'rgba(244, 114, 182, 0.25)';
    }

    // Card Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 360);
    bgGrad.addColorStop(0, gradientStart);
    bgGrad.addColorStop(1, gradientEnd);
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 340, 24);
    ctx.fill();

    // Border Glow
    ctx.lineWidth = isFocused ? 6 : 2.5;
    ctx.strokeStyle = isFocused ? accentColor : 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 340, 24);
    ctx.stroke();

    // Top Category Pill
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(32, 32, 160, 36, 12);
    ctx.fill();

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText((memory.category || 'Milestone').toUpperCase(), 46, 56);

    // Date
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText(memory.date || '2026', 360, 56);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    const titleText = memory.title || 'Untitled Memory';
    // Wrap title
    const maxTitleWidth = 440;
    if (ctx.measureText(titleText).width > maxTitleWidth) {
      let truncated = titleText;
      while (ctx.measureText(truncated + '...').width > maxTitleWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      ctx.fillText(truncated + '...', 32, 118);
    } else {
      ctx.fillText(titleText, 32, 118);
    }

    // Summary Snippet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '16px sans-serif';
    const summary = memory.summary || memory.snippet || 'A meaningful moment preserved in your memory log.';
    
    // Simple line wrap for 2 lines
    const words = summary.split(' ');
    let line1 = '';
    let line2 = '';
    for (const w of words) {
      if (ctx.measureText(line1 + ' ' + w).width < 440 && !line2) {
        line1 += (line1 ? ' ' : '') + w;
      } else if (ctx.measureText(line2 + ' ' + w).width < 440) {
        line2 += (line2 ? ' ' : '') + w;
      }
    }
    ctx.fillText(line1, 32, 165);
    if (line2) {
      ctx.fillText(line2 + (words.length > 20 ? '...' : ''), 32, 195);
    }

    // Bottom Mood Indicator & AI Grounded Tag
    if (memory.mood || memory.emotionalTag) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(32, 280, 150, 34, 10);
      ctx.fill();

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px sans-serif';
      ctx.fillText(`✨ Mood: ${memory.mood || memory.emotionalTag}`, 44, 302);
    }

    // Featured Star or Canonical Indicator
    ctx.fillStyle = accentColor;
    ctx.font = '14px sans-serif';
    ctx.fillText('✧ Canonical Memory', 310, 302);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  // Initialize Three.js Scene, Camera, Renderer and Card Meshes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || memories.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = Math.min(Math.max(window.innerHeight * 0.55, 420), 580);

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Ambient Starfield / Particle Background
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 200;
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 1200;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 2,
      color: 0x818cf8,
      transparent: true,
      opacity: 0.5,
    });
    const particleMesh = new THREE.Points(particleGeo, particleMat);
    scene.add(particleMesh);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000);
    camera.position.set(0, 0, 480);
    cameraRef.current = camera;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xa855f7, 2, 800);
    pointLight.position.set(0, 150, 300);
    scene.add(pointLight);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Card Mesh Creation (Fibonacci distribution for Sphere, Arc for Carousel)
    const cardGeo = new THREE.PlaneGeometry(120, 85);
    const meshes: THREE.Mesh[] = [];
    const count = Math.min(memories.length, 18); // limit hero 3D objects for optimal 60fps

    for (let i = 0; i < count; i++) {
      const texture = createCardTexture(memories[i], i === selectedIndexRef.current);
      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(cardGeo, cardMat);
      mesh.userData = { index: i, memory: memories[i] };
      scene.add(mesh);
      meshes.push(mesh);
    }
    cardMeshesRef.current = meshes;

    // Raycaster for click selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePositionRef.current.x;
      const deltaY = clientY - previousMousePositionRef.current.y;

      targetSphereRotationRef.current.y += deltaX * 0.005;
      targetSphereRotationRef.current.x += deltaY * 0.005;

      // Clamp vertical rotation
      targetSphereRotationRef.current.x = Math.max(-0.6, Math.min(0.6, targetSphereRotationRef.current.x));

      previousMousePositionRef.current = { x: clientX, y: clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(cardMeshesRef.current);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const idx = clickedMesh.userData.index;
        if (typeof idx === 'number') {
          onSelectIndex(idx);
          if (viewModeRef.current === 'sphere') {
            setViewMode('carousel');
          } else if (idx === selectedIndexRef.current) {
            onOpenDetail(memoriesRef.current[idx]);
          }
        }
      }
    };

    const domElem = canvasRef.current;
    domElem.addEventListener('mousedown', handlePointerDown);
    domElem.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    domElem.addEventListener('touchstart', handlePointerDown, { passive: true });
    domElem.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    domElem.addEventListener('click', handleClick);

    // Responsive Window Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = Math.min(Math.max(window.innerHeight * 0.55, 420), 580);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Main 60fps Animation Loop
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Slowly rotate background starfield
      particleMesh.rotation.y += 0.0008;

      // Auto-progress in carousel mode if playing
      if (isPlayingRef.current && viewModeRef.current === 'carousel') {
        autoPlayTimerRef.current += delta;
        if (autoPlayTimerRef.current > 4.5) {
          autoPlayTimerRef.current = 0;
          const nextIdx = (selectedIndexRef.current + 1) % memoriesRef.current.length;
          onSelectIndex(nextIdx);
        }
      } else {
        autoPlayTimerRef.current = 0;
      }

      // Smooth View Mode transition (0 = sphere, 1 = carousel)
      const targetTransition = viewModeRef.current === 'carousel' ? 1 : 0;
      viewTransitionRef.current += (targetTransition - viewTransitionRef.current) * 0.08;
      const t = viewTransitionRef.current;

      // Smooth Rotation Interpolation
      if (!isDraggingRef.current && isPlayingRef.current && viewModeRef.current === 'sphere') {
        targetSphereRotationRef.current.y += 0.003;
      }
      sphereRotationRef.current.x += (targetSphereRotationRef.current.x - sphereRotationRef.current.x) * 0.1;
      sphereRotationRef.current.y += (targetSphereRotationRef.current.y - sphereRotationRef.current.y) * 0.1;

      // Position each card according to viewTransition (Interpolating between Sphere and Carousel)
      const totalCards = cardMeshesRef.current.length;
      const sphereRadius = 210;

      cardMeshesRef.current.forEach((mesh, i) => {
        // --- 1. SPHERE CALCULATIONS (Fibonacci Spherical Distribution) ---
        const phi = Math.acos(1 - (2 * (i + 0.5)) / totalCards);
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5) + sphereRotationRef.current.y;

        const sphereX = sphereRadius * Math.sin(phi) * Math.cos(theta);
        const sphereY = sphereRadius * Math.cos(phi) + Math.sin(time * 0.0015 + i) * 8; // subtle breathing wave
        const sphereZ = sphereRadius * Math.sin(phi) * Math.sin(theta);

        // Rotation facing outward from sphere center
        const normalVec = new THREE.Vector3(sphereX, sphereY, sphereZ).normalize();
        const sphereLookAt = new THREE.Vector3().addVectors(new THREE.Vector3(sphereX, sphereY, sphereZ), normalVec);

        // --- 2. CAROUSEL CALCULATIONS (Centered Horizontal Arc) ---
        const activeIdx = selectedIndexRef.current;
        let offset = i - activeIdx;
        // Wrap offset around for continuous circle
        if (offset > totalCards / 2) offset -= totalCards;
        if (offset < -totalCards / 2) offset += totalCards;

        const spacingX = 145;
        const carouselX = offset * spacingX;
        const carouselZ = -Math.abs(offset) * 85 + (offset === 0 ? 110 : 0);
        const carouselY = Math.sin(offset * 0.5) * 12;
        const carouselRotY = -offset * 0.22;

        // --- 3. INTERPOLATION (Sphere <-> Carousel) ---
        mesh.position.x = THREE.MathUtils.lerp(sphereX, carouselX, t);
        mesh.position.y = THREE.MathUtils.lerp(sphereY, carouselY, t);
        mesh.position.z = THREE.MathUtils.lerp(sphereZ, carouselZ, t);

        // Scale
        const baseScale = offset === 0 && t > 0.5 ? 1.35 : 1.0;
        mesh.scale.set(baseScale, baseScale, 1);

        // Rotation
        if (t < 0.5) {
          mesh.lookAt(sphereLookAt);
        } else {
          mesh.rotation.set(0, carouselRotY, 0);
        }

        // Opacity
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat) {
          if (t > 0.5) {
            const distFromCenter = Math.abs(offset);
            mat.opacity = THREE.MathUtils.lerp(0.9, distFromCenter === 0 ? 1.0 : Math.max(0.3, 1 - distFromCenter * 0.28), t);
          } else {
            // In sphere, cards in front are more opaque than cards in back
            const zNorm = (mesh.position.z + sphereRadius) / (sphereRadius * 2);
            mat.opacity = Math.max(0.35, Math.min(1.0, zNorm * 1.1));
          }
        }
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Lifecycle Cleanup on Unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      domElem.removeEventListener('mousedown', handlePointerDown);
      domElem.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      domElem.removeEventListener('touchstart', handlePointerDown);
      domElem.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      domElem.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);

      // Clean Three.js memory
      particleGeo.dispose();
      particleMat.dispose();
      cardGeo.dispose();
      meshes.forEach((m) => {
        const mat = m.material as THREE.MeshBasicMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
      renderer.dispose();
    };
  }, [memories.length, createCardTexture, onOpenDetail, onSelectIndex]);

  // Update card textures when selectedIndex changes
  useEffect(() => {
    cardMeshesRef.current.forEach((mesh, i) => {
      if (memories[i]) {
        const isFocused = i === selectedIndex;
        const newTex = createCardTexture(memories[i], isFocused);
        const mat = mesh.material as THREE.MeshBasicMaterial;
        if (mat.map) mat.map.dispose();
        mat.map = newTex;
        mat.needsUpdate = true;
      }
    });
  }, [selectedIndex, memories, createCardTexture]);

  const currentMemory = memories[selectedIndex] || memories[0];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 border border-indigo-500/20 shadow-2xl backdrop-blur-2xl flex flex-col items-center"
    >
      {/* Top Experience Navigation Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* View Mode Toggle Switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-xl pointer-events-auto shadow-xl">
          <button
            onClick={() => setViewMode('sphere')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'sphere'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5 text-indigo-300" />
            <span>3D Sphere</span>
          </button>
          <button
            onClick={() => setViewMode('carousel')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'carousel'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>Linear Carousel</span>
          </button>
        </div>

        {/* Counter & Hint */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300 backdrop-blur-xl pointer-events-auto shadow-xl">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Memory {selectedIndex + 1} of {memories.length}
          </span>
          <span className="text-slate-500">• Drag to orbit</span>
        </div>

        {/* Play/Pause & Reset Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl pointer-events-auto shadow-xl">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
            title={isPlaying ? 'Pause Auto-Progression' : 'Resume Auto-Progression'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => {
              targetSphereRotationRef.current = { x: 0, y: 0 };
              onSelectIndex(0);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer"
            title="Reset Perspective"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main WebGL 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full cursor-grab active:cursor-grabbing block"
        style={{ minHeight: '420px', maxHeight: '580px' }}
      />

      {/* Floating Bottom Step Controls for Carousel Mode */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button
          onClick={() => {
            const prevIdx = (selectedIndex - 1 + memories.length) % memories.length;
            onSelectIndex(prevIdx);
            if (viewMode !== 'carousel') setViewMode('carousel');
          }}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 cursor-pointer"
          title="Previous Memory"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onOpenDetail(currentMemory)}
          className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 backdrop-blur-xl flex items-center gap-1.5 transition-all hover:scale-102 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Open Memory Focus</span>
        </button>

        <button
          onClick={() => {
            const nextIdx = (selectedIndex + 1) % memories.length;
            onSelectIndex(nextIdx);
            if (viewMode !== 'carousel') setViewMode('carousel');
          }}
          className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 shadow-2xl backdrop-blur-xl transition-all hover:scale-105 cursor-pointer"
          title="Next Memory"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
