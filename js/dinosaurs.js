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
    height: 1.7,
    position: [0, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
  },
  stegosaurus: {
    name: 'Stegosaurus',
    path: 'media/models/stegosaurus/',
    height: 2.75,
    position: [0, 0, -4.5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
  },
  velociraptor: {
    name: 'Velociraptor',
    path: 'media/models/velociraptor/',
    height: 1.5,
    position: [0, 0, -3],
    animationSequence: ['Idle', 'Scratch', 'Idle', 'Shake'],
  },
  triceratops: {
    name: 'Triceratops',
    path: 'media/models/triceratops/',
    height: 2.9,
    position: [0, 0, -3],
    animationSequence: ['Idle', 'Look_Back', 'Idle', 'Look_Side'],
  },
  parasaurolophus: {
    name: 'Parasaurolophus',
    path: 'media/models/parasaurolophus/',
    height: 3,
    position: [1, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
  },
  pachycephalosaurus: {
    name: 'Pachycephalosaurus',
    path: 'media/models/pachycephalosaurus/',
    height: 3,
    position: [0, 0, -5],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
  },
  trex: {
    name: 'Tyrannosaurus Rex',
    path: 'media/models/tyrannosaurus/',
    height: 5.2,
    position: [0, 0, -7],
    animationSequence: ['Idle', 'Look_Back', 'Idle', 'Look_Side'],
    animationRoot: '_rootJoint',
    mouthNode: 'TRex Jaw_07',
    footNodes: ['TRex L Toe0_037', 'TRex R Toe0_043']
  },
  brachiosaurus: {
    name: 'Brachiosaurus',
    path: 'media/models/brachiosaurus/',
    height: 13,
    position: [0, 0, -10],
    orientation: Math.PI * -0.2,
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
  },
};

export default Dinosaurs;