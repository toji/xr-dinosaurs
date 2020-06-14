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

const BUTTON_RADIUS = 0.1;
const BUTTON_HEIGHT = 0.04;
const BUTTON_SEGMENTS = 32;

const IMAGE_RADIUS = 0.09;

// A button that can be shown both in the DOM and in XR
const textureLoader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const tmpMatrix = new THREE.Matrix4();

export class XRButtonManager {
  constructor() {
    this._buttons = [];
    this._controllers = [];
    this._frame = 0;
    this.active = true;

    this.selectEventListener = (event) => {
      this.onSelect(event.target);
    };

    let buttonGeometry = new THREE.CylinderBufferGeometry(BUTTON_RADIUS, BUTTON_RADIUS, BUTTON_HEIGHT, BUTTON_SEGMENTS);
    this._buttonMesh = new THREE.Mesh(
      buttonGeometry,
      new THREE.MeshLambertMaterial({ color: 0xAA2222 })
    );
    this._outlineMesh = new THREE.Mesh(
      buttonGeometry,
      new THREE.MeshBasicMaterial({ color: 0xAAFFAA, side: THREE.BackSide })
    );

    this._imageGeometry = new THREE.CircleBufferGeometry(IMAGE_RADIUS, BUTTON_SEGMENTS);
  }

  createButton(options) {
    let button = new XRButton(
      this._buttonMesh.clone(),
      this._outlineMesh.clone(),
      this._imageGeometry,
      options);
    this._buttons.push(button);
    return button;
  }

  addController(controller) {
    this._controllers.push(controller);
    controller.addEventListener('select', this.selectEventListener);
  }

  removeController(controller) {
    const index = this._controllers.indexOf(controller);
    if (index > -1) {
      this._controllers.splice(index, 1);
      controller.removeEventListener('select', this.selectEventListener);
    }
  }

  onSelect(controller) {
    if (this.active) {
      let hovered = this.getHoveredButtons(controller);
      if (hovered && hovered.length > 0) {
        hovered[0].click();
      }
    }
  }

  getHoveredButtons(controller) {
    let hovered = [];
    tmpMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tmpMatrix);
    for (let button of this._buttons) {
      let intersects = raycaster.intersectObject(button._buttonMesh);
      if (intersects && intersects.length) {
        hovered.push(button);
      }
    }
    return hovered;
  }

  update(delta) {
    this._frame++;

    for (let controller of this._controllers) {
      let hovered = this.getHoveredButtons(controller);

      for (let button of hovered) {
        button._hoveredFrame = this._frame;
      }
    }

    for (let button of this._buttons) {
      button.hovered = (button._hoveredFrame == this._frame);
    }

    // TODO: Allow button presses via controller contact
  }
}

class XRButton extends THREE.Group {
  constructor(buttonMesh, outlineMesh, imageGeometry, options = {}) {
    super();

    this._buttonMesh = buttonMesh;
    this._buttonMesh.position.y = BUTTON_HEIGHT * 0.5;
    this.add(this._buttonMesh);

    this._outlineMesh = outlineMesh;
    this._outlineMesh.position.copy(this._buttonMesh.position);
    this._outlineMesh.scale.multiplyScalar(1.05);
    this._outlineMesh.visible = false;
    this.add(this._outlineMesh);

    if (options.imageUrl) {
      this._imageUrl = options.imageUrl;
      this._texture = textureLoader.load(options.imageUrl);

      if (options.imageOffset) {
        this._texture.offset.x = options.imageOffset[0];
        this._texture.offset.y = 1.0 - (options.imageOffset[1]+0.25);
        this._texture.repeat.x = 0.25;
        this._texture.repeat.y = 0.25;
      }

      this._imageMesh = new THREE.Mesh(
        imageGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          map: this._texture
        })
      );
      this._imageMesh.rotateX(Math.PI * -0.5);
      this._imageMesh.position.y = BUTTON_HEIGHT * 1.01;
      this.add(this._imageMesh);
    }

    this._hovered = false;

    this._domElement = null;

    this._title = options.title;
    this._onClick = options.onClick;
    this._onHoverStart = options.onHoverStart;
    this._onHoverEnd = options.onHoverEnd;
    this._hoveredFrame = 0;
    this._imageOffset = options.imageOffset;
  }

  get hovered() {
    return this._hovered;
  }

  set hovered(value) {
    if (this._hovered == value) {
      return;
    }
    this._hovered = value;
    if (value) {
      this._outlineMesh.visible = true;
      if (this._onHoverStart) { this._onHoverStart(); }
    } else {
      this._outlineMesh.visible = false;
      if (this._onHoverEnd) { this._onHoverEnd(); }
    }
  }

  click() {
    if (this._onClick) { this._onClick(); }
  }
}