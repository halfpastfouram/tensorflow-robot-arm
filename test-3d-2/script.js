// Find the latest version by visiting https://unpkg.com/three. The URL will
// redirect to the newest stable release.
import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import {OrbitControls} from '../orbitcontrols.js';
import Stats from 'https://unpkg.com/three/examples/jsm/libs/stats.module.js';
import {Model} from './Model.js'

// Setup 3d environment
let camera, scene, renderer, stats;
const MAP_SIZE = 10;
const magnification = 1;

init();

function init() {
    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(2, 10, 15);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // Light
    const light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
    light.position.set(0, 1, -3);
    scene.add(light);

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;
    document.body.appendChild(renderer.domElement);

    // Grids
    const divisions = 10;

    const gridXZ = new THREE.GridHelper(MAP_SIZE, divisions);
    gridXZ.position.set(0, 0, 0);
    scene.add(gridXZ);

    const gridZY = new THREE.GridHelper(MAP_SIZE, divisions);
    gridZY.position.set(0, 0, 0);
    gridZY.rotation.x = Math.PI/2;
    scene.add(gridZY);

    // Controls
    window.addEventListener('resize', onWindowResize, false);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.update();

    document.getElementById('start').onclick = start;
    document.getElementById('stop').onclick = stop;
    document.getElementById('display').onclick = toggleDisplay;

    // Stats
    stats = new Stats();
    stats.showPanel(1);
    document.body.appendChild(stats.domElement);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    let mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    let raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects(pixels);

    if (intersects.length) {
        console.log(intersects);
    }
}

const targetX = document.getElementById('targetX');
const targetY = document.getElementById('targetY');
const targetZ = document.getElementById('targetZ');
const outputX = document.getElementById('actorX');
const outputY = document.getElementById('actorY');
const outputZ = document.getElementById('actorZ');
const outputSteps = document.getElementById('steps');
const outputReward = document.getElementById('reward');
const outputCubes = document.getElementById('cubes');
const outputRuns = document.getElementById('runs');

///////////
// TOOLS //
///////////

function drawPixel(vector, size, color, opacity) {
    if (size === undefined) {
        size = 1;
    }

    let dotGeometry = new THREE.BoxGeometry(size, size, size);

    if (color === undefined) {
        color = new THREE.Color(Math.random() * 0xffffff);
    }

    if (opacity === undefined) {
        opacity = 1;
    }

    let vectorString = vector3ToString(vector);
    if (pixels.hasOwnProperty(vectorString)) {
        let foundPixel = pixels[vectorString];
        if (foundPixel.name === 'start' && foundPixel.name === 'end') {
            return;
        } else {
            scene.remove(foundPixel);
        }
    }

    let dotMaterial = new THREE.MeshLambertMaterial({color: color, transparent: true, opacity: opacity});
    let dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(vector.x, vector.y, vector.z);
    scene.add(dot);

    return dot;
}

function vector3ToString(vector3) {
    return `${vector3.x}x${vector3.y}x${vector3.z}`;
}

function rememberPixel(pixelVector, pixel) {
    pixels[vector3ToString(pixelVector)] = pixel;
}

function randomPoint() {
    let min = - (MAP_SIZE / 2);
    let max = MAP_SIZE / 2;

    return Math.floor(Math.random() * (max - min + 1) + min);
}

function jumpDistance(vectorA, vectorB) {
    return vectorA.distanceTo(vectorB);
}

function getRandomVector() {
    return new THREE.Vector3(
      randomPoint(),
      randomPoint(),
      randomPoint()
    );
}

function start() {
    active = true;
    working = false;
}

function stop() {
    active = false;
    working = false;
}

function toggleDisplay() {
    display = !display;
}

//////////////////////////
// Neural network setup //
//////////////////////////

const numActions = 6;

// Now we initialize our model, and start adding layers
const model = new Model(3, 1, numActions, 1000);

//////////
// Work //
//////////

let pixels = {};
let steps = 0;
let active = false;
let working = false;
let display = true;
let totalReward = 0;
let epsilon = .5;
let gradients = [];
let optimizer = tf.train.adam(0.05);

// Set a random state:
let actorVector = getRandomVector();
let targetVector = getRandomVector();

// Draw actor and target on canvas:
let actor = drawPixel(actorVector, 1, new THREE.Color(0x00ff00), .5);
let target = drawPixel(targetVector, 1, new THREE.Color(0xff0000), .5);
rememberPixel(actorVector, actor);
rememberPixel(targetVector, target);
actor.name = 'start';
target.name = 'name';

// Calculate initial distance:
let distance = jumpDistance(actorVector, targetVector);

// Display target coordinates on screen:
targetX.value = targetVector.x;
targetY.value = targetVector.y;
targetZ.value = targetVector.z;

