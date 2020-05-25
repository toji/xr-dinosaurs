// Copyright 2020 Brandon Jones
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

// This code is based heavily off of the wonderful WebXR locomotion tutorial at
// https://medium.com/samsung-internet-dev/vr-locomotion-740dafa85914
// Thank you, Ada!
// My primary contribution was making the rendering fit the app's style better
// and doing a bit of additional encapsulation and abstraction work.

import * as THREE from './third-party/three.js/build/three.module.js';

const RAY_TEXTURE_DATA = new Uint8Array([
  0xff, 0xff, 0xff, 0x01, 0xff, 0xff, 0xff, 0x02, 0xbf, 0xbf, 0xbf, 0x04, 0xcc, 0xcc, 0xcc, 0x05,
  0xdb, 0xdb, 0xdb, 0x07, 0xcc, 0xcc, 0xcc, 0x0a, 0xd8, 0xd8, 0xd8, 0x0d, 0xd2, 0xd2, 0xd2, 0x11,
  0xce, 0xce, 0xce, 0x15, 0xce, 0xce, 0xce, 0x1a, 0xce, 0xce, 0xce, 0x1f, 0xcd, 0xcd, 0xcd, 0x24,
  0xc8, 0xc8, 0xc8, 0x2a, 0xc9, 0xc9, 0xc9, 0x2f, 0xc9, 0xc9, 0xc9, 0x34, 0xc9, 0xc9, 0xc9, 0x39,
  0xc9, 0xc9, 0xc9, 0x3d, 0xc8, 0xc8, 0xc8, 0x41, 0xcb, 0xcb, 0xcb, 0x44, 0xee, 0xee, 0xee, 0x87,
  0xfa, 0xfa, 0xfa, 0xc8, 0xf9, 0xf9, 0xf9, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xfa, 0xfa, 0xfa, 0xc9,
  0xfa, 0xfa, 0xfa, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xf9, 0xf9, 0xf9, 0xc9, 0xfa, 0xfa, 0xfa, 0xc8,
  0xee, 0xee, 0xee, 0x87, 0xcb, 0xcb, 0xcb, 0x44, 0xc8, 0xc8, 0xc8, 0x41, 0xc9, 0xc9, 0xc9, 0x3d,
  0xc9, 0xc9, 0xc9, 0x39, 0xc9, 0xc9, 0xc9, 0x34, 0xc9, 0xc9, 0xc9, 0x2f, 0xc8, 0xc8, 0xc8, 0x2a,
  0xcd, 0xcd, 0xcd, 0x24, 0xce, 0xce, 0xce, 0x1f, 0xce, 0xce, 0xce, 0x1a, 0xce, 0xce, 0xce, 0x15,
  0xd2, 0xd2, 0xd2, 0x11, 0xd8, 0xd8, 0xd8, 0x0d, 0xcc, 0xcc, 0xcc, 0x0a, 0xdb, 0xdb, 0xdb, 0x07,
  0xcc, 0xcc, 0xcc, 0x05, 0xbf, 0xbf, 0xbf, 0x04, 0xff, 0xff, 0xff, 0x02, 0xff, 0xff, 0xff, 0x01,
]);

const RAY_LENGTH = 10.0;
const RAY_RADIUS = 0.02;
const RAY_FADE_END = 0.0035;
const RAY_FADE_POINT = 0.00335;

const TELEPORT_GUIDE_SEGMENTS = 16;

const TMP_VEC = new THREE.Vector3();
const TMP_VEC_P = new THREE.Vector3();
const TMP_VEC_V = new THREE.Vector3();
const GRAVITY = new THREE.Vector3(0,-9.8,0);

function guidePositionAtT(inVec,t,p,v,g) {
  inVec.copy(p);
  inVec.addScaledVector(v,t);
  inVec.addScaledVector(g,0.5*t**2);
  return inVec;
}

