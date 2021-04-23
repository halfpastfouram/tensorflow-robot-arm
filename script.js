import Stats from 'https://unpkg.com/three/examples/jsm/libs/stats.module.js';
import * as Utils from './utils/tools.js';
import {setMapSize} from "./utils/tools.js";

let camera, scene, renderer, stats;
let lowerArmRot, lowerArmBend, elbowBend;
let wristRot, wristBend, fingersRot;
let tip;

const targetX = document.getElementById('targetX');
const targetY = document.getElementById('targetY');
const targetZ = document.getElementById('targetZ');
const outputX = document.getElementById('actorX');
const outputY = document.getElementById('actorY');
const outputZ = document.getElementById('actorZ');
const outputSteps = document.getElementById('steps');
const outputReward = document.getElementById('reward');
const outputCubes = document.getElementById('cubes');

// Add a camera:
camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(2, 10, 55);

// Create the scene:
scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
Utils.setScene(scene);

// Add lighting:
const light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
light.position.set(2, 10, 15);
scene.add(light);

// Setup the 3d model:
const loader = new THREE.GLTFLoader();
loader.load('6axis-arm-bones-linked.glb', function (gltf) {
    const model = gltf.scene;
    model.scale.set(10, 10, 10);

    lowerArmRot = model.getObjectByName('lower-arm-rot');
    lowerArmBend = model.getObjectByName('lower-arm-bend');
    elbowBend = model.getObjectByName('elbow-bend');
    wristRot = model.getObjectByName('wrist-rot');
    wristBend = model.getObjectByName('wrist-bend');
    fingersRot = model.getObjectByName('fingers-rot');
    tip = model.getObjectByName('00044_32474dat');

    scene.add(model);
    renderer.render(scene, camera);
});

// Create a renderer:
renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize, false);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

document.getElementById('start').onclick = start;
document.getElementById('stop').onclick = stop;
document.getElementById('display').onclick = toggleDisplay;

// Stats
stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.domElement);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

Utils.setMapSize(10);
Utils.setPrecision(2);

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

let rotations = {
    lowerArmRot: {
        axis: 'y',
        constraints: [-360, 360],
        direction: 1,
        speed: 4
    },
    lowerArmBend: {
        axis: 'z',
        constraints: [-90, 60],
        direction: -1,
        speed: 1
    },
    elbowBend: {
        axis: 'z',
        constraints: [-165, 0],
        direction: -1,
        speed: .5
    },
    wristRot: {
        axis: 'y',
        constraints: [-360, 360],
        direction: 1,
        speed: 1
    },
    wristBend: {
        axis: 'z',
        constraints: [-145, 145],
        direction: -1,
        speed: 2
    },
    fingersRot: {
        axis: 'y',
        constraints: [-360, 360],
        direction: 1,
        speed: 1
    }
};

let actorVector;
// let targetVector = new THREE.Vector3(-0.02, 12.20, 11.53);
let targetVector = Utils.getRandomVector();
let actor;
let target = Utils.drawPixel(targetVector, 1, new THREE.Color(0xff0000), .5);
let distance = null;
let steps = 0;
let active = false;
let working = false;
let display = true;
let totalReward = 0;

Utils.rememberPixel(targetVector, target);
targetX.value = targetVector.x;
targetY.value = targetVector.y;
targetZ.value = targetVector.z;

function translateActionToMovement(action) {
    let stepSize = .01; //Utils.degToRad(1);
    let arm, armName, direction;

    if (action === 0) {
        arm = lowerArmRot;
        armName = 'lowerArmRot';
        direction = 1;
    } else if (action === 1) {
        arm = lowerArmRot;
        armName = 'lowerArmRot';
        direction = -1;
    } else if (action === 2) {
        arm = lowerArmBend;
        armName = 'lowerArmBend';
        direction = 1;
    } else if (action === 3) {
        arm = lowerArmBend;
        armName = 'lowerArmBend';
        direction = -1;
    } else if (action === 4) {
        arm = elbowBend;
        armName = 'elbowBend';
        direction = 1;
    } else if (action === 5) {
        arm = elbowBend;
        armName = 'elbowBend';
        direction = -1;
    } else if (action === 6) {
        arm = wristRot;
        armName = 'wristRot';
        direction = 1;
    } else if (action === 7) {
        arm = wristRot;
        armName = 'wristRot';
        direction = -1;
    } else if (action === 8) {
        arm = wristBend;
        armName = 'wristBend';
        direction = 1;
    } else if (action === 9) {
        arm = wristBend;
        armName = 'wristBend';
        direction = -1;
    } else if (action === 10) {
        arm = fingersRot;
        armName = 'fingersRot';
        direction = 1;
    } else if (action === 11) {
        arm = fingersRot;
        armName = 'fingersRot';
        direction = -1;
    }

    move(arm, armName, direction, stepSize);
}

function doWork() {
    if (!actorVector && tip) {
        actorVector = new THREE.Vector3();
        actorVector.setFromMatrixPosition(tip.matrixWorld);
        actor = Utils.drawPixel(actorVector, .1);
        Utils.rememberPixel(actor);
        distance = actorVector.distanceTo(targetVector);
    }

    if (active && !working) {
        working = true;

        // Gather inputs
        let distance_before = Utils.jumpDistance(actorVector, targetVector)
        let inputs = [actorVector.y, actorVector.z, targetVector.y, targetVector.z];

        academy.step([{teacherName: teacher, agentsInput: inputs}]).then(function (result) {
            // Take Action
            if (result !== undefined) {
                steps++;
                translateActionToMovement(result.get(agent));
            }

            actorVector = new THREE.Vector3();
            actorVector.setFromMatrixPosition(tip.matrixWorld);
            actor = Utils.drawPixel(actorVector, .1);
            Utils.rememberPixel(actor);
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
                Math.round(actorVector.x * 100) / 100 === targetVector.x
                && Math.round(actorVector.y * 100) / 100 === targetVector.y
                && Math.round(actorVector.z * 100) / 100 === targetVector.z
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
                console.log(targetVector);

                outputSteps.value = steps;
                outputReward.value = totalReward;
                outputCubes.value = Object.keys(pixels).length;
            }
        });
        working = false;
    }
}

function animate() {
    doWork();

    renderer.render(scene, camera);
    stats.update();

    setTimeout(function () {
        requestAnimationFrame(animate);
    }, 1);
}

animate();

function move(arm, settingsKey, direction, stepSize) {
    if (! arm || ! Object.hasOwnProperty.call(arm, 'rotation')) {
        return;
    }

    let current = Utils.radToDeg(arm.rotation[rotations[settingsKey].axis]);
    if (
        (current < rotations[settingsKey].constraints[1] && direction === 1)
        || (current > rotations[settingsKey].constraints[0] && direction === -1)
    ) {
        arm.rotation[rotations[settingsKey].axis] += stepSize * direction;
    }
}

function moveRandom(arm, settingsKey) {
    let current = Utils.radToDeg(arm.rotation[rotations[settingsKey].axis]);
    if (current >= rotations[settingsKey].constraints[1]) {
        rotations[settingsKey].direction = -1;
    } else if (current <= rotations[settingsKey].constraints[0]) {
        rotations[settingsKey].direction = 1;
    }

    arm.rotation[rotations[settingsKey].axis] += Utils.degToRad(rotations[settingsKey].speed) * rotations[settingsKey].direction;
}

window.rotate = function (motor, axis, degrees) {
    motor.rotation[axis] += Utils.degToRad(degrees);
}