async function doWork()
{
    if (active && ! working) {
        working = true;

        // Gather inputs
        let distance_before = jumpDistance(actorVector, targetVector)
        let stateTensor = tf.tensor2d(
            [actorVector.x, actorVector.y, actorVector.z, targetVector.x, targetVector.y, targetVector.z],
            [6, 1]
        );

        stateTensor.print()

        // Step the learning
        steps++;
        let action = model.chooseAction(stateTensor, epsilon);
        if (action === 0) {
            actorVector.setX(actorVector.x + 1); // Right
        } else if (action === 1) {
            actorVector.setX(actorVector.x - 1); // Left
        } else if (action === 2) {
            actorVector.setY(actorVector.y + 1); // Down
        } else if (action === 3) {
            actorVector.setY(actorVector.y - 1); // UP
        } else if (action === 4) {
            actorVector.setZ(actorVector.z + 1); // Back
        } else if (action === 5) {
            actorVector.setZ(actorVector.z - 1) // Forth
        }

        if (actorVector.x < -MAP_SIZE/2) {
            actorVector.x = -MAP_SIZE/2;
        } else if (actorVector.x > MAP_SIZE/2) {
            actorVector.x = MAP_SIZE / 2;
        }

        if (actorVector.y < -MAP_SIZE/2) {
            actorVector.y = -MAP_SIZE/2;
        } else if (actorVector.y > MAP_SIZE/2) {
            actorVector.y = MAP_SIZE/2;
        }

        if (actorVector.z < -MAP_SIZE/2) {
            actorVector.z = -MAP_SIZE/2;
        } else if (actorVector.z > MAP_SIZE/2) {
            actorVector.z = MAP_SIZE/2;
        }

        outputX.value = actorVector.x;
        outputY.value = actorVector.y;
        outputZ.value = actorVector.z;
        outputSteps.value = steps;

        let distance_after = jumpDistance(actorVector, targetVector);
        let reward = (distance_before === distance_after) ? -0.1 : distance_before - distance_after;
        totalReward += reward;
        outputReward.value = totalReward;
        outputCubes.value = Object.keys(pixels).length;

        // Reward extra for being on the same axis, but only when the current step is closer than the previous step.
        // This immensely reduces the total amount of steps.
        if (distance_before > distance_after) {
            if (actorVector.x === targetVector.x) {
                reward += 0.05;
            }
            if (actorVector.y === targetVector.y) {
                reward += 0.05;
            }
            if (actorVector.z === targetVector.z) {
                reward += 0.05;
            }
        }

        if (display) {
            let pixel;
            rememberPixel(actorVector, pixel = drawPixel(actorVector, .5, new THREE.Color(0x00ff00 * reward)));
            pixel.reward = reward;
        }

        let nextStateTensor = tf.tensor2d(
            [actorVector.x, actorVector.y, actorVector.z, targetVector.x, targetVector.y, targetVector.z],
            [6, 1]
        );

        if (distance_before > distance_after) {
            stateTensor.print()
            nextStateTensor.print()

            model.train(
              stateTensor,
              nextStateTensor
            );
        }

        gradients.push([stateTensor, nextStateTensor, reward]);

        if (
            actorVector.x === targetVector.x
            && actorVector.y === targetVector.y
            && actorVector.z === targetVector.z
        ) {
            console.info(`Target: ${distance} Steps: ${steps} Delta: ${(steps - distance)}`);

            restart();
        } else if(steps > 500) {
            console.info('Failed to come up with a solution in 500 steps.');
            console.info(`Target: ${distance} Delta: ${(steps - distance)}`);
            restart();
        }

        working = false;
    }
}

function restart() {
    // Clear all pixels:
    for (let k in pixels) {
        scene.remove(pixels[k]);
    }

    // Generate new target and actor:
    pixels      = [];
    actorVector = getRandomVector();
    targetVector = getRandomVector();
    if (display) {
        rememberPixel(actorVector, actor = drawPixel(actorVector, 1, new THREE.Color(0x00ff00), .5));
        rememberPixel(targetVector, target = drawPixel(targetVector, 1, new THREE.Color(0xff0000), .5));
        actor.name = 'start';
        target.name = 'name';
    }
    distance = jumpDistance(actorVector, targetVector);
    steps = 0;
    totalReward = 0;
    gradients = [];

    targetX.value = targetVector.x;
    targetY.value = targetVector.y;
    targetZ.value = targetVector.z;

    outputSteps.value = steps;
    outputReward.value = totalReward;
    outputCubes.value = Object.keys(pixels).length;
    outputRuns.value = parseInt(outputRuns.value, 10) + 1;
}

const fps = 60;
async function animate() {
    setTimeout(function() {
        // slow down render speed
        requestAnimationFrame(animate);
    }, 1000/fps);

    await doWork();
    renderer.render(scene, camera);
    stats.update();
}

animate();
