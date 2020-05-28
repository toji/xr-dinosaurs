// This code is based heavily off of the wonderful WebXR locomotion tutorial at
// https://medium.com/samsung-internet-dev/vr-locomotion-740dafa85914
// Thank you, Ada!
// My primary contribution was making the rendering fit the app's style better
// and doing a bit of additional encapsulation and abstraction work.

import * as THREE from './third-party/three.js/build/three.module.js';

const OFFSET_VEC = new THREE.Vector3();

export class XRLocomotionEffect extends THREE.Object3D {
  constructor() {
    super();
    this.duration = 0;
  }

  startEffect(outputPos, startPos, endPos) {}
  updateEffect(outputPos, startPos, endPos, t) {}
  endEffect(outputPos, startPos, endPos) {
    outputPos.copy(endPos);
  }
}

// Immediately jump to the destination with no transition
export const XRLocomotionEffectSnap = XRLocomotionEffect;

// Quickly slide to the new location.
export class XRLocomotionEffectSlide extends XRLocomotionEffect {
  // It it's HIGHLY recommended that you don't set the duration to more than,
  // say, 0.25. Some users are highly sensitive to camera motion in VR, and the
  // longer this effect takes the more it's likely to bother them.
  constructor(duration = 0.1) {
    super();
    this.duration = duration;
  }

  updateEffect(outputPos, startPos, endPos, t) {
    outputPos.lerpVectors(startPos, endPos, t);
  }
}

// Fade the scene out, jump to the new location, and fade the scene back in.
// This is probably the most comfortable for the largest number of users.
export class XRLocomotionEffectFade extends XRLocomotionEffect {
  constructor(duration = 0.5) {
    super();
    this.duration = duration;
    this.moved = false;

    this.fadeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        opacity: { value: 0.0 },
      },

      transparent: true,
      depthWrite: false,
      depthTest: false,

