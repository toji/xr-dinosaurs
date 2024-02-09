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

import * as THREE from 'three';

const MAX_SHADOW_COUNT = 10;
const DEFAULT_SHADOW_SIZE = 3;
const DEFAULT_SHADOW_HEIGHT = 0.008;

const worldPosition = new THREE.Vector3();

export class BlobShadowManager extends THREE.Mesh {
  constructor(shadowTexture) {
    let instancedGeometry = new THREE.InstancedBufferGeometry();

    let shadowVerts = [
    // X,   Y,  Z,    U, V
      -0.5, 0, -0.5,  0, 0,
       0.5, 0, -0.5,  1, 0,
       0.5, 0,  0.5,  1, 1,
      -0.5, 0,  0.5,  0, 1,
    ];

    let shadowIndices = [
      0, 2, 1,
      0, 3, 2
    ];

    let interleavedBuffer = new THREE.InterleavedBuffer(new Float32Array(shadowVerts), 5);
    instancedGeometry.setIndex(shadowIndices);
    instancedGeometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0, false));
    instancedGeometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(interleavedBuffer, 2, 3, false));

    let shadowOffsets = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SHADOW_COUNT * 4), 4);
    shadowOffsets.setUsage(THREE.DynamicDrawUsage);
    instancedGeometry.setAttribute('shadowOffsets', shadowOffsets);

    let blobShadowMaterial = new THREE.RawShaderMaterial({
      transparent: true,
      depthWrite: false,

      uniforms: {
        map: { value: shadowTexture },
        shadowScale: { value: DEFAULT_SHADOW_SIZE }
      },

      vertexShader: `
        precision highp float;

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float shadowScale;

        attribute vec3 position;
        attribute vec2 uv;
        attribute vec4 shadowOffsets;

        varying vec2 vUv;
        varying float vOpacity;

        void main() {
          vec3 offset = shadowOffsets.xyz;
          vOpacity = shadowOffsets.w;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(offset + (position * shadowScale), 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform sampler2D map;

        varying vec2 vUv;
        varying float vOpacity;

        void main() {
          vec4 shadowColor = texture2D(map, vUv);
          gl_FragColor = vec4(shadowColor.rgb, shadowColor.a * vOpacity);
        }
      `
    });

    super(instancedGeometry, blobShadowMaterial);
    this.frustumCulled = false;

    this._shadowNodes = [];
    this._shadowSize = DEFAULT_SHADOW_SIZE;
    this._shadowOffsets = shadowOffsets;
    this._arMode = false;
  }

  set shadowNodes(value) {
    this._shadowNodes = value || [];
  }

  set shadowSize(value) {
    if (!value) { value = DEFAULT_SHADOW_SIZE; }
    if (value != this._shadowSize) {
      this._shadowSize = value;
      this.material.uniforms.shadowScale.value = value;
    }
  }

  get shadowSize() {
    return this._shadowSize;
  }

  set arMode(value) {
    this._arMode = value;
  }

  onBeforeRender() {
    for (let i = 0; i < this._shadowNodes.length; ++i) {
      this._shadowNodes[i].getWorldPosition(worldPosition);

      let opacity = THREE.MathUtils.lerp(this._arMode ? 0.3 : 1, this._arMode ? 0.1 : .25, worldPosition.y * 0.75);
      this._shadowOffsets.setXYZW(i, worldPosition.x, DEFAULT_SHADOW_HEIGHT, worldPosition.z, opacity);
    }

    this.geometry.instanceCount = this._shadowNodes.length;
    this._shadowOffsets.needsUpdate = true;
  }
}