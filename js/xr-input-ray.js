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

const RAY_RADIUS = 0.01;
const RAY_LENGTH = 1.0;
const RAY_FADE_END = 0.535;
const RAY_FADE_POINT = 0.5335;

export class XRInputRay extends THREE.Mesh {
  constructor() {
    let r = RAY_RADIUS;
    let l = RAY_LENGTH;

    // The ray is rendered as cross-shaped beam
    let rayVerts = [
    // X    Y   Z    U    V
      0.0, r, 0.0, 0.0, 1.0,
      0.0, r, -l, 0.0, 0.0,
      0.0, -r, 0.0, 1.0, 1.0,
      0.0, -r, -l, 1.0, 0.0,

      r, 0.0, 0.0, 0.0, 1.0,
      r, 0.0, -l, 0.0, 0.0,
      -r, 0.0, 0.0, 1.0, 1.0,
      -r, 0.0, -l, 1.0, 0.0,

      0.0, -r, 0.0, 0.0, 1.0,
      0.0, -r, -l, 0.0, 0.0,
      0.0, r, 0.0, 1.0, 1.0,
      0.0, r, -l, 1.0, 0.0,

      -r, 0.0, 0.0, 0.0, 1.0,
      -r, 0.0, -l, 0.0, 0.0,
      r, 0.0, 0.0, 1.0, 1.0,
      r, 0.0, -l, 1.0, 0.0,
    ];
    let rayIndices = [
      0, 1, 2, 1, 3, 2,
      4, 5, 6, 5, 7, 6,
      8, 9, 10, 9, 11, 10,
      12, 13, 14, 13, 15, 14,
    ];

    let geometry = new THREE.BufferGeometry();
    let interleavedBuffer = new THREE.InterleavedBuffer(new Float32Array(rayVerts), 5);
    geometry.setIndex(rayIndices);
    geometry.setAttribute('position', new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0, false));
    geometry.setAttribute('uv', new THREE.InterleavedBufferAttribute(interleavedBuffer, 2, 3, false));

    let rayTexture = new THREE.DataTexture(RAY_TEXTURE_DATA, 48, 1);
    rayTexture.needsUpdate = true;

    let material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: rayTexture },
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
          vec2 uv = vUv;
          float front_fade_factor = 1.0 - clamp(1.0 - (uv.y - fadePoint) / (1.0 - fadePoint), 0.0, 1.0);
          float back_fade_factor = clamp((uv.y - fadePoint) / (fadeEnd - fadePoint), 0.0, 1.0);
          vec4 color = rayColor * texture2D(map, uv);
          float opacity = color.a * front_fade_factor * back_fade_factor;
          gl_FragColor = vec4(color.rgb * opacity, opacity);
        }`
    });

    super(geometry, material);
  }
}

