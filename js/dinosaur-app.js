// Copyright 2019 Brandon Jones
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { HDRSkybox } from './hdr-skybox.js';
import { BlobShadowManager } from './blob-shadow-manager.js';
import { Dinosaurs } from './dinosaurs.js';
import { XRButtonManager } from './xr-button.js';
import { XRDinosaurManager } from './xr-dinosaur.js';
import { XRInputCursorManager } from './xr-input-cursor.js';
import { XRInputRay } from './xr-input-ray.js';
import { XRStats } from './xr-stats.js';

// Third Party Imports
import * as THREE from './third-party/three.js/build/three.module.js';
import { DRACOLoader } from './third-party/three.js/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from './third-party/three.js/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './third-party/three.js/examples/jsm/controls/OrbitControls.js';
import { VRButton } from './third-party/three.js/examples/jsm/webxr/VRButton.js';
import { PenEnvironment } from './pen-environment.js';

// VR Button Layout
const ROW_LENGTH = 4;
const BUTTON_SPACING = 0.25;
const LEFT_BUTTON_X = (BUTTON_SPACING * (ROW_LENGTH - 1) * -0.5);

const HORN_BUTTON_POSITION = new THREE.Vector3(0.65, 0, 0);
const UP_BUTTON_POSITION = new THREE.Vector3(-0.65, 0, -BUTTON_SPACING * 0.5);
const DOWN_BUTTON_POSITION = new THREE.Vector3(-0.65, 0, BUTTON_SPACING * 0.5);

const IDEAL_RELATIVE_BUTTON_HEIGHT = -0.6;
const MIN_BUTTON_HEIGHT = 0.3;
const MAX_BUTTON_HEIGHT = 1.1;
const BUTTON_HEIGHT_DEADZONE = 0.15;

let preloadPromise, vrButton, appRunning = false;
let container, stats, controls;
let camera, scene, renderer;
let viewerProxy;
let gltfLoader;
let xrDinosaurManager, xrDinosaur;
let blobShadowManager;
let cursorManager;
let environment;
let controller0, controller1;
let skybox, envMap;
let buttonManager, buttonGroup, targetButtonGroupHeight;

let textureLoader = new THREE.TextureLoader();
let audioLoader = new THREE.AudioLoader();
let clock = new THREE.Clock();

let listener = new THREE.AudioListener();
let ambientSounds, hornSound;

let screenshotList;
let takeScreenshot = false;

let debugEnabled = false;
let debugSettings = {
  drawSkybox: true,
  drawEnvironment: true,
  drawDinosaur: true,
  drawShadows: true,
  drawButtons: true,
  animate: true,

  dinosaur: 'ankylosaurus',
  screenshot: () => { screenshot(); },
  scare: () => { scare(); },
  raisePlatform: () => { environment.raisePlatform(); },
  lowerPlatform: () => { environment.lowerPlatform(); }
};

function screenshot() {
  if (!screenshotList) {
    screenshotList = document.createElement('div');
    screenshotList.classList.add('screenshot-list');
    document.body.appendChild(screenshotList);
  }
  takeScreenshot = true;
}

function initDebugUI() {
  let gui = new dat.GUI();

  let dinoList = {};
  for (let dino in Dinosaurs) {
    dinoList[Dinosaurs[dino].name] = dino;
  }

  gui.add(debugSettings, 'dinosaur', dinoList).onFinishChange(() => {
    loadModel(debugSettings.dinosaur);
  });
  gui.add(debugSettings, 'scare');
  gui.add(debugSettings, 'screenshot');
  gui.add(debugSettings, 'raisePlatform');
  gui.add(debugSettings, 'lowerPlatform');

  let guiRenderingFolder = gui.addFolder('Rendering Options');
  guiRenderingFolder.add(debugSettings, 'drawSkybox').onFinishChange(() => {
    if (debugSettings.drawSkybox) {
      scene.background = skybox;
    } else {
      scene.background = null;
    }
  });
  guiRenderingFolder.add(debugSettings, 'drawEnvironment').onFinishChange(() => {
    environment.scene.visible = debugSettings.drawEnvironment;
  });
  guiRenderingFolder.add(debugSettings, 'drawDinosaur').onFinishChange(() => {
    xrDinosaur.visible = debugSettings.drawDinosaur;
  });
  guiRenderingFolder.add(debugSettings, 'drawShadows').onFinishChange(() => {
    blobShadowManager.visible = debugSettings.drawShadows;
  });
  guiRenderingFolder.add(debugSettings, 'drawButtons').onFinishChange(() => {
    buttonGroup.visible = debugSettings.drawButtons;
  });
  guiRenderingFolder.add(debugSettings, 'animate');

  document.body.appendChild(gui.domElement);
}