      vertexShader: `
        void main() {
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: `
        uniform float opacity;
        void main() {
          gl_FragColor = vec4(0, 0, 0, opacity);
        }`
    });
    // When you absolutely, positively MUST be rendered dead last.
    this.fadeMaterial.renderOrder = Number.MAX_SAFE_INTEGER;

    this.fadeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2, 1, 1),
      this.fadeMaterial
    );
    this.fadeMesh.visible = false;
    this.fadeMesh.frustumCulled = false;
    this.add(this.fadeMesh);
  }

  startEffect(outputPos, startPos, endPos) {
    this.fadeMesh.visible = true;
    this.moved = false;
  }

  updateEffect(outputPos, startPos, endPos, t) {
    this.fadeMaterial.uniforms.opacity.value = 1.0 - (Math.abs(t - 0.5) * 2.0);
    if (!this.moved && t >= 0.5) {
      outputPos.copy(endPos);
      this.moved = true;
    }
  }

  endEffect() {
    this.fadeMesh.visible = true;
    if (!this.moved) {
      outputPos.copy(endPos);
    }
  }
}

export class XRLocomotionManager extends THREE.Group {
  constructor(options = {}) {
    super();

    this.enabled = true;

    this.inputs = [];
    this.teleportingInput = null;
    this.effect = options.effect || new XRLocomotionEffectFade();

    // Callbacks for apps using the manager to hook into.
    this.startSelectDestinationCallback = options.startSelectDestinationCallback || null;
    this.endSelectDestinationCallback = options.endSelectDestinationCallback || null;
    this.startTransitionCallback = options.startTransitionCallback || null;
    this.endTransitionCallback = options.endTransitionCallback || null;

    this.transition = {
      active: false,
      startTime: 0,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
    };

    this.teleportGuide = new XRTeleportGuide(options);
    this.teleportGuide.visible = false;
    this.add(this.teleportGuide);
  }

  watchController(controller) {
    const input = {
      controller,
      inputSource: null,
      touchpadActive: false,
      thumbstickActive: false
    };
    this.inputs.push(input);
    controller.addEventListener('connected', (event) => {
      input.inputSource = event.data;
    });
  }

  //onBeforeRender(renderer, scene, camera, geometry, material, group) {
  update(renderer, camera) {
    if (!this.enabled) { return; }

    // If a transition is in progress finish it before allowing further locomotion
    if (this.transition.active) {
      const elapsed = this.teleportGuide.clock.getElapsedTime() - this.transition.startTime;
      if (elapsed >= this.effect.duration) {
        this.endTransition();
      } else {
        this.effect.updateEffect(this.position, this.transition.startPos, this.transition.endPos, elapsed / this.effect.duration);
      }
      return;
    }

    for (let input of this.inputs) {
      const gamepad = input.inputSource ? input.inputSource.gamepad : null;
      if(!gamepad) { continue; }

      // TODO: Would be nice to make these more configurable, but for now I'm
      // going to statically map them. Either pressing the touchpad or holding
      // the thumbstick forward will trigger teleportation.

      // Touchpad pressed
      if (gamepad.buttons.length > 2 && gamepad.buttons[2].pressed) {
        if (!input.touchpadActive) {
          input.touchpadActive = true;
          this.startSelectDestination(input);
        }
      } else if (input.touchpadActive) {
        if (input.touchpadActive) {
          this.endSelectDestination(input, renderer, camera);
          input.touchpadActive = false;
        }
      }

      // Thumbstick forward
      if (gamepad.axes.length > 3 && gamepad.axes[3] < -0.7) {
        if (!input.thumbstickActive) {
          input.thumbstickActive = true;
          this.startSelectDestination(input);
        }
      } else if (input.thumbstickActive) {
        if (input.thumbstickActive) {
          this.endSelectDestination(input, renderer, camera);
          input.thumbstickActive = false;
        }
      }
    }

    if (this.teleportingInput) {
      this.teleportGuide.updateGuideForController(this.teleportingInput.controller);
    }
  }

  startSelectDestination(input) {
    if (this.teleportingInput) { return; }
    this.teleportingInput = input;
    this.teleportGuide.visible = true;
    if (this.startSelectDestinationCallback) {
      this.startSelectDestinationCallback(input.controller);
    }
  }

  endSelectDestination(input, renderer, camera) {
    if (!input || input != this.teleportingInput) { return; }

    const xrCamera = renderer.xr.getCamera(camera);
    const validDest = this.teleportGuide.getTeleportOffset(OFFSET_VEC, xrCamera, this.teleportingInput.controller);

    if (this.endSelectDestinationCallback) {
      this.endSelectDestinationCallback(input.controller);
    }

    if (validDest) {
      // Transition the camera group by the given offset.
      this.transition.startTime = this.teleportGuide.clock.getElapsedTime();
      this.transition.startPos.copy(this.position);
      this.transition.endPos.copy(this.position);
      this.transition.endPos.add(OFFSET_VEC);
      this.transition.active = true;
      this.add(this.effect);

      if (this.startTransitionCallback) {
        this.startTransitionCallback(this.transition.startPos, this.transition.endPos);
      }

      this.effect.startEffect(this.position, this.transition.startPos, this.transition.endPos);
      if (this.effect.duration == 0) {
        // Special case for zero-length transitions
        this.endTransition();
      }
    }

    this.teleportingInput = null;
    this.teleportGuide.visible = false;
  }

  endTransition() {
    if (!this.transition.active) { return; }
    this.effect.endEffect(this.position, this.transition.startPos, this.transition.endPos);
    this.remove(this.effect);
    this.transition.active = false;
    if (this.endTransitionCallback) {
      this.endTransitionCallback();
    }
  }
}

//
// Teleportation guideline
//

const DEFAULT_GUIDE_OPTIONS = {
  color: new THREE.Color(0x00ffff),
  invalidColor: new THREE.Color(0xdd0000),
  validDestinationCallback: null,
  targetTexture: null,
  rayRadius: 0.06,
  raySegments: 16,
  dashCount: 8,
  dashSpeed: 0.2,
  teleportVelocity: 8,
  groundHeight: 0
};

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

export class XRTeleportGuide extends THREE.Group {
  constructor(options) {
    super();

    this.options = Object.assign({}, DEFAULT_GUIDE_OPTIONS, options);

    const r = this.options.rayRadius;

    let guidePositions = [];
    let guideUVs = [];
    let guideIndices = [];

    // The guideline is a cross-chaped beam, rendered with a 1D texture fade
    // and additive blending so that it displays well in almost any situation.

    // Positions will have to be recomputed every frame, so we're really just
    // filling in dummy values here. The rest of the mesh will stay constant.
    for (let i = 0; i < this.options.raySegments; ++i) {
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

      const t1 = (i+1) / this.options.raySegments;

      guidePositions.push(
        0, r, -t1,
        0, -r, -t1,
        r, 0, -t1,
        -r, 0, -t1);

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

    let dashFactor = 2.0 * Math.PI * this.options.dashCount;
    if (Number.isInteger(dashFactor)) {
      // This is silly, but we have to do it to ensure that injecting the dash
      // count into the shader won't break if we happen to land on an integer
      // value (like 0)
      dashFactor = dashFactor + '.0';
    }

    const guideTexture = new THREE.DataTexture(RAY_TEXTURE_DATA, 48, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: guideTexture },
        color: { value: this.options.color },
        time: { value: 0.0 },
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
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;

        const float fadePoint = 0.05; // Fade out the last 5% of the line

        void main() {
          float end_fade_factor = clamp((vUv.y - fadePoint) / (fadePoint), 0.0, 1.0);
          float dash_fade_factor = clamp(sin(((vUv.y + time) * ${dashFactor}) + 1.5) + 0.5, 0.0, 1.0);
          vec4 rayColor = vec4(color, 1.0) * texture2D(map, vUv);
          float opacity = rayColor.a * dash_fade_factor * end_fade_factor;
          gl_FragColor = vec4(rayColor.rgb * opacity, opacity);
        }`
    });

    this.guidelineMesh = new THREE.Mesh(geometry, material);
    this.add(this.guidelineMesh);

    if (this.options.targetTexture) {
      this.targetMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 0.75, 1, 1),
        new THREE.MeshBasicMaterial({
            map: this.options.targetTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
        })
      );
    } else {
      this.targetMesh = new XRDefaultTeleportTarget(this.options.color);
    }

    this.targetMesh.rotation.x = -Math.PI * 0.5;
    this.add(this.targetMesh);

    this.clock = new THREE.Clock();

    this.uniforms = material.uniforms;
    this.wasValid = true;
  }

  // Updates the rendered guideline to match the given controller
  updateGuideForController(controller) {
    const r = this.options.rayRadius;

    // Controller start position
    const p = controller.getWorldPosition(TMP_VEC_P);

    // Set Vector V to the direction of the controller, at 1m/s
    const v = controller.getWorldDirection(TMP_VEC_V);

    // Rotate the target texture to always be oriented the same way as the guide beam.
    this.targetMesh.rotation.z = Math.atan2(v.x, v.z);

    // Scale the initial velocity
    v.multiplyScalar(this.options.teleportVelocity);

    // Time for tele ball to hit ground
    const t = (-v.y + Math.sqrt(v.y**2 - 2*p.y*GRAVITY.y))/GRAVITY.y;

    const segments = this.options.raySegments;
    const vert = TMP_VEC.set(0,0,0);
    let guidePositions = [];
    for (let i = 0; i <= segments; i++) {
        // Set vertex to current position of the virtual ball at time t
        guidePositionAtT(vert, i*t/segments, p, v, GRAVITY);
        this.worldToLocal(vert);

        // TODO: The cross section here is wrong, and will get "squished" as the
        // guide becomes more vertical or the user turns.
        guidePositions.push(
          vert.x, vert.y + r, vert.z,
          vert.x, vert.y - r, vert.z,
          vert.x + r, vert.y, vert.z,
          vert.x - r, vert.y, vert.z);
    }

    const geometry = this.guidelineMesh.geometry;
    geometry.attributes.position.array.set(guidePositions);
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();

    // Check to see if our destination point is valid
    guidePositionAtT(vert, t, p, v, GRAVITY);
    const isValid = this.options.validDestinationCallback ? this.options.validDestinationCallback(vert) : true;

    if (isValid) {
      // Place the target mesh near the end of the guide
      guidePositionAtT(this.targetMesh.position, t*0.98, p, v, GRAVITY);
      this.worldToLocal(this.targetMesh.position);

      // Update the timer for the scrolling dashes
      this.uniforms.time.value = this.clock.getElapsedTime() * this.options.dashSpeed;
    }

    // If the teleportation target has switched from valid to invalid or visa-versa
    // then change the style of the guideline/target to indicate that.
    if (isValid && !this.wasValid) {
      this.uniforms.color.value = this.options.color;
      this.targetMesh.visible = true;
    } else if (!isValid && this.wasValid) {
      this.uniforms.color.value = this.options.invalidColor;
      this.targetMesh.visible = false;
    }

    this.wasValid = isValid;
  }

  // Get's the offset from the target's current location to the teleport destination
  // Returns true if that destination is a valid one to teleport to.
  getTeleportOffset(outputVector, target, controller) {
    // feet position
    const feetPos = target.getWorldPosition(TMP_VEC);
    feetPos.y = 0;

    // cursor position
    const p = controller.getWorldPosition(TMP_VEC_P);
    const v = controller.getWorldDirection(TMP_VEC_V);
    v.multiplyScalar(this.options.teleportVelocity);
    const t = (-v.y  + Math.sqrt(v.y**2 - 2*p.y*GRAVITY.y))/GRAVITY.y;
    guidePositionAtT(outputVector, t, p, v, GRAVITY);

    const isValid = this.options.validDestinationCallback ? this.options.validDestinationCallback(outputVector) : true;

    // Get the offset
    outputVector.sub(feetPos);

    // Return whether or not this is a valid teleport location
    return isValid;
  }
}

