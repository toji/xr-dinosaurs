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

import { BlobShadowManager } from './blob-shadow-manager.js';
import { PenEnvironment } from './pen-environment.js';
import { XRButtonManager } from './xr-button.js';
import { XRDinosaurLoader } from './dinosaurs/xr-dinosaur-loader.js';
import { XRInputCursorManager } from './xr-input-cursor.js';
import { XRInputRay } from './xr-input-ray.js';
import { XRTeleportGuide, XRLocomotionManager } from './xr-teleport.js';
import { XRLighting } from './xr-lighting.js';
import { XRStats } from './xr-stats.js';

// Third Party Imports
import * as THREE from './third-party/three.js/build/three.module.js';
import { DRACOLoader } from './third-party/three.js/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from './third-party/three.js/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './third-party/three.js/examples/jsm/controls/OrbitControls.js';
import { XRControllerModelFactory } from './third-party/three.js/examples/jsm/webxr/XRControllerModelFactory.js';

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

let preloadPromise, appRunning = false;
let stats, controls;
let camera, cameraGroup, scene, renderer;
let viewerProxy;
let gltfLoader;
let xrDinosaurLoader, xrDinosaur;
let blobShadowManager;
let cursorManager;
let environment;
let controllers = [];
let buttonManager, buttonGroup, targetButtonGroupHeight;
let xrSession, xrMode;
let xrControllerModelFactory;
let placementMode = false;
let dinosaurScale = 1;
let hitTestSource;
let xrLighting;
let stateCallback = null;

let textureLoader = new THREE.TextureLoader();
let audioLoader = new THREE.AudioLoader();
let clock = new THREE.Clock();

let listener = new THREE.AudioListener();
let ambientSounds, hornSound;

