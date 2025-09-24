// ✅ ONLY CDN imports, no "three"
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, globe, controls;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    (window.innerWidth - 250) / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 3);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("globeCanvas"),
    antialias: true
  });
  renderer.setSize(window.innerWidth - 250, window.innerHeight);

  controls = new OrbitControls(camera, renderer.domElement);

  // Globe sphere
  const geometry = new THREE.SphereGeometry(1, 64, 64);
  const material = new THREE.MeshPhongMaterial({
    color: 0x0077ff,
    shininess: 10
  });
  globe = new THREE.Mesh(geometry, material);
  scene.add(globe);

  // Lights
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 3, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x404040));

  // Handle window resize
  window.addEventListener("resize", () => {
    camera.aspect = (window.innerWidth - 250) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 250, window.innerHeight);
  });

  // Sidebar controls
  document.getElementById("globeColor").addEventListener("input", e => {
    globe.material.color.set(e.target.value);
  });

  document.getElementById("toggleHeatmap").addEventListener("click", () => {
    globe.material.wireframe = !globe.material.wireframe;
  });

  document.getElementById("densitySlider").addEventListener("input", e => {
    const scale = e.target.value / 50; // 1 at midpoint
    globe.scale.set(scale, scale, scale);
  });
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
