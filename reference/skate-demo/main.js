import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let skateboard = new THREE.Group();

let boardModels = {};
let boltsMesh = null;
let trucksMesh = null;
let wheelGroups = {};
let activeWheels = [];
let currentWheelType = '';
let wheelSpinVelocity = 0;
let targetCamPos = null;
let targetCamLook = null;
let boardModelRoot = null;

const BOARD_CONFIG = [
  { id: 'abstract', label: 'Abstract' },
  { id: 'clash', label: 'Clash' },
  { id: 'moon', label: 'Moon' },
  { id: 'neonpalmtree', label: 'Synth Wave' },
  { id: 'ogre', label: 'Ogre' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'tiedye', label: 'Tie-dye' },
  { id: 'syndicateBLACK', label: 'Black Syndicate' },
  { id: 'syndicateBLUE', label: 'Blue Syndicate' },
  { id: 'syndicateGREEN', label: 'Green Syndicate' },
  { id: 'syndicatePURPLE', label: 'Purple Syndicate' },
  { id: 'syndicateRED', label: 'Red Syndicate' },
  { id: 'syndicateWHITE', label: 'White Syndicate' },
  { id: 'syndicateYELLOW', label: 'Yellow Syndicate' }
];

init();
animate();

function init() {
  const container = document.getElementById('canvas-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);


  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 5000);

  camera.position.set(-200, 250, 400);


  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false;

  controls.minDistance = 20;
  controls.maxDistance = 600;
  controls.enablePan = true;


  controls.target.set(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight2.position.set(-5, 0, -5);
  scene.add(dirLight2);

  const dirLight3 = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight3.position.set(0, -5, 0);
  scene.add(dirLight3);

  scene.add(skateboard);

  loadModels();

  window.addEventListener('resize', onWindowResize);
  setupUI();
}

function loadModels() {
  const loader = new GLTFLoader();

  let loadedCount = 0;
  const totalModels = 2;

  const checkLoad = () => {
    loadedCount++;
    if (loadedCount === totalModels) {
      document.getElementById('loader').style.opacity = '0';
      setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
      }, 500);

      const box = new THREE.Box3().setFromObject(skateboard);
      const center = box.getCenter(new THREE.Vector3());
      skateboard.position.x += (skateboard.position.x - center.x);
      skateboard.position.y += (skateboard.position.y - center.y);
      skateboard.position.z += (skateboard.position.z - center.z);


      updateConfiguration();
    }
  };


  loader.load('/board.glb', (gltf) => {
    const boardModel = gltf.scene;


    boardModel.traverse((child) => {
      if (child.isMesh) {
        if (!child.material.isCloned) {
          child.material = child.material.clone();
          child.material.isCloned = true;
        }
      }
    });

    boardModelRoot = boardModel;

    boardModel.traverse((child) => {
      const childNameLower = child.name.toLowerCase();

      let isBoardPart = false;
      BOARD_CONFIG.forEach(board => {
        const boardIdLower = board.id.toLowerCase();
        if (childNameLower === boardIdLower || childNameLower.includes(boardIdLower)) {
          boardModels[board.id] = child;
          isBoardPart = true;
          console.log(`Mapped board: ${board.id} to hierarchy object: ${child.name}`);
        }
      });

      if (isBoardPart && child.isMesh) {
        const nameLower = child.name.toLowerCase();
        const isGrip = nameLower.includes('grip') || nameLower.includes('tape') || nameLower.includes('top') || nameLower.includes('sand');

        if (isGrip) {
          child.material.roughness = 0.95;
          child.material.metalness = 0.0;
          if (child.material.clearcoat !== undefined) {
            child.material.clearcoat = 0.0;
          }
        } else {
          child.material.roughness = 0.15;
          child.material.metalness = 0.25;

          if (child.material.type === 'MeshPhysicalMaterial' || child.material.clearcoat !== undefined) {
            child.material.clearcoat = 1.0;
            child.material.clearcoatRoughness = 0.1;
          }
        }
      }
    });

    const boltsObj = boardModel.getObjectByName('Bolts') || boardModel.getObjectByName('bolts');
    const trucksObj = boardModel.getObjectByName('Trucks') || boardModel.getObjectByName('trucks');

    if (boltsObj) boltsMesh = boltsObj;
    if (trucksObj) trucksMesh = trucksObj;

    skateboard.add(boardModel);
    checkLoad();
  }, undefined, (error) => {
    console.error('Error loading board.glb:', error);
  });

  loader.load('/wheels.glb', (gltf) => {
    const wheelsScene = gltf.scene;

    const wheelNames = [
      'bbBLUE', 'bbGREEN', 'bbPURPLE', 'bbRED', 'bbWHITE', 'bbYELLOW',
      'eyeBLUE', 'eyeGREEN', 'eyePURPLE', 'eyeRED', 'eyeWHITE', 'eyeYELLOW',
      'starBLUE', 'starGREEN', 'starPURPLE', 'starRED', 'starWHITE', 'starYELLOW'
    ];

    wheelNames.forEach(name => {
      wheelGroups[name] = [];
      const w1 = wheelsScene.getObjectByName(`${name}1`);
      const w2 = wheelsScene.getObjectByName(`${name}2`);
      if (w1) wheelGroups[name].push(centerPivotAndReturn(w1));
      if (w2) wheelGroups[name].push(centerPivotAndReturn(w2));
    });

    skateboard.add(wheelsScene);
    checkLoad();
  }, undefined, (error) => {
    console.error('Error loading wheels.glb:', error);
  });
}