export class XRTeleportGuideline extends THREE.Mesh {
  constructor() {
    const r = RAY_RADIUS;
    const l = RAY_LENGTH;

    let guidePositions = [];
    let guideUVs = [];
    let guideIndices = [];

    // The guideline is a cross-chaped beam, rendered with a 1D texture fade
    // and additive blending so that it displays well in almost any situation.

    // Positions will have to be recomputed every frame, so we're really just
    // filling in dummy values here. The rest of the mesh can stay constant,
    // though.
    for (let i = 0; i < TELEPORT_GUIDE_SEGMENTS; ++i) {
      if (i == 0) {
        guidePositions.push(
          0, r, 0,
          0, -r, 0,
          r, 0, 0,
          -r, 0, 0);

        guideUVs.push(
          0.0, 1.0,
          1.0, 1.0,
          0.0, 1.0,
          1.0, 1.0);
      }

      const t1 = (i+1) / TELEPORT_GUIDE_SEGMENTS;
      const l1 = -l * t1;

      guidePositions.push(
        0, r, l1,
        0, -r, l1,
        r, 0, l1,
        -r, 0, l1);

      guideUVs.push(
        0.0, 1.0 - t1,
        1.0, 1.0 - t1,
        0.0, 1.0 - t1,
        1.0, 1.0 - t1);

      const o = i * 4; // index offset
      guideIndices.push(
        0+o, 1+o, 4+o,  1+o, 5+o, 4+o,
        2+o, 3+o, 6+o,  3+o, 7+o, 6+o
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(guideIndices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(guidePositions), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(guideUVs), 2));

    const guideTexture = new THREE.DataTexture(RAY_TEXTURE_DATA, 48, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: guideTexture },
      },

      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,

      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;

        const float fadePoint = ${RAY_FADE_POINT};
        const float fadeEnd = ${RAY_FADE_END};
        const vec4 rayColor = vec4(1.0, 1.0, 1.0, 1.0);

        void main() {
          float front_fade_factor = 1.0 - clamp(1.0 - (vUv.y - fadePoint) / (1.0 - fadePoint), 0.0, 1.0);
          float back_fade_factor = clamp((vUv.y - fadePoint) / (fadeEnd - fadePoint), 0.0, 1.0);
          vec4 color = rayColor * texture2D(map, vUv);
          float opacity = color.a * front_fade_factor * back_fade_factor;
          gl_FragColor = vec4(color.rgb * opacity, opacity);
        }`
    });

    super(geometry, material);
  }

  updateGuideForController(controller) {
    const r = RAY_RADIUS;

    // Controller start position
    const p = controller.getWorldPosition(TMP_VEC_P);

    // Set Vector V to the direction of the controller, at 1m/s
    const v = controller.getWorldDirection(TMP_VEC_V);

    // Scale the initial velocity to 8m/s
    v.multiplyScalar(8);

    // Time for tele ball to hit ground
    const t = (-v.y  + Math.sqrt(v.y**2 - 2*p.y*GRAVITY.y))/GRAVITY.y;

    const vert = TMP_VEC.set(0,0,0);
    let guidePositions = [];
    for (let i = 0; i <= TELEPORT_GUIDE_SEGMENTS; i++) {
        // Set vertex to current position of the virtual ball at time t
        guidePositionAtT(vert,i*t/TELEPORT_GUIDE_SEGMENTS,p,v,GRAVITY);
        controller.worldToLocal(vert);

        // TODO: The cross section here is wrong, and will get "squished" as the
        // guide becomes more vertical or the user turns.
        guidePositions.push(
          vert.x, vert.y + r, vert.z,
          vert.x, vert.y - r, vert.z,
          vert.x + r, vert.y, vert.z,
          vert.x - r, vert.y, vert.z);
    }
    this.geometry.attributes.position.array.set(guidePositions);
    this.geometry.attributes.position.needsUpdate = true;

    // Place the light and sprite near the end of the guide
    /*guidePositionAtT(guidelight.position,t*0.98,p,v,g);
    guidePositionAtT(guidesprite.position,t*0.98,p,v,g);*/
  }
}