let locomotionManager;

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

  let actionFolder = gui.addFolder('Actions');
  actionFolder.add(debugSettings, 'scare');
  actionFolder.add(debugSettings, 'screenshot');
  actionFolder.add(debugSettings, 'raisePlatform');
  actionFolder.add(debugSettings, 'lowerPlatform');

  let guiRenderingFolder = gui.addFolder('Rendering Options');
  guiRenderingFolder.add(debugSettings, 'drawSkybox').onFinishChange(() => {
    if (debugSettings.drawSkybox) {
      scene.background = xrLighting.envMap;
    } else {
      scene.background = null;
    }
  });
  guiRenderingFolder.add(debugSettings, 'drawEnvironment').onFinishChange(() => {
    environment.visible = debugSettings.drawEnvironment;
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
  if (controllers.length) {
    return;
  }

  // VR controller trackings
  let inputRay = new XRInputRay();
  inputRay.scale.z = 2;

  function buildController(index) {
    let targetRay = renderer.xr.getController(index);
    let grip = renderer.xr.getControllerGrip(index);
    let model = xrControllerModelFactory.createControllerModel(grip);

    targetRay.addEventListener('connected', (event) => {
      const xrInputSource = event.data;
      targetRay.visible = xrInputSource !== 'gaze';
    });

    targetRay.add(inputRay.clone());

    grip.add(model);

    buttonManager.addController(targetRay);
    locomotionManager.watchController(targetRay);

    locomotionManager.add(targetRay);
    locomotionManager.add(grip);

    model.setEnvironmentMap(xrLighting.envMap);

    return {
      targetRay,
      grip,
      model
    };
  }

  controllers.push(buildController(0), buildController(1));
}

export function SetStateChangeCallback(callback) {
  stateCallback = callback;
}

function OnAppStateChange(state) {
  if (stateCallback) {
    stateCallback(state);
  }
}

function isValidDestination(dest) {
  // Does a really simple bounds check to ensure users can't teleport beyond the inner fence.
  return (dest.x > -25.5 && dest.x < 26 && dest.z > -35 && dest.z < 16.5);
}

export function PreloadDinosaurApp(debug = false) {
  if (preloadPromise) {
    return preloadPromise;
  }

  debugEnabled = debug;

  scene = new THREE.Scene();

  gltfLoader = new GLTFLoader();
  let dracoLoader = new DRACOLoader();
  dracoLoader.setWorkerLimit(1);
  dracoLoader.setDecoderPath('js/third-party/three.js/examples/js/libs/draco/gltf/');
  gltfLoader.setDRACOLoader(dracoLoader);

  xrDinosaurLoader = new XRDinosaurLoader(gltfLoader);
  blobShadowManager = new BlobShadowManager(textureLoader.load('media/textures/shadow.png'));
  scene.add(blobShadowManager);

  xrControllerModelFactory = new XRControllerModelFactory(gltfLoader);

  environment = new PenEnvironment(gltfLoader);
  scene.add(environment);

  buttonManager = new XRButtonManager();
  buttonGroup = new THREE.Group();
  environment.platform.add(buttonGroup);

  cursorManager = new XRInputCursorManager();
  scene.add(cursorManager);
  cursorManager.addCollider(buttonGroup);

  locomotionManager = new XRLocomotionManager({
    targetTexture: new textureLoader.load('media/textures/teleport-target.png'),
    validDestinationCallback: isValidDestination
  });
  environment.platform.add(locomotionManager);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 100);
  camera.position.set(0, 5.0, 5.0);
  camera.add(listener);
  locomotionManager.add(camera);

  viewerProxy = new THREE.Object3D();
  camera.add(viewerProxy);

  // Try to create a WebGL 2 context if we can, otherwise fall back to WebGL.
  let canvas = document.createElement('canvas');
  let gl = null;
  for (let contextType of ['webgl2', 'webgl', 'experimental-webgl']) {
    gl = canvas.getContext(contextType, { antialias: true, xrCompatible: true });
    if (gl) break;
  }

  renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  //renderer.physicallyCorrectLights = true;
  renderer.xr.enabled = true;

  xrLighting = new XRLighting(renderer);
  scene.add(xrLighting);

  window.addEventListener('resize', onWindowResize, false);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -4);
  if (!debugEnabled) {
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.49;
  }
  controls.update();

  stats = new XRStats(renderer);
  if (!debugEnabled) {
    stats.drawOrthographic = false;
  }

  renderer.xr.addEventListener('sessionstart', async () => {
    initControllers();

    if (!debugEnabled) {
      buttonGroup.visible = true;
    }

    if (stats) {
      stats.drawOrthographic = false;
      stats.scale.set(0.1, 0.1, 0.1);
      stats.position.set(0, -0.07, 0);
      stats.rotation.set(Math.PI * -0.5, Math.PI, 0);
      scene.remove(stats);
      controllers[0].grip.add(stats);
    }

    if (xrMode == 'immersive-ar') {
      // Stop rendering the environment in AR mode
      scene.background = null;
      environment.visible = false;
      buttonGroup.visible = false;

      // Lighting estimation experiement
      xrLighting.xrSession = xrSession;

      if ('requestHitTestSource' in xrSession) {
        placementMode = true;
        buttonManager.active = false;

        xrSession.addEventListener('select', () => {
          if (xrDinosaur) {
            placementMode = false;
            xrDinosaur.visible = true;
            blobShadowManager.visible = true;
          }
        });

        let viewerSpace = await xrSession.requestReferenceSpace('viewer');
        hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace });
      }
    } else {
      buttonManager.active = true;

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
    }

    OnAppStateChange({ xrSessionStarted: true });
  });

  renderer.xr.addEventListener('sessionend', () => {
    xrSession = null;
    xrMode = null;
    hitTestSource = null;
    placementMode = false;

    xrLighting.xrSession = null;

    if (xrDinosaur) {
      xrDinosaur.visible = true;
    }
    blobShadowManager.visible = true;

    // Stop ambient jungle sounds once the user exits VR.
    if (ambientSounds) {
      ambientSounds.stop();
    }

    if (!debugEnabled) {
      buttonGroup.visible = false;
    }
    environment.resetPlatform();

    if (stats && debugEnabled) {
      stats.drawOrthographic = true;
    }

    environment.visible = debugSettings.drawEnvironment;
    buttonGroup.visible = debugSettings.drawButtons;

    OnAppStateChange({ xrSessionEnded: true });
  });

  xrLighting.addEventListener('envmapchange', () => {
    // When exiting AR mode we need to re-enable the environment rendering
    if (xrMode != 'immersive-ar' && debugSettings.drawSkybox) {
      scene.background = xrLighting.envMap;
    } else {
      scene.background = null;
    }

    if (xrDinosaur) {
      xrDinosaur.envMap = xrLighting.envMap;
    }

    for (let controller of controllers) {
      controller.model.setEnvironmentMap(xrLighting.envMap);
    }
  });

  preloadPromise = xrLighting.loadHDRSkybox('media/textures/equirectangular/misty_pines_2k.hdr');
  return preloadPromise;
}

