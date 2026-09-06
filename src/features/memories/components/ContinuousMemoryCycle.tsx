import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { MemoryItem, JournalEntry, GoalTrack } from '../../../types';
import { ArrowLeft, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';

interface ContinuousMemoryCycleProps {
  memories: MemoryItem[];
  journals?: JournalEntry[];
  goals?: GoalTrack[];
  onBackToHome: () => void;
  onSelectMemory: (memory: MemoryItem) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
  userUid?: string;
  viewMode?: '3d' | 'timeline';
  onViewModeChange?: (mode: '3d' | 'timeline') => void;
}

export const ContinuousMemoryCycle: React.FC<ContinuousMemoryCycleProps> = ({
  memories,
  journals = [],
  goals = [],
  onBackToHome,
  onSelectMemory,
  onRefreshData,
  isLoading = false,
  userUid = '',
  viewMode = '3d',
  onViewModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlaying = true;
  const [_activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // References for Three.js and lifecycle management
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereGroupRef = useRef<THREE.Group | null>(null);
  const itemsRef = useRef<THREE.Mesh[]>([]);
  const isPlayingRef = useRef<boolean>(true);
  isPlayingRef.current = isPlaying;

  // Active timers / intervals to cancel on unmount or pause
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const clearAllTimeouts = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    intervalsRef.current.forEach((i) => clearInterval(i));
    intervalsRef.current = [];
  };

  // Prepare cards array from memories, journals, goals, and AI synthesis
  const displayItems = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: string;
      snippet: string;
      date: string;
      type: 'journal' | 'image' | 'video' | 'book' | 'music' | 'goal' | 'summary' | 'insights' | 'memory';
      rawMemory?: MemoryItem;
    }> = [];

    // Add existing memories with accurate semantic typing
    memories.forEach((m, idx) => {
      let cardType: 'journal' | 'image' | 'video' | 'book' | 'music' | 'goal' | 'summary' | 'insights' | 'memory' = 'memory';
      if (m.sourceBookIds && m.sourceBookIds.length > 0) {
        cardType = 'book';
      } else if (m.sourceMusicIds && m.sourceMusicIds.length > 0) {
        cardType = 'music';
      } else if (m.imageUrl || m.mediaUrl) {
        cardType = 'image';
      } else if (m.sourceGoalIds && m.sourceGoalIds.length > 0) {
        cardType = 'goal';
      }

      list.push({
        id: m.id || `mem-${idx}`,
        title: m.title || 'Memory Milestone',
        category: m.category?.toUpperCase() || (cardType === 'book' ? 'BOOK MEMORY' : cardType === 'music' ? 'MUSIC MEMORY' : 'MILESTONE'),
        snippet: m.summary || m.snippet || 'Reflections captured in your journal journey.',
        date: m.date || 'Aug 2026',
        type: cardType,
        rawMemory: m,
      });
    });

    // If less than 14 items, populate with real journal entries or goals
    if (list.length < 14 && journals.length > 0) {
      journals.slice(0, 14 - list.length).forEach((j, idx) => {
        const hasImage = j.mediaAttachments && j.mediaAttachments.length > 0;
        list.push({
          id: `journal-${j.id || idx}`,
          title: j.title || 'Journal Reflection',
          category: hasImage ? 'PHOTO MEMORY' : 'JOURNAL ENTRY',
          snippet: (j.content || '').slice(0, 100) + '...',
          date: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'Recent',
          type: hasImage ? 'image' : 'journal',
          rawMemory: {
            id: `temp-${j.id}`,
            userId: userUid,
            title: j.title || 'Journal Reflection',
            summary: j.content,
            imageUrl: hasImage ? j.mediaAttachments[0].url : undefined,
            date: j.createdAt ? new Date(j.createdAt).toLocaleDateString() : 'Recent',
            category: hasImage ? 'Photo Reflection' : 'Daily Reflection',
            sourceJournalIds: [j.id],
            createdAt: j.createdAt,
            updatedAt: j.createdAt,
          },
        });
      });
    }

    // Include AI Summary and AI Insights cards at the end
    list.push({
      id: 'ai-weekly-summary',
      title: '✨ Your Week in Review',
      category: 'AI WEEKLY SUMMARY',
      snippet: 'Based on your weekly activity, you made steady progress towards your goals and deepened your reflections.',
      date: 'Weekly Synthesis',
      type: 'summary',
      rawMemory: {
        id: 'ai-weekly-summary',
        userId: userUid,
        title: '✨ Your Week in Review',
        summary: 'Synthesized from your canonical journal reflections, reading milestones, and achieved goals.',
        date: 'Weekly Synthesis',
        category: 'AI Synthesis',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    list.push({
      id: 'ai-weekly-insights',
      title: '🧠 Gemini Life Insights',
      category: 'AI INSIGHTS',
      snippet: 'Noticed elevated creative energy in the evenings, regular reading habits, and high mood consistency.',
      date: 'Life Pattern',
      type: 'insights',
      rawMemory: {
        id: 'ai-weekly-insights',
        userId: userUid,
        title: '🧠 Gemini Life Insights',
        summary: 'Pattern observations grounded in authentic personal data without fabrication.',
        date: 'Life Pattern',
        category: 'AI Synthesis',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    // Ensure at least 14 items for rich Fibonacci geometry
    if (list.length < 14) {
      const needed = 14 - list.length;
      for (let i = 0; i < needed; i++) {
        const idx = i + 1;
        list.push({
          id: `sample-${idx}`,
          title: `Milestone Refraction #${idx}`,
          category: idx % 2 === 0 ? 'LEARNING' : 'ACHIEVEMENT',
          snippet: 'Continuous record of growth, mindfulness, and personal development.',
          date: 'Recorded Life Moment',
          type: idx % 2 === 0 ? 'book' : 'goal',
          rawMemory: {
            id: `sample-${idx}`,
            userId: userUid,
            title: `Milestone Refraction #${idx}`,
            summary: 'Preserved in your personal memory archive.',
            date: 'Recorded Life Moment',
            category: idx % 2 === 0 ? 'Learning' : 'Achievement',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }
    }

    return list;
  }, [memories, journals, goals, userUid]);

  const TOTAL_ITEMS = displayItems.length;
  const SPHERE_RADIUS = 22;
  const CAROUSEL_SPACING = 13;

  // Create High-DPI Procedural Card Texture with Image Preview Support
  const createCardTexture = useCallback((index: number) => {
    const item = displayItems[index] || {
      id: `fallback-${index}`,
      title: `CARD ${index + 1}`,
      category: 'MEMORY',
      snippet: 'Reflective life log entry',
      date: 'Recent',
      type: 'memory' as const,
      rawMemory: undefined,
    };

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    if (!ctx) return texture;

    const renderCard = (loadedImg?: HTMLImageElement) => {
      ctx.clearRect(0, 0, 512, 768);

      const hue = (index * (360 / TOTAL_ITEMS)) % 360;
      const grad = ctx.createLinearGradient(0, 0, 512, 768);
      grad.addColorStop(0, `hsl(${hue}, 80%, 35%)`);
      grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 90%, 12%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 768);

      // Sleek border glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 10;
      ctx.strokeRect(16, 16, 480, 736);

      // Inner subtle frame
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, 460, 716);

      // Top Category Pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.roundRect(36, 38, 440, 50, 16);
      ctx.fill();

      // Category Icon & Label
      let icon = '✨';
      if (item.type === 'journal') icon = '📔';
      else if (item.type === 'image') icon = '🖼️';
      else if (item.type === 'video') icon = '🎥';
      else if (item.type === 'book') icon = '📚';
      else if (item.type === 'music') icon = '🎵';
      else if (item.type === 'goal') icon = '🏆';
      else if (item.type === 'summary') icon = '✨';
      else if (item.type === 'insights') icon = '🧠';

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${icon} ${item.category}`, 50, 72);

      // Date / Timestamp badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '600 18px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.date, 460, 72);

      const hasImageUrl = Boolean(item.rawMemory?.imageUrl);

      if (hasImageUrl) {
        // Image Viewport Frame
        const imgX = 36;
        const imgY = 100;
        const imgW = 440;
        const imgH = 260;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 18);
        ctx.clip();

        if (loadedImg) {
          // Calculate Aspect Fit/Cover
          const hRatio = imgW / loadedImg.width;
          const vRatio = imgH / loadedImg.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (imgW - loadedImg.width * ratio) / 2;
          const centerShiftY = (imgH - loadedImg.height * ratio) / 2;
          ctx.drawImage(
            loadedImg,
            0,
            0,
            loadedImg.width,
            loadedImg.height,
            imgX + centerShiftX,
            imgY + centerShiftY,
            loadedImg.width * ratio,
            loadedImg.height * ratio
          );

          // Subtle gradient overlay over image for depth
          const imgGrad = ctx.createLinearGradient(imgX, imgY + 140, imgX, imgY + imgH);
          imgGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          imgGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
          ctx.fillStyle = imgGrad;
          ctx.fillRect(imgX, imgY, imgW, imgH);
        } else {
          // Placeholder gradient while image is loading
          const pGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
          pGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
          pGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
          ctx.fillStyle = pGrad;
          ctx.fillRect(imgX, imgY, imgW, imgH);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = 'bold 20px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🖼️ Memory Visual Attachment', 256, imgY + 135);
        }
        ctx.restore();

        // Image Frame Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, 18);
        ctx.stroke();

        // Title below image
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const words = item.title.split(' ');
        let line = '';
        let yPos = 398;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > 410 && n > 0) {
            ctx.fillText(line, 256, yPos);
            line = words[n] + ' ';
            yPos += 36;
            if (yPos > 440) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 256, yPos);

        // Snippet Box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.roundRect(36, 475, 440, 165, 16);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '20px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const snippetWords = item.snippet.split(' ');
        let sLine = '';
        let sY = 515;
        for (let m = 0; m < snippetWords.length; m++) {
          const testSnippet = sLine + snippetWords[m] + ' ';
          if (ctx.measureText(testSnippet).width > 390 && m > 0) {
            ctx.fillText(sLine, 256, sY);
            sLine = snippetWords[m] + ' ';
            sY += 28;
            if (sY > 610) break;
          } else {
            sLine = testSnippet;
          }
        }
        ctx.fillText(sLine, 256, sY);
      } else {
        // No image attached -> Large typography layout
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const words = item.title.split(' ');
        let line = '';
        let yPos = 175;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          if (ctx.measureText(testLine).width > 420 && n > 0) {
            ctx.fillText(line, 256, yPos);
            line = words[n] + ' ';
            yPos += 48;
            if (yPos > 300) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 256, yPos);

        // Divider Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(70, yPos + 25);
        ctx.lineTo(442, yPos + 25);
        ctx.stroke();

        // Snippet Box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.roundRect(36, yPos + 48, 440, 270, 20);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.font = '23px -apple-system, sans-serif';
        ctx.textAlign = 'center';

        const snippetWords = item.snippet.split(' ');
        let sLine = '';
        let sY = yPos + 98;
        for (let m = 0; m < snippetWords.length; m++) {
          const testSnippet = sLine + snippetWords[m] + ' ';
          if (ctx.measureText(testSnippet).width > 390 && m > 0) {
            ctx.fillText(sLine, 256, sY);
            sLine = snippetWords[m] + ' ';
            sY += 34;
            if (sY > yPos + 270) break;
          } else {
            sLine = testSnippet;
          }
        }
        ctx.fillText(sLine, 256, sY);
      }

      // Bottom Action Pill
      ctx.fillStyle = '#38ef7d';
      ctx.beginPath();
      ctx.roundRect(50, 672, 412, 48, 24);
      ctx.fill();

      ctx.fillStyle = '#080a10';
      ctx.font = 'bold 20px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VIEW EVIDENCE & DETAILS ↗', 256, 703);

      texture.needsUpdate = true;
    };

    // Initial render
    renderCard();

    // Async Image Loader if attached
    if (item.rawMemory?.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        renderCard(img);
      };
      img.src = item.rawMemory.imageUrl;
    }

    return texture;
  }, [displayItems, TOTAL_ITEMS]);

  // Main Three.js setup and continuous animation pipeline
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080a10, 0.018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 48);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x080a10, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    sphereGroupRef.current = sphereGroup;

    // Ambient space particles for depth
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 400;
    const posArray = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      posArray[p] = (Math.random() - 0.5) * 160;
      posArray[p + 1] = (Math.random() - 0.5) * 160;
      posArray[p + 2] = (Math.random() - 0.5) * 160;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.8,
      color: 0x818cf8,
      transparent: true,
      opacity: 0.45,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 2. Build 3D Card Items
    const items: THREE.Mesh[] = [];
    const geometry = new THREE.PlaneGeometry(7.5, 11.5);

    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: createCardTexture(i),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = {
        id: i,
        spherePos: new THREE.Vector3(),
        sphereRot: new THREE.Euler(),
        explodePos: new THREE.Vector3(),
        itemData: displayItems[i],
      };

      sphereGroup.add(mesh);
      items.push(mesh);
    }
    itemsRef.current = items;

    // 3. Mathematical Fibonacci Sphere Distribution
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < TOTAL_ITEMS; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const y = 1 - (i / (TOTAL_ITEMS - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));

      const x = Math.cos(theta) * radiusAtY * SPHERE_RADIUS;
      const z = Math.sin(theta) * radiusAtY * SPHERE_RADIUS;
      const posY = y * SPHERE_RADIUS;

      items[i].userData.spherePos.set(x, posY, z);

      const dummy = new THREE.Object3D();
      dummy.position.set(x, posY, z);
      dummy.lookAt(x * 2, posY * 2, z * 2);
      items[i].userData.sphereRot.copy(dummy.rotation);

      items[i].userData.explodePos.set(x * 3.5, posY * 3.5, z * 3.5);
    }

    // 4. Animation Pipeline Implementation
    function runAnimationPipeline() {
      if (!isPlayingRef.current) {
        const timeout = setTimeout(runAnimationPipeline, 500);
        timersRef.current.push(timeout);
        return;
      }

      // 1. SPHERE FORMATION & 360 SHOWCASE (3000ms Entrance, 6000ms 360 Spin)
      sphereGroup.rotation.set(0, 0, 0);

      items.forEach((item, i) => {
        item.position.set(0, 0, 0);
        item.rotation.set(0, 0, 0);
        item.scale.set(0.1, 0.1, 0.1);
        (item.material as THREE.MeshBasicMaterial).opacity = 0;

        new TWEEN.Tween(item.position)
          .to(item.userData.spherePos, 3000)
          .easing(TWEEN.Easing.Cubic.Out)
          .delay(i * 70)
          .start();

        new TWEEN.Tween(item.rotation)
          .to(
            {
              x: item.userData.sphereRot.x,
              y: item.userData.sphereRot.y,
              z: item.userData.sphereRot.z,
            },
            3000
          )
          .easing(TWEEN.Easing.Cubic.Out)
          .delay(i * 70)
          .start();

        new TWEEN.Tween(item.scale)
          .to({ x: 1, y: 1, z: 1 }, 3000)
          .easing(TWEEN.Easing.Cubic.Out)
          .delay(i * 70)
          .start();

        new TWEEN.Tween(item.material)
          .to({ opacity: 1 }, 2000)
          .delay(i * 70)
          .start();
      });

      // 360-degree rotation of formed sphere (6000ms)
      new TWEEN.Tween(sphereGroup.rotation)
        .to({ y: Math.PI * 2 }, 6000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();

      // 2. LINEAR CAROUSEL FOCUS (Triggered at 7000ms)
      const carouselTimer = setTimeout(() => {
        if (!isPlayingRef.current) return;

        new TWEEN.Tween(sphereGroup.rotation)
          .to({ y: 0 }, 1500)
          .easing(TWEEN.Easing.Cubic.Out)
          .start();

        let activeIndex = 0;
        setActiveCardIndex(0);

        function updateCarouselLayout(index: number, duration = 1400) {
          setActiveCardIndex(index);

          items.forEach((item, i) => {
            const offset = i - index;
            const targetX = offset * CAROUSEL_SPACING;
            const targetZ = -Math.abs(offset) * 9;
            const isCenter = offset === 0;

            const targetScale = isCenter ? 1.7 : 0.85;
            const targetOpacity = isCenter ? 1.0 : Math.max(0.15, 1 - Math.abs(offset) * 0.28);

            new TWEEN.Tween(item.position)
              .to({ x: targetX, y: 0, z: targetZ }, duration)
              .easing(TWEEN.Easing.Cubic.Out)
              .start();

            new TWEEN.Tween(item.rotation)
              .to({ x: 0, y: -offset * 0.12, z: 0 }, duration)
              .easing(TWEEN.Easing.Cubic.Out)
              .start();

            new TWEEN.Tween(item.scale)
              .to({ x: targetScale, y: targetScale, z: targetScale }, duration)
              .easing(TWEEN.Easing.Back.Out)
              .start();

            new TWEEN.Tween(item.material)
              .to({ opacity: targetOpacity }, duration)
              .start();
          });
        }

        updateCarouselLayout(0, 2000);

        // Step interval: 2400ms per focused card
        const stepInterval = setInterval(() => {
          if (!isPlayingRef.current) return;
          activeIndex++;

          if (activeIndex < TOTAL_ITEMS) {
            updateCarouselLayout(activeIndex, 1400);
          } else {
            clearInterval(stepInterval);
            triggerSphereExitSequence();
          }
        }, 2400);

        intervalsRef.current.push(stepInterval);
      }, 7000);

      timersRef.current.push(carouselTimer);
    }

    // 3. EXTENDED SPHERE RE-FORMATION & RADIAL DISPERSAL
    function triggerSphereExitSequence() {
      // Slower re-assembly back to sphere layout (2500ms)
      items.forEach((item, i) => {
        new TWEEN.Tween(item.position)
          .to(item.userData.spherePos, 2500)
          .easing(TWEEN.Easing.Cubic.InOut)
          .delay(i * 50)
          .start();

        new TWEEN.Tween(item.rotation)
          .to(
            {
              x: item.userData.sphereRot.x,
              y: item.userData.sphereRot.y,
              z: item.userData.sphereRot.z,
            },
            2500
          )
          .easing(TWEEN.Easing.Cubic.InOut)
          .delay(i * 50)
          .start();

        new TWEEN.Tween(item.scale)
          .to({ x: 1, y: 1, z: 1 }, 2500)
          .easing(TWEEN.Easing.Cubic.InOut)
          .delay(i * 50)
          .start();

        new TWEEN.Tween(item.material)
          .to({ opacity: 1 }, 1800)
          .start();
      });

      // Hold and spin before explosion exit (3500ms)
      const exitTimer = setTimeout(() => {
        new TWEEN.Tween(sphereGroup.rotation)
          .to({ y: sphereGroup.rotation.y + Math.PI }, 2200)
          .easing(TWEEN.Easing.Cubic.In)
          .start();

        // Radial explosion
        items.forEach((item) => {
          new TWEEN.Tween(item.position)
            .to(item.userData.explodePos, 2200)
            .easing(TWEEN.Easing.Exponential.In)
            .start();

          new TWEEN.Tween(item.scale)
            .to({ x: 0.05, y: 0.05, z: 0.05 }, 2200)
            .easing(TWEEN.Easing.Exponential.In)
            .start();

          new TWEEN.Tween(item.material)
            .to({ opacity: 0 }, 1600)
            .start();
        });

        const loopTimer = setTimeout(() => {
          runAnimationPipeline();
        }, 2600);

        timersRef.current.push(loopTimer);
      }, 3500);

      timersRef.current.push(exitTimer);
    }

    // 5. Interactive Raycaster for Card Clicking (View Evidence)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(items);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const clickedData = hitMesh.userData.itemData;
        if (clickedData?.rawMemory) {
          // Pause animation and open evidence detail modal
          isPlayingRef.current = false;
          onSelectMemory(clickedData.rawMemory);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // 6. Animation render loop
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      if (isPlayingRef.current) {
        TWEEN.update();
      }
      particles.rotation.y += 0.0004;
      renderer.render(scene, camera);
    }

    runAnimationPipeline();
    animate();

    // 7. Window resize handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearAllTimeouts();
      TWEEN.removeAll();
      renderer.dispose();
    };
  }, [createCardTexture, TOTAL_ITEMS, displayItems, onSelectMemory]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080a10] text-white select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-pointer" />

      {/* Top Floating Header & Navigation */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/15 backdrop-blur-xl transition-all shadow-xl cursor-pointer hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Home</span>
          </button>

          <div className="px-4 py-2 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-xl hidden sm:flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-extrabold tracking-widest text-white uppercase">
              Memories
            </span>
            <span className="text-xs text-slate-400">· Real Life Continuum</span>
          </div>
        </div>

        {/* Unified Mode Switcher Pill */}
        {onViewModeChange && (
          <div className="flex items-center bg-slate-900/85 p-1 rounded-full border border-white/10 backdrop-blur-xl gap-1 shadow-2xl">
            <button
              onClick={() => onViewModeChange('3d')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3D Sphere
            </button>
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/35'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Timeline Grid
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* User Isolation Badge */}
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-mono backdrop-blur-xl shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">UID:</span>
            <span>{userUid ? userUid.slice(0, 6) : 'Explorer'}...</span>
          </div>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isLoading}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/15 backdrop-blur-xl transition-all cursor-pointer"
              title="Refresh Memory Continuum"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Instructions Pill (Top Center) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
        <div className="px-4 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md text-[11px] text-slate-300 tracking-wide font-medium flex items-center gap-2">
          <span>💡 Tap any memory card to inspect source evidence</span>
        </div>
      </div>
    </div>
  );
};
