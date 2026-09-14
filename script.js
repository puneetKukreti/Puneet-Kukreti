
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
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function updateScrollTarget() {
    const scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));
  }

  function renderLoop() {
    if (lenisInstance) lenisInstance.raf(Date.now());

    // Smooth, cinematic camera deceleration (slower, softer, deliberate pacing)
    currentProgress += (targetProgress - currentProgress) * 0.035;

    const targetCamX = mouseX * 300;
    const targetCamY = mouseY * 300;
    currentCamX += (targetCamX - currentCamX) * 0.05;
    currentCamY += (targetCamY - currentCamY) * 0.05;

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
        item.el.style.pointerEvents = dist < 1800 ? 'auto' : 'none';
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
          duration: 1.8,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 0.38,
          touchMultiplier: 0.65,
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

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
          e.stopPropagation();
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');

          if (items[index]) {
            const gridLeft = grid.getBoundingClientRect().left;
            const itemLeft = items[index].getBoundingClientRect().left;
            const scrollOffset = itemLeft - gridLeft + grid.scrollLeft - (grid.clientWidth - items[index].clientWidth) / 2;
            grid.scrollTo({ left: scrollOffset, behavior: 'smooth' });
          }
        });
      });

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
    }

    setupTabGroup('skills-tabs', 'skills-grid', 'skill-node');
    setupTabGroup('achieve-tabs', 'achieve-grid', 'achieve-card');
  }

  function init() {
    initThree();
    initLenis();
    updateScrollTarget();
    initHorizontalTabs();
    
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

