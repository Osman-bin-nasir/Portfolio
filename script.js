import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

// ----- Scene Setup -----
const scene = new THREE.Scene();
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const canvas = document.getElementById('draw');
const fixedWidth = window.innerWidth;
const fixedHeight = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, fixedWidth / fixedHeight, 0.1, 1000);
camera.position.set(8, 9, 2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(fixedWidth, fixedHeight);

// ----- Cube Creation -----
const faceColors = [0xff8c00, 0xdc143c, 0x1e90ff, 0x32cd32, 0xffff00, 0xffffff];

function createFaceMaterials() {
  return Array(6).fill().map(() => new THREE.MeshBasicMaterial({ color: 0x000000 }));
}

function createRoundedStickerGeometry() {
  const width = 0.8, height = 0.8, radius = 0.1;
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return new THREE.ShapeGeometry(shape);
}

function addSticker(subCube, face, color) {
  const sticker = new THREE.Mesh(
    createRoundedStickerGeometry(),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  );
  switch (face) {
    case 'right':  sticker.position.set(0.501, 0, 0); sticker.rotation.y =  Math.PI / 2; break;
    case 'left':   sticker.position.set(-0.501, 0, 0); sticker.rotation.y = -Math.PI / 2; break;
    case 'top':    sticker.position.set(0, 0.501, 0);  sticker.rotation.x = -Math.PI / 2; break;
    case 'bottom': sticker.position.set(0, -0.501, 0); sticker.rotation.x =  Math.PI / 2; break;
    case 'front':  sticker.position.set(0, 0, 0.501);  break;
    case 'back':   sticker.position.set(0, 0, -0.501); sticker.rotation.y =  Math.PI; break;
  }
  subCube.add(sticker);
}

// Build Rubik's Cube
const spacing = 1.025;
const cubes = [];
for (let x = 0; x < 3; x++) {
  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) {
      const subCube = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        createFaceMaterials()
      );
      subCube.position.set((x - 1) * spacing, (y - 1) * spacing, (z - 1) * spacing);
      if (x === 0) addSticker(subCube, 'left', faceColors[1]);
      if (x === 2) addSticker(subCube, 'right', faceColors[0]);
      if (y === 0) addSticker(subCube, 'bottom', faceColors[3]);
      if (y === 2) addSticker(subCube, 'top', faceColors[2]);
      if (z === 0) addSticker(subCube, 'back', faceColors[5]);
      if (z === 2) addSticker(subCube, 'front', faceColors[4]);
      cubes.push(subCube);
      scene.add(subCube);
    }
  }
}

// ----- State & Controls -----
let rotatingGroup = null, rotationAxis = null, rotationSpeed = 0, remainingAngle = 0;
const rotationQueue = [];
let scrambleMoves = [], isShuffled = false;
let solved = false;
let zoomOut = false;
let scaleFactor = 1;
let heroCubeInitialized = false;

// Audio
const shuffleSound = document.getElementById('shuffleSound');
const solveSound = document.getElementById('solveSound');
const zoomSound = document.getElementById('zoomSound');

// UI Elements
const hint = document.getElementById('hint');
const overlay = document.getElementById('cube-overlay');
const mainSite = document.getElementById('main-site');

// Sections for navigation
const sections = ['about', 'projects', 'tech', 'contact', 'home'];
let currentSectionIndex = -1;

// ----- Hover Hint -----
setTimeout(() => hint.classList.add('show'), 3000);

// ----- Scramble & Solve with Sound -----
function scrambleCube() {
  shuffleSound.play();
  scrambleMoves = [];
  const axes = ['x', 'y', 'z'], idxs = [-spacing, 0, spacing];
  for (let i = 0; i < 20; i++) {
    const axis = axes[Math.floor(Math.random() * 3)];
    const idx = idxs[Math.floor(Math.random() * 3)];
    const ang = Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
    rotationQueue.push({ axis, index: idx, angle: ang });
    scrambleMoves.push({ axis, index: idx, angle: ang });
  }
  isShuffled = true;
}

function solveCube() {
  solveSound.play();
  const solution = scrambleMoves.slice().reverse().map(m => ({
    axis: m.axis, index: m.index, angle: -m.angle
  }));
  rotationQueue.push(...solution);
  isShuffled = false;
}

// ----- Click Handler for Intro Cube -----
window.addEventListener('click', (e) => {
  if (!isShuffled) {
    scrambleCube();
    return;
  }
  if (solved) return;
  
  solved = true;
  solveCube();

  document.getElementById('scramble-text').classList.add('hide');
  document.getElementById('solve-text').classList.remove('hide');
  hint.classList.remove('show');

  setTimeout(() => {
    zoomSound.play();
    overlay.classList.add('dim');
    zoomOut = true;
  }, 5000);
});

// ----- Click Handler for Hero Cube -----
function handleCubeClick() {
  currentSectionIndex = (currentSectionIndex + 1) % sections.length;
  const nextSection = sections[currentSectionIndex];
  if (nextSection === 'home') {
    solveHeroCube();
  } else {
    scrambleHeroCube();
  }
  document.getElementById(nextSection).scrollIntoView({ behavior: 'smooth' });
}

