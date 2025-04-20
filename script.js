import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;

const canvas = document.querySelector("#draw");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Face colors
const faceColors = [0xff8c00, 0xdc143c, 0x1e90ff, 0x32cd32, 0xffff00, 0xffffff];

function createFaceMaterials() {
  return Array(6).fill().map(() => new THREE.MeshBasicMaterial({ color: 0x000000 }));
}

function addSticker(subCube, face, color) {
  const sticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ color })
  );
  switch(face) {
    case 'right': sticker.position.set(0.501, 0, 0); sticker.rotation.y = Math.PI/2; break;
    case 'left':  sticker.position.set(-0.501, 0, 0); sticker.rotation.y = -Math.PI/2; break;
    case 'top':   sticker.position.set(0, 0.501, 0); sticker.rotation.x = -Math.PI/2; break;
    case 'bottom':sticker.position.set(0, -0.501, 0); sticker.rotation.x = Math.PI/2; break;
    case 'front': sticker.position.set(0, 0, 0.501); break;
    case 'back':  sticker.position.set(0, 0, -0.501); sticker.rotation.y = Math.PI; break;
  }
  subCube.add(sticker);
}

// Build cube
const spacing = 1.025;
const cubes = [];
for (let x = 0; x < 3; x++) {
  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) {
      const subCube = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        createFaceMaterials()
      );
      subCube.position.set((x-1)*spacing, (y-1)*spacing, (z-1)*spacing);
      if(x===0) addSticker(subCube,'left', faceColors[1]);
      if(x===2) addSticker(subCube,'right',faceColors[0]);
      if(y===0) addSticker(subCube,'bottom',faceColors[3]);
      if(y===2) addSticker(subCube,'top',   faceColors[2]);
      if(z===0) addSticker(subCube,'back',  faceColors[5]);
      if(z===2) addSticker(subCube,'front', faceColors[4]);
      cubes.push(subCube);
      scene.add(subCube);
    }
  }
}

// Rotation queue & scramble history
let rotatingGroup = null;
let rotationAxis = null;
let rotationSpeed = 0;
let remainingAngle = 0;
const rotationQueue = [];
let scrambleMoves = [];
let isShuffled = false;

// Raycaster for click detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Handle clicks: shuffle/solve toggle
window.addEventListener('click', (event) => {
  // Normalize mouse coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  // Check intersects with any sub-cube
  const intersects = raycaster.intersectObjects(cubes, true);
  if (intersects.length === 0) return;

  if (!isShuffled) {
    // Shuffle
    scrambleMoves = [];
    const axes = ['x','y','z'];
    const indices = [-spacing, 0, spacing];
    for (let i = 0; i < 20; i++) {
      const axis = axes[Math.floor(Math.random()*3)];
      const idx = indices[Math.floor(Math.random()*3)];
      const ang = Math.PI/2 * (Math.random() < 0.5 ? 1 : -1);
      const move = { axis, index: idx, angle: ang };
      rotationQueue.push(move);
      scrambleMoves.push(move);
    }
    isShuffled = true;
  } else {
    // Solve: reverse scrambleMoves
    const solution = scrambleMoves.slice().reverse().map(m => ({
      axis: m.axis,
      index: m.index,
      angle: -m.angle
    }));
    rotationQueue.push(...solution);
    isShuffled = false;
  }
});

// Layer selection
function getLayerCubes(axis, index) {
  return cubes.filter(c => Math.abs(c.position[axis] - index) < 0.01);
}

function rotateLayer(axis, index, angle) {
  if (rotatingGroup) return;
  const layer = getLayerCubes(axis, index);
  rotatingGroup = new THREE.Group();
  layer.forEach(c => {
    scene.attach(c);
    rotatingGroup.add(c);
  });
  scene.add(rotatingGroup);
  rotationAxis = new THREE.Vector3(
    axis==='x'?1:0,
    axis==='y'?1:0,
    axis==='z'?1:0
  );
  remainingAngle = angle;
  rotationSpeed = angle / 15;
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

// Render loop
function animate() {
  requestAnimationFrame(animate);
  if (rotatingGroup) {
    performRotation();
  } else if (rotationQueue.length) {
    const {axis,index,angle} = rotationQueue.shift();
    rotateLayer(axis,index,angle);
  } else {
    scene.rotation.x += 0.005;
    scene.rotation.y += 0.005;
  }
  renderer.render(scene, camera);
}
animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
