
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
      { id: 'layer-ring', z: -1800 },
      { id: 'layer-pitch', z: -6200 },
      { id: 'layer-decade', z: -11000 },
      { id: 'layer-numbers', z: -15800 },
      { id: 'layer-cases', z: -20400 },
      { id: 'layer-contact', z: -24600 }
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

    // Smooth, cinematic camera deceleration (slower and softer zoom)
    currentProgress += (targetProgress - currentProgress) * 0.045;

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

    // Update active section HUD label based on compact depth
    let currentSection = "INTRO";
    if (camZ < -22500) currentSection = "CONTACT";
    else if (camZ < -18100) currentSection = "HIGHLIGHTS";
    else if (camZ < -13400) currentSection = "METRICS";
    else if (camZ < -8600) currentSection = "EXPERIENCE";
    else if (camZ < -4000) currentSection = "BIO";

    const sectionLabel = document.getElementById('section-name');
    if (sectionLabel && sectionLabel.textContent !== currentSection) {
      sectionLabel.textContent = currentSection;
    }

    // Dynamic Cosmic Snake Animation (slithering text & uncoiling out of screen)
    const ringObj = objects.find(o => o.config.id === 'layer-ring');
    const snakeText = document.getElementById('snake-text-path');

    if (ringObj) {
      // Approach phase from camZ = 1200 down to -2800
      const ringActive = Math.max(0, Math.min(1, (1200 - camZ) / 3800));

      // Continuous slithering text along the snake curve (flows forward like living scales)
      if (snakeText) {
        const slither = (currentProgress * 380 + (Date.now() * 0.016)) % 100;
        snakeText.setAttribute('startOffset', `${slither}%`);
      }

      // Slithering 3D motion: the snake undulates in S-waves and slithers diagonally out of the screen
      const snakePhase = ringActive * Math.PI * 2.2;
      ringObj.obj.position.x = Math.sin(snakePhase) * 550 + (ringActive * 1200);
      ringObj.obj.position.y = Math.cos(snakePhase) * 320 - (ringActive * 850);
      
      // Serpentine 3D body rotation
      ringObj.obj.rotation.x = (55 + Math.sin(snakePhase) * 22) * Math.PI / 180;
      ringObj.obj.rotation.y = (20 + Math.cos(snakePhase) * 25) * Math.PI / 180;
      ringObj.obj.rotation.z = (currentProgress * 7) + (Math.sin(snakePhase) * 0.5);
    }
    
    objects.forEach(item => {
      // Distance from camera to object along Z (positive = object is in front of camera)
      const dist = camera.position.z - item.obj.position.z;
      
      if (dist <= 250 && item.config.id !== 'layer-contact') {
        // Safe near-plane culling: element is too close or behind camera -> strictly hidden to prevent 100x magnification glitch
        item.el.style.opacity = '0';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (dist < 700 && item.config.id !== 'layer-contact') {
        // Exiting smoothly past camera -> clean fade out from dist=700 down to dist=250 (zero blur near lens)
        const exitAlpha = Math.max(0, (dist - 250) / 450);
        item.el.style.opacity = exitAlpha.toFixed(2);
        item.el.style.filter = 'none';
        item.el.style.visibility = exitAlpha > 0.02 ? 'visible' : 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (dist <= 1800 || (item.config.id === 'layer-contact' && dist <= 2400)) {
        // In-focus reading zone -> 100% crisp, zero blur overhead
        item.el.style.opacity = '1';
        item.el.style.filter = 'none';
        item.el.style.visibility = 'visible';
        item.el.style.pointerEvents = dist < 1400 ? 'auto' : 'none';
      } else if (dist <= 5500) {
        // Approaching in distance -> smooth depth-of-field transition (starts blurred, clarifies slowly)
        const approachProgress = (5500 - dist) / (5500 - 1800);
        const opacity = Math.pow(approachProgress, 1.25);
        // Integer blur to prevent GPU subpixel shader recompiles
        const blurPx = Math.round((1 - approachProgress) * 8);
        
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
          wheelMultiplier: 0.75,
          touchMultiplier: 1.2,
          autoResize: true,
          infinite: false
        });
        lenisInstance.on('scroll', updateScrollTarget);
      } catch (err) {}
    }
    window.addEventListener('scroll', updateScrollTarget, { passive: true });
  }

  function init() {
    initThree();
    initLenis();
    updateScrollTarget();
    
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

