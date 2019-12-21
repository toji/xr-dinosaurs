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

export let Dinosaurs = {
  ankylosaurus: {
    name: 'Ankylosaurus',
    description: `She may be covered in spikes, but our Ankylosaur is actually quite cuddly and loves to meet new friends! Think of her as a big, prehistoric puppy.`,
    path: 'media/models/ankylosaurus/',
    file: 'compressed.glb',
    height: 1.8,
    position: [0, 0, -5],
    buttonAtlasOffset: [0, 0],
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
    description: `Strong and proud, the Stegosaurus is one of our more popular dinosaurs. She favorite thing is getting her plates scrubbed clean so they stay such a beautiful, shiny red.`,
    path: 'media/models/stegosaurus/',
    file: 'compressed.glb',
    height: 4.3,
    position: [1, 0, -5],
    buttonAtlasOffset: [0, 0.25],
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
    description: `You've probably heard these smart dinosaurs called "Velociraptors", but those were actually quite small. Our Utahraptor is much closer in size to the dinosaurs you know and love from the big screen.`,
    path: 'media/models/velociraptor/',
    file: 'compressed.glb',
    height: 2.0,
    position: [-0.5, 0, -4],
    buttonAtlasOffset: [0.75, 0.25],
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
    description: `Our youngest dinosaur, this juvenile Triceratops is a smaller than a full grown adult would be. Spunky and playful, she loves being the center of attention.`,
    path: 'media/models/triceratops/',
    file: 'compressed.glb',
    height: 2.8,
    position: [0.5, 0, -3.5],
    buttonAtlasOffset: [0.25, 0.25],
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
    description: `Our Parasaurolophus is a mischevious, silly dinosaur. The long crest on her head acts like a trumpet, which she loves using to surprise park guests.`,
    path: 'media/models/parasaurolophus/',
    file: 'compressed.glb',
    height: 4,
    position: [1, 0, -5],
    buttonAtlasOffset: [0.75, 0],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Parasaurolophus_L_Toe01_032',
      'Parasaurolophus_R_Toe01_037'
    ],
    shadowSize: 2.0,
  },
  pachycephalosaurus: {
    name: 'Pachycephalosaurus',
    description: `This sweet "Pachy" is one of our older dinosaurs. She's a bit shy and gets nervous around new people, but is incredibly gentle.`,
    path: 'media/models/pachycephalosaurus/',
    file: 'compressed.glb',
    height: 3,
    position: [0, 0, -5],
    buttonAtlasOffset: [0.5, 0],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Pachycephalosaurus_L_Toe01_030',
      'Pachycephalosaurus_R_Toe01_035'
    ],
    shadowSize: 2.0,
  },
  trex: {
    name: 'Tyrannosaurus Rex',
    description: `Don't let the big teeth scare you, our T-Rex is really a big softie that loves showing off. Her hobbies include making stompy noises with her feet and going for runs around her pen.`,
    path: 'media/models/tyrannosaurus/',
    file: 'compressed.glb',
    height: 5,
    position: [0, 0, -7],
    buttonAtlasOffset: [0.5, 0.25],
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
    description: `Our biggest dinosaur by far, she weighs as much as 12 elephants! But don't worry, she's very friendly, and we've taught her to be extremely careful about where she's stepping!`,
    path: 'media/models/brachiosaurus/',
    file: 'compressed.glb',
    height: 12,
    position: [0, 0, -10],
    orientation: Math.PI * -0.2,
    buttonAtlasOffset: [0.25, 0],
    animationSequence: ['Idle', 'Idle_2', 'Idle_3'],
    shadowNodes: [
      'Brachiosaurus_L_Toe01_032',
      'Brachiosaurus_R_Toe01_037',
      'Brachiosaurus_L_Finger0_010',
      'Brachiosaurus_R_Finger0_015'
    ],
    shadowSize: 4.5,
  },
  pterodactyl: {
    name: 'Pterodactyl',
    path: 'media/models/pterodactyl/',
    file: 'compressed.glb',
    height: 1.8,
    position: [2, 0, -2],
    buttonAtlasOffset: [0, 0.5],
    animationSequence: ['Idle', 'Look_Side', 'Take_Off', 'Hovering', 'Fall', 'Land'],
    debugOnly: true
  }
};
