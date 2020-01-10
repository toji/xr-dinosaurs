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
import { XRInputRay } from './xr-input-ray.js';

import { Constants as Constants$1, fetchProfile, MotionController } from './third-party/webxr-input-profiles/packages/motion-controllers/dist/motion-controllers.module.js';

class ControllerNode extends THREE.Object3D {
  constructor() {
    super();

    this._ray = null;
    this._envMap = null;

    // BIG TODO: Currently Three.js only interacts with the targetRaySpace,
    // which means the controllers handles won't be in the right place. Need to
    // get the transform from the targetRaySpace to the gripSpace (maybe per-frame?)
    // and apply that to the glTF mesh to have everything line up correctly.
    // (Rays will still be positioned at the targetRaySpace, obviously.)
  }

  get rayVisible() {
    return this._ray ? this._ray.visible : false;
  }

  set rayVisible(value) {
    // Build the selection ray if this is the first time it's been requested.
    if (value && !this._ray) {
      this._ray = new XRInputRay();
      this.add(this._ray);
    } else if (this._ray) {
      this._ray.visible = value;
    }
  }

  set envMap(value) {
    this._envMap = value;
    this.traverse((child) => {
      if (child.isMesh) {
        child.material.envMap = value;
        child.material.needsUpdate = true;
      }
    });
  }

  get envMap() {
    return this._envMap;
  }

  clear() {
    if (this.rootNode) {
      this.remove(this.rootNode);
    }

    this.isMock = undefined;
    this.asset = null;
    this.rootNode = null;
    this.nodes = null;
    this.motionController = null;
    this.loaded = false;
  }

  async load(motionController, gltfLoader) {
    this.clear();
    this.motionController = motionController;
    try {
      this.asset = await new Promise(((resolve, reject) => {
        gltfLoader.load(
          this.motionController.assetUrl,
          (loadedAsset) => { resolve(loadedAsset); },
          null,
          () => { reject(new Error(`Asset ${this.motionController.assetUrl} missing or malformed.`)); }
        );
      }));

      this.rootNode = this.asset.scene;
      if (this._envMap) {
        this.rootNode.traverse((child) => {
          if (child.isMesh) {
            child.material.envMap = this._envMap;
            child.material.needsUpdate = true;
          }
        });
      }
      this.findNodes();
      this.addTouchDots();

      // Set the new model
      this.add(this.rootNode);
      this.loaded = true;
    } catch (error) {
      this.clear();
      console.error(error.message);
      throw error;
    }
  }

  addTouchDots() {
    Object.keys(this.motionController.components).forEach((componentId) => {
      const component = this.motionController.components[componentId];
      // Find the touchpads
      if (component.type === Constants$1.ComponentType.TOUCHPAD) {
        // Find the node to attach the touch dot.
        const touchPointRoot = this.rootNode.getObjectByName(component.touchPointNodeName, true);
        if (!touchPointRoot) {
          console.error(`Could not find touch dot, ${component.touchPointNodeName}, in touchpad component ${componentId}`);
        } else {
          const sphereGeometry = new THREE.SphereGeometry(0.001);
          const material = new THREE.MeshBasicMaterial({ color: 0x0000FF });
          const sphere = new THREE.Mesh(sphereGeometry, material);
          touchPointRoot.add(sphere);
        }
      }
    });
  }

  /**
   * @description Walks the model's tree to find the nodes needed to animate the components and
   * saves them for use in the frame loop
   */
  findNodes() {
    const nodes = {};

    // Loop through the components and find the nodes needed for each components' visual responses
    Object.values(this.motionController.components).forEach((component) => {
      const { touchPointNodeName, visualResponses } = component;
      if (touchPointNodeName) {
        nodes[touchPointNodeName] = this.rootNode.getObjectByName(touchPointNodeName);
      }

      // Loop through all the visual responses to be applied to this component
      Object.values(visualResponses).forEach((visualResponse) => {
        const {
          valueNodeName, minNodeName, maxNodeName, valueNodeProperty
        } = visualResponse;
        // If animating a transform, find the two nodes to be interpolated between.
        if (valueNodeProperty === Constants$1.VisualResponseProperty.TRANSFORM) {
          nodes[minNodeName] = this.rootNode.getObjectByName(minNodeName);
          nodes[maxNodeName] = this.rootNode.getObjectByName(maxNodeName);

          // If the extents cannot be found, skip this animation
          if (!nodes[minNodeName]) {
            console.error(`Could not find ${minNodeName} in the model`);
            return;
          }
          if (!nodes[maxNodeName]) {
            console.error(`Could not find ${maxNodeName} in the model`);
            return;
          }
        }

        // If the target node cannot be found, skip this animation
        nodes[valueNodeName] = this.rootNode.getObjectByName(valueNodeName);
        if (!nodes[valueNodeName]) {
          console.error(`Could not find ${valueNodeName} in the model`);
        }
      });
    });

    this.nodes = nodes;
  }

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
}

export class XRControllerModelLoader {
  constructor(gltfLoader, profilesRootPath) {
    this._gltfLoader = gltfLoader;
    this._profilesRootPath = profilesRootPath;
  }

  getControllerModel(controller) {
    let controllerModel = new ControllerNode();

    controller.addEventListener('connected', (event) => {
      const xrInputSource = event.data;
      fetchProfile(xrInputSource, this._profilesRootPath).then(({profile, assetPath}) => {
        const motionController = new MotionController(
          xrInputSource,
          profile,
          assetPath
        );
        
        this._gltfLoader.setPath('');
        controllerModel.load(motionController, this._gltfLoader);
      });
    });

    controller.addEventListener('disconnected', (event) => {
      controllerModel.clear();
    });

    return controllerModel;
  }
}