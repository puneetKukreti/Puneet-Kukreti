
(function () {
  let targetProgress = 0;
  let currentProgress = 0;
  let lenisInstance;

  const stickyWrapper = document.querySelector('.sequence-sticky-wrapper');

  let scene, camera, cssRenderer, webglRenderer;
  let starMesh;
  const objects = [];

  let mouseX = 0;
  let mouseY = 0;
  let currentCamX = 0;
  let currentCamY = 0;
  let isMouseHovering = false;
  let hoverIdleTimer = null;

  function getOptimalHeroStartZ() {
    // Dynamic FOV distance based on THREE.PerspectiveCamera(45) and CSS3DRenderer:
    // fovDist = (0.5 / tan(22.5 deg)) * innerHeight = 1.20710678 * innerHeight
    const fovDist = (0.5 / Math.tan((45 * Math.PI) / 360)) * window.innerHeight;
    // Balanced framing: zoomed out a little for comfortable breathing room
    const targetScale = window.innerWidth <= 860 ? 0.80 : 0.84;
    const heroZ = 1000;
    return heroZ + (fovDist / targetScale);
  }

  function initThree() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40000);
    const initialCamZ = getOptimalHeroStartZ();
    camera.position.set(0, 0, initialCamZ);

    webglRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    webglRenderer.setSize(window.innerWidth, window.innerHeight);
    webglRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    webglRenderer.domElement.style.position = 'absolute';
    webglRenderer.domElement.style.top = '0';
    webglRenderer.domElement.style.left = '0';
    webglRenderer.domElement.style.pointerEvents = 'none';
    webglRenderer.domElement.style.zIndex = '0';
    stickyWrapper.appendChild(webglRenderer.domElement);

    cssRenderer = new THREE.CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    cssRenderer.domElement.style.zIndex = '7';
    stickyWrapper.appendChild(cssRenderer.domElement);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 12000;
    const posArr = new Float32Array(starCount * 3);
    for(let i=0; i < starCount * 3; i+=3) {
      posArr[i] = (Math.random() - 0.5) * 12000;
      posArr[i+1] = (Math.random() - 0.5) * 8000;
      // Z spans from +2000 to -35000
      posArr[i+2] = 2000 - Math.random() * 37000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    const starTex = new THREE.CanvasTexture(canvas);
    
    const starMat = new THREE.PointsMaterial({
      size: 24,
      map: starTex,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false
    });
    starMesh = new THREE.Points(starGeo, starMat);
    scene.add(starMesh);

    const layerConfigs = [
      { id: 'layer-hero', z: 1000 },
      { id: 'layer-ring', z: -700 },
      { id: 'layer-pitch', z: -5500 },
      { id: 'layer-decade', z: -10500 },
      { id: 'layer-cases', z: -20200 },
      { id: 'layer-contact', z: -24500 }
    ];

    layerConfigs.forEach(config => {
      const el = document.getElementById(config.id);
      if (el) {
        el.style.transform = '';
        el.style.opacity = '1';
        el.style.display = 'flex';
        el.style.pointerEvents = 'auto';

        const obj = new THREE.CSS3DObject(el);
        obj.position.z = config.z;
        scene.add(obj);
        objects.push({ obj, config, el });
      }
    });

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    webglRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    if (currentProgress < 0.005) {
      camera.position.z = getOptimalHeroStartZ();
    }
  }

  function onMouseMove(e) {
    // Only desktop pointer devices
    if (window.innerWidth <= 860) return;

    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    isMouseHovering = true;

    clearTimeout(hoverIdleTimer);
    // When the user stops moving the mouse, smoothly return to the center!
    hoverIdleTimer = setTimeout(() => {
      isMouseHovering = false;
    }, 700);
  }

  window.addEventListener('mouseleave', () => {
    isMouseHovering = false;
  });

  function updateScrollTarget() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
  }

  function renderLoop() {
    if (lenisInstance) lenisInstance.raf(Date.now());

    // Smooth, cinematic camera deceleration
    currentProgress += (targetProgress - currentProgress) * 0.035;

    // Gentle, controlled hover parallax when actively moving mouse;
    // Returns smoothly to the middle (0, 0) when user stops hovering or on mobile!
    const targetCamX = isMouseHovering ? (mouseX * 45) : 0;
    const targetCamY = isMouseHovering ? (mouseY * 35) : 0;
    currentCamX += (targetCamX - currentCamX) * 0.04;
    currentCamY += (targetCamY - currentCamY) * 0.04;

    checkMinigameTrigger();

    const startZ = getOptimalHeroStartZ();
    const endZ = -24500;

    // Cinematic camera trajectory:
    // Smoothly decelerates as it approaches ACHIEVEMENTS (layer-cases at z = -20200)
    // framing the composition closer at dist ≈ 1000 - 1180, where it occupies 80-85% viewport width
    // and 70-80% viewport height, providing an unhurried, comfortable reading zone.
    let camZ;
    if (currentProgress < 0.70 || currentProgress > 0.90) {
      camZ = startZ + currentProgress * (endZ - startZ);
    } else {
      const t = (currentProgress - 0.70) / 0.20;
      const deltaT = t - 0.5;
      const curveT = 0.5 + 0.5 * Math.pow(2 * deltaT, 3);
      camZ = -16550 + (0.45 * t + 0.55 * curveT) * (-21850 - (-16550));
    }

    camera.position.x = currentCamX;
    camera.position.y = currentCamY;
    camera.position.z = camZ;

    // Cinematic Depth of Field (Focus/Blur)
    objects.forEach(item => {
      // Calculate absolute distance from camera to layer
      // If item is behind the camera (camZ < item.config.z), it naturally goes out of view, but we'll blur it as we pass through
      const dist = item.config.z - camZ;
      let blur = 0;
      
      // Far away (in the distance)
      if (dist < -1800) {
        blur = Math.min(10, (Math.abs(dist) - 1800) * 0.002);
      } 
      // Close up (passing through it)
      else if (dist > -600) {
        blur = Math.min(20, (600 + dist) * 0.03); // The closer we get to 0 (and past it), the blurrier
      }
      
      item.el.style.filter = `blur(${blur}px)`;
    });

    // Update HUD vertical progress bar
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.height = `${(currentProgress * 100).toFixed(1)}%`;
    }

    // Update active section HUD label based on compact depth
    let currentSection = "INTRO";
    if (camZ < -22400) currentSection = "CONTACT";
    else if (camZ < -17400) currentSection = "ACHIEVEMENTS";
    else if (camZ < -8000) currentSection = "SKILLS";
    else if (camZ < -3200) currentSection = "EXPERIENCE";

    const sectionLabel = document.getElementById('section-name');
    if (sectionLabel && sectionLabel.textContent !== currentSection) {
      sectionLabel.textContent = currentSection;
    }

    // Dynamic Cosmic Snake Animation (centered, near, calm readable speed)
    const ringObj = objects.find(o => o.config.id === 'layer-ring');
    const snakeText = document.getElementById('snake-text-path');

    if (ringObj) {
      // Distance from camera to snake (ring is at z = -700)
      const distToRing = camZ - (-700);

      // Slow, steady, calm slithering so user can easily read "PUNEET"
      if (snakeText) {
        const slither = (currentProgress * 45 + (Date.now() * 0.0035)) % 100;
        snakeText.setAttribute('startOffset', `${slither}%`);
      }

      if (distToRing > 380) {
        // Approaching & Reading Zone: Snake stays centered right in front of camera so name is large & readable
        const hover = (Date.now() * 0.001);
        ringObj.obj.position.x = Math.sin(hover) * 35;
        ringObj.obj.position.y = Math.cos(hover * 0.8) * 25;
        ringObj.obj.rotation.x = (48 + Math.sin(hover * 0.7) * 4) * Math.PI / 180;
        ringObj.obj.rotation.y = (10 + Math.cos(hover * 0.6) * 4) * Math.PI / 180;
        ringObj.obj.rotation.z = currentProgress * 2.0;
      } else {
        // Exit phase: as camera zooms past it, the snake uncoils and slithers diagonally out of the screen
        const exitFactor = Math.max(0, (380 - distToRing) / 380);
        ringObj.obj.position.x = exitFactor * 900;
        ringObj.obj.position.y = -(exitFactor * 650);
        ringObj.obj.rotation.x = (48 + exitFactor * 25) * Math.PI / 180;
        ringObj.obj.rotation.y = (10 + exitFactor * 30) * Math.PI / 180;
        ringObj.obj.rotation.z = (currentProgress * 2.0) + (exitFactor * 1.5);
      }
    }
    
    objects.forEach(item => {
      // Distance from camera to object along Z (positive = object is in front of camera)
      const dist = camera.position.z - item.obj.position.z;
      
      const heroDistStart = Math.max(400, startZ - 1000);
      const heroExitDist = Math.max(220, heroDistStart * 0.72);
      const nearCullDist = item.config.id === 'layer-cases' ? 100 : (item.config.id === 'layer-hero' ? 80 : 160);
      const exitFadeDist = item.config.id === 'layer-cases' ? 320 : (item.config.id === 'layer-hero' ? heroExitDist : 460);

      if (dist <= nearCullDist && item.config.id !== 'layer-contact') {
        // Safe near-plane culling: element is too close or behind camera -> strictly hidden
        item.el.style.opacity = '0';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (dist < exitFadeDist && item.config.id !== 'layer-contact') {
        // Exiting smoothly past camera
        const exitAlpha = Math.max(0, (dist - nearCullDist) / (exitFadeDist - nearCullDist));
        item.el.style.opacity = exitAlpha.toFixed(2);
        item.el.style.filter = 'none';
        item.el.style.visibility = exitAlpha > 0.02 ? 'visible' : 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (dist <= 2600 || (item.config.id === 'layer-contact' && dist <= 3200)) {
        // Wide in-focus reading zone -> 100% crisp, content stays readable for a long time
        item.el.style.opacity = '1';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'visible';
        if (window.innerWidth <= 860) {
          item.el.style.pointerEvents = 'none';
        } else {
          item.el.style.pointerEvents = dist < 1800 ? 'auto' : 'none';
        }
      } else if (dist <= 6200) {
        // Approaching in distance -> smooth depth-of-field transition (starts blurred, clarifies slowly)
        const approachProgress = (6200 - dist) / (6200 - 2600);
        const opacity = Math.pow(approachProgress, 1.2);
        // Integer blur to prevent GPU subpixel shader recompiles
        const blurPx = Math.round((1 - approachProgress) * 7);
        
        item.el.style.opacity = opacity.toFixed(2);
        item.el.style.filter = blurPx > 1 ? `blur(${blurPx}px)` : 'none';
        item.el.style.visibility = 'visible';
        item.el.style.pointerEvents = 'none';
      } else {
        // Beyond horizon -> completely hidden
        item.el.style.opacity = '0';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'hidden';
        item.el.style.pointerEvents = 'none';
      }
    });

    webglRenderer.render(scene, camera);
    cssRenderer.render(scene, camera);

    requestAnimationFrame(renderLoop);
  }

  function initLenis() {
    if (typeof Lenis !== 'undefined') {
      try {
        lenisInstance = new Lenis({
          duration: 1.6,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          syncTouch: true,
          wheelMultiplier: 0.38,
          touchMultiplier: window.innerWidth <= 860 ? 1.5 : 0.85,
          autoResize: true,
          infinite: false
        });
        lenisInstance.on('scroll', updateScrollTarget);
      } catch (err) {}
    }
    window.addEventListener('scroll', updateScrollTarget, { passive: true });
  }

  function initHorizontalTabs() {
    function setupTabGroup(tabContainerId, gridClass, itemClass) {
      const tabContainer = document.getElementById(tabContainerId);
      const grid = document.querySelector(`.${gridClass}`);
      if (!tabContainer || !grid) return;

      const tabs = tabContainer.querySelectorAll('.tab-btn');
      const items = grid.querySelectorAll(`.${itemClass}`);
      if (items.length === 0) return;

      let currentIndex = 0;
      let autoScrollTimer = null;
      let isUserInteracting = false;
      let resumeTimeout = null;

      function scrollToCard(index, smooth = true) {
        if (!items[index]) return;
        currentIndex = index;
        let scrollOffset = 0;
        if (index > 0) {
          const gridRect = grid.getBoundingClientRect();
          const itemRect = items[index].getBoundingClientRect();
          scrollOffset = itemRect.left - gridRect.left + grid.scrollLeft - (grid.clientWidth - items[index].clientWidth) / 2;
        }
        grid.scrollTo({ left: Math.max(0, Math.round(scrollOffset)), behavior: smooth ? 'smooth' : 'auto' });

        tabs.forEach((t, i) => {
          if (i === index) {
            t.classList.add('active');
            try {
              t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } catch(e) {}
          } else {
            t.classList.remove('active');
          }
        });
      }

      function nextCard() {
        if (isUserInteracting) return;
        // Only auto-scroll if container has scrollable overflow (e.g. mobile/tablet)
        if (grid.scrollWidth <= grid.clientWidth + 10) return;

        currentIndex = (currentIndex + 1) % items.length;
        scrollToCard(currentIndex, true);
      }

      function startAutoScroll() {
        stopAutoScroll();
        autoScrollTimer = setInterval(nextCard, 3200);
      }

      function stopAutoScroll() {
        if (autoScrollTimer) {
          clearInterval(autoScrollTimer);
          autoScrollTimer = null;
        }
      }

      function pauseAutoScroll(duration = 4500) {
        isUserInteracting = true;
        stopAutoScroll();
        clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
          isUserInteracting = false;
          startAutoScroll();
        }, duration);
      }

      // Tab button clicks
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          scrollToCard(index, true);
          pauseAutoScroll(5000);
        });
      });

      // Pause auto-scroll on direct touch or mouse interaction
      grid.addEventListener('touchstart', () => pauseAutoScroll(4500), { passive: true });
      grid.addEventListener('touchmove', () => pauseAutoScroll(4500), { passive: true });
      grid.addEventListener('pointerdown', () => pauseAutoScroll(4500), { passive: true });
      grid.addEventListener('mouseenter', () => {
        isUserInteracting = true;
        stopAutoScroll();
      });
      grid.addEventListener('mouseleave', () => pauseAutoScroll(2000));

      // Synchronize active tab when user manually scrolls / swipes
      let scrollTimeout;
      grid.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          let activeIndex = 0;
          let minDiff = Infinity;
          const gridCenter = grid.getBoundingClientRect().left + grid.clientWidth / 2;

          items.forEach((item, index) => {
            const itemCenter = item.getBoundingClientRect().left + item.clientWidth / 2;
            const diff = Math.abs(gridCenter - itemCenter);
            if (diff < minDiff) {
              minDiff = diff;
              activeIndex = index;
            }
          });

          currentIndex = activeIndex;
          tabs.forEach((tab, index) => {
            if (index === activeIndex) {
              tab.classList.add('active');
              try {
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              } catch(e) {}
            } else {
              tab.classList.remove('active');
            }
          });
        }, 60);
      }, { passive: true });

      // Start automatic scrolling left to right
      setTimeout(startAutoScroll, 1600);
    }

    setupTabGroup('skills-tabs', 'skills-grid', 'skill-node');
    setupTabGroup('achieve-tabs', 'achieve-grid', 'achieve-card');
  }

  function initMobileTouchScroll() {
    let touchStartY = 0;
    let touchStartX = 0;
    let isTrackingTouch = false;
    let isVerticalScrollMode = false;
    let isHorizontalScrollMode = false;

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isTrackingTouch = true;
        isVerticalScrollMode = false;
        isHorizontalScrollMode = false;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!isTrackingTouch || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = touchStartY - currentY;
      const deltaX = touchStartX - currentX;

      const target = e.target;
      const isInsideCarousel = target && (target.closest('.skills-grid') || target.closest('.achieve-grid'));

      if (isInsideCarousel) {
        if (!isVerticalScrollMode && !isHorizontalScrollMode) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 6) {
            isHorizontalScrollMode = true;
          } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
            isVerticalScrollMode = true;
          }
        }

        if (isHorizontalScrollMode) {
          // Horizontal swipe between carousel cards
          return;
        }

        if (isVerticalScrollMode) {
          // Vertical swipe over cards -> drive page scroll
          const maxScroll = document.body.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY || window.pageYOffset;
          const targetScroll = Math.max(0, Math.min(maxScroll, currentScroll + deltaY * 1.8));

          if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
            lenisInstance.scrollTo(targetScroll, { immediate: true });
          } else {
            window.scrollBy(0, deltaY * 1.8);
          }
          touchStartY = currentY;
          touchStartX = currentX;
        }
      } else {
        // Touching anywhere else on mobile content or background
        if (Math.abs(deltaY) > 3) {
          const maxScroll = document.body.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY || window.pageYOffset;
          const targetScroll = Math.max(0, Math.min(maxScroll, currentScroll + deltaY * 1.8));

          if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
            lenisInstance.scrollTo(targetScroll, { immediate: true });
          } else {
            window.scrollBy(0, deltaY * 1.8);
          }
          touchStartY = currentY;
          touchStartX = currentX;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isTrackingTouch = false;
      isVerticalScrollMode = false;
      isHorizontalScrollMode = false;
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
      isTrackingTouch = false;
      isVerticalScrollMode = false;
      isHorizontalScrollMode = false;
    }, { passive: true });
  }

  // ==========================================
  // Interactive UX Additions
  // ==========================================

  // 1. Web Audio API
  let audioCtx = null;
  let humOsc = null;
  let humGain = null;
  let isMuted = false;

  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    audioCtx = new AudioContext();
    
    // Ambient Space Hum
    humOsc = audioCtx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.value = 55; // Low hum
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 100;
    
    humGain = audioCtx.createGain();
    humGain.gain.value = 0.15;
    
    humOsc.connect(filter);
    filter.connect(humGain);
    humGain.connect(audioCtx.destination);
    
    humOsc.start();
    
    // Setup Audio Toggle
    const audioBtn = document.getElementById('audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
          humGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
          audioBtn.classList.add('muted');
        } else {
          humGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.5);
          audioBtn.classList.remove('muted');
          playBeep(600, 'sine');
        }
      });
    }

    // Bind UI hover sounds
    const hoverElements = document.querySelectorAll('.planet-container, .tab-btn, .card-action-btn, a, button');
    hoverElements.forEach(el => {
      el.addEventListener('mouseenter', () => playBeep(800, 'sine', 0.05, 0.02));
    });
  }

  function playBeep(freq, type = 'sine', duration = 0.1, vol = 0.1) {
    if (!audioCtx || isMuted) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + duration);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  // 2. Custom Cursor
  function initCursor() {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;
    
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });

    const hoverElements = document.querySelectorAll('a, button, .planet-container, .card-action-btn, .tab-btn, .achieve-card');
    hoverElements.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
  }
  function initCometTrail() {
    const canvas = document.getElementById('comet-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    });

    const particles = [];
    let lastX = 0;
    let lastY = 0;

    window.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Spawn particles based on distance moved (prevents clumping)
      if (dist > 2) {
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 + 1, // drift down slightly
          life: 1.0,
          size: Math.random() * 3 + 1
        });
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    function renderComet() {
      ctx.clearRect(0, 0, width, height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        
        if (p.life <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${p.life * 0.8})`;
          ctx.fill();
        }
      }
      requestAnimationFrame(renderComet);
    }
    requestAnimationFrame(renderComet);
  }

  function initConstellations() {
    const nodes = document.querySelectorAll('.skill-node');
    const lines = document.querySelectorAll('.constellation-line');
    
    nodes.forEach((node, index) => {
      node.addEventListener('mouseenter', () => {
        const nodeNum = index + 1;
        lines.forEach(line => {
          if (line.classList.contains(`line-${nodeNum}-`) || 
              line.className.baseVal.includes(`-${nodeNum}`)) {
            line.classList.add('active');
          }
        });
      });
      node.addEventListener('mouseleave', () => {
        lines.forEach(line => line.classList.remove('active'));
      });
    });
  }

  // 3. Boot Sequence
  function runBootSequence(onComplete) {
    let preloader = document.getElementById('preloader');
    
    if (preloader && !document.getElementById('boot-text')) {
      preloader.innerHTML = `
        <div class="boot-terminal">
          <div id="boot-text" class="boot-text"></div>
        </div>
      `;
      preloader.className = 'preloader boot-sequence';
    }

    const bootText = document.getElementById('boot-text');
    if (!preloader || !bootText) return onComplete();

    const lines = [
      "SYSTEM BOOT INITIATED...",
      "LOADING KERNEL MODULES [OK]",
      "MOUNTING VIRTUAL FILESYSTEM [OK]",
      "INITIALIZING WEBGL 3D CONTEXT...",
      "CSS3D RENDERER SYNCED.",
      "STARFIELD GENERATION COMPLETE.",
      "SYSTEM ONLINE."
    ];
    let delay = 0;
    
    lines.forEach((line, index) => {
      setTimeout(() => {
        bootText.textContent += line + "\n";
        
        // Auto-proceed when the last line finishes
        if (index === lines.length - 1) {
          setTimeout(() => {
            initAudio(); // Will initialize, but might be suspended by browser policy
            
            // Resume audio on first user click anywhere if it was blocked
            const resumeAudio = () => {
              if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume();
              }
              document.removeEventListener('click', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);

            playBeep(800, 'square', 0.2, 0.2); // Might not play if blocked
            preloader.classList.add('fade-out');
            onComplete();
          }, 800);
        }
      }, delay);
      delay += 300 + Math.random() * 400;
    });
  }

  // 4. Modals
  // 4. Modals & Case Studies (Authentic Data)
  const caseStudies = {
    'case-1': {
      title: 'Bill of Entry Data Extraction',
      meta: '01 / AUTOMATION',
      tags: ['Python', 'Excel', 'Data Extraction'],
      challenge: 'Thousands of Bill of Entry records had to be manually processed and specific operational and duty information extracted into structured Excel data. Doing this manually was a repetitive, error-prone, months-long process.',
      solution: 'Developed an automated Python extraction script to parse and extract Bill of Entry records directly into structured Excel data.',
      workflow: 'The script parses document records, extracts key operational and duty fields, normalizes the data, and formats it cleanly into organized Excel spreadsheets.',
      impact: 'Reduced a months-long manual process to approximately one week, eliminating repetitive manual transcription.',
      tools: ['Python', 'Excel', 'Data Extraction', 'OpenPyXL / Pandas']
    },
    'case-2': {
      title: 'Automated Repetitive Workflows',
      meta: '02 / WORKFLOW',
      tags: ['Python', 'GST', 'Tally', 'Excel'],
      challenge: 'Routine business operations involved repetitive manual data entry, reconciliation, and handoffs across GST filings, Tally ERP entries, and Excel tracking sheets.',
      solution: 'Engineered automated Python workflows connecting GST, Tally, and Excel data to eliminate repetitive manual tasks and enable continuous execution.',
      workflow: 'Automated scripts ingest and transform cross-platform data, validate entries between systems, and keep master Excel workbooks synchronized without manual intervention.',
      impact: 'Transformed repetitive manual work into automated workflows that run continuously and reliably.',
      tools: ['Python', 'GST', 'Tally', 'Excel']
    },
    'case-3': {
      title: 'AI Shipment Tracking',
      meta: '03 / AI AGENT',
      tags: ['AI Agent', 'Email Automation', 'Live Sheets', 'Python'],
      challenge: 'Shipment tracking required manually reading hundreds of carrier status emails and updating tracking sheets by hand, causing delays and operational friction.',
      solution: 'Built an automated AI workflow that processes shipment emails, identifies the latest shipment status, and automatically updates the tracking sheet in real time.',
      workflow: 'Incoming shipment emails are processed through an AI model that extracts cargo identifiers and current status milestones, then streams the live status directly into the tracking sheet.',
      impact: 'Established a direct automated flow from EMAIL → AI → LIVE STATUS without manual tracking delays.',
      tools: ['Python', 'AI Integration', 'Email Automation', 'Google Sheets']
    }
  };

  function initModals() {
    const modal = document.getElementById('case-modal');
    const closeBtn = document.getElementById('case-modal-close');
    const backdrop = document.getElementById('case-modal-backdrop');
    const cards = document.querySelectorAll('.achieve-card');
    let lastActiveCard = null;
    
    if (!modal || !closeBtn) return;

    function openModal(caseId, triggerEl) {
      const data = caseStudies[caseId] || caseStudies['case-1'];
      lastActiveCard = triggerEl || null;
      
      const titleEl = document.getElementById('case-title');
      const metaEl = document.getElementById('case-meta');
      const chalEl = document.getElementById('case-challenge');
      const solEl = document.getElementById('case-solution');
      const wfEl = document.getElementById('case-workflow');
      const impEl = document.getElementById('case-impact');

      if (titleEl) titleEl.textContent = data.title;
      if (metaEl) metaEl.textContent = data.meta;
      if (chalEl) chalEl.textContent = data.challenge;
      if (solEl) solEl.textContent = data.solution;
      if (wfEl) wfEl.textContent = data.workflow;
      if (impEl) impEl.textContent = data.impact;
      
      const tagsDiv = document.getElementById('case-tags');
      if (tagsDiv) {
        tagsDiv.innerHTML = '';
        data.tags.forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag-pill';
          span.textContent = tag;
          tagsDiv.appendChild(span);
        });
      }

      const toolsDiv = document.getElementById('case-tools');
      if (toolsDiv && data.tools) {
        toolsDiv.innerHTML = '';
        data.tools.forEach(tool => {
          const span = document.createElement('span');
          span.className = 'case-tool-tag';
          span.textContent = tool;
          toolsDiv.appendChild(span);
        });
      }
      
      modal.classList.remove('hidden');
      if (lenisInstance) lenisInstance.stop();
      playBeep(1200, 'triangle', 0.15, 0.1);

      // Focus close button for accessibility
      setTimeout(() => {
        closeBtn.focus();
      }, 50);
    }

    function closeModal() {
      modal.classList.add('hidden');
      if (lenisInstance) lenisInstance.start();
      playBeep(400, 'triangle', 0.15, 0.1);

      // Restore focus to the card that triggered the modal
      if (lastActiveCard && typeof lastActiveCard.focus === 'function') {
        lastActiveCard.focus();
      }
    }

    cards.forEach((card, index) => {
      card.style.cursor = 'pointer';

      // Holographic Tilt Effect
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });

      // Click event
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const caseId = card.getAttribute('data-case') || ('case-' + (index + 1));
        openModal(caseId, card);
      });

      // Keyboard accessibility (Enter / Space)
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const caseId = card.getAttribute('data-case') || ('case-' + (index + 1));
          openModal(caseId, card);
        }
      });
    });

    closeBtn.addEventListener('click', closeModal);

    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Escape key and Tab focus trapping
    document.addEventListener('keydown', (e) => {
      if (modal.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      } else if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length === 0) return;

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });
  }

  // 5. Easter Egg Minigame
  let minigameActive = false;
  let minigameTimer = 0;
  function initMinigame() {
    const canvas = document.getElementById('minigame-canvas');
    const ctx = canvas.getContext('2d');
    const gameOverText = document.getElementById('game-over-text');
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    window.addEventListener('resize', () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    });

    const ship = { x: width/2, y: height - 100, size: 20 };
    const lasers = [];
    const asteroids = [];

    // Follow mouse
    window.addEventListener('mousemove', (e) => {
      if (!minigameActive) return;
      ship.x += (e.clientX - ship.x) * 0.2;
      ship.y += (e.clientY - ship.y) * 0.2;
    });

    // Shoot
    window.addEventListener('mousedown', () => {
      if (!minigameActive) return;
      lasers.push({ x: ship.x, y: ship.y - ship.size, speed: 15 });
      playBeep(1200, 'sawtooth', 0.1, 0.05); // Pew pew
    });

    function spawnAsteroid() {
      asteroids.push({
        x: Math.random() * width,
        y: -50,
        size: 15 + Math.random() * 25,
        speed: 2 + Math.random() * 3
      });
    }

    function gameLoop() {
      if (!minigameActive) {
        requestAnimationFrame(gameLoop);
        return;
      }
      
      ctx.clearRect(0, 0, width, height);
      
      // Draw Ship (Triangle)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y - ship.size);
      ctx.lineTo(ship.x + ship.size, ship.y + ship.size);
      ctx.lineTo(ship.x - ship.size, ship.y + ship.size);
      ctx.fill();

      // Update & Draw Lasers
      ctx.fillStyle = '#fff';
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.y -= l.speed;
        ctx.fillRect(l.x - 2, l.y, 4, 15);
        if (l.y < -50) lasers.splice(i, 1);
      }

      // Update & Draw Asteroids
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 2;
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        a.y += a.speed;
        
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
        ctx.stroke();

        if (a.y > height + 50) asteroids.splice(i, 1);

        // Collision check
        for (let j = lasers.length - 1; j >= 0; j--) {
          const l = lasers[j];
          const dist = Math.hypot(l.x - a.x, l.y - a.y);
          if (dist < a.size + 10) {
            asteroids.splice(i, 1);
            lasers.splice(j, 1);
            playBeep(150, 'square', 0.2, 0.1); // Boom
            break;
          }
        }
      }

      if (Math.random() < 0.03) spawnAsteroid();

      requestAnimationFrame(gameLoop);
    }
    
    requestAnimationFrame(gameLoop);
  }

  function checkMinigameTrigger() {
    if (targetProgress > 0.98 && !minigameActive && minigameTimer === 0) {
      minigameActive = true;
      document.getElementById('minigame-canvas').classList.add('active');
      
      // End game after 10s
      setTimeout(() => {
        minigameActive = false;
        minigameTimer = 10;
        document.getElementById('game-over-text').style.opacity = '1';
        document.getElementById('minigame-canvas').classList.remove('active');
        
        // Hide text after 2 seconds, and reset timer to allow playing again
        setTimeout(() => {
          document.getElementById('game-over-text').style.opacity = '0';
          // Reset after another second to let the fade finish
          setTimeout(() => {
            minigameTimer = 0;
          }, 1000);
        }, 2000);

      }, 10000);
    }
  }

  function initMagneticButtons() {
    const magneticElements = document.querySelectorAll('.contact-resume-link, .tab-btn, .case-modal-close');
    
    magneticElements.forEach(el => {
      // Add transition for smooth snap back
      el.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distX = e.clientX - centerX;
        const distY = e.clientY - centerY;
        
        // Remove transition while actively moving to prevent lag
        el.style.transition = 'none';
        
        // Translate button towards cursor (magnetic pull)
        el.style.transform = `translate(${distX * 0.3}px, ${distY * 0.3}px)`;
      });
      
      el.addEventListener('mouseleave', () => {
        // Restore transition for elastic snap back
        el.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        el.style.transform = `translate(0px, 0px)`;
      });
    });
  }

  function initHeroCTA() {
    const heroCtaWork = document.getElementById('hero-cta-work');
    if (!heroCtaWork) return;

    heroCtaWork.addEventListener('click', (e) => {
      e.preventDefault();
      // Achievements layer is framed comfortably around targetProgress ≈ 0.80
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const targetScrollY = maxScroll * 0.80;

      if (lenisInstance) {
        lenisInstance.scrollTo(targetScrollY, { duration: 2.0 });
      } else {
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
      }
      playBeep(900, 'sine', 0.12, 0.08);
    });
  }

  function init() {
    initThree();
    initLenis();
    updateScrollTarget();
    initHorizontalTabs();
    initMobileTouchScroll();
    initCursor();
    initCometTrail();
    initModals();
    initHeroCTA();
    initConstellations();
    initMinigame();
    initMagneticButtons();
    
    if (lenisInstance) lenisInstance.stop();

    runBootSequence(() => {
      if (lenisInstance) lenisInstance.start();
      requestAnimationFrame(renderLoop);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

