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
import { AllDinosaurs } from './all-dinosaurs.js';

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

export class XRDinosaurLoader {
  constructor(gltfLoader) {
    this._gltfLoader = gltfLoader;
    this._currentKey = null;
    this._currentDinosaur = null;

    this._loadedDinosaurs = {};
  }

  load(key) {
    let dinosaur = AllDinosaurs[key];
    if (!dinosaur) {
      return Promise.reject(new Error('Invalid key'));
    }
    if (key == this._currentKey) {
      // Don't waste time doing duplicate loads
      Promise.resolve(this._currentDinosaur);
    }

    this._currentKey = key;

    if (this._loadedDinosaurs[key]) {
      // Load from cache when we can
      return this._loadedDinosaurs[key].then((loadedDinosaur) => {
        if (key == this._currentKey) {
          this._currentDinosaur = loadedDinosaur;
        }
        return loadedDinosaur;
      });
    }

    this._loadedDinosaurs[key] = new Promise((resolve) => {
      this._gltfLoader.setPath(dinosaur.path);
      let fileName = dinosaur.file || 'scene.gltf';
      this._gltfLoader.load(fileName, (gltf) => {
        // Scale to a more realistic size based on the real dinosaur's height
        let bbox = new THREE.Box3().setFromObject(gltf.scene);
        let modelScale = dinosaur.height / (bbox.max.y - bbox.min.y);
        gltf.scene.scale.multiplyScalar(modelScale);

        // Position feet on the ground
        gltf.scene.position.y -= bbox.min.y * modelScale;

        dinosaur.add(gltf.scene);

        // Clean up the animation data
        for (let i = 0; i < gltf.animations.length; ++i) {
          trimEmptyLeadingKeyframes(gltf.animations[i]);
        }
        dinosaur.animations = gltf.animations;

        if (key == this._currentKey) {
          this._currentDinosaur = dinosaur;
        }
        resolve(dinosaur);
      });
    });

    return this._loadedDinosaurs[key];
  }

  get currentDinosaur() {
    return this._currentDinosaur;
  }

  get allDinosaurs() {
    return AllDinosaurs;
  }
}