//
// Default teleport target mesh
//

const TARGET_OUTER_RADIUS = 0.4;
const TARGET_INNER_RADIUS = 0.2;
const TARGET_OUTER_LUMINANCE = 1.0;
const TARGET_INNER_LUMINANCE = 0.0;
const TARGET_SEGMENTS = 16;

// Creates a simple circular teleport target mesh to use when no texture is supplied
class XRDefaultTeleportTarget extends THREE.Mesh {
  constructor(color) {
    let targetVerts = [];
    let targetIndices = [];

    let segRad = (2.0 * Math.PI) / TARGET_SEGMENTS;

    // Target Ring
    for (let i = 0; i < TARGET_SEGMENTS; ++i) {
      let rad = i * segRad;
      let x = Math.cos(rad);
      let y = Math.sin(rad);
      targetVerts.push(x * TARGET_OUTER_RADIUS, y * TARGET_OUTER_RADIUS,
        TARGET_OUTER_LUMINANCE);
      targetVerts.push(x * TARGET_INNER_RADIUS, y * TARGET_INNER_RADIUS,
        TARGET_INNER_LUMINANCE);

      if (i > 0) {
        let idx = (i * 2);
        targetIndices.push(idx, idx-1, idx-2);
        targetIndices.push(idx, idx+1, idx-1);
      }
    }

    let idx = (TARGET_SEGMENTS * 2);
    targetIndices.push(0, idx-1, idx-2);
    targetIndices.push(0, 1, idx-1);

    let geometry = new THREE.BufferGeometry();
    geometry.setIndex(targetIndices);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(targetVerts), 3));

    let material = new THREE.ShaderMaterial({
      uniforms: {
        cursorColor: { value: color },
      },

      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,

      vertexShader: `
        attribute float opacity;
        varying float vLuminance;

        void main() {
          vLuminance = position.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, 0.0, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 cursorColor;
        varying float vLuminance;

        void main() {
          gl_FragColor = vec4(cursorColor * vLuminance, 1.0);
        }`
    });

    super(geometry, material);
  }
}