function centerPivotAndReturn(obj) {
  if (!obj) return null;

  obj.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);

  const pivot = new THREE.Group();
  const parent = obj.parent;

  if (parent) {
    parent.worldToLocal(center);
    pivot.position.copy(center);
    parent.add(pivot);

    pivot.attach(obj);
  }

  return pivot;
}

function updateMaterialColor(object, hexColorStr, isMetallic = false) {
  if (!object) return;

  let processedColor = hexColorStr;
  if (processedColor.startsWith('#') && processedColor.length === 9) {
    processedColor = processedColor.substring(0, 7);
  }

  object.traverse((child) => {
    if (child.isMesh) {
      child.material.color.set(processedColor);
      if (isMetallic) {
        child.material.metalness = 0.95;
        child.material.roughness = 0.15;
      }
    }
  });
}

function updateConfiguration(e) {
  const selectedBoard = document.querySelector('input[name="board"]:checked').value;
  const boltsColor = document.querySelector('input[name="bolts_color"]:checked').value;
  const trucksColor = document.querySelector('input[name="trucks_color"]:checked').value;
  const selectedWheel = document.querySelector('input[name="wheel_type"]:checked').value;

  if (e && e.target) {
    const name = e.target.name;

    if (name === 'board') {
      targetCamLook = new THREE.Vector3(0.0, 0.0, 0.0);
      targetCamPos = new THREE.Vector3(-18.3, -509.0, -21.9);
      camera.up.set(0, 1, 0);
    } else if (name === 'bolts_color' && boltsMesh) {
      targetCamLook = new THREE.Vector3(-14.4, 36.8, -135.2);
      targetCamPos = new THREE.Vector3(-226.3, 182.7, -39.5);
      camera.up.set(0, 1, 0);
    } else if (name === 'trucks_color' && trucksMesh) {
      targetCamLook = new THREE.Vector3(-30.3, 35.6, 84.4);
      targetCamPos = new THREE.Vector3(256.1, -128.0, 248.5);
      camera.up.set(0, 1, 0);
    } else if (name === 'wheel_type' && activeWheels.length > 0) {
      targetCamLook = new THREE.Vector3(15.5, 14.3, -85.6);
      targetCamPos = new THREE.Vector3(-154.8, -13.6, -204.9);
      camera.up.set(0, 1, 0);
    }
  }

  if (boardModelRoot) {
    boardModelRoot.traverse((child) => {
      if (child.isMesh) {
        let isCorePart = false;
        child.traverseAncestors((ancestor) => {
          if (ancestor === boltsMesh || ancestor === trucksMesh) isCorePart = true;
        });
        if (child === boltsMesh || child === trucksMesh) isCorePart = true;

        if (!isCorePart) {
          child.visible = false;
        }
      }
    });
  }

  const activeBoardObj = boardModels[selectedBoard];
  if (activeBoardObj) {
    activeBoardObj.visible = true;
    activeBoardObj.traverse((child) => {
      if (child.isMesh) child.visible = true;
    });
  }

  updateMaterialColor(boltsMesh, boltsColor, true);
  updateMaterialColor(trucksMesh, trucksColor, true);

  activeWheels = [];
  Object.keys(wheelGroups).forEach(key => {
    const isVisible = (key === selectedWheel);
    wheelGroups[key].forEach(w => {
      w.visible = isVisible;
      if (isVisible) activeWheels.push(w);
    });
  });

  if (currentWheelType !== selectedWheel) {
    if (currentWheelType !== '') {
      wheelSpinVelocity = 0.8;
    }
    currentWheelType = selectedWheel;
  }
}

function getCenter(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

function setupUI() {
  const inputs = document.querySelectorAll('input[type="radio"]');
  inputs.forEach(input => {
    input.addEventListener('change', (e) => updateConfiguration(e));
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (targetCamPos && targetCamLook) {
    controls.enabled = false;
    camera.position.lerp(targetCamPos, 0.04);
    controls.target.lerp(targetCamLook, 0.04);

    if (camera.position.distanceTo(targetCamPos) < 3.0) {
      targetCamPos = null;
      targetCamLook = null;
      controls.enabled = true;
    }
  }

  controls.update();

  if (wheelSpinVelocity > 0.001) {
    activeWheels.forEach(w => {
      w.rotation.x += wheelSpinVelocity;
    });
    wheelSpinVelocity *= 0.92;
  } else {
    wheelSpinVelocity = 0;
  }


  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', () => {
  const uiPanel = document.getElementById('ui-panel');
  const closeBtn = document.getElementById('close-sidebar');
  const openBtn = document.getElementById('open-sidebar');

  if (closeBtn && openBtn && uiPanel) {
    closeBtn.addEventListener('click', () => {
      uiPanel.classList.add('collapsed');
      openBtn.classList.add('visible');
    });

    openBtn.addEventListener('click', () => {
      uiPanel.classList.remove('collapsed');
      openBtn.classList.remove('visible');
    });
  }
});
