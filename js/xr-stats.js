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

// This is a Three.js port of the WebGL-based stats tracker that I built for the
// WebVR samples a few years back. It's not as robust as the traditional stats
// library, but has the significant advantage that it can be placed in the 3D
// scene if needed, which allows you to view it while in VR.

import * as THREE from './third-party/three.js/build/three.module.js';

const SEGMENTS = 30;
const MAX_FPS = 90;
const TEXT_KERNING = 2.0;
const MAX_CHARACTERS = 10;

const now = (window.performance && performance.now) ? performance.now.bind(performance) : Date.now;

function segmentToX(i) {
  return ((0.9/SEGMENTS) * i) - 0.45;
}

function fpsToY(value) {
  return (Math.min(value, MAX_FPS) * (0.7 / MAX_FPS)) - 0.45;
}

function fpsToRGB(value) {
  return {
    r: Math.max(0.0, Math.min(1.0, 1.0 - (value/60))),
    g: Math.max(0.0, Math.min(1.0, ((value-15)/(MAX_FPS-15)))),
    b: Math.max(0.0, Math.min(1.0, ((value-15)/(MAX_FPS-15)))),
  };
}

export class XRStats extends THREE.Object3D {
  constructor(renderer) {
    super();

    this._renderer = renderer;
    let element = renderer.domElement;
    this._orthoCamera = new THREE.OrthographicCamera(0, element.offsetWidth, element.offsetHeight, 0, 0.001, 100);
		this._orthoCamera.position.z = 10;
    this._orthoScene = new THREE.Scene();
    this._orthoSize = 80;

    this._performanceMonitoring = false;

    this._startTime = now();
    this._prevFrameTime = this._startTime;
    this._prevGraphUpdateTime = this._startTime;
    this._frames = 0;
    this._fpsAverage = 0;
    this._fpsMin = 0;
    this._fpsStep = this._performanceMonitoring ? 1000 : 250;
    this._lastSegment = 0;

    this._fpsVertexBuffer = null;
    this._fpsRenderPrimitive = null;
    this._fpsNode = null;

    // Build the graph geometry
    let fpsVerts = [];
    let fpsIndices = [];

    // Graph geometry
    for (let i = 0; i < SEGMENTS; ++i) {
      // Bar top
      fpsVerts.push(segmentToX(i), fpsToY(0), 0.02, 0.0, 1.0, 1.0);
      fpsVerts.push(segmentToX(i+1), fpsToY(0), 0.02, 0.0, 1.0, 1.0);

      // Bar bottom
      fpsVerts.push(segmentToX(i), fpsToY(0), 0.02, 0.0, 1.0, 1.0);
      fpsVerts.push(segmentToX(i+1), fpsToY(0), 0.02, 0.0, 1.0, 1.0);

      let idx = i * 4;
      fpsIndices.push(idx, idx+3, idx+1,
                       idx+3, idx, idx+2);
    }

    function addBGSquare(left, bottom, right, top, z, r, g, b) {
      let idx = fpsVerts.length / 6;

      fpsVerts.push(left, bottom, z, r, g, b);
      fpsVerts.push(right, top, z, r, g, b);
      fpsVerts.push(left, top, z, r, g, b);
      fpsVerts.push(right, bottom, z, r, g, b);

      fpsIndices.push(idx, idx+1, idx+2,
                       idx, idx+3, idx+1);
    }

    // Panel Background
    addBGSquare(-0.5, -0.5, 0.5, 0.5, 0.0, 0.0, 0.0, 0.125);

    // FPS Background
    addBGSquare(-0.45, -0.45, 0.45, 0.25, 0.01, 0.0, 0.0, 0.4);

    // 30 FPS line
    addBGSquare(-0.45, fpsToY(30), 0.45, fpsToY(32), 0.015, 0.5, 0.0, 0.5);

    // 60 FPS line
    addBGSquare(-0.45, fpsToY(60), 0.45, fpsToY(62), 0.015, 0.2, 0.0, 0.75);

    let geometry = new THREE.BufferGeometry();
    this._interleavedBuffer = new THREE.InterleavedBuffer(new Float32Array(fpsVerts), 6);
    this._interleavedBuffer.setUsage(THREE.DynamicDrawUsage);
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(fpsIndices), 1));
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(this._interleavedBuffer, 3, 0, false));
    geometry.setAttribute('color', new THREE.InterleavedBufferAttribute(this._interleavedBuffer, 3, 3, false));

    let material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 color;
        varying vec4 vColor;

        void main() {
          vColor = vec4(color, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec4 vColor;

        void main() {
          gl_FragColor = vColor;
        }`
    });

    this._graphMesh = new THREE.Mesh(geometry, material);
    this.add(this._graphMesh);

    this._sevenSegmentText = new SevenSegmentText();
    this._sevenSegmentText.scale.set(0.075, 0.075, 1);
    this._sevenSegmentText.position.set(-0.3625, 0.3625, 0.02);
    this.add(this._sevenSegmentText);

    this.drawOrthographic = true;
  }

  get performanceMonitoring() {
    return this._performanceMonitoring;
  }

  set performanceMonitoring(value) {
    this._performanceMonitoring = value;
    this._fpsStep = value ? 1000 : 250;
  }

  get drawOrthographic() {
    return this._drawOrtho;
  }

  set drawOrthographic(value) {
    this._drawOrtho = value;
    if (value) {
      if (this.parent) {
        this.parent.remove(this);
      }
      this._orthoScene.add(this);
      this.rotation.set(0, 0, 0);
    } else {
      this._orthoScene.remove(this);
    }
  }

  get orthographicSize() {
    return this._orthoSize;
  }

  set orthographicSize(value) {
    this._orthoSize = value;
  }

  update() {
    let time = now();

    let frameFps = 1000 / (time - this._prevFrameTime);
    this._prevFrameTime = time;
    this._fpsMin = this._frames ? Math.min(this._fpsMin, frameFps) : frameFps;
    this._frames++;

    if (time > this._prevGraphUpdateTime + this._fpsStep) {
      let intervalTime = time - this._prevGraphUpdateTime;
      this._fpsAverage = Math.round(1000 / (intervalTime / this._frames));

      // Draw both average and minimum FPS for this period
      // so that dropped frames are more clearly visible.
      this._updateGraph(this._fpsMin, this._fpsAverage);
      if (this._performanceMonitoring) {
        console.log(`Average FPS: ${this._fpsAverage} Min FPS: ${this._fpsMin}`);
      }

      this._prevGraphUpdateTime = time;
      this._frames = 0;
      this._fpsMin = 0;
    }

    if (this._drawOrtho) {
      let autoClear = this._renderer.autoClear;
      this._renderer.autoClear = false;
      this._orthoCamera.right = this._renderer.domElement.offsetWidth;
      this._orthoCamera.top = this._renderer.domElement.offsetHeight;
      this.scale.set(this._orthoSize, this._orthoSize, 1);
      this.position.set((this._orthoSize * 0.5) + 5, this._orthoCamera.top - (this._orthoSize * 0.5) - 5, 0);
      this._orthoCamera.updateProjectionMatrix();
      this._renderer.render(this._orthoScene, this._orthoCamera);
      this._renderer.autoClear = true;
    }
  }

  _updateGraph(valueLow, valueHigh) {
    let color = fpsToRGB(valueLow);
    // Draw a range from the low to high value. Artificially widen the
    // range a bit to ensure that near-equal values still remain
    // visible - the logic here should match that used by the
    // "60 FPS line" setup below. Hitting 60fps consistently will
    // keep the top half of the 60fps background line visible.
    let y0 = fpsToY(valueLow - 1);
    let y1 = fpsToY(valueHigh + 1);

    // Update the current segment with the new FPS value
    let updateVerts = [
      segmentToX(this._lastSegment), y1, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment+1), y1, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment), y0, 0.02, color.r, color.g, color.b,
      segmentToX(this._lastSegment+1), y0, 0.02, color.r, color.g, color.b,
    ];

    // Re-shape the next segment into the green "progress" line
    color.r = 0.2;
    color.g = 1.0;
    color.b = 0.2;

    if (this._lastSegment == SEGMENTS - 1) {
      // If we're updating the last segment we need to do two bufferSubDatas
      // to update the segment and turn the first segment into the progress line.
      /*this._renderer.updateRenderBuffer(this._fpsVertexBuffer, new Float32Array(updateVerts),
                                        this._lastSegment * 24 * 4);*/
      this._interleavedBuffer.set(new Float32Array(updateVerts), this._lastSegment * 24);
      updateVerts = [
        segmentToX(0), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(0), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(.25), fpsToY(0), 0.02, color.r, color.g, color.b,
      ];
      this._interleavedBuffer.set(new Float32Array(updateVerts), 0);
      //this._renderer.updateRenderBuffer(this._fpsVertexBuffer, new Float32Array(updateVerts), 0);
    } else {
      updateVerts.push(
        segmentToX(this._lastSegment+1), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment+1.25), fpsToY(MAX_FPS), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment+1), fpsToY(0), 0.02, color.r, color.g, color.b,
        segmentToX(this._lastSegment+1.25), fpsToY(0), 0.02, color.r, color.g, color.b
      );
      this._interleavedBuffer.set(new Float32Array(updateVerts), this._lastSegment * 24);
      /*this._renderer.updateRenderBuffer(this._fpsVertexBuffer, new Float32Array(updateVerts),
                                        this._lastSegment * 24 * 4);*/
    }

    this._interleavedBuffer.needsUpdate = true;

    this._lastSegment = (this._lastSegment+1) % SEGMENTS;

    this._sevenSegmentText.text = `${this._fpsAverage} FP5`;
  }
}

class SevenSegmentText extends THREE.Mesh {
  constructor() {
    let vertices = [];
    let indices = [];

    const width = 0.5;
    const thickness = 0.25;

    function defineSegment(id, left, top, right, bottom) {
      let idx = vertices.length / 3;
      vertices.push(
        left, top, id,
        right, top, id,
        right, bottom, id,
        left, bottom, id);

      indices.push(
        idx, idx+2, idx+1,
        idx, idx+3, idx+2);
    }

    let characters = {};
    function defineCharacter(c, segments) {
      let mask = [0, 0, 0, 0];

      for (let i = 0; i < segments.length; ++i) {
        switch (segments[i]) {
          case 0: mask[0] += 1; break;
          case 1: mask[1] += 1; break;
          case 2: mask[2] += 1; break;
          case 3: mask[3] += 1; break;
          case 4: mask[0] += 2; break;
          case 5: mask[1] += 2; break;
          case 6: mask[2] += 2; break;
        }
      }

      characters[c] = mask;
    }

    /* Segment layout is as follows:

    |-0-|
    3   4
    |-1-|
    5   6
    |-2-|

    */

    defineSegment(0, -1, 1, width, 1-thickness);
    defineSegment(1, -1, thickness*0.5, width, -thickness*0.5);
    defineSegment(2, -1, -1+thickness, width, -1);
    defineSegment(3, -1, 1, -1+thickness, -thickness*0.5);
    defineSegment(4, width-thickness, 1, width, -thickness*0.5);
    defineSegment(5, -1, thickness*0.5, -1+thickness, -1);
    defineSegment(6, width-thickness, thickness*0.5, width, -1);

    defineCharacter('0', [0, 2, 3, 4, 5, 6]);
    defineCharacter('1', [4, 6]);
    defineCharacter('2', [0, 1, 2, 4, 5]);
    defineCharacter('3', [0, 1, 2, 4, 6]);
    defineCharacter('4', [1, 3, 4, 6]);
    defineCharacter('5', [0, 1, 2, 3, 6]);
    defineCharacter('6', [0, 1, 2, 3, 5, 6]);
    defineCharacter('7', [0, 4, 6]);
    defineCharacter('8', [0, 1, 2, 3, 4, 5, 6]);
    defineCharacter('9', [0, 1, 2, 3, 4, 6]);
    defineCharacter('A', [0, 1, 3, 4, 5, 6]);
    defineCharacter('B', [1, 2, 3, 5, 6]);
    defineCharacter('C', [0, 2, 3, 5]);
    defineCharacter('D', [1, 2, 4, 5, 6]);
    defineCharacter('E', [0, 1, 2, 4, 6]);
    defineCharacter('F', [0, 1, 3, 5]);
    defineCharacter('P', [0, 1, 3, 4, 5]);
    defineCharacter('-', [1]);
    defineCharacter(' ', []);
    defineCharacter('_', [2]); // Used for undefined characters

    let geometry = new THREE.InstancedBufferGeometry();
    //let geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3, false));

    let chars = [];
    chars.push(0 * TEXT_KERNING, 0, ...characters['0']);
    chars.push(0 * TEXT_KERNING, 0, ...characters['0']);
    chars.push(2 * TEXT_KERNING, 0, ...characters[' ']);
    chars.push(3 * TEXT_KERNING, 0, ...characters['F']);
    chars.push(4 * TEXT_KERNING, 0, ...characters['P']);
    chars.push(5 * TEXT_KERNING, 0, ...characters['5']);

    let characterBuffer = new THREE.InstancedInterleavedBuffer( new Float32Array(chars), 6)
    characterBuffer.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('offset', new THREE.InterleavedBufferAttribute(characterBuffer, 2, 0));
    geometry.setAttribute('mask', new THREE.InterleavedBufferAttribute(characterBuffer, 4, 2));

    let material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec2 offset;
        attribute vec4 mask;
        varying float vMask;
        void main() {
          int segment = int(position.z);
          vMask = 0.0;
          if (segment == 0) {
            int sm = int(mask[0]);
            vMask = (sm == 1 || sm == 3) ? 1.0 : 0.0;
          } else if (segment == 1) {
            int sm = int(mask[1]);
            vMask = (sm == 1 || sm == 3) ? 1.0 : 0.0;
          } else if (segment == 2) {
            int sm = int(mask[2]);
            vMask = (sm == 1 || sm == 3) ? 1.0 : 0.0;
          } else if (segment == 3) {
            int sm = int(mask[3]);
            vMask = (sm == 1 || sm == 3) ? 1.0 : 0.0;
          } else if (segment == 4) {
            int sm = int(mask[0]);
            vMask = (sm >= 2) ? 1.0 : 0.0;
          } else if (segment == 5) {
            int sm = int(mask[1]);
            vMask = (sm >= 2) ? 1.0 : 0.0;
          } else if (segment == 6) {
            int sm = int(mask[2]);
            vMask = (sm >= 2) ? 1.0 : 0.0;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy + offset, 0.0, 1.0);
        }`,
      fragmentShader: `
        varying float vMask;
        void main() {
          if (vMask < 1.0) { discard; }
          gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
        }`
    });

    super(geometry, material);

    this._text = '';
    this._characters = characters;
    this._characterBuffer = characterBuffer;
  }

  get text() {
    return this._text;
  }

  set text(value) {
    this._text = value;

    let chars = [];
    for (let i = 0; i < value.length; ++i) {
      chars.push(i * TEXT_KERNING, 0);

      let mask;
      if (value[i] in this._characters) {
        mask = this._characters[value[i]];
      } else {
        mask = this._characters['_'];
      }
      chars.push(...mask);
    }

    this._characterBuffer.array = new Float32Array(chars);
    this._characterBuffer.needsUpdate = true;
  }
}