function initControllers() {
  if (controller0) {
    return;
  }

  // VR controller trackings
  function updateControllerVisualization(controller, inputSource) {
    let showRay = inputSource &&
                  inputSource.targetRayMode == 'tracked-pointer';
    controller.userData.inputRay.visible = showRay;
  }

  let inputRay = new XRInputRay();
  inputRay.scale.z = 2;

  controller0 = renderer.xr.getController(0);
  controller0.userData.inputRay = inputRay.clone();
  controller0.add(controller0.userData.inputRay);
  updateControllerVisualization(controller0, null);
  controller0.addEventListener('connected', (event) => {
    updateControllerVisualization(controller0, event.data);
  });
  buttonManager.addController(controller0);
  environment.platform.add(controller0);

  controller1 = renderer.xr.getController(1);
  controller1.userData.inputRay = inputRay.clone();
  controller1.add(controller1.userData.inputRay);
  updateControllerVisualization(controller1);
  controller0.addEventListener('connected', (event) => {
    updateControllerVisualization(controller1, event.data);
  });
  buttonManager.addController(controller1);
  environment.platform.add(controller1);

  gltfLoader.setPath('media/models/controller/');
  gltfLoader.load('controller.gltf', (gltf) => { controller0.add(gltf.scene); });
  gltfLoader.load('controller-left.gltf', (gltf) => { controller1.add(gltf.scene); });
}

export function PreloadDinosaurApp(debug = false) {
  if (preloadPromise) {
    return preloadPromise;
  }

  debugEnabled = debug;

  container = document.createElement('div');

  scene = new THREE.Scene();

  gltfLoader = new GLTFLoader();
  let dracoLoader = new DRACOLoader();
  dracoLoader.setWorkerLimit(1);
  dracoLoader.setDecoderPath('js/third-party/three.js/examples/js/libs/draco/gltf/');
  gltfLoader.setDRACOLoader(dracoLoader);

  xrDinosaurManager = new XRDinosaurManager(gltfLoader);
  xrDinosaurManager.definitions = Dinosaurs;
  blobShadowManager = new BlobShadowManager(textureLoader.load('media/textures/shadow.png'));
  scene.add(blobShadowManager);

  environment = new PenEnvironment(gltfLoader);
  scene.add(environment);

  buttonManager = new XRButtonManager();
  buttonGroup = new THREE.Group();
  environment.platform.add(buttonGroup);

  cursorManager = new XRInputCursorManager();
  scene.add(cursorManager);
  cursorManager.addCollider(buttonGroup);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 100);
  camera.position.set(0, 5.0, 5.0);
  camera.add(listener);
  environment.platform.add(camera);

  viewerProxy = new THREE.Object3D();
  camera.add(viewerProxy);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  //renderer.physicallyCorrectLights = true;
  renderer.xr.enabled = true;

  window.addEventListener('resize', onWindowResize, false);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -4);
  if (!debugEnabled) {
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.49;
  }
  controls.update();

  let light = new THREE.HemisphereLight(0xFFFFFF, 0x448844);
  light.position.set(1, 1, 1);
  scene.add(light);

  if (debugEnabled) {
    stats = new XRStats(renderer);
  }

  vrButton = VRButton.createButton(renderer);
  if (!debugEnabled) {
    vrButton.style.top = vrButton.style.bottom;
    vrButton.style.bottom = '';
  }
  container.appendChild(vrButton);

  renderer.xr.addEventListener('sessionstart', () => {
    initControllers();

    buttonGroup.visible = true;

    if (stats) {
      stats.drawOrthographic = false;
      stats.scale.set(0.1, 0.1, 0.1);
      stats.position.set(0, -0.07, 0);
      stats.rotation.set(Math.PI * -0.5, Math.PI, 0);
      scene.remove(stats);
      controller0.add(stats);
    }

    // Load and play ambient jungle sounds once the user enters VR.
    if (!ambientSounds) {
      ambientSounds = new THREE.Audio(listener);
      audioLoader.load('media/sounds/jungle-ambient.mp3', (buffer) => {
        ambientSounds.setBuffer(buffer);
        ambientSounds.setLoop(true);
        ambientSounds.setVolume(0.5);
        ambientSounds.play();
      });
    } else {
      ambientSounds.play();
    }
  });

  renderer.xr.addEventListener('sessionend', () => {
    // Stop ambient jungle sounds once the user exits VR.
    if (ambientSounds) {
      ambientSounds.stop();
    }

    if (!debugEnabled) {
      buttonGroup.visible = false;
    }
    environment.resetPlatform();

    if (stats) {
      stats.drawOrthographic = true;
    }
  });

  skybox = new HDRSkybox(renderer, 'media/textures/equirectangular/', 'misty_pines_2k.hdr');
  preloadPromise = skybox.getEnvMap().then((texture) => {
    envMap = texture;
    scene.background = envMap;
    return loadModel(debugSettings.dinosaur);
  });

  return preloadPromise;
}

