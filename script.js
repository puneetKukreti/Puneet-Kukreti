
(function () {
  let targetProgress = 0;
  let currentProgress = 0;
  let lenisInstance;

  const stickyWrapper = document.querySelector('.sequence-sticky-wrapper');

  let scene, camera, cssRenderer, webglRenderer;
  let starMesh, warpLinesMesh;
  const objects = [];

  let mouseX = 0;
  let mouseY = 0;
  let currentCamX = 0;
  let currentCamY = 0;
  let isMouseHovering = false;
  let hoverIdleTimer = null;

  function initThree() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 40000);
    camera.position.set(0, 0, 1500);

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

    const warpGeo = new THREE.BufferGeometry();
    const warpCount = 2000;
    const warpPos = new Float32Array(warpCount * 6);
    for (let i = 0; i < warpCount * 6; i += 6) {
      const x = (Math.random() - 0.5) * 12000;
      const y = (Math.random() - 0.5) * 8000;
      const z = 2000 - Math.random() * 37000;
      warpPos[i] = x; warpPos[i+1] = y; warpPos[i+2] = z;
      warpPos[i+3] = x; warpPos[i+4] = y; warpPos[i+5] = z - 2000;
    }
    warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPos, 3));
    const warpMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0
    });
    warpLinesMesh = new THREE.LineSegments(warpGeo, warpMat);
    scene.add(warpLinesMesh);

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

    // Calculate scroll velocity
    const velocity = Math.abs(targetProgress - currentProgress);

    // Smooth, cinematic camera deceleration
    currentProgress += (targetProgress - currentProgress) * 0.035;

    // Warp Speed Effect
    if (warpLinesMesh) {
      // Base scale + velocity multiplier
      const stretch = 1 + (velocity * 2000); 
      warpLinesMesh.scale.z = stretch;
      
      // Fade in lines based on speed
      const targetOpacity = Math.min(1, velocity * 50);
      warpLinesMesh.material.opacity += (targetOpacity - warpLinesMesh.material.opacity) * 0.1;
      
      // Slightly push stars back based on stretch to avoid clipping
      warpLinesMesh.position.z = -stretch * 500;
    }

    // Gentle, controlled hover parallax when actively moving mouse;
    // Returns smoothly to the middle (0, 0) when user stops hovering or on mobile!
    const targetCamX = isMouseHovering ? (mouseX * 45) : 0;
    const targetCamY = isMouseHovering ? (mouseY * 35) : 0;
    currentCamX += (targetCamX - currentCamX) * 0.04;
    currentCamY += (targetCamY - currentCamY) * 0.04;

    checkMinigameTrigger();

    const startZ = 2000;
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
      
      const nearCullDist = item.config.id === 'layer-cases' ? 100 : 160;
      const exitFadeDist = item.config.id === 'layer-cases' ? 320 : 460;

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
  const caseStudies = {
    'case-1': {
      title: 'AI Shipment Tracking',
      meta: '01 / AUTOMATION',
      tags: ['AI Agent', 'Python', 'LLM', 'Logistics'],
      challenge: 'The client was manually reading hundreds of emails per day to track cargo container statuses, matching them to an internal tracking sheet. It was highly error-prone and consumed hours of manual labor.',
      solution: 'I developed an autonomous Python-based AI agent that securely monitors the inbox, extracts structured logistics data using a specialized LLM pipeline, and automatically updates the live status tracking sheet via the Google Sheets API.',
      impact: 'Reduced manual processing time by 95% and completely eliminated data-entry errors. The system now seamlessly handles 500+ emails daily, allowing the operations team to focus on exception handling.'
    },
    'case-2': {
      title: 'Inventory Forecasting Engine',
      meta: '02 / DATA PIPELINE',
      tags: ['Data Science', 'SQL', 'Predictive Modeling'],
      challenge: 'A retail client experienced frequent stockouts and overstock scenarios because they relied on static, backward-looking Excel spreadsheets for inventory purchasing.',
      solution: 'I built an automated data pipeline that pulled historical sales data, applied a seasonal forecasting algorithm, and generated dynamic reorder points for every SKU in their warehouse.',
      impact: 'Decreased stockouts by 40% and improved capital efficiency by reducing dead stock by 18% within the first two quarters of deployment.'
    },
    'case-3': {
      title: 'Automated Billing Portal',
      meta: '03 / WEB SYSTEM',
      tags: ['Full Stack', 'Stripe API', 'React'],
      challenge: 'The client’s accounting team was manually generating PDF invoices and chasing down unpaid accounts at the end of every month, causing severe cash flow delays.',
      solution: 'I engineered a secure, client-facing billing portal integrated directly with Stripe. The system automatically triggers invoices upon project completion and sends scheduled payment reminders.',
      impact: 'Accelerated average payment collection time from 28 days to 4 days and saved the accounting team over 20 hours per month in administrative work.'
    }
  };

  function initModals() {
    const modal = document.getElementById('case-modal');
    const closeBtn = document.getElementById('case-modal-close');
    const cards = document.querySelectorAll('.achieve-card');
    
    if (!modal || !closeBtn) return;

    cards.forEach((card, index) => {
      // Make the whole card clickable, not just the button
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
      card.addEventListener('click', (e) => {
        // Prevent default if they click the actual link/button inside
        e.preventDefault();
        const caseId = 'case-' + (index + 1);
        const data = caseStudies[caseId] || caseStudies['case-1'];
        
        document.getElementById('case-title').textContent = data.title;
        document.getElementById('case-meta').textContent = data.meta;
        document.getElementById('case-challenge').textContent = data.challenge;
        document.getElementById('case-solution').textContent = data.solution;
        document.getElementById('case-impact').textContent = data.impact;
        
        const tagsDiv = document.getElementById('case-tags');
        tagsDiv.innerHTML = '';
        data.tags.forEach(tag => {
          const span = document.createElement('span');
          span.className = 'tag-pill';
          span.textContent = tag;
          tagsDiv.appendChild(span);
        });
        
        modal.classList.remove('hidden');
        if (lenisInstance) lenisInstance.stop();
        playBeep(1200, 'triangle', 0.15, 0.1);
      });
    });

    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      if (lenisInstance) lenisInstance.start();
      playBeep(400, 'triangle', 0.15, 0.1);
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
    if (targetProgress > 0.98 && !minigameActive && minigameTimer < 10) {
      minigameActive = true;
      document.getElementById('minigame-canvas').classList.add('active');
      
      // End game after 10s
      setTimeout(() => {
        minigameActive = false;
        minigameTimer = 10;
        document.getElementById('game-over-text').style.opacity = '1';
        document.getElementById('minigame-canvas').classList.remove('active');
      }, 10000);
    }
  }

  function init() {
    initThree();
    initLenis();
    updateScrollTarget();
    initHorizontalTabs();
    initMobileTouchScroll();
    initCursor();
    initModals();
    initConstellations();
    initMinigame();
    
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

