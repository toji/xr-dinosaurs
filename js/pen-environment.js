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

const PLATFORM_SPEED = 0.5; // Meters/second
const MAX_PLATFORM_HEIGHT = 5;
const PLATFORM_MOVE_INCREMENT = MAX_PLATFORM_HEIGHT / 2;

export class PenEnvironment extends THREE.Group {
  constructor(gltfLoader) {
    super();
  
    this._platform = new THREE.Group();
    this._platform.position.set(0, 0, 0);
    this.add(this._platform);

    this._platformTargetHeight = 0;

    this._scene = null;

    gltfLoader.setPath('media/models/environment/');
    gltfLoader.load('compressed-optimized.glb', (gltf) => {
      this._scene = gltf.scene;
      this._scene.updateMatrixWorld();

      let raisedPlatform = null;
      this._scene.traverse((child) => {
        if (child.isMesh) {
          // Replace the MeshStandardMaterial for the pen with something cheaper
          // to render, because we don't have proper physical materials for this
          // model.
          let newMaterial = new THREE.MeshLambertMaterial({
            map: child.material.map,
            alphaMap: child.material.alphaMap,
            transparent: child.material.transparent,
            side: child.material.side,
          });
          child.material = newMaterial;
        }
        if (child.name == 'Raised_Platform') {
          raisedPlatform = child;
        }
      });

      if (raisedPlatform) {
        let raisedPlatformTransform = raisedPlatform.parent.matrixWorld;
        raisedPlatform.parent.remove(raisedPlatform);
        raisedPlatform.applyMatrix(raisedPlatformTransform);
        this._platform.add(raisedPlatform);
      }
      
      this.add(this._scene);
    });
  }

  get platform() {
    return this._platform;
  }

  get scene() {
    return this._scene;
  }

  raisePlatform() {
    if (this._platform.position.y < this._platformTargetHeight) {
      return;
    }
    this._platformTargetHeight += PLATFORM_MOVE_INCREMENT;
    if (this._platformTargetHeight >  MAX_PLATFORM_HEIGHT) {
      this._platformTargetHeight = MAX_PLATFORM_HEIGHT;
    }
  }

  lowerPlatform() {
    if (this._platform.position.y > this._platformTargetHeight) {
      return;
    }
    this._platformTargetHeight -= PLATFORM_MOVE_INCREMENT;
    if (this._platformTargetHeight < 0) {
      this._platformTargetHeight = 0;
    }
  }

  resetPlatform() {
    this._platformTargetHeight = 0;
    this._platform.position.y = 0;
  }

  update(delta) {
    // Update the platform height if needed
    if (this._platform.position.y < this._platformTargetHeight) {
      this._platform.position.y += PLATFORM_SPEED * delta;
      if (this._platform.position.y > this._platformTargetHeight) {
        this._platform.position.y = this._platformTargetHeight;
      }
    } else if (this._platform.position.y > this._platformTargetHeight) {
      this._platform.position.y -= PLATFORM_SPEED * delta;
      if (this._platform.position.y < this._platformTargetHeight) {
        this._platform.position.y = this._platformTargetHeight;
      }
    }
  }
}