import Stats from 'https://unpkg.com/three/examples/jsm/libs/stats.module.js';
import * as Utils from './utils/tools.js';
import {clearPixels, getPixels} from "./utils/tools.js";

let camera, scene, renderer, stats;
let lowerArmRot, lowerArmBend, elbowBend;
let wristRot, wristBend, fingersRot;
let tip;
let direction = {
    back: -1,
    forth: 1
};

const targetX = document.getElementById('targetX');
const targetY = document.getElementById('targetY');
const targetZ = document.getElementById('targetZ');
const outputX = document.getElementById('actorX');
const outputY = document.getElementById('actorY');
const outputZ = document.getElementById('actorZ');
const outputSteps = document.getElementById('steps');
const outputReward = document.getElementById('reward');
const outputCubes = document.getElementById('cubes');
const outputDistance = document.getElementById('distance');

// Add a camera:
camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(2, 10, 55);

// Create the scene:
scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);
Utils.setScene(scene);

// Add lighting:
const light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
light.position.set(2, 10, 15);
scene.add(light);

// Set up the 3d model:
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

    lowerArmRot.rotation.y = Utils.degToRad(0)
    lowerArmBend.rotation.z = 0
    elbowBend.rotation.z = Utils.degToRad(-90)
    wristRot.rotation.y = 0
    wristBend.rotation.z = Utils.degToRad(-90)
    fingersRot.rotation.y = 0

    scene.add(model);
    renderer.render(scene, camera);

    const armVectors = [
      new THREE.Vector3().setFromMatrixPosition(lowerArmRot.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(lowerArmBend.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(elbowBend.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(wristRot.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(wristBend.matrixWorld),
      new THREE.Vector3().setFromMatrixPosition(fingersRot.matrixWorld),
    ]

    RobotKin = new Kinematics([
        [0, 0, 0],
        [0, armVectors[1].sub(armVectors[0]).y, 0],
        [armVectors[2].sub(armVectors[1]).x, 0, 0],
        [armVectors[3].sub(armVectors[2]).x, 0, 0],
        [0, armVectors[4].sub(armVectors[3]).y, 0],
    ])
    RobotKin.debug = true

    pose([
      Utils.degToRad(0),
      0,
      Utils.degToRad(-90),
      0,
      Utils.degToRad(-90)
    ])
    // getPoseForVector(targetVector)
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
Utils.setPrecision(0);

// Grids
const divisions = 20;

const gridXZ = new THREE.GridHelper(80, divisions);
gridXZ.position.set(0, 0, 0);
scene.add(gridXZ);

const gridZY = new THREE.GridHelper(80, divisions);
gridZY.position.set(0, 0, 0);
gridZY.rotation.x = Math.PI/2;
scene.add(gridZY);

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
// let targetVector = Utils.getRandomVector();
let targetVector = new THREE.Vector3(-5, 15, 0);
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

let RobotKin = null
let angles = [
    Utils.degToRad(0),
    Utils.degToRad(0),
    Utils.degToRad(0),
    Utils.degToRad(0),
    Utils.degToRad(0),
]

function getPoseForVector (vector)
{
    console.dir('given vector', vector)
    const newPose = RobotKin.inverse(
      parseFloat(vector.x),
      parseFloat(vector.y),
      parseFloat(vector.z),
      0,
      0,
      0
    )
    console.log('new pose', newPose)
}

function pose (newAngles) {
    if (newAngles) {
        console.log(newAngles)
        const angles = RobotKin.forward(...newAngles)[5]
        // const inversed = RobotKin.inverse(...pose)
        // console.log('Inversed', inversed)

        // if (isNaN(inversed[5])) {
        //     return;
        // }
        // angles = pose
    }

    lowerArmRot.rotation.y = angles[0]
    lowerArmBend.rotation.z = angles[1]
    elbowBend.rotation.z = angles[2]
    wristRot.rotation.y = angles[3]
    wristBend.rotation.z = angles[4]
    fingersRot.rotation.y = 0
}

function translateActionToMovement(action) {
    let stepSize = .01; //Utils.degToRad(1);
    let arm, armName, direction, joint;

    if (action === 0) {
        joint = 0
        arm = lowerArmRot;
        armName = 'lowerArmRot';
        direction = 1;
    } else if (action === 1) {
        joint = 0
        arm = lowerArmRot;
        armName = 'lowerArmRot';
        direction = -1;
    } else if (action === 2) {
        joint = 1
        arm = lowerArmBend;
        armName = 'lowerArmBend';
        direction = 1;
    } else if (action === 3) {
        joint = 1
        arm = lowerArmBend;
        armName = 'lowerArmBend';
        direction = -1;
    } else if (action === 4) {
        joint = 2
        arm = elbowBend;
        armName = 'elbowBend';
        direction = 1;
    } else if (action === 5) {
        joint = 2
        arm = elbowBend;
        armName = 'elbowBend';
        direction = -1;
    } else if (action === 6) {
        joint = 3
        arm = wristRot;
        armName = 'wristRot';
        direction = 1;
    } else if (action === 7) {
        joint = 3
        arm = wristRot;
        armName = 'wristRot';
        direction = -1;
    } else if (action === 8) {
        joint = 4
        arm = wristBend;
        armName = 'wristBend';
        direction = 1;
    } else if (action === 9) {
        joint = 4
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

    // if (joint) {
        const newAngles = angles
        newAngles[joint] = Utils.degToRad(Utils.radToDeg(newAngles[joint]) + direction)
        pose(newAngles)
        document.getElementById(armName).value = getRotation(arm, armName)
    // }

    // move(arm, armName, direction, stepSize);
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
            outputX.value = actorVector.x;
            outputY.value = actorVector.y;
            outputZ.value = actorVector.z;
            outputSteps.value = steps;

            let distance_after = Utils.jumpDistance(actorVector, targetVector);
            outputDistance.value = distance_after
            let reward = (distance_before === distance_after) ? -0.2 : (distance_before - distance_after) * 1.05;

            // Being underground is bad:
            if (actorVector.y < 0) {
                reward -= 0.5
            }

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
                academy.addRewardToAgent(agent, 10);
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

                outputSteps.value = steps;
                outputReward.value = totalReward;
                outputCubes.value = Object.keys(pixels).length;
                restart();
            } else if(steps > 5000) {
                console.info('Failed to come up with a solution in 500 steps.');
                console.info(`Target: ${distance} Delta: ${(steps - distance)}`);
                restart();
            }
        });
        working = false;
    }
}

function restart() {
    document.getElementById('runs').value = parseInt(document.getElementById('runs').value) + 1;

    // Clear all pixels:
    const pixels = getPixels()
    for (let k in pixels) {
        scene.remove(pixels[k]);
    }

    // Generate new target and actor:
    clearPixels()
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

    lowerArmRot.rotation.y = 0
    lowerArmBend.rotation.z = 0
    elbowBend.rotation.z = Utils.degToRad(-90)
    wristRot.rotation.y = 0
    wristBend.rotation.z = Utils.degToRad(-90)
    fingersRot.rotation.y = 0
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

function getRotation (arm, settingsKey) {
    return Utils.radToDeg(arm.rotation[rotations[settingsKey].axis])
}

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

    document.getElementById(settingsKey).value = getRotation(arm, settingsKey)
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
