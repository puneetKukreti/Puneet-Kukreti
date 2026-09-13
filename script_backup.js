/**
 * Puneet Kukreti — Dual Camera Engine:
 * 1. Mouse-Position Panning Camera (Oversized composition with physical spring lag)
 * 2. Continuous 3D Perspective Z-Axis Fly-Through (Scroll-driven spatial flight)
 * 3. 60fps/120fps Sub-frame optical star canvas cross-fading
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 66;
  const FRAME_PREFIX = 'ezgif-split/frame_';
  const FRAME_SUFFIX = '_delay-0.067s.png';

  // --- DOM Elements ---
  const preloader = document.getElementById('preloader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPct = document.getElementById('loader-pct');
  const canvas = document.getElementById('sequence-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const sequenceSection = document.getElementById('sequence-section');
  const oversizedComposition = document.getElementById('oversized-composition');
  const progressFill = document.getElementById('progress-fill');
  const sectionName = document.getElementById('section-name');
  const scrollHint = document.getElementById('scroll-hint');

  // Hero internal elements for subtle split
  const heroTextCol = document.getElementById('hero-text-col');
  const heroPortraitCol = document.getElementById('hero-portrait-col');

  // --- State ---
  const images = [];
  let currentProgress = 0;
  let targetProgress = 0;
  let lenisInstance = null;
  let isLoaded = false;

  // Mouse-Position Camera Panning State
  let mouseNormX = 0; // -1 to +1
  let mouseNormY = 0; // -1 to +1
  let currentCamX = 0;
  let currentCamY = 0;
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  // Screen metrics (oversized dimensions)
  let dpr = 1;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let drawWidth = 0;
  let drawHeight = 0;
  let drawX = 0;
  let drawY = 0;

  /**
   * Smoothstep easing function
   */
  function smoothstep(min, max, value) {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  }

  /**
   * Continuous 3D Spatial Transform Formula for Z-Axis Fly-Through
   * Pure physical camera approach: No artificial opacity fades or approach windows.
   * Objects exist in space infinitely, shrinking to microscopic specks in the distance,
   * completely eliminating any "pop-in" effect.
   */
  function getSpatialTransform(progress, center) {
    const delta = progress - center;

    if (delta <= 0) {
      // Approaching camera
      const dist = Math.abs(delta);
      
      // Exponential scale decay creates true optical depth
      const scale = Math.exp(-dist * 12);
      const z = -dist * 8000;

      return {
        transform: `translate3d(0, 0, ${z.toFixed(1)}px) scale(${scale.toFixed(4)})`,
        opacity: 1, // ALWAYS 1, no opacity fading!
        blur: '0',  // Crystal clear at all distances
        visible: true // ALWAYS visible, just tiny in the distance!
      };
    } else {
      // Zooming past the camera
      const dist = delta;
      
      // Scale up massively as it flies past
      const scale = 1.0 + dist * 25;
      const z = dist * 2500;
      
      // Fade out only after it passes the camera so it doesn't block the screen
      const opacity = Math.max(0, 1.0 - dist * 8);

      return {
        transform: `translate3d(0, 0, ${z.toFixed(1)}px) scale(${scale.toFixed(4)})`,
        opacity: Math.max(0, opacity),
        blur: (dist * 40).toFixed(1), // Motion blur as it flies past
        visible: opacity > 0.01
      };
    }
  }

  // --- Spatial Layers Definitions ---
  const layers = [
    {
      id: 'layer-hero',
      el: document.getElementById('layer-hero'),
      name: 'INTRO',
      center: 0.00,
      render: (progress) => {
        if (progress <= 0.001) {
          if (heroTextCol) heroTextCol.style.transform = 'translateX(0px)';
          if (heroPortraitCol) heroPortraitCol.style.transform = 'translateX(0px)';
          return { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, blur: 0, visible: true };
        }
        if (progress > 0.16) {
          return { transform: 'translate3d(0, 0, 800px) scale(2.6)', opacity: 0, blur: 6, visible: false };
        }

        const t = progress / 0.16;
        const scale = 1.0 + t * t * 1.6;
        const z = t * t * 750;
        const opacity = Math.max(0, 1.0 - t * 1.6);
        const blur = (t * 4).toFixed(1);

        if (heroTextCol) heroTextCol.style.transform = `translateX(${-t * 180}px)`;
        if (heroPortraitCol) heroPortraitCol.style.transform = `translateX(${t * 180}px)`;

        return {
          transform: `translate3d(0, 0, ${z.toFixed(1)}px) scale(${scale.toFixed(3)})`,
          opacity: Math.max(0, Math.min(1, opacity)),
          blur: blur,
          visible: opacity > 0.01
        };
      }
    },
    {
      id: 'layer-ring',
      el: document.getElementById('layer-ring'),
      name: 'WARP',
      center: 0.18,
      render: (progress) => {
        if (progress < 0.07 || progress > 0.28) {
          return { transform: 'scale(0.1)', opacity: 0, blur: 0, visible: false };
        }
        const delta = progress - 0.18;
        const rotZ = progress * 380;
        const scale = Math.max(0.1, 0.4 + (progress - 0.07) * 8.5);
        const z = delta * 1200;
        const opacity = delta < 0
          ? Math.min(0.85, (progress - 0.07) / 0.06)
          : Math.max(0, 0.85 - delta / 0.06);

        return {
          transform: `translate3d(0, 0, ${z.toFixed(1)}px) rotateX(65deg) rotateY(15deg) rotateZ(${rotZ.toFixed(1)}deg) scale(${scale.toFixed(3)})`,
          opacity: Math.max(0, Math.min(1, opacity)),
          blur: 0,
          visible: opacity > 0.01
        };
      }
    },
    {
      id: 'layer-pitch',
      el: document.getElementById('layer-pitch'),
      name: 'ELEVATOR PITCH',
      center: 0.33,
      render: (progress) => getSpatialTransform(progress, 0.33)
    },
    {
      id: 'layer-decade',
      el: document.getElementById('layer-decade'),
      name: 'THE DECADE',
      center: 0.50,
      render: (progress) => getSpatialTransform(progress, 0.50)
    },
    {
      id: 'layer-numbers',
      el: document.getElementById('layer-numbers'),
      name: 'NUMBERS',
      center: 0.67,
      render: (progress) => getSpatialTransform(progress, 0.67)
    },
    {
      id: 'layer-cases',
      el: document.getElementById('layer-cases'),
      name: 'CASE STUDIES',
      center: 0.83,
      render: (progress) => getSpatialTransform(progress, 0.83)
    },
    {
      id: 'layer-contact',
      el: document.getElementById('layer-contact'),
      name: "LET'S TALK",
      center: 0.97,
      render: (progress) => {
        if (progress >= 0.96) {
          return { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1, blur: 0, visible: true };
        }
        return getSpatialTransform(progress, 0.97);
      }
    }
  ];

  /**
   * Update 3D spatial layers based on scroll progress
   */
  function updateSpatialWorld(progress) {
    let closestSection = 'INTRO';
    let minDistance = 999;

    layers.forEach((layer) => {
      if (!layer.el) return;
      const state = layer.render(progress);

      if (!state.visible) {
        layer.el.style.display = 'none';
        return;
      }

      layer.el.style.display = 'flex';
      layer.el.style.transform = state.transform;
      layer.el.style.opacity = state.opacity;
      layer.el.style.filter = state.blur > 0.1 ? `blur(${state.blur}px)` : 'none';

      const dist = Math.abs(progress - layer.center);
      layer.el.style.pointerEvents = (dist < 0.08) ? 'auto' : 'none';

      if (layer.name !== 'WARP') {
        if (dist < minDistance) {
          minDistance = dist;
          closestSection = layer.name;
        }
      }
    });

    if (sectionName && sectionName.textContent !== closestSection) {
      sectionName.textContent = closestSection;
    }
  }

  /**
   * Mouse-Position-Controlled Camera Panning Engine
   * Moves the entire oversized composition smoothly with spring lerp
   */
  function initMouseCamera() {
    if (!isFinePointer) return;

    window.addEventListener('mousemove', (e) => {
      // Normalized between -1.0 (left/top) and +1.0 (right/bottom)
      mouseNormX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNormY = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // Reset smoothly when cursor leaves window
    document.addEventListener('mouseleave', () => {
      mouseNormX = 0;
      mouseNormY = 0;
    });
  }

  function updateMouseCamera() {
    if (!oversizedComposition || !isFinePointer) return;

    // Max pan bounded to safe 5.0% margin so user NEVER sees empty space outside composition
    const maxPanX = window.innerWidth * 0.05;
    const maxPanY = window.innerHeight * 0.05;

    // Direction specification:
    // Mouse top (-Y) -> move composition upward (-Y)
    // Mouse bottom (+Y) -> move composition downward (+Y)
    // Mouse left (-X) -> move composition left (-X)
    // Mouse right (+X) -> move composition right (+X)
    // Mouse center (0,0) -> composition centered (0,0)
    const targetCamX = mouseNormX * maxPanX;
    const targetCamY = mouseNormY * maxPanY;

    // Physical spring lerp for subtle, fluid, lagged follow
    const lerpSpeed = 0.065;
    currentCamX += (targetCamX - currentCamX) * lerpSpeed;
    currentCamY += (targetCamY - currentCamY) * lerpSpeed;

    oversizedComposition.style.transform = `translate3d(${currentCamX.toFixed(2)}px, ${currentCamY.toFixed(2)}px, 0)`;
  }

  /**
   * Helper to format frame path
   */
  function getFramePath(index) {
    const padded = String(index).padStart(3, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_SUFFIX}`;
  }

  /**
   * Preload star frames
   */
  function preloadImages() {
    return new Promise((resolve) => {
      let completed = 0;
      let isResolved = false;

      function onAssetDone() {
        completed++;
        const pct = Math.min(100, Math.round((completed / TOTAL_FRAMES) * 100));
        if (loaderBar) loaderBar.style.width = `${pct}%`;
        if (loaderPct) loaderPct.textContent = `${pct}%`;

        if (completed >= TOTAL_FRAMES && !isResolved) {
          isResolved = true;
          resolve();
        }
      }

      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve();
        }
      }, 2500);

      for (let i = 0; i < TOTAL_FRAMES; i++) {
        const img = new Image();
        images[i] = img;

        img.onload = () => {
          if ('decode' in img) {
            img.decode().catch(() => {}).finally(onAssetDone);
          } else {
            onAssetDone();
          }
        };

        img.onerror = () => {
          const fallback = `frames/frame_${String(i).padStart(3, '0')}_delay-0.067s.png`;
          const retry = new Image();
          retry.onload = onAssetDone;
          retry.onerror = onAssetDone;
          retry.src = fallback;
          images[i] = retry;
        };

        img.src = getFramePath(i);
      }
    });
  }

  /**
   * Responsive layout geometry calculation for oversized canvas
   */
  function updateCanvasDimensions() {
    dpr = window.devicePixelRatio || 1;
    // Canvas covers the oversized composition (112vw x 112vh)
    canvasWidth = Math.ceil(window.innerWidth * 1.12);
    canvasHeight = Math.ceil(window.innerHeight * 1.12);

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);

    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const imgRatio = 16 / 9;
    const screenRatio = canvasWidth / canvasHeight;

    if (screenRatio > imgRatio) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      drawX = 0;
      drawY = (canvasHeight - drawHeight) / 2;
    } else {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      drawX = (canvasWidth - drawWidth) / 2;
      drawY = 0;
    }

    renderContinuousFrame(currentProgress * (TOTAL_FRAMES - 1));
  }

  /**
   * Continuous sub-frame optical alpha cross-fading
   */
  function renderContinuousFrame(floatIndex) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, floatIndex));
    const baseIndex = Math.floor(clampedIndex);
    const nextIndex = Math.min(TOTAL_FRAMES - 1, baseIndex + 1);
    const blendFactor = clampedIndex - baseIndex;

    const baseImg = images[baseIndex];
    const nextImg = images[nextIndex];

    if (!baseImg || !baseImg.complete) return;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(baseImg, drawX, drawY, drawWidth, drawHeight);

    if (blendFactor > 0.005 && baseIndex !== nextIndex && nextImg && nextImg.complete) {
      ctx.globalAlpha = blendFactor;
      ctx.drawImage(nextImg, drawX, drawY, drawWidth, drawHeight);
      ctx.globalAlpha = 1.0;
    }
  }

  /**
   * Scroll calculation
   */
  function updateScrollTarget() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) {
      targetProgress = 0;
      return;
    }

    const currentScroll = window.scrollY || window.pageYOffset || 0;
    const rawProgress = currentScroll / maxScroll;
    targetProgress = Math.max(0, Math.min(1, rawProgress));

    if (progressFill) {
      progressFill.style.height = `${(targetProgress * 100).toFixed(1)}%`;
    }

    if (scrollHint) {
      scrollHint.style.opacity = targetProgress > 0.015 ? '0' : '1';
    }
  }

  /**
   * Main 60FPS / 120FPS Render Loop
   */
  function animationLoop(time) {
    if (lenisInstance) {
      lenisInstance.raf(time);
    }

    const lerpSpeed = 0.12;
    const diff = targetProgress - currentProgress;

    if (Math.abs(diff) > 0.0001) {
      currentProgress += diff * lerpSpeed;
    } else {
      currentProgress = targetProgress;
    }

    // 1. Mouse camera panning
    updateMouseCamera();

    // 2. Star canvas frame scrubbing
    renderContinuousFrame(currentProgress * (TOTAL_FRAMES - 1));

    // 3. 3D spatial world fly-through
    updateSpatialWorld(currentProgress);

    requestAnimationFrame(animationLoop);
  }

  /**
   * Setup Lenis smooth scrolling
   */
  function initLenis() {
    if (typeof Lenis !== 'undefined') {
      try {
        lenisInstance = new Lenis({
          duration: 1.05,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1.05,
          touchMultiplier: 1.5,
          autoResize: true,
          infinite: false
        });

        lenisInstance.on('scroll', updateScrollTarget);
      } catch (err) {
        console.warn('Lenis init error, using native scroll fallback:', err);
      }
    }

    window.addEventListener('scroll', updateScrollTarget, { passive: true });
  }

  /**
   * App initialization
   */
  async function init() {
    window.addEventListener('resize', updateCanvasDimensions);
    updateCanvasDimensions();

    initLenis();
    initMouseCamera();

    // Start 60fps/120fps render loop immediately
    requestAnimationFrame(animationLoop);

    // Preload star images
    await preloadImages();
    isLoaded = true;

    // Render initial state
    updateScrollTarget();
    currentProgress = targetProgress;
    renderContinuousFrame(0);
    updateSpatialWorld(0);

    // Smoothly reveal experience
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
