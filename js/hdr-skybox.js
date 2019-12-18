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
import { RGBELoader } from './third-party/three.js/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from './third-party/three.js/examples/jsm/pmrem/PMREMGenerator.js';
import { PMREMCubeUVPacker } from './third-party/three.js/examples/jsm/pmrem/PMREMCubeUVPacker.js';

const SKYBOX_SIZE = 1024;

export class HDRSkybox extends THREE.WebGLRenderTargetCube {
  constructor(renderer, path, file) {
    let options = {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter
    };
    super(SKYBOX_SIZE, SKYBOX_SIZE, options);

    this._renderer = renderer;
    this._envMapPromise = null;
    this._texturePromise = new Promise((resolve, reject) => {
      let rgbeLoader = new RGBELoader();
      rgbeLoader.setDataType(THREE.UnsignedByteType);
      rgbeLoader.setPath(path);
      rgbeLoader.load(file,  (texture) => {
        this.fromEquirectangularTexture(this._renderer, texture);
        resolve();
      });
    });
  }

  getEnvMap() {
    if (!this._envMapPromise) {
      this._envMapPromise = this._texturePromise.then(() => {
        let pmremGenerator = new PMREMGenerator(this.texture);
        pmremGenerator.update(this._renderer);

        let pmremCubeUVPacker = new PMREMCubeUVPacker(pmremGenerator.cubeLods);
        pmremCubeUVPacker.update(this._renderer);

        let envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;
        pmremGenerator.dispose();
        pmremCubeUVPacker.dispose();

        return envMap;
      });
    }
    return this._envMapPromise;
  }
}