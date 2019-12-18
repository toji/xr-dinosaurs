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
import { DRACOLoader } from './third-party/three.js/examples/jsm/loaders/DRACOLoader.js';

const DEFAULT_POSITION = [0, 0, -3];
const DEFAULT_ORIENTATION = Math.PI * 0.2;
const DEFAULT_ANIMATION_SEQUENCE = ['Idle'];

// The models we're using here have an incredibly annoying issue where
// many of the animations start with several seconds of "empty" keyframes.
// (Just the default pose.) This really should be fixed in the models
// themselves, but seeing as how I've been having issues with various
// importers/exporters I instead wrote up this quick utility to trim off
// all the dead space at the beginning of each track. It's not pretty, but
// it works for now.
function trimEmptyLeadingKeyframes(animation) {
  let firstTime = animation.tracks[0].times[0];
  if (firstTime <= 0) { return; }
  for (let track of animation.tracks) {
    let firstTrackTime = track.times[0];
    if (firstTime > firstTrackTime) {
      firstTime = firstTrackTime;
      if (firstTime <= 0) {
        return;
      }
    }
  }
  
  // If the animation start time was greater than zero adjust all
  // track times (and the animation duration) to re-root the animation
  // at 0.
  animation.duration -= firstTime;
  for (let track of animation.tracks) {
    for (let i = 0; i < track.times.length; ++i) {
      track.times[i] -= firstTime;
    }
  }
}

export class XRDinosaurManager {
  constructor(gltfLoader) {
    this._gltfLoader = gltfLoader;
    this._definitions = {};
    this._currentDefinition = null;
    this._currentDinosaur = null;

    this._loadedDinosaurs = {};
  }

  set definitions(value) {
    this._definitions = value;
  }

  get definitions() {
    return this._definitions;
  }

  load(key) {
    let definition = this._definitions[key];
    if (!definition) {
      return Promise.reject(new Error('Invalid key'));
    }
    if (definition == this._currentDefinition) {
      // Don't waste time doing duplicate loads
      Promise.resolve(this._currentDinosaur);
    }
    if (this._loadedDinosaurs[key]) {
      // Load from cache when we can
      this._currentDefinition = definition;
      this._currentDinosaur = this._loadedDinosaurs[key];
      return Promise.resolve(this._currentDinosaur);
    }
    if (definition.compressed && !this._gltfLoader.dracoLoader) {
      let dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('js/third-party/three.js/examples/js/libs/draco/gltf/');
      this._gltfLoader.setDRACOLoader(dracoLoader);
    }
    return new Promise((resolve, reject) => {
      this._currentDefinition = definition;

      this._gltfLoader.setPath(definition.path);
      let fileName = definition.file || 'scene.gltf';
      this._gltfLoader.load(fileName, (gltf) => {
        if (definition != this._currentDefinition) {
          reject(new Error('Load was preempted.'));
          return;
        } else {
          this._currentDinosaur = new XRDinosaur(definition, gltf);
          this._loadedDinosaurs[key] = this._currentDinosaur;
          resolve(this._currentDinosaur);
        }
      });
    });
  }

  get currentDinosaur() {
    return this._currentDinosaur;
  }
}

class XRDinosaur extends THREE.Object3D {
  constructor(definition, gltf) {
    super();

    this._definition = definition;
    this._scared = false;

    // Scale to a more realistic size in meters
    let bbox = new THREE.Box3().setFromObject(gltf.scene);
    let modelScale = definition.height / (bbox.max.y - bbox.min.y);
    gltf.scene.children[0].scale.multiplyScalar(modelScale);

    // Recalculate the new, scaled bounds
    bbox = new THREE.Box3().setFromObject(gltf.scene);
    this._center = new THREE.Vector3();
    bbox.getCenter(this._center);

    // Position feet on the ground
    gltf.scene.position.fromArray(definition.position || DEFAULT_POSITION);
    gltf.scene.position.y -= bbox.min.y;
    gltf.scene.rotation.y = definition.orientation || DEFAULT_ORIENTATION;

    this._center.add(gltf.scene.position);

    this.add(gltf.scene);

    // Find nodes that will cast blob shadows
    this._shadowNodes = [];
    gltf.scene.traverse((child) => {
      if (definition.shadowNodes &&
          definition.shadowNodes.includes(child.name)) {
        this._shadowNodes.push(child);
      }
    });

    // Process animations
    this._mixer = new THREE.AnimationMixer(gltf.scene);

    let animations = gltf.animations;
    this._actions = {};
    for (let i = 0; i < animations.length; ++i) {
      let animation = animations[i];
      trimEmptyLeadingKeyframes(animation);
      let action = this._mixer.clipAction(animation);
      this._actions[animation.name] = action;
      if (animation.name == 'Die' || animation.name == 'Get_Up') {
        action.loop = THREE.LoopOnce;
      }
    }

    // Set up the animation sequence
    let animationIndex = 0;
    let animationSequence = definition.animationSequence || DEFAULT_ANIMATION_SEQUENCE;
    this._currentAction = this._actions[animationSequence[0]];
    this._currentAction.play();

    let nextAnimation = (e) => {
      if (e.action == this._actions.Die) {
        this._mixer.stopAllAction();
        this._scared = false;
        this._currentAction = this._actions.Get_Up;
        this._currentAction.play();
      } else if (!this._scared) {
        this._mixer.stopAllAction();
        animationIndex = ++animationIndex % animationSequence.length;
        this._currentAction = this._actions[animationSequence[animationIndex]];
        this._currentAction.play();
      }
    }
    this._mixer.addEventListener('loop', nextAnimation);
    this._mixer.addEventListener('finished', nextAnimation);
  }

  get definition() {
    return this._definition;
  }

  set envMap(value) {
    this.traverse((child) => {
      if (child.isMesh) {
        child.material.envMap = value;
      }
    });
  }

  scare() {
    if (this._scared) { return; }
    this._scared = true;

    this._currentAction.crossFadeTo(this._actions.Die, 0.25);
    this._currentAction = this._actions.Die;
    this._actions.Die.play();
  }

  get shadowNodes() {
    return this._shadowNodes;
  }

  update(delta) {
    if (this._mixer) {
      this._mixer.update(delta);
    }
  }

  get center() {
    return this._center;
  }
}