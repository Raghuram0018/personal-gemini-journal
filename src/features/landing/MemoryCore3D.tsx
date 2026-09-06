import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  BookOpen,
  Target,
  Music,
  Compass,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

export interface OrbitNodeData {
  id: string;
  label: string;
  category: string;
  description: string;
  color: string;
  hexColor: number;
  icon: React.ReactNode;
  index: number;
}

interface MemoryCore3DProps {
  onNodeSelect?: (nodeId: string) => void;
  onBeginJourney?: () => void;
}

export const MemoryCore3D: React.FC<MemoryCore3DProps> = ({ onNodeSelect, onBeginJourney }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<OrbitNodeData | null>(null);
  const [activeNode, setActiveNode] = useState<OrbitNodeData | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [screenCoords, setScreenCoords] = useState<{
    [key: string]: { x: number; y: number; visible: boolean; opacity: number; zIndex: number; scale: number };
  }>({});
  const [isWebGLSupported, setIsWebGLSupported] = useState<boolean>(true);

  // Rotation state refs for frame loop
  const rotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const isAutoRotatingRef = useRef<boolean>(true);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartRotationRef = useRef<number>(0);

  // Synchronize auto-rotate state with ref
  useEffect(() => {
    isAutoRotatingRef.current = isAutoRotating;
  }, [isAutoRotating]);

  // 8 Symmetrical Carousel Nodes (spaced exactly 45 deg / PI/4 apart)
  const nodes: OrbitNodeData[] = [
    {
      id: 'journal',
      index: 0,
      label: 'Journal',
      category: 'Reflections',
      description: 'Your thoughts, voice-notes, and daily entries with PIN privacy',
      color: '#818cf8', // Indigo
      hexColor: 0x818cf8,
      icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
    },
    {
      id: 'memories',
      index: 1,
      label: 'Memories',
      category: 'Moments',
      description: '3D spatial carousel of key life milestones and media',
      color: '#22d3ee', // Cyan
      hexColor: 0x22d3ee,
      icon: <Compass className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'goals',
      index: 2,
      label: 'Goal Journey',
      category: 'Growth',
      description: 'Milestones, progress maps, and intention paths',
      color: '#f472b6', // Pink
      hexColor: 0xf472b6,
      icon: <Target className="w-4 h-4 text-pink-400" />,
    },
    {
      id: 'mood',
      index: 3,
      label: 'Mood Tracker',
      category: 'Emotional',
      description: 'Energy, stress, and confidence timelines over time',
      color: '#fb7185', // Rose
      hexColor: 0xfb7185,
      icon: <Activity className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'ai_insights',
      index: 4,
      label: 'AI Insights',
      category: 'Intelligence',
      description: 'Grounded pattern discovery and memory synthesis',
      color: '#c084fc', // Purple
      hexColor: 0xc084fc,
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'books',
      index: 5,
      label: 'Books Library',
      category: 'Knowledge',
      description: 'Captured quotes, reviews, and reading milestones',
      color: '#fbbf24', // Amber
      hexColor: 0xfbbf24,
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'music',
      index: 6,
      label: 'Music Memories',
      category: 'Soundtrack',
      description: 'Songs and albums anchored to emotional life events',
      color: '#e879f9', // Fuchsia
      hexColor: 0xe879f9,
      icon: <Music className="w-4 h-4 text-fuchsia-400" />,
    },
    {
      id: 'calendar',
      index: 7,
      label: 'Life Timeline',
      category: 'Chronology',
      description: 'Scheduled reminders, tasks, and future events',
      color: '#34d399', // Emerald
      hexColor: 0x34d399,
      icon: <Calendar className="w-4 h-4 text-emerald-400" />,
    },
  ];

  // Carousel Navigation Handlers
  const handleRotateStep = (direction: 'next' | 'prev') => {
    const step = (Math.PI * 2) / 8; // 45 degrees
    if (direction === 'next') {
      targetRotationRef.current -= step;
    } else {
      targetRotationRef.current += step;
    }
  };

  const handleResetRotation = () => {
    targetRotationRef.current = 0;
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      console.warn('WebGL not available, falling back to 2D UI:', e);
      setIsWebGLSupported(false);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2.2, 11.5);
    camera.lookAt(0, 0, 0);

    // Mouse Parallax targets
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaX = event.clientX - dragStartXRef.current;
        targetRotationRef.current = dragStartRotationRef.current + (deltaX / container.clientWidth) * Math.PI * 2;
        return;
      }
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.targetX = x * 1.2;
      mouse.targetY = y * 0.8;
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartXRef.current = event.clientX;
      dragStartRotationRef.current = targetRotationRef.current;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const centralLight = new THREE.PointLight(0x818cf8, 4, 20);
    centralLight.position.set(0, 0, 0);
    scene.add(centralLight);

    const secondaryLight = new THREE.PointLight(0xc084fc, 2.5, 15);
    secondaryLight.position.set(2, 4, 3);
    scene.add(secondaryLight);

    const cyanLight = new THREE.PointLight(0x22d3ee, 2.5, 15);
    cyanLight.position.set(-3, -2, 2);
    scene.add(cyanLight);

    // --- Central Memory Core (Halftone Dot Matrix Sphere) ---
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Helper to construct Halftone Dot Sphere Matrix (matching uploaded reference halftone sphere design)
    const createHalftoneSphere = (
      dotCount: number,
      sphereRadius: number,
      primaryColorHex: number,
      secondaryColorHex: number,
      opacity = 0.95
    ) => {
      const dotGeo = new THREE.CircleGeometry(1, 16);
      const dotMat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const instancedMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();
      const c1 = new THREE.Color(primaryColorHex);
      const c2 = new THREE.Color(secondaryColorHex);

      for (let i = 0; i < dotCount; i++) {
        // Fibonacci distribution on sphere surface
        const y = 1 - (i / (dotCount - 1)) * 2; // -1 at bottom, 1 at top
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
        const goldenAngle = 2.3999632297286533; // ~137.5 degrees
        const phi = i * goldenAngle;

        const x = Math.cos(phi) * radiusAtY;
        const z = Math.sin(phi) * radiusAtY;

        const normPos = new THREE.Vector3(x, y, z);
        const pos = normPos.clone().multiplyScalar(sphereRadius);

        dummy.position.copy(pos);
        // Orient disc outward along normal vector
        dummy.lookAt(pos.clone().multiplyScalar(2));

        // Halftone scale calculation: dots are largest at equator (y=0), tapering toward poles
        const latFactor = Math.sin(Math.acos(Math.abs(y))); // 0 at poles, 1 at equator
        const dotScale = 0.02 + Math.pow(latFactor, 1.2) * 0.07;
        dummy.scale.set(dotScale, dotScale, dotScale);

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);

        // Color gradient across halftone sphere
        const mixRatio = (y + 1) / 2;
        color.copy(c1).lerp(c2, mixRatio);
        instancedMesh.setColorAt(i, color);
      }

      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

      return instancedMesh;
    };

    // Outer primary Halftone Dot Sphere (650 dots)
    const halftoneOuter = createHalftoneSphere(650, 1.4, 0x818cf8, 0x22d3ee, 0.95);
    coreGroup.add(halftoneOuter);

    // Inner counter-rotating Halftone Dot Sphere (380 dots) creating Moiré depth
    const halftoneInner = createHalftoneSphere(380, 1.05, 0xc084fc, 0xf472b6, 0.85);
    coreGroup.add(halftoneInner);

    // Luminous inner glowing orb inside halftone sphere
    const coreSphereGeo = new THREE.SphereGeometry(0.7, 32, 32);
    const coreSphereMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    const coreSphere = new THREE.Mesh(coreSphereGeo, coreSphereMat);
    coreGroup.add(coreSphere);

    // --- Outer Animated Sphere Distribution Shell (480 dots) ---
    const outerDistCount = 480;
    const outerDistBaseRadius = 2.4;
    const outerDistGeo = new THREE.CircleGeometry(1, 12);
    const outerDistMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const outerDistInstanced = new THREE.InstancedMesh(outerDistGeo, outerDistMat, outerDistCount);
    const outerDistDummy = new THREE.Object3D();
    const outerNormPosList: THREE.Vector3[] = [];
    const outerPhaseList: Float32Array = new Float32Array(outerDistCount);
    const outerBaseScaleList: Float32Array = new Float32Array(outerDistCount);

    const outerColor = new THREE.Color();
    const outerC1 = new THREE.Color(0xa855f7); // Violet
    const outerC2 = new THREE.Color(0x38bdf8); // Sky Cyan

    for (let i = 0; i < outerDistCount; i++) {
      const y = 1 - (i / (outerDistCount - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const goldenAngle = 2.3999632297286533;
      const phi = i * goldenAngle;

      const normPos = new THREE.Vector3(
        Math.cos(phi) * radiusAtY,
        y,
        Math.sin(phi) * radiusAtY
      );
      outerNormPosList.push(normPos);
      outerPhaseList[i] = phi * 2 + Math.random() * Math.PI;
      outerBaseScaleList[i] = 0.02 + Math.random() * 0.025;

      const mixRatio = (y + 1) / 2;
      outerColor.copy(outerC1).lerp(outerC2, mixRatio);
      outerDistInstanced.setColorAt(i, outerColor);
    }
    if (outerDistInstanced.instanceColor) outerDistInstanced.instanceColor.needsUpdate = true;
    coreGroup.add(outerDistInstanced);

    // --- Symmetrical Carousel Track Parameters ---
    const CAROUSEL_RADIUS = 4.3;
    const CAROUSEL_TILT = 0.18; // Slight 3D inclination

    // --- Particle Stars System ---
    const particleCount = 350;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 4.5 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xc7d2fe,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- Orbiting Nodes Meshes (Symmetrical 3D Carousel Group) ---
    const carouselGroup = new THREE.Group();
    carouselGroup.rotation.x = CAROUSEL_TILT;
    scene.add(carouselGroup);

    const nodeMeshes: { [id: string]: { mesh: THREE.Mesh; glowMesh: THREE.Mesh; data: OrbitNodeData } } = {};

    nodes.forEach((nodeData) => {
      const nodeGroup = new THREE.Group();

      // Node sphere
      const sphereGeo = new THREE.SphereGeometry(0.32, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: nodeData.hexColor,
        emissive: nodeData.hexColor,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.75,
      });
      const nodeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      nodeGroup.add(nodeMesh);

      // Outer halo/glow mesh
      const glowGeo = new THREE.SphereGeometry(0.44, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: nodeData.hexColor,
        transparent: true,
        opacity: 0.22,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      nodeGroup.add(glowMesh);

      // Initial position on symmetrical 45-degree circle
      const baseAngle = (nodeData.index * Math.PI * 2) / 8;
      const x = Math.cos(baseAngle) * CAROUSEL_RADIUS;
      const z = Math.sin(baseAngle) * CAROUSEL_RADIUS;
      const y = Math.sin(baseAngle * 2) * 0.12; // Symmetrical wave elevation

      nodeGroup.position.set(x, y, z);
      carouselGroup.add(nodeGroup);

      nodeMeshes[nodeData.id] = { mesh: nodeMesh, glowMesh, data: nodeData };
    });

    // --- Resize Handler ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;

      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // --- Animation Loop ---
    let time = 0;

    const animate = () => {
      time += 0.01;

      // Auto rotation increment if enabled and not dragging
      if (isAutoRotatingRef.current && !isDraggingRef.current) {
        targetRotationRef.current += 0.0022; // Smooth steady symmetrical carousel spin
      }

      // Smooth Rotation Lerp
      rotationRef.current += (targetRotationRef.current - rotationRef.current) * 0.08;
      carouselGroup.rotation.y = rotationRef.current;

      // Smooth mouse parallax camera easing
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      camera.position.x = mouse.x;
      camera.position.y = 2.2 + mouse.y * 0.4;
      camera.lookAt(0, 0, 0);

      // Central Halftone Sphere Core rotation
      halftoneOuter.rotation.y = time * 0.22;
      halftoneOuter.rotation.x = Math.sin(time * 0.1) * 0.15;

      halftoneInner.rotation.y = -time * 0.35;
      halftoneInner.rotation.z = time * 0.18;

      coreSphere.rotation.y = -time * 0.1;

      // Outer Animated Sphere Distribution Effect Update
      for (let i = 0; i < outerDistCount; i++) {
        const normPos = outerNormPosList[i];
        const phase = outerPhaseList[i];

        // Rhythmic radial distribution pulse wave
        const radialOffset =
          Math.sin(time * 1.8 + phase) * 0.2 + Math.cos(time * 1.2 + normPos.y * 4) * 0.12;
        const currentRadius = outerDistBaseRadius + radialOffset;

        const pos = normPos.clone().multiplyScalar(currentRadius);
        outerDistDummy.position.copy(pos);
        outerDistDummy.lookAt(pos.clone().multiplyScalar(2));

        const baseScale = outerBaseScaleList[i];
        const currentScale = baseScale * (1 + Math.sin(time * 2.5 + phase) * 0.35);
        outerDistDummy.scale.set(currentScale, currentScale, currentScale);

        outerDistDummy.updateMatrix();
        outerDistInstanced.setMatrixAt(i, outerDistDummy.matrix);
      }
      outerDistInstanced.instanceMatrix.needsUpdate = true;
      outerDistInstanced.rotation.y = time * 0.08;
      outerDistInstanced.rotation.z = Math.sin(time * 0.05) * 0.1;

      particleSystem.rotation.y = time * 0.02;

      // Update screen coordinates for 2D UI overlay labels
      const newScreenCoords: {
        [key: string]: { x: number; y: number; visible: boolean; opacity: number; zIndex: number; scale: number };
      } = {};

      nodes.forEach((node) => {
        const nodeObj = nodeMeshes[node.id];
        if (nodeObj) {
          // Pulse glow
          const pulse = Math.sin(time * 3 + node.index) * 0.06 + 1;
          nodeObj.glowMesh.scale.set(pulse, pulse, pulse);

          // Get World Position of node
          const worldPos = new THREE.Vector3();
          nodeObj.mesh.getWorldPosition(worldPos);

          const screenPos = worldPos.clone().project(camera);
          const px = ((screenPos.x + 1) * width) / 2;
          const py = ((-screenPos.y + 1) * height) / 2;

          // Depth Occlusion & Visibility Calculation
          // worldPos.z > 0 means in front of central core plane; worldPos.z < 0 means behind
          const zDepth = worldPos.z;
          const distFromCenter = Math.sqrt(worldPos.x * worldPos.x + worldPos.y * worldPos.y);

          // Hide or fade if behind central core (zDepth < -0.5 and near center) to eliminate label overlap!
          const isBehindCore = zDepth < -0.2 && distFromCenter < 2.2;
          const isVisible = screenPos.z < 1.0 && px >= -40 && px <= width + 40 && py >= -40 && py <= height + 40 && !isBehindCore;

          // Opacity and scale based on depth (front nodes are larger and fully opaque)
          const depthRatio = Math.max(0, Math.min(1, (zDepth + 4.5) / 9)); // 0 (back) to 1 (front)
          const opacity = isBehindCore ? 0 : Math.max(0.2, Math.min(1.0, depthRatio * 1.3));
          const scale = 0.8 + depthRatio * 0.35;
          const zIndex = Math.round(depthRatio * 100);

          newScreenCoords[node.id] = {
            x: px,
            y: py,
            visible: isVisible && opacity > 0.15,
            opacity,
            zIndex,
            scale,
          };
        }
      });

      setScreenCoords(newScreenCoords);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] sm:h-[600px] lg:h-[660px] flex items-center justify-center overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-2xl shadow-2xl select-none"
    >
      {/* WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
      />

      {/* Atmospheric Background Glows */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Floating 2D Labels projected over 3D nodes (Filtered by Depth Occlusion) */}
      {isWebGLSupported &&
        nodes.map((node) => {
          const coords = screenCoords[node.id];
          if (!coords || !coords.visible) return null;

          const isHovered = hoveredNode?.id === node.id;
          const isActive = activeNode?.id === node.id;

          return (
            <div
              key={node.id}
              style={{
                position: 'absolute',
                left: `${coords.x}px`,
                top: `${coords.y}px`,
                transform: `translate(-50%, -50%) scale(${coords.scale})`,
                opacity: coords.opacity,
                zIndex: coords.zIndex,
              }}
              className="transition-opacity duration-200 pointer-events-auto"
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => {
                setActiveNode(node);
                if (onNodeSelect) onNodeSelect(node.id);
              }}
            >
              <button
                type="button"
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl transition-all duration-300 border text-xs font-medium cursor-pointer shadow-lg whitespace-nowrap ${
                  isHovered || isActive
                    ? 'scale-110 bg-slate-900/95 border-indigo-400 text-white shadow-indigo-500/30'
                    : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
                style={{
                  boxShadow: isHovered ? `0 0 20px ${node.color}55` : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0"
                  style={{ backgroundColor: node.color }}
                />
                <span className="font-display tracking-wide">{node.label}</span>
              </button>
            </div>
          );
        })}

      {/* Interactive Carousel Control Bar (Step Left/Right, Play/Pause, Reset) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 backdrop-blur-xl shadow-xl">
        <button
          onClick={() => handleRotateStep('prev')}
          title="Previous Node (45° Step)"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsAutoRotating(!isAutoRotating)}
          title={isAutoRotating ? 'Pause Symmetrical Auto-Rotation' : 'Resume Auto-Rotation'}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            isAutoRotating
              ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => handleRotateStep('next')}
          title="Next Node (45° Step)"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-800 mx-0.5" />

        <button
          onClick={handleResetRotation}
          title="Reset Symmetrical Alignment"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hovered / Selected Node Card Inspector */}
      {(hoveredNode || activeNode) && (
        <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 z-30 p-4 rounded-2xl bg-slate-900/95 border border-indigo-500/30 backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="p-1.5 rounded-lg text-slate-900 font-bold"
                style={{ backgroundColor: (hoveredNode || activeNode)!.color }}
              >
                {(hoveredNode || activeNode)!.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-display">
                  {(hoveredNode || activeNode)!.label}
                </h4>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {(hoveredNode || activeNode)!.category}
                </p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            {(hoveredNode || activeNode)!.description}
          </p>
          <button
            onClick={() => {
              if (onBeginJourney) onBeginJourney();
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>Explore {(hoveredNode || activeNode)!.label}</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      {/* Fallback 2D grid for non-WebGL devices */}
      {!isWebGLSupported && (
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 text-center">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-2 hover:border-indigo-500/50 transition-colors cursor-pointer"
              onClick={() => onNodeSelect && onNodeSelect(node.id)}
            >
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">{node.icon}</div>
              <span className="text-xs font-semibold text-slate-200 font-display">{node.label}</span>
              <span className="text-[10px] text-slate-400">{node.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

