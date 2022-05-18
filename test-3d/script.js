// Find the latest version by visiting https://unpkg.com/three. The URL will
// redirect to the newest stable release.
import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import { OrbitControls } from '../orbitcontrols.js';
import Stats from 'https://unpkg.com/three/examples/jsm/libs/stats.module.js';
import * as Utils from '../utils/tools.js';

// Setup 3d environment
let camera, scene, renderer, stats;
const MAP_SIZE = 10;
const magnification = 1;
Utils.setMapSize(MAP_SIZE);

init();

function init() {
    // Camera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(2, 10, 15);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    Utils.setScene(scene);

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

/////////////////////////////
// Actor and academy setup //
/////////////////////////////

ReImprove.setBackend('cpu');
const modelFitConfig = {
    epochs: 1,
    stepsPerEpoch: 24
};

const numActions = 6;
const inputSize = 6;
// The window of data which will be sent yo your agent. For instance the x previous inputs, and what actions
// the agent took
const temporalWindow = 1;

const totalInputSize = inputSize * temporalWindow + numActions * temporalWindow + inputSize;

const network = new ReImprove.NeuralNetwork();
network.InputShape = [totalInputSize];
network.addNeuralNetworkLayers([
    {type: 'dense', units: 32, activation: 'relu'},
    {type: 'dense', units: numActions, activation: 'softmax'}
]);

// Now we initialize our model, and start adding layers
let model = new ReImprove.Model.FromNetwork(network, modelFitConfig);

// Finally compile the model, we also exactly use tfjs's optimizers and loss functions
// (So feel free to choose one among tfjs's)
if (localStorage.getItem('tensorflowjs_models/RL-model/info')) {
    model.loadFromFile('localstorage://RL-model').then(() => {
        model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
        console.info('Loaded model from local storage.');
    });
} else {
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
}

// Every single field here is optional, and has a default value. Be careful, it may not fit your needs ...
const teacherConfig = {
    lessonsQuantity: 10000,
    lessonLength: 20,
    lessonsWithRandom: 2,
    epsilon: 0.5,
    epsilonDecay: 0.995,
    epsilonMin: 0.05,
    gamma: 0.9
};

const agentConfig = {
    model: model,
    agentConfig: {
        memorySize: 1000,                      // The size of the agent's memory (Q-Learning)
        batchSize: 128,                        // How many tensors will be given to the network when fit
        temporalWindow: temporalWindow         // The temporal window giving previous inputs & actions
    }
};

// First we need an academy to host everything
const academy = new ReImprove.Academy();
const teacher = academy.addTeacher(teacherConfig);
const agent = academy.addAgent(agentConfig);

academy.assignTeacherToAgent(agent, teacher);

//////////
// Work //
//////////

let actorVector = Utils.getRandomVector();
let targetVector = Utils.getRandomVector();
let actor = Utils.drawPixel(actorVector, 1, new THREE.Color(0x00ff00), .5);
let target = Utils.drawPixel(targetVector, 1, new THREE.Color(0xff0000), .5);
actor.name = 'start';
target.name = 'name';
let distance = Utils.jumpDistance(actorVector, targetVector);
let steps = 0;
let active = false;
let working = false;
let display = true;
let totalReward = 0;

Utils.rememberPixel(actorVector, actor);
Utils.rememberPixel(targetVector, target);
targetX.value = targetVector.x;
targetY.value = targetVector.y;
targetZ.value = targetVector.z;

// This seems to be the quickest backend for my situation.
function doWork()
{
    if (active && ! working) {
        working = true;

        // Gather inputs
        let distance_before = Utils.jumpDistance(actorVector, targetVector)
        let inputs = [actorVector.x, actorVector.y, actorVector.z, targetVector.x, targetVector.y, targetVector.z];

        // Step the learning
        academy.step([{teacherName: teacher, agentsInput: inputs}]).then(function (result) {
            // Take Action
            if (result !== undefined) {
                steps++;
                var action = result.get(agent);
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

            let distance_after = Utils.jumpDistance(actorVector, targetVector);
            let reward = (distance_before === distance_after) ? -0.1 : distance_before - distance_after;
            totalReward += reward;
            outputReward.value = totalReward;
            outputCubes.value = Object.keys(Utils.getPixels()).length;

            if (display) {
                let pixel;
                Utils.rememberPixel(actorVector, pixel = Utils.drawPixel(actorVector, .5, new THREE.Color(0x00ff00 * reward)));
                pixel.reward = reward;
            }

            academy.addRewardToAgent(agent, reward);

            if (
                actorVector.x === targetVector.x
                && actorVector.y === targetVector.y
                && actorVector.z === targetVector.z
            ) {
                console.info(`Target: ${distance} Steps: ${steps} Delta: ${(steps - distance)}`);

                // Save trained model:
                model.model.save('localstorage://RL-model').then(() => {
                    console.info('Saved model to localstorage');
                });

                // Clear all pixels:
                let pixels = Utils.getPixels();
                for (let k in pixels) {
                    scene.remove(pixels[k]);
                }

                // Generate new target and actor:
                Utils.clearPixels();
                actorVector = Utils.getRandomVector();
                targetVector = Utils.getRandomVector();
                if (display) {
                    Utils.rememberPixel(actorVector, actor = Utils.drawPixel(actorVector, 1, new THREE.Color(0x00ff00), .5));
                    Utils.rememberPixel(targetVector, target = Utils.drawPixel(targetVector, 1, new THREE.Color(0xff0000), .5));
                    actor.name = 'start';
                    target.name = 'name';
                }
                distance = Utils.jumpDistance(actorVector, targetVector);
                steps = 0;
                totalReward = 0;

                targetX.value = targetVector.x;
                targetY.value = targetVector.y;
                targetZ.value = targetVector.z;

                outputSteps.value = steps;
                outputReward.value = totalReward;
                outputCubes.value = Object.keys(pixels).length;
            }
        });
        working = false;
    }
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

function animate() {
    requestAnimationFrame(animate);

    doWork();
    renderer.render(scene, camera);
    stats.update();
}

animate();