function getLayerCubes(axis, index) {
  return cubes.filter(c => Math.abs(c.position[axis] - index) < 0.01);
}

function rotateLayer(axis, index, angle) {
  if (rotatingGroup) return;
  const layer = getLayerCubes(axis, index);
  rotatingGroup = new THREE.Group();
  layer.forEach(c => { scene.attach(c); rotatingGroup.add(c); });
  scene.add(rotatingGroup);
  rotationAxis = new THREE.Vector3(
    axis === 'x' ? 1 : 0,
    axis === 'y' ? 1 : 0,
    axis === 'z' ? 1 : 0
  );
  remainingAngle = angle;
  rotationSpeed = angle / 20;
}

function performRotation() {
  const step = Math.sign(remainingAngle) * Math.min(Math.abs(rotationSpeed), Math.abs(remainingAngle));
  rotatingGroup.rotateOnAxis(rotationAxis, step);
  remainingAngle -= step;
  if (Math.abs(remainingAngle) < 0.001) {
    rotatingGroup.children.slice().forEach(c => {
      scene.attach(c);
      scene.add(c);
    });
    scene.remove(rotatingGroup);
    rotatingGroup = null;
  }
}

let introAnimationActive = true;

function animate() {
  if (!introAnimationActive) {
    return;
  }
  requestAnimationFrame(animate);

  scene.rotation.x += 0.005;
  scene.rotation.y += 0.003;

  if (rotatingGroup) {
    performRotation();
  } else if (rotationQueue.length) {
    const { axis, index, angle } = rotationQueue.shift();
    rotateLayer(axis, index, angle);
  }

  if (zoomOut) {
    scaleFactor += 0.01;
    scene.scale.set(scaleFactor, scaleFactor, scaleFactor);
    ambientLight.intensity = Math.max(0, ambientLight.intensity - 0.005);
    pointLight.intensity = Math.max(0, pointLight.intensity - 0.005);

    if (scaleFactor > 3) {
      if (overlay.style.display !== 'none') {
        overlay.style.display = 'none';
        mainSite.classList.remove('hidden');
        document.body.style.overflow = 'auto';

        if (!heroCubeInitialized) {
          initHeroCube();
          heroCubeInitialized = true;
        }
        window.dispatchEvent(new Event('resize'));
      }
      introAnimationActive = false;
    }
  }

  if (overlay.style.display !== 'none') {
    renderer.render(scene, camera);
  }
}

function initHeroCube() {
  const heroCanvas = document.getElementById('heroCanvas');
  const w = heroCanvas.clientWidth;
  const h = heroCanvas.clientHeight;

  const heroScene = new THREE.Scene();
  const heroCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  heroCamera.position.set(8, 9, 10);
  heroCamera.lookAt(-3, 0, 0);

  const heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true });
  heroRenderer.setSize(w, h);

  heroScene.add(new THREE.AmbientLight(0xffffff, 1));
  const heroLight = new THREE.PointLight(0xffffff, 0.5);
  heroLight.position.set(5, 5, 5);
  heroScene.add(heroLight);

  const heroSpacing = 1.025;
  const heroCubes = [];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        const subCube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          createFaceMaterials()
        );
        subCube.position.set((x - 1) * heroSpacing, (y - 1) * heroSpacing, (z - 1) * heroSpacing);
        if (x === 0) addSticker(subCube, 'left', faceColors[1]);
        if (x === 2) addSticker(subCube, 'right', faceColors[0]);
        if (y === 0) addSticker(subCube, 'bottom', faceColors[3]);
        if (y === 2) addSticker(subCube, 'top', faceColors[2]);
        if (z === 0) addSticker(subCube, 'back', faceColors[5]);
        if (z === 2) addSticker(subCube, 'front', faceColors[4]);
        heroCubes.push(subCube);
        heroScene.add(subCube);
      }
    }
  }

  let heroRotatingGroup = null;
  let heroRotationAxis = null;
  let heroRotationSpeed = 0;
  let heroRemainingAngle = 0;
  let heroRotationQueue = [];
  let heroScrambleMoves = [];

  window.scrambleHeroCube = function() {
    shuffleSound.play();
    heroScrambleMoves = [];
    const axes = ['x', 'y', 'z'];
    const idxs = [-heroSpacing, 0, heroSpacing];
    for (let i = 0; i < 3; i++) {
      const axis = axes[Math.floor(Math.random() * 3)];
      const idx = idxs[Math.floor(Math.random() * 3)];
      const ang = Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
      heroRotationQueue.push({ axis, index: idx, angle: ang });
      heroScrambleMoves.push({ axis, index: idx, angle: ang });
    }
  };

  window.solveHeroCube = function() {
    solveSound.play();
    const solution = heroScrambleMoves.slice().reverse().map(m => ({
      axis: m.axis, index: m.index, angle: -m.angle
    }));
    heroRotationQueue.push(...solution);
  };

  function getHeroLayerCubes(axis, index) {
    return heroCubes.filter(c => Math.abs(c.position[axis] - index) < 0.01);
  }

  function rotateHeroLayer(axis, index, angle) {
    if (heroRotatingGroup) return;
    const layer = getHeroLayerCubes(axis, index);
    heroRotatingGroup = new THREE.Group();
    layer.forEach(c => { heroScene.attach(c); heroRotatingGroup.add(c); });
    heroScene.add(heroRotatingGroup);
    heroRotationAxis = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );
    heroRemainingAngle = angle;
    heroRotationSpeed = angle / 20;
  }

  function performHeroRotation() {
    const step = Math.sign(heroRemainingAngle) * Math.min(Math.abs(heroRotationSpeed), Math.abs(heroRemainingAngle));
    heroRotatingGroup.rotateOnAxis(heroRotationAxis, step);
    heroRemainingAngle -= step;
    if (Math.abs(heroRemainingAngle) < 0.001) {
      heroRotatingGroup.children.slice().forEach(c => {
        heroScene.attach(c);
        heroScene.add(c);
      });
      heroScene.remove(heroRotatingGroup);
      heroRotatingGroup = null;
    }
  }

  window.addEventListener('resize', () => {
    const ww = heroCanvas.clientWidth;
    const hh = heroCanvas.clientHeight;
    heroCamera.aspect = ww / hh;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(ww, hh);
  });

  (function animateHero() {
    requestAnimationFrame(animateHero);
    heroScene.rotation.x += 0.005;
    heroScene.rotation.y += 0.003;
    if (heroRotatingGroup) {
      performHeroRotation();
    } else if (heroRotationQueue.length) {
      const { axis, index, angle } = heroRotationQueue.shift();
      rotateHeroLayer(axis, index, angle);
    }
    heroRenderer.render(heroScene, heroCamera);
  })();

  heroCanvas.addEventListener('click', handleCubeClick);
}


