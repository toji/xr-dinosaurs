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

const DEFAULT_SHADOW_SIZE = 3;

const worldPosition = new THREE.Vector3();

export class XRBlobShadowManager extends THREE.Group {
  constructor(shadowTexture) {
    super();

    this._shadowTexture = shadowTexture;
    this._shadowMeshes = [];
    this._shadowNodes = [];
    this._shadowSize = DEFAULT_SHADOW_SIZE;
  }

  set shadowNodes(value) {
    this._shadowNodes = value || [];

    for (let i = 0; i < this._shadowNodes.length; ++i) {
      if (this._shadowMeshes.length == i) {
        // Build the shadow mesh
        let shadowGeometry = new THREE.PlaneBufferGeometry(1, 1);
        let shadowMaterial = new THREE.MeshBasicMaterial({
          map: this._shadowTexture,
          transparent: true,
          depthWrite: false,
        });
        let shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadowMesh.rotation.x = Math.PI * -0.5;
        this.add(shadowMesh);
        this._shadowMeshes.push(shadowMesh);
      }
      this._shadowMeshes[i].visible = true;
      let shadowSize = this._shadowSize;
      this._shadowMeshes[i].scale.set(shadowSize, shadowSize, shadowSize);
    }

    for (let i = this._shadowNodes.length; i < this._shadowMeshes.length; ++i) {
      this._shadowMeshes[i].visible = false;
    }
  }

  set shadowSize(value) {
    if (!value) { value = DEFAULT_SHADOW_SIZE; }
    if (value != this._shadowSize) {
      for (let mesh of this._shadowMeshes) {
        mesh.scale.set(value, value, value);
      }
      this._shadowSize = value;
    }
  }

  get shadowSize() {
    return this._shadowSize;
  }

  update() {
    if (!this.visible) { return; }
    for (let i = 0; i < this._shadowNodes.length; ++i) {
      this._shadowNodes[i].getWorldPosition(worldPosition);

      let mesh = this._shadowMeshes[i];
      mesh.position.x = worldPosition.x;
      mesh.position.z = worldPosition.z;
      mesh.material.opacity = THREE.Math.lerp(1, .25, worldPosition.y * 0.75);
    }
  }
}