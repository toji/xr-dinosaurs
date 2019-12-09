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

// All heights, positions, and other distances are in meters.

let Dinosaurs = {
  ankylosaurus: {
    name: 'Ankylosaurus',
    path: 'media/models/ankylosaurus/',
    height: 1.8,
    position: [0, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],

    // These are the joints in the dinosaurs skeleton that will have a blob
    // shadow associated with them. The shadow will appear as a dark fuzzy blob
    // directly beneath the joint at Y ~= 0 and will be attenuated by the
    // distance from the ground. In many therapods you can get away with only
    // adding shadows to the feet, but in the case of something like the
    // Ankylosaurus, which has a large club on the end of it's tail and a very
    // low head, we want to add shadow blobs to those as well.
    shadowNodes: [
      'Ankylosaurus_L_Toe0_031',
      'Ankylosaurus_R_Toe0_036',
      'Ankylosaurus_L_Hand_09',
      'Ankylosaurus_R_Hand_014',
      'Ankylosaurus_Tail03_040',
      'Ankylosaurus_Jaw_018'
    ],
    shadowSize: 2.5,
  },
  stegosaurus: {
    name: 'Stegosaurus',
    path: 'media/models/stegosaurus/',
    height: 4.3,
    position: [1, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Stegosaurus_L_Toe01_030',
      'Stegosaurus_R_Toe01_035',
      'Stegosaurus_L_Hand_019',
      'Stegosaurus_R_Hand_024',
      'Stegosaurus_Tail03_038',
      'Stegosaurus_Jaw_08'
    ],
    shadowSize: 2.5,
  },
  raptor: {
    name: 'Utahraptor',
    path: 'media/models/velociraptor/',
    height: 2.0,
    position: [0, 0, -4],
    animationSequence: ['Idle', 'Scratch', 'Idle', 'Shake'],
    // The raptor is small enough that a single blob shadow on the root node
    // gives us pretty much the results we want.
    shadowNodes: [
      'Raptor_L_Toe01_044',
      'Raptor_R_Toe01_049',
      'Raptor_Tail03_052',
    ],
    shadowSize: 1.5,
  },
  triceratops: {
    name: 'Triceratops',
    path: 'media/models/triceratops/',
    height: 3,
    position: [0.5, 0, -3.5],
    animationSequence: ['Idle', 'Look_Back', 'Idle', 'Look_Side'],
    shadowNodes: [
      'Triceratops_L_Toe0_038',
      'Triceratops_R_Toe0_042',
      'Triceratops_L_Hand_023',
      'Triceratops_R_Hand_028',
      'Triceratops_Tail03_032',
      'Triceratops_Jaw_06'
    ],
    shadowSize: 2.0,
  },
  parasaurolophus: {
    name: 'Parasaurolophus',
    path: 'media/models/parasaurolophus/',
    height: 4,
    position: [1, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Parasaurolophus_L_Toe01_032',
      'Parasaurolophus_R_Toe01_037'
    ],
    shadowSize: 2.0,
  },
  pachycephalosaurus: {
    name: 'Pachycephalosaurus',
    path: 'media/models/pachycephalosaurus/',
    height: 3,
    position: [0, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Pachycephalosaurus_L_Toe01_030',
      'Pachycephalosaurus_R_Toe01_035'
    ],
    shadowSize: 2.0,
  },
  trex: {
    name: 'Tyrannosaurus Rex',
    path: 'media/models/tyrannosaurus/',
    height: 5,
    position: [0, 0, -7],
    animationSequence: ['Idle', 'Look_Back', 'Idle', 'Look_Side', 'Idle', 'Stomp'],
    animationRoot: '_rootJoint',
    mouthNode: 'TRex Jaw_07',
    shadowNodes: [
      'TRex_L_Toe01_038',
      'TRex_R_Toe01_044',
      'TRex_Tail03_048'
    ],
    shadowSize: 4.0,
  },
  brachiosaurus: {
    name: 'Brachiosaurus',
    path: 'media/models/brachiosaurus/',
    height: 12,
    position: [0, 0, -10],
    orientation: Math.PI * -0.2,
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Brachiosaurus_L_Toe01_032',
      'Brachiosaurus_R_Toe01_037',
      'Brachiosaurus_L_Finger0_010',
      'Brachiosaurus_R_Finger0_015'
    ],
    shadowSize: 4.5,
  },
  
};

export default Dinosaurs;