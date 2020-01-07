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

const CURSOR_RADIUS = 0.006;
const CURSOR_SHADOW_RADIUS = 0.0085;
const CURSOR_SHADOW_INNER_LUMINANCE = 0.5;
const CURSOR_SHADOW_OUTER_LUMINANCE = 0.0;
const CURSOR_SHADOW_INNER_OPACITY = 0.75;
const CURSOR_SHADOW_OUTER_OPACITY = 0.0;
const CURSOR_OPACITY = 0.9;
const CURSOR_SEGMENTS = 16;

const tmpMatrix = new THREE.Matrix4();

export class XRInputCursorManager extends THREE.Group {
  constructor() {
    super();
    this._raycaster = new THREE.Raycaster();

    this._colliders = [];
    this._frameCursorCount = 0;
    this._cursors = [new XRInputCursor()];
    this._cursors[0].visible = false;
    this.add(this._cursors[0]);
  }

  addCollider(collider) {
    this._colliders.push(collider);
  }

  update(controllers) {
    let frameCursorCount = 0;

    for (let controller of controllers) {
      if (!controller) continue;
      tmpMatrix.identity().extractRotation(controller.matrixWorld);
      this._raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      this._raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMatrix);

      let intersects = this._raycaster.intersectObjects(this._colliders, true);
      if (intersects && intersects.length) {
        let cursor;
        if (this._cursors.length == frameCursorCount) {
          cursor = this._cursors[0].clone();
          this.add(cursor);
          this._cursors.push(cursor);
        } else {
          cursor = this._cursors[frameCursorCount];
        }
        frameCursorCount++;
        cursor.position.copy(intersects[0].point);
        // Move the cursor back along the ray a smidge to prevent intersections
        cursor.position.x -= this._raycaster.ray.direction.x * 0.01;
        cursor.position.y -= this._raycaster.ray.direction.y * 0.01;
        cursor.position.z -= this._raycaster.ray.direction.z * 0.01;
        cursor.visible = true;
      }
    }

    for (let i = frameCursorCount; i < this._cursors.length; ++i) {
      this._cursors[i].visible = false;
    }
  }
}

export class XRInputCursor extends THREE.Mesh {
  constructor() {
    // Cursor is a circular white dot with a dark "shadow" skirt around the edge
    // that fades from black to transparent as it moves out from the center.
    // Cursor verts are packed as [X, Y, Luminance, Opacity]
    let cursorVerts = [];
    let cursorIndices = [];

    let segRad = (2.0 * Math.PI) / CURSOR_SEGMENTS;

    // Cursor center
    for (let i = 0; i < CURSOR_SEGMENTS; ++i) {
      let rad = i * segRad;
      let x = Math.cos(rad);
      let y = Math.sin(rad);
      cursorVerts.push(x * CURSOR_RADIUS, y * CURSOR_RADIUS, 1.0, CURSOR_OPACITY);

      if (i > 1) {
        cursorIndices.push(0, i-1, i);
      }
    }

    let indexOffset = CURSOR_SEGMENTS;

    // Cursor Skirt
    for (let i = 0; i < CURSOR_SEGMENTS; ++i) {
      let rad = i * segRad;
      let x = Math.cos(rad);
      let y = Math.sin(rad);
      cursorVerts.push(x * CURSOR_RADIUS, y * CURSOR_RADIUS,
          CURSOR_SHADOW_INNER_LUMINANCE, CURSOR_SHADOW_INNER_OPACITY);
      cursorVerts.push(x * CURSOR_SHADOW_RADIUS, y * CURSOR_SHADOW_RADIUS,
          CURSOR_SHADOW_OUTER_LUMINANCE, CURSOR_SHADOW_OUTER_OPACITY);

      if (i > 0) {
        let idx = indexOffset + (i * 2);
        cursorIndices.push(idx-2, idx-1, idx);
        cursorIndices.push(idx-1, idx+1, idx);
      }
    }

    let idx = indexOffset + (CURSOR_SEGMENTS * 2);
    cursorIndices.push(idx-2, idx-1, indexOffset);
    cursorIndices.push(idx-1, indexOffset+1, indexOffset);

    let geometry = new THREE.BufferGeometry();
    let interleavedBuffer = new THREE.InterleavedBuffer(new Float32Array(cursorVerts), 4);
    geometry.setIndex(cursorIndices);
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0, false));
    geometry.setAttribute('opacity', new THREE.InterleavedBufferAttribute(interleavedBuffer, 1, 3, false));

    let material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,

      vertexShader: `
        attribute float opacity;
        varying float vLuminance;
        varying float vOpacity;
        
        void main() {
          vLuminance = position.z;
          vOpacity = opacity;
        
          // Billboarded, constant size vertex transform.
          vec4 screenPos = projectionMatrix * modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          screenPos /= screenPos.w;
          screenPos.xy += position.xy;
          gl_Position = screenPos;
        }`,
      fragmentShader: `
        const vec4 cursorColor = vec4(1.0, 1.0, 1.0, 1.0);
        varying float vLuminance;
        varying float vOpacity;
        
        void main() {
          vec3 color = cursorColor.rgb * vLuminance;
          float opacity = cursorColor.a * vOpacity;
          gl_FragColor = vec4(color * opacity, opacity);
        }`
    });

    super(geometry, material);
  }
}