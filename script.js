
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
    webglRenderer.domElement.style.zIndex = '5';
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
      { id: 'layer-numbers', z: -15500 },
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

    // Smooth, cinematic camera deceleration (slower, softer, deliberate pacing)
    currentProgress += (targetProgress - currentProgress) * 0.035;

    // Gentle, controlled hover parallax when actively moving mouse;
    // Returns smoothly to the middle (0, 0) when user stops hovering or on mobile!
    const targetCamX = isMouseHovering ? (mouseX * 45) : 0;
    const targetCamY = isMouseHovering ? (mouseY * 35) : 0;
    currentCamX += (targetCamX - currentCamX) * 0.04;
    currentCamY += (targetCamY - currentCamY) * 0.04;

    const startZ = 2000;
    const endZ = -24500;
    const camZ = startZ + currentProgress * (endZ - startZ);

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
    else if (camZ < -17800) currentSection = "ACHIEVEMENTS";
    else if (camZ < -13000) currentSection = "METRICS";
    else if (camZ < -8000) currentSection = "SKILLS";
    else if (camZ < -3200) currentSection = "BIO";

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
      
      if (dist <= 160 && item.config.id !== 'layer-contact') {
        // Safe near-plane culling: element is too close or behind camera -> strictly hidden
        item.el.style.opacity = '0';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (dist < 460 && item.config.id !== 'layer-contact') {
        // Exiting smoothly past camera -> gentle fade out from dist=460 down to dist=160
        const exitAlpha = Math.max(0, (dist - 160) / 300);
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
          touchMultiplier: 0.85,
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
          const targetScroll = Math.max(0, Math.min(maxScroll, currentScroll + deltaY * 1.3));

          if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
            lenisInstance.scrollTo(targetScroll, { immediate: true });
          } else {
            window.scrollBy(0, deltaY * 1.3);
          }
          touchStartY = currentY;
          touchStartX = currentX;
        }
      } else {
        // Touching anywhere else on mobile content or background
        if (Math.abs(deltaY) > 3) {
          const maxScroll = document.body.scrollHeight - window.innerHeight;
          const currentScroll = window.scrollY || window.pageYOffset;
          const targetScroll = Math.max(0, Math.min(maxScroll, currentScroll + deltaY * 1.25));

          if (lenisInstance && typeof lenisInstance.scrollTo === 'function') {
            lenisInstance.scrollTo(targetScroll, { immediate: true });
          } else {
            window.scrollBy(0, deltaY * 1.25);
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

  function init() {
    initThree();
    initLenis();
    updateScrollTarget();
    initHorizontalTabs();
    initMobileTouchScroll();
    
    setTimeout(() => {
      const p = document.getElementById('preloader');
      if (p) p.classList.add('fade-out');
    }, 200);

    requestAnimationFrame(renderLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

