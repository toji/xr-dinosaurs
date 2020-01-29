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

const LIGHT_PROBE_INTENSITY = 3;
const REFLECTION_UPDATE_RATE = 1000; // ms

export class XRLighting extends THREE.Group {
  constructor(renderer) {
    super();

    this._renderer = renderer;
    this._pmremGenerator = new THREE.PMREMGenerator(renderer);

    this._hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0x448844);
    this.add(this._hemisphereLight);

    this._envMap = null;

    this._xrSession = null;
    this._xrEnvMap = null;
    this._xrLightProbe = null;
    this._xrDirectionalLight = null;

    this._xrReflectionTexture = null;
    this._xrReflectionCubeMap = null;
    this._xrLastReflectionUpdate = 0;

    this._xrFrameCallback = (time, xrFrame) => { this.onXRFrame(time, xrFrame); };
  }

  loadHDRSkybox(url) {
    this._pmremGenerator.compileEquirectangularShader();

    return new Promise((resolve) => {
      let rgbeLoader = new RGBELoader();
      rgbeLoader.setDataType(THREE.UnsignedByteType);
      rgbeLoader.load(url, (texture) => {
        this._envMap = this._pmremGenerator.fromEquirectangular(texture).texture;
        if (!this._xrEnvMap) {
          this.dispatchEvent( { type: 'envmapchange' } );
        }
        resolve(this._envMap);
      });
    });
  }

  get envMap() {
    return this._xrEnvMap ? this._xrEnvMap : this._envMap;
  }

  set xrSession(value) {
    if (this._xrSession == value) return;

    this._xrSession = value;

    if (!this._xrSession) {
      // Revert back to app-specific lighting.
      if (this._xrLightProbe) {
        this.remove(this._xrLightProbe);
        this._xrLightProbe = null;

        this.add(this._hemisphereLight);
      }

      if (this._xrDirectionalLight) {
        this.remove(this._xrDirectionalLight);
        this._xrDirectionalLight = null;
      }

      if (this._xrEnvMap) {
        this._xrEnvMap.dispose();
        this._xrEnvMap = null;
        this.dispatchEvent( { type: 'envmapchange' } );
      }
    } else {
      if ('updateWorldTrackingState' in this._xrSession) {
        // Indicate that we want to start tracking lighting estimation if it's
        // available.
        this._xrSession.updateWorldTrackingState({
          lightEstimationState: { enabled: true }
        });

        // Start monitoring the XR animation frame loop to look for lighting
        // estimation changes.
        this._xrSession.requestAnimationFrame(this._xrFrameCallback);

        this._pmremGenerator.compileCubemapShader();
      }
    }
  }

  get xrSession() {
    return this._xrSession;
  }

  onXRFrame(time, xrFrame) {
    this._xrSession.requestAnimationFrame(this._xrFrameCallback);

    if (xrFrame.worldInformation && xrFrame.worldInformation.lightEstimation) {
      let lightEstimation = xrFrame.worldInformation.lightEstimation;

      let lightProbe = lightEstimation.lightProbe;
      if (lightProbe) {
        if (!this._xrLightProbe) {
          this._xrLightProbe = new THREE.LightProbe();
          this._xrLightProbe.intensity = 1;
          this.add(this._xrLightProbe);

          this.remove(this._hemisphereLight);
        }
        
        if (!this._xrDirectionalLight) {
          this._xrDirectionalLight = new THREE.DirectionalLight();
          this.add(this._xrDirectionalLight);
        }
        
        this._xrLightProbe.sh.fromArray(lightProbe.sphericalHarmonics.coefficients);

        let intensityScalar = Math.max(1.0,
                              Math.max(lightProbe.mainLightIntensity.x,
                              Math.max(lightProbe.mainLightIntensity.y,
                                      lightProbe.mainLightIntensity.z)));

        this._xrDirectionalLight.color.setRGB(lightProbe.mainLightIntensity.x / intensityScalar,
                                              lightProbe.mainLightIntensity.y / intensityScalar,
                                              lightProbe.mainLightIntensity.z / intensityScalar);
        this._xrDirectionalLight.intensity = intensityScalar;
        this._xrDirectionalLight.position.copy(lightProbe.mainLightDirection);
      }

      let reflectionProbe = lightEstimation.reflectionProbe;
      if (reflectionProbe && this._renderer.capabilities.isWebGL2) {
        // Generating the PMREM cubemap is reasonably expensive, so we're going
        // to manually throttle this to only happen once a second or so. Ideally
        // the API will tell directly us when this change happens.
        if (time > this._xrLastReflectionUpdate + REFLECTION_UPDATE_RATE) {
          this._xrLastReflectionUpdate = time;
          if (!this._xrReflectionTexture) {
            this._xrReflectionTexture = reflectionProbe.cubeMap.updateWebGLEnvironmentCube(this._renderer.getContext(), null);
            this._xrReflectionCubeMap = new THREE.CubeTexture(new Array(6));

            // An unfortunate hack to get Three to consume this texture.
            let textureProperties = this._renderer.properties.get(this._xrReflectionCubeMap);
            textureProperties.__webglInit = true;
            textureProperties.__webglTexture = this._xrReflectionTexture;
          } else {
            reflectionProbe.cubeMap.updateWebGLEnvironmentCube(this._renderer.getContext(), this._xrReflectionTexture);
          }

          //this._xrEnvMap = this._xrReflectionCubeMap;
          this._xrEnvMap = this._pmremGenerator.fromCubemap(this._xrReflectionCubeMap).texture;
          this.dispatchEvent({ type: 'envmapchange' });
        }
      }
    }
  }
}