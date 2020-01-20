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

import * as THREE from './third-party/three.js/build/three.module.js';

import { Constants as Constants$1, fetchProfile, MotionController } from 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/motion-controllers@0.1.0/dist/motion-controllers.module.js'
//import { Constants as Constants$1, fetchProfile, MotionController } from './third-party/webxr-input-profiles/packages/motion-controllers/dist/motion-controllers.module.js';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@0.1.0/dist/profiles'

class ControllerModel extends THREE.Object3D {
  constructor() {
    super();
    this.xrInputSource = null;
    this.motionController = null;
    this.asset = null;
    this.rootNode = null;
    this.nodes = {};
    this.loaded = false;
    this.envMap = null;
  }

  async initialize(motionController, gltfLoader) {
    if (this.motionController && this.motionController != motionController) {
      this.reset();
    }
    this.motionController = motionController;
    this.xrInputSource = this.motionController.xrInputSource;

    // Fetch the assets and generate threejs objects for it
    this.asset = await new Promise(((resolve, reject) => {
      gltfLoader.load(
        motionController.assetUrl,
        (loadedAsset) => { resolve(loadedAsset); },
        null,
        () => { reject(new Error(`Asset ${motionController.assetUrl} missing or malformed.`)); }
      );
    }));

    if (this.envMap) {
      this.asset.scene.traverse((child) => {
        if (child.isMesh) {
          child.material.envMap = this.envMap;
        }
      });
    }

    this.rootNode = this.asset.scene;
    this.addTouchDots();
    this.findNodes();
    this.add(this.rootNode);
    this.loaded = true;
  }

  reset() {
    this.motionController = null;
    this.xrInputSource = null;
    this.nodes = {};
    this.asset = null;

    if (this.rootNode) {
      this.remove(this.rootNode);
      this.rootNode = null;
    }

    this.loaded = false;
  }

  setEnvironmentMap(envMap) {
    if (this.envMap == envMap) {
      return;
    }

    this.envMap = envMap;
    this.traverse((child) => {
      if (child.isMesh) {
        child.material.envMap = this.envMap;
        child.material.needsUpdate = true;
      }
    });
  }

  /**
   * Polls data from the XRInputSource and updates the model's components to match
   * the real world data
   */
  updateMatrixWorld(force) {
    super.updateMatrixWorld(force);

    if (!this.loaded) {
      return;
    }

    // Cause the MotionController to poll the Gamepad for data
    this.motionController.updateFromGamepad();

    // Update the 3D model to reflect the button, thumbstick, and touchpad state
    Object.values(this.motionController.components).forEach((component) => {
      // Update node data based on the visual responses' current states
      Object.values(component.visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, value, valueNodeProperty
        } = visualResponse;
        const valueNode = this.nodes[valueNodeName];

        // Skip if the visual response node is not found. No error is needed,
        // because it will have been reported at load time.
        if (!valueNode) return;

        // Calculate the new properties based on the weight supplied
        if (valueNodeProperty === Constants$1.VisualResponseProperty.VISIBILITY) {
          valueNode.visible = value;
        } else if (valueNodeProperty === Constants$1.VisualResponseProperty.TRANSFORM) {
          const minNode = this.nodes[minNodeName];
          const maxNode = this.nodes[maxNodeName];
          THREE.Quaternion.slerp(
            minNode.quaternion,
            maxNode.quaternion,
            valueNode.quaternion,
            value
          );

          valueNode.position.lerpVectors(
            minNode.position,
            maxNode.position,
            value
          );
        }
      });
    });
  }

  /**
   * Walks the model's tree to find the nodes needed to animate the components and
   * saves them for use in the frame loop
   */
  findNodes() {
    this.nodes = {};

    // Loop through the components and find the nodes needed for each components' visual responses
    Object.values(this.motionController.components).forEach((component) => {
      const { touchPointNodeName, visualResponses } = component;
      if (touchPointNodeName) {
        this.nodes[touchPointNodeName] = this.rootNode.getObjectByName(touchPointNodeName);
      }

      // Loop through all the visual responses to be applied to this component
      Object.values(visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, valueNodeProperty
        } = visualResponse;
        // If animating a transform, find the two nodes to be interpolated between.
        if (valueNodeProperty === Constants$1.VisualResponseProperty.TRANSFORM) {
          this.nodes[minNodeName] = this.rootNode.getObjectByName(minNodeName);
          this.nodes[maxNodeName] = this.rootNode.getObjectByName(maxNodeName);

          // If the extents cannot be found, skip this animation
          if (!this.nodes[minNodeName]) {
            console.warn(`Could not find ${minNodeName} in the model`);
            return;
          }
          if (!this.nodes[maxNodeName]) {
            console.warn(`Could not find ${maxNodeName} in the model`);
            return;
          }
        }

        // If the target node cannot be found, skip this animation
        this.nodes[valueNodeName] = this.rootNode.getObjectByName(valueNodeName);
        if (!this.nodes[valueNodeName]) {
          console.warn(`Could not find ${valueNodeName} in the model`);
        }
      });
    });
  }

  /**
   * Add touch dots to all touchpad components so the finger can be seen
   */
  addTouchDots() {
    Object.keys(this.motionController.components).forEach((componentId) => {
      const component = this.motionController.components[componentId];
      // Find the touchpads
      if (component.type === Constants$1.ComponentType.TOUCHPAD) {
        // Find the node to attach the touch dot.
        const touchPointRoot = this.rootNode.getObjectByName(component.touchPointNodeName, true);
        if (!touchPointRoot) {
          console.warn(`Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${componentId}`);
        } else {
          const sphereGeometry = new THREE.SphereGeometry(0.001);
          const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
          const sphere = new THREE.Mesh(sphereGeometry, material);
          touchPointRoot.add(sphere);
        }
      }
    });
  }
}

export class XRControllerModelLoader {
  constructor(gltfLoader, profilesRootPath = DEFAULT_PROFILES_PATH) {
    this._gltfLoader = gltfLoader;
    this._profilesRootPath = profilesRootPath;
  }

  getControllerModel(controller) {
    let controllerModel = new ControllerModel();

    controller.addEventListener('connected', (event) => {
      const xrInputSource = event.data;
      fetchProfile(xrInputSource, this._profilesRootPath).then(({profile, assetPath}) => {
        const motionController = new MotionController(
          xrInputSource,
          profile,
          assetPath
        );
        
        this._gltfLoader.setPath('');
        controllerModel.initialize(motionController, this._gltfLoader);
      }).catch((err) => {
        console.warn(err);
      });
    });

    controller.addEventListener('disconnected', (event) => {
      controllerModel.reset();
    });

    return controllerModel;
  }
}