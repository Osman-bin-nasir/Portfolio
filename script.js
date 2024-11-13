const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 10;

const canvas = document.querySelector("#draw");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const faceColors = [
    0xff8c00, // orange
    0xdc143c, // red
    0x1e90ff, // blue
    0x32cd32, // green
    0xffff00, // yellow
    0xffffff  // white
];


function createFaceMaterials() {
    return faceColors.map(color => new THREE.MeshBasicMaterial({ color }));
}

const cubeSize = 1;
const spacing = 1.025; 
const halfGridSize = (3 * spacing - spacing) / 2;

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
            const subCubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const subCubeMaterials = createFaceMaterials();
            const subCube = new THREE.Mesh(subCubeGeometry, subCubeMaterials);

            subCube.position.set(
                (x - 1) * spacing,
                (y - 1) * spacing,
                (z - 1) * spacing
            );

            scene.add(subCube);
        }
    }
}
scene.position.x = -5;

function animate() {
    requestAnimationFrame(animate);
    scene.rotation.x += 0.01;
    scene.rotation.y += 0.01;
    renderer.render(scene, camera);
}

animate();