// Initialization
scrambleCube();
animate();

// Scroll handling
window.addEventListener("scroll", () => {
  const canvas = document.querySelector("#draw");
  canvas.classList.toggle("hide-cube", window.scrollY > 100);
  document.getElementById("scrollTopBtn").style.display =
    window.scrollY > 300 ? "block" : "none";
});

document.getElementById("scrollTopBtn").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Flip-card effect
document.addEventListener("DOMContentLoaded", () => {
  const toggleImg = document.querySelector('.toggle-img');
  toggleImg.addEventListener('click', () => {
    toggleImg.classList.toggle('flipped');
  });
});

document.addEventListener("DOMContentLoaded", function() {
  // Theme management
  const body = document.body;
  
  // Set initial theme
  if (!body.getAttribute('data-theme')) {
    body.setAttribute('data-theme', 'dark');
  }
  
  // Toggle theme function
  function toggleTheme() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Add transition class for smooth theme change
    body.classList.add('theme-transition');
    
    // Change theme
    body.setAttribute('data-theme', newTheme);
    
    // Store preference in localStorage (optional)
    localStorage.setItem('preferred-theme', newTheme);
    
    // Remove transition class after animation
    setTimeout(() => {
      body.classList.remove('theme-transition');
    }, 500);
    
    // Optional: Play a subtle sound effect
    playThemeToggleSound();
  }
  
  // Load saved theme preference
  function loadThemePreference() {
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme && savedTheme !== body.getAttribute('data-theme')) {
      body.setAttribute('data-theme', savedTheme);
    }
  }
  
  // Optional: Add subtle sound effect for theme toggle
  function playThemeToggleSound() {
    // Create a subtle click sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }
  
  // Enhance existing profile picture click handler
  const existingToggleImg = document.querySelector('.toggle-img');
  if (existingToggleImg) {
    // Remove existing click listener and add enhanced one
    const newToggleImg = existingToggleImg.cloneNode(true);
    existingToggleImg.parentNode.replaceChild(newToggleImg, existingToggleImg);
    
    newToggleImg.addEventListener('click', function(e) {
      // First, handle the existing flip animation
      newToggleImg.classList.toggle('flipped');
      
      // Then, toggle the theme after a short delay
      setTimeout(() => {
        toggleTheme();
      }, 300);
    });
  }
  
  // Optional: Add keyboard shortcut (Ctrl/Cmd + Shift + T)
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      toggleTheme();
    }
  });
  
  // Initialize theme icon and load preferences
  updateThemeIcon();
  loadThemePreference();
  
  // Optional: Add theme indicator click functionality
  const themeIndicator = document.getElementById('theme-indicator');
  if (themeIndicator) {
    themeIndicator.addEventListener('click', toggleTheme);
    themeIndicator.style.cursor = 'pointer';
    themeIndicator.title = 'Toggle theme (or click profile picture)';
  }
  
  // Add smooth transition class to CSS
  const style = document.createElement('style');
  style.textContent = `
    .theme-transition * {
      transition: background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease !important;
    }
  `;
  document.head.appendChild(style);
});