export function RunDinosaurApp(xrSessionMode = null) {
  if (!appRunning) {
    // Hide the landing page.
    let landingPage = document.getElementById('landingPage');
    landingPage.style.display = 'none';

    // Ensure the app content has been loaded (will early terminate if already
    // called).
    PreloadDinosaurApp();

    // Build out some final bits of UI
    if (debugEnabled) {
      initDebugUI();
    }

    buildButtons();

    // Attach the main WebGL canvas and supporting UI to the page
    container.appendChild(renderer.domElement);
    document.body.appendChild(container);

    // Start the render loop
    renderer.setAnimationLoop(render);

    appRunning = true;
  }

  // If the app was requested to start up immediately into a given XR session
  // mode, do so now.
  if (xrSessionMode) {
    vrButton.onclick();
  }
}

function buildButtons() {
  if (!debugEnabled) {
    buttonGroup.visible = false;
  }

  buttonGroup.position.y = targetButtonGroupHeight = 0.6;
  buttonGroup.position.z = -0.9;
  buttonGroup.rotation.x = Math.PI * 0.3;

  let domButtonGroup = document.createElement('div');
  domButtonGroup.classList.add('xr-button-group');

  let x = LEFT_BUTTON_X;
  let y = 0;
  let z = -BUTTON_SPACING * 0.5;
  let idx = 0;
  for (let i in Dinosaurs) {
    let dino = Dinosaurs[i];
    if (dino.debugOnly) { continue; }

    let button = buttonManager.createButton({
      imageUrl: `media/textures/button-atlas.png`,
      imageOffset: dino.buttonAtlasOffset ? dino.buttonAtlasOffset : [0, 0],
      title: dino.name,
      onClick: () => {
        loadModel(i);
      },
    });
    button.position.set(x, y, z);
    idx++;
    if (idx % ROW_LENGTH == 0) {
      x = LEFT_BUTTON_X;
      z += BUTTON_SPACING;
    } else {
      x += BUTTON_SPACING;
    }
    buttonGroup.add(button);

    if (!debugEnabled) {
      domButtonGroup.appendChild(button.domElement);
    }
  }

  if (!debugEnabled) {
    document.body.appendChild(domButtonGroup);
  }

  let hornButton = buttonManager.createButton({
    imageUrl: `media/textures/button-atlas.png`,
    imageOffset: [0.75, 0.5],
    title: "Airhorn",
    onClick: () => {
      scare();
    },
  });
  hornButton.scale.multiplyScalar(1.1);
  hornButton.position.copy(HORN_BUTTON_POSITION);
  buttonGroup.add(hornButton);

  let upButton = buttonManager.createButton({
    imageUrl: `media/textures/button-atlas.png`,
    imageOffset: [0.25, 0.5],
    title: "Raise Platform",
    onClick: () => {
      environment.raisePlatform();
    },
  });
  upButton.position.copy(UP_BUTTON_POSITION);
  buttonGroup.add(upButton);

  let downButton = buttonManager.createButton({
    imageUrl: `media/textures/button-atlas.png`,
    imageOffset: [0.5, 0.5],
    title: "Lower Platform",
    onClick: () => {
      environment.lowerPlatform();
    },
  });
  downButton.position.copy(DOWN_BUTTON_POSITION);
  buttonGroup.add(downButton);

  // "Glass" pedestal
  let glassGeometry = new THREE.BoxBufferGeometry(1.6, 0.05, 0.5);
  let glassMaterial = new THREE.MeshLambertMaterial({
    color: 0xAACCFF,
    transparent: true,
    opacity: 0.3,
    /*envMap: envMap,
    roughness: 0.1,
    metalness: 0.0*/
  });
  let glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  glassMesh.position.y = -0.05;
  buttonGroup.add(glassMesh);
}

