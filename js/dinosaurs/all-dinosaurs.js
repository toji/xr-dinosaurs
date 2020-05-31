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

import { XRDinosaur } from './xr-dinosaur.js';

export class Ankylosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/ankylosaurus/';
    this.buttonAtlasOffset = [0, 0];

    this.shadowNodeNames = [
      'Ankylosaurus_L_Toe0_031',
      'Ankylosaurus_R_Toe0_036',
      'Ankylosaurus_L_Hand_09',
      'Ankylosaurus_R_Hand_014',
      'Ankylosaurus_Tail03_040',
      'Ankylosaurus_Jaw_018'
    ];
    this.shadowSize = 2.5;

    this.animationSequence = ['Idle', 'Idle_2', 'Idle_3'];

    this.height = 1.8;
    this.position.set(0, 0, -5);
  }
}

export class Brachiosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/brachiosaurus/';
    this.buttonAtlasOffset = [0.25, 0];

    this.shadowNodeNames = [
      'Brachiosaurus_L_Toe01_032',
      'Brachiosaurus_R_Toe01_037',
      'Brachiosaurus_L_Finger0_010',
      'Brachiosaurus_R_Finger0_015'
    ];
    this.shadowSize = 2.5;

    this.animationSequence = ['Idle', 'Idle_2', 'Idle_3'];

    this.height = 12;
    this.position.set(0, 0, -10);
    this.rotation.y = Math.PI * -0.2;
  }
}

export class Dilophosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/dilophosaurus/';
    this.file = 'scene.gltf';
    this.buttonAtlasOffset = [0.0, 0.75];

    this.shadowNodeNames = [
      'Dilophosaurus_L_Toe0_037',
      'Dilophosaurus_R_Toe0_041',
      'Dilophosaurus_L_Finger0_028',
      // This critter always tends to hold his hands together, so doubling
      // up on the finger shadows makes it look too dark. As such we'll only
      // do one.
      //'Dilophosaurus_R_Finger0_033',
      'Dilophosaurus_Tail03_044',
      'Dilophosaurus_Tongue02_014'
    ];
    this.shadowSize = 1.5;

    this.animationSequence = ['Idle', 'Look_Side', 'Idle', 'Look_Back'];

    this.height = 1.9;
    this.position.set(0, 0, -4);
    this.rotation.y = Math.PI * -0.2;
  }
}

export class Pachycephalosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/pachycephalosaurus/';
    this.buttonAtlasOffset = [0.5, 0];

    this.shadowNodeNames = [
      'Pachycephalosaurus_L_Toe01_030',
      'Pachycephalosaurus_R_Toe01_035'
    ];
    this.shadowSize = 2.0;

    this.animationSequence = ['Idle', 'Idle_2', 'Idle_3'];

    this.height = 3;
    this.position.set(0, 0, -5);
  }
}

export class Parasaurolophus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/parasaurolophus/';
    this.buttonAtlasOffset = [0.75, 0];

    this.shadowNodeNames = [
      'Parasaurolophus_L_Toe01_032',
      'Parasaurolophus_R_Toe01_037'
    ];
    this.shadowSize = 2.0;

    this.animationSequence = ['Idle', 'Idle_2', 'Idle_3'];

    this.height = 4;
    this.position.set(1, 0, -5);
  }
}

export class Utahraptor extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/velociraptor/';
    this.buttonAtlasOffset = [0.75, 0.25];

    this.shadowNodeNames = [
      'Raptor_L_Toe01_044',
      'Raptor_R_Toe01_049',
      'Raptor_Tail03_052',
    ];
    this.shadowSize = 1.5;

    this.animationSequence = ['Idle', 'Scratch', 'Idle', 'Shake'];

    this.height = 2.0;
    this.position.set(-0.5, 0, -4);
  }
}

export class Spinosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/spinosaurus/';
    this.file = 'scene.gltf';
    this.buttonAtlasOffset = [0.25, 0.75];

    this.shadowNodeNames = [
      'Spinosaurus_L_Toe0_035',
      'Spinosaurus_R_Toe0_039',
      'Spinosaurus_L_Hand_023',
      'Spinosaurus_R_Hand_029',
      'Spinosaurus_Tail04_043',
      'Spinosaurus_Tongue02_010'
    ];
    this.shadowSize = 2.5;

    this.animationSequence = ['Idle', 'Look_Side', 'Idle', 'Look_Back'];

    this.height = 5.5;
    this.position.set(-25, -0.2, -43.3);
    //this.rotation.y = Math.PI * -0.2;
  }
}


export class Stegosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/stegosaurus/';
    this.buttonAtlasOffset = [0, 0.25];

    this.shadowNodeNames = [
      'Stegosaurus_L_Toe01_030',
      'Stegosaurus_R_Toe01_035',
      'Stegosaurus_L_Hand_019',
      'Stegosaurus_R_Hand_024',
      'Stegosaurus_Tail03_038',
      'Stegosaurus_Jaw_08'
    ];
    this.shadowSize = 2.5;

    this.animationSequence = ['Idle', 'Idle_2', 'Idle_3'];

    this.height = 4.3;
    this.position.set(1, 0, -5);
  }
}

export class Triceratops extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/triceratops/';
    this.buttonAtlasOffset = [0.25, 0.25];

    this.shadowNodeNames = [
      'Triceratops_L_Toe0_038',
      'Triceratops_R_Toe0_042',
      'Triceratops_L_Hand_023',
      'Triceratops_R_Hand_028',
      'Triceratops_Tail03_032',
      'Triceratops_Jaw_06'
    ];
    this.shadowSize = 2.0;

    this.animationSequence = ['Idle', 'Look_Back', 'Idle', 'Look_Side'];

    this.height = 2.8;
    this.position.set(0.5, 0, -3.5);
  }
}

export class Tyrannosaurus extends XRDinosaur {
  constructor() {
    super();

    this.path = 'media/models/tyrannosaurus/';
    this.buttonAtlasOffset = [0.5, 0.25];

    this.shadowNodeNames = [
      'TRex_L_Toe01_038',
      'TRex_R_Toe01_044',
      'TRex_Tail03_048'
    ];
    this.shadowSize = 4.0;

    this.animationSequence = ['Idle', 'Look_Back', 'Idle', 'Look_Side', 'Idle', 'Stomp'];

    this.height = 5;
    this.position.set(0, 0, -7);
  }
}

export let AllDinosaurs = {
  ankylosaurus: new Ankylosaurus(),
  brachiosaurus: new Brachiosaurus(),
  dilophosaurus: new Dilophosaurus(),
  pachycephalosaurus: new Pachycephalosaurus(),
  parasaurolophus: new Parasaurolophus(),
  raptor: new Utahraptor(),
  spinosaurus: new Spinosaurus(),
  stegosaurus: new Stegosaurus(),
  triceratops: new Triceratops(),
  trex: new Tyrannosaurus(),
};

