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

import * as THREE from '../third-party/three.js/build/three.module.js';

const DEFAULT_POSITION = [0, 0, -3];
const DEFAULT_ORIENTATION = Math.PI * 0.2;
const DEFAULT_HEIGHT = 3;
const DEFAULT_ANIMATION_SEQUENCE = ['Idle'];

export class XRDinosaur extends THREE.Object3D {
  constructor() {
    super();

    this._scared = false;
    this._center = new THREE.Vector3();
    this._shadowNodes = null;
    this._mixer = new THREE.AnimationMixer(this);
    this._actions = {};
    this._currentAction = null;
    this._envMap = null;

    // Classes that extend XRDinosaur should override these values
    this.path = '';
    this.file = 'compressed.glb';
    this.shadowNodeNames = [];
    this.shadowSize = 3;
    this.animationSequence = DEFAULT_ANIMATION_SEQUENCE;
    this.buttonAtlasOffset = [0, 0];

    this.height = DEFAULT_HEIGHT;
    this.position.fromArray(DEFAULT_POSITION);
    this.rotation.y = DEFAULT_ORIENTATION;
  }

  set animations(animations) {
    // Process animations into clips
    for (let i = 0; i < animations.length; ++i) {
      let animation = animations[i];
      let action = this._mixer.clipAction(animation);
      this._actions[animation.name] = action;
      if (animation.name == 'Die' || animation.name == 'Get_Up') {
        action.loop = THREE.LoopOnce;
      }
    }

    // Set up the animation sequence
    let animationIndex = 0;
    let animationSequence = this.animationSequence;
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

  set envMap(value) {
    this._envMap = value;
    this.traverse((child) => {
      if (child.isMesh) {
        child.material.envMap = value;
        child.material.needsUpdate = true;
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
    if (!this._shadowNodes) {
      this._shadowNodes = [];
      this.traverse((child) => {
        if (this.shadowNodeNames &&
            this.shadowNodeNames.includes(child.name)) {
          this._shadowNodes.push(child);
        }
      });
    }
    return this._shadowNodes;
  }

  update(delta) {
    if (this._mixer) {
      this._mixer.update(delta);
    }
  }

  get center() {
    let bbox = new THREE.Box3().setFromObject(this);
    bbox.getCenter(this._center);
    return this._center;
  }
}