export function RunDinosaurApp(container, options = {}) {
  if (!appRunning) {
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
  dinosaurScale = 1;

  if (options.xrSessionMode) {
    if (options.xrSessionMode === 'immersive-ar' && options.arScale) {
      dinosaurScale = options.arScale;
    }
    StartXRSession(options.xrSessionMode);
  }

  if (options.dinosaur) {
    loadModel(options.dinosaur);
  }
}

export function EndXRSession() {
  if (xrSession) {
    xrSession.end();
  }
}

function StartXRSession(mode) {
  if (xrSession && xrMode == mode) {
    return;
  }

  let referenceSpace = mode == 'immersive-ar' ? 'local' : 'local-floor';

  let sessionOptions = {
    requiredFeatures: [referenceSpace]
  };
  if (mode === 'immersive-ar') {
    sessionOptions.requiredFeatures.push('hit-test');
    /*sessionOptions.optionalFeatures = ['dom-overlay'],
    sessionOptions.domOverlay = { root: document.body };*/
  }

  navigator.xr.requestSession(mode, sessionOptions).then(async (session) => {
    xrSession = session;
    xrMode = mode;
    renderer.xr.setReferenceSpaceType(referenceSpace);
    renderer.xr.setSession(session);
  });
}

function buildButtons() {
  if (!debugEnabled) {
    buttonGroup.visible = false;
  }

  buttonGroup.position.y = targetButtonGroupHeight = 0.6;
  buttonGroup.position.z = -0.9;
  buttonGroup.rotation.x = Math.PI * 0.3;

  let x = LEFT_BUTTON_X;
  let y = 0;
  let z = -BUTTON_SPACING * 0.5;
  let idx = 0;
  for (let i in xrDinosaurLoader.allDinosaurs) {
    let dino = xrDinosaurLoader.allDinosaurs[i];
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
  });
  let glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
  glassMesh.position.y = -0.05;
  buttonGroup.add(glassMesh);
}

function loadModel(key) {
  if (xrDinosaur) {
    scene.remove(xrDinosaur);
    xrDinosaur = null;
    blobShadowManager.shadowNodes = [];
  }

  return xrDinosaurLoader.load(key).then((dinosaur) => {
    if (dinosaur != xrDinosaurLoader.currentDinosaur) { return; }

    if (xrDinosaur) {
      scene.remove(xrDinosaur);
      xrDinosaur = null;
    }

    xrDinosaur = dinosaur;
    xrDinosaur.envMap = xrLighting.envMap;
    xrDinosaur.visible = debugSettings.drawDinosaur;
    xrDinosaur.scale.setScalar(dinosaurScale, dinosaurScale, dinosaurScale);

    scene.add(xrDinosaur);

    controls.target.copy(xrDinosaur.center);
    controls.update();

    blobShadowManager.shadowNodes = xrDinosaur.shadowNodes;
    blobShadowManager.shadowSize = xrDinosaur.shadowSize * dinosaurScale;

    OnAppStateChange({ dinosaur: key });
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

//let frameId = 0;

function render(time, xrFrame) {
  let delta = clock.getDelta();

  if (xrDinosaur) {
    if (placementMode && hitTestSource) {
      let pose = null;
      let hitTestResults = xrFrame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        pose = hitTestResults[0].getPose(renderer.xr.getReferenceSpace());
      }

      if (pose) {
        xrDinosaur.visible = true;
        blobShadowManager.visible = true;
        xrDinosaur.position.copy(pose.transform.position);
        blobShadowManager.position.y = pose.transform.position.y;
      } else {
        xrDinosaur.visible = false;
        blobShadowManager.visible = false;
      }
    } else if(debugSettings.animate) {
      xrDinosaur.update(delta);
    }
  }

  if (xrMode != 'immersive-ar') {
    environment.update(delta);

    // Update the button height to always stay within a reasonable range of the user's head
    /*if (renderer.xr.isPresenting && buttonGroup) {
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
    }*/

    buttonManager.update(delta);
  }

  if (controllers.length) {
    cursorManager.update([controllers[0].targetRay, controllers[1].targetRay]);
  }

  locomotionManager.update(renderer, camera);

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