function updateUrl() {
  // Turns out this is causing a bug on Oculus browser, so I'm disabling
  // it for now. Navigating to a bookmarked dinosaur will still work.
  /*let hashString = `#dinosaur=${debugSettings.dinosaur}`;
  if (debugEnabled) { hashString += '&debug=1'; }

  window.location.hash = hashString;*/
}

function loadModel(key) {
  debugSettings.dinosaur = key;
  updateUrl();

  if (xrDinosaur) {
    scene.remove(xrDinosaur);
    xrDinosaur = null;
    blobShadowManager.shadowNodes = [];
  }

  return xrDinosaurManager.load(key).then((dinosaur) => {
    if (xrDinosaur) {
      scene.remove(xrDinosaur);
      xrDinosaur = null;
    }

    xrDinosaur = dinosaur;
    xrDinosaur.visible = debugSettings.drawDinosaur;
    xrDinosaur.envMap = envMap;
    scene.add(xrDinosaur);

    controls.target.copy(xrDinosaur.center);
    controls.update();

    blobShadowManager.shadowNodes = xrDinosaur.shadowNodes;
    blobShadowManager.shadowSize = xrDinosaur.definition.shadowSize;
  }).catch((err) => {
    // This will usually happen if a new dino is selected before the
    // previous one finishes loading. Not a cause for concern.
    console.log(err);
  });
}

function scare() {
  if (!hornSound) {
    audioLoader.load('media/sounds/horn.mp3', (buffer) => {
      hornSound = new THREE.Audio(listener);
      hornSound.setBuffer(buffer);
      scare();
    });
  } else {
    hornSound.play();
    if (xrDinosaur) { xrDinosaur.scare(); }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
  let delta = clock.getDelta();
  if(xrDinosaur && debugSettings.animate) {
    xrDinosaur.update(delta);
    blobShadowManager.update();
  }

  environment.update(delta);

  // Update the button height to always stay within a reasonable range of the user's head
  if (renderer.xr.isPresenting && buttonGroup) {
    let worldPosition = new THREE.Vector3();
    viewerProxy.getWorldPosition(worldPosition);

    let idealPosition = Math.max(MIN_BUTTON_HEIGHT,
                        Math.min(MAX_BUTTON_HEIGHT,
                                 (worldPosition.y - environment.platform.position.y) + IDEAL_RELATIVE_BUTTON_HEIGHT));
    if (Math.abs(idealPosition - buttonGroup.position.y) > BUTTON_HEIGHT_DEADZONE) {
      targetButtonGroupHeight = idealPosition;
    }

    // Ease into the target position
    buttonGroup.position.y += (targetButtonGroupHeight - buttonGroup.position.y) * 0.05;
  }

  buttonManager.update(delta);
  cursorManager.update([controller0, controller1]);

  if (takeScreenshot) {
    renderer.setPixelRatio(window.devicePixelRatio * 2);
  }

  renderer.render(scene, camera);

  if (takeScreenshot) {
    let img = new Image();
    img.src = renderer.domElement.toDataURL();
    img.classList.add('screenshot');
    screenshotList.appendChild(img);
    renderer.setPixelRatio(window.devicePixelRatio);
    takeScreenshot = false;
  }

  if (stats) { stats.update(); }
}