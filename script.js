
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
      { id: 'layer-ring', z: -4400 },
      { id: 'layer-pitch', z: -8900 },
      { id: 'layer-decade', z: -14000 },
      { id: 'layer-numbers', z: -19100 },
      { id: 'layer-cases', z: -23900 },
      { id: 'layer-contact', z: -28100 }
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

    currentProgress += (targetProgress - currentProgress) * 0.08;

    const targetCamX = mouseX * 300;
    const targetCamY = mouseY * 300;
    currentCamX += (targetCamX - currentCamX) * 0.05;
    currentCamY += (targetCamY - currentCamY) * 0.05;

    const startZ = 2000;
    const endZ = -28000;
    const camZ = startZ + currentProgress * (endZ - startZ);

    camera.position.x = currentCamX;
    camera.position.y = currentCamY;
    camera.position.z = camZ;

    // Update active section HUD label based on camera depth
    let currentSection = "INTRO";
    if (camZ < -26000) currentSection = "CONTACT";
    else if (camZ < -21500) currentSection = "HIGHLIGHTS";
    else if (camZ < -16500) currentSection = "METRICS";
    else if (camZ < -11500) currentSection = "EXPERIENCE";
    else if (camZ < -6500) currentSection = "BIO";

    const sectionLabel = document.getElementById('section-name');
    if (sectionLabel && sectionLabel.textContent !== currentSection) {
      sectionLabel.textContent = currentSection;
    }

    const ringObj = objects.find(o => o.config.id === 'layer-ring');
    if (ringObj) {
      ringObj.obj.rotation.x = 65 * Math.PI / 180;
      ringObj.obj.rotation.y = 15 * Math.PI / 180;
      ringObj.obj.rotation.z = currentProgress * 8;
    }
    
    // Parallax hero elements
    const heroObj = objects.find(o => o.config.id === 'layer-hero');
    if (heroObj && currentProgress < 0.2) {
       const heroTextCol = document.getElementById('hero-text-col');
       const heroPortraitCol = document.getElementById('hero-portrait-col');
       if (heroTextCol) heroTextCol.style.transform = `translateX(${-currentProgress * 1000}px)`;
       if (heroPortraitCol) heroPortraitCol.style.transform = `translateX(${currentProgress * 1000}px)`;
    }

    objects.forEach(item => {
      const distBehind = item.obj.position.z - camera.position.z;
      
      if (distBehind > 500) {
        // Object is behind the camera -> fully hidden
        item.el.style.opacity = '0';
        item.el.style.visibility = 'hidden';
        item.el.style.pointerEvents = 'none';
      } else if (distBehind > 0) {
        // Object is actively passing behind camera -> fade out smoothly
        const fadeOut = Math.max(0, 1 - (distBehind / 500));
        item.el.style.opacity = fadeOut.toFixed(3);
        item.el.style.visibility = fadeOut > 0.01 ? 'visible' : 'hidden';
        item.el.style.pointerEvents = 'none';
      } else {
        // Object is in front of the camera (upcoming)
        const distAhead = -distBehind;
        const maxDist = 3200; // Do not show objects until camera is within this distance
        const minDist = 1800; // Full opacity when camera is this close
        
        if (distAhead > maxDist) {
          // Too far ahead -> completely hidden to prevent visual clutter/glitches
          item.el.style.opacity = '0';
          item.el.style.visibility = 'hidden';
          item.el.style.pointerEvents = 'none';
        } else if (distAhead > minDist) {
          // Approaching -> smoothly fade in
          const fadeIn = (maxDist - distAhead) / (maxDist - minDist);
          item.el.style.opacity = fadeIn.toFixed(3);
          item.el.style.visibility = 'visible';
          item.el.style.pointerEvents = 'none';
        } else {
          // In focus range -> fully visible
          item.el.style.opacity = '1';
          item.el.style.visibility = 'visible';
          item.el.style.pointerEvents = distAhead < 1500 ? 'auto' : 'none';
        }
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
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1.0,
          touchMultiplier: 1.5,
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

