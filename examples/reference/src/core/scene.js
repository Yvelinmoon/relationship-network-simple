import * as THREE from "../../vendor/three/three.module.js";
import { OrbitControls } from "../../vendor/three/OrbitControls.js";
import { CSS2DRenderer } from "../../vendor/three/CSS2DRenderer.js";

export function createScene(root) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.background = "transparent";
  root.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.className = "label-layer";
  root.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const backgroundTexture = new THREE.TextureLoader().load("./assets/harry-potter-dark-bg.webp");
  if (THREE.SRGBColorSpace) {
    backgroundTexture.colorSpace = THREE.SRGBColorSpace;
  }
  scene.background = backgroundTexture;
  scene.fog = new THREE.Fog(0x09060a, 1200, 3400);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 5200);
  camera.position.set(-540, 780, 540);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 360;
  controls.maxDistance = 3000;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: -1,
  };
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.28;
  controls.target.set(0, 20, 0);

  scene.add(new THREE.AmbientLight(0xe7d9bc, 1.1));

  const keyLight = new THREE.PointLight(0xd7b16a, 22000, 0, 2);
  keyLight.position.set(220, 260, 340);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x2a5b3d, 13000, 0, 2);
  rimLight.position.set(-280, -150, -240);
  scene.add(rimLight);

  const curseLight = new THREE.PointLight(0x7a2134, 11000, 0, 2);
  curseLight.position.set(320, -120, 260);
  scene.add(curseLight);

  const graphRoot = new THREE.Group();
  graphRoot.rotation.x = -Math.PI / 2;
  scene.add(graphRoot);

  const zoneGroup = new THREE.Group();
  const haloGroup = new THREE.Group();
  const edgeGroup = new THREE.Group();
  const nodeGroup = new THREE.Group();
  const labelGroup = new THREE.Group();
  graphRoot.add(zoneGroup, edgeGroup, haloGroup, nodeGroup, labelGroup);

  const raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 12;

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function render() {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  return {
    THREE,
    scene,
    graphRoot,
    camera,
    renderer,
    labelRenderer,
    controls,
    zoneGroup,
    haloGroup,
    edgeGroup,
    nodeGroup,
    labelGroup,
    raycaster,
    resize,
    render,
  };
}
