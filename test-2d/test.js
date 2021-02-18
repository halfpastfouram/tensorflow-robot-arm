const TIMEOUT = 1; // mins
const MAP_SIZE = 10;

function randomPoint() {
    let min = 0;
    let max = MAP_SIZE;
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function jumpDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

// const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;

let actor = {x: 1, y: 1};
let target = {x: randomPoint(), y: randomPoint()};
let distance = jumpDistance(actor.x, actor.y, target.x, target.y);
let steps = 0;

// Get context for the canvas:
const ctx = document.getElementById('field').getContext('2d');
const magnification = 50;

ctx.fillStyle = new THREE.Color(0x00ff00).getStyle();
ctx.fillRect(actor.x * magnification, actor.y * magnification, magnification, magnification);
ctx.fillStyle = new THREE.Color(0xff0000).getStyle();
ctx.fillRect(target.x * magnification, target.y * magnification, magnification, magnification);

const targetX = document.getElementById('tx');
const targetY = document.getElementById('ty');
const outputX = document.getElementById('ax');
const outputY = document.getElementById('ay');
const outputSteps = document.getElementById('steps');

targetX.value = target.x;
targetY.value = target.y;
outputX.value = actor.x;
outputY.value = actor.y;

const modelFitConfig = {
    epochs: 1,
    stepsPerEpoch: 16
};

const numActions = 4;
const inputSize = 4;
// The window of data which will be sent yo your agent. For instance the x previous inputs, and what actions the agent took
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
model.compile({loss: 'meanSquaredError', optimizer: 'sgd'})

// Every single field here is optionnal, and has a default value. Be careful, it may not fit your needs ...
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
let timer;
function learn() {
    timer = setInterval(function() {
        // Gather inputs
        let distance_before = Math.hypot(target.x - actor.x, target.y - actor.y);
        let inputs = [actor.x, actor.y, target.x, target.y];

        // Step the learning
        academy.step([{teacherName: teacher, agentsInput: inputs}]).then(function (result) {
            // Take Action
            if (result !== undefined) {
                steps++;
                var action = result.get(agent);
                if (action === 0) {
                    actor.x++; // Right
                } else if (action === 1) {
                    actor.x--; // Left
                } else if (action === 2) {
                    actor.y++; // Down
                } else if (action === 3) {
                    actor.y--; // Up
                }
            }

            if (actor.x < 0) {
                actor.x = 0;
            } else if (actor.x > MAP_SIZE) {
                actor.x = MAP_SIZE;
            }

            if (actor.y < 0) {
                actor.y = 0;
            } else if (actor.y > MAP_SIZE) {
                actor.y = MAP_SIZE;
            }

            let distance_after = Math.hypot(target.x - actor.x, target.y - actor.y)
            let reward = (distance_before == distance_after) ? -0.1 : distance_before - distance_after;
            ctx.fillStyle = new THREE.Color(0x00ff00 * reward).getStyle();
            ctx.fillRect(
                actor.x * magnification + (magnification / 10),
                actor.y * magnification + (magnification / 10),
                magnification - (magnification / 10) * 2,
                magnification - (magnification / 10) * 2
            );
            outputX.value = actor.x;
            outputY.value = actor.y;
            outputSteps.value = steps;
            academy.addRewardToAgent(agent, reward);
            // console.info(`Target: (${target.x}, ${target.y}) Location: (${actor.x}, ${actor.y}) Reward: ${reward}`);

            if (actor.x === target.x && actor.y === target.y) {
                ctx.fillStyle = '0xff00ff';
                ctx.fillRect(
                    actor.x * magnification + (magnification / 10),
                    actor.y * magnification + (magnification / 10),
                    magnification - (magnification / 10) * 2,
                    magnification - (magnification / 10) * 2
                );
                console.info(`Target: ${distance} Steps: ${steps} Delta: ${(steps - distance)}`);
                stop();

                setTimeout(function() {
                    target = {x: randomPoint(), y: randomPoint()};
                    steps = 0;
                    distance = jumpDistance(actor.x, actor.y, target.x, target.y);

                    targetX.value = target.x;
                    targetY.value = target.y;
                    outputSteps.value = steps;

                    ctx.clearRect(0, 0, MAP_SIZE * magnification + magnification, MAP_SIZE * magnification + magnification);
                    ctx.fillStyle = 'rgb(0, 255, 0)';
                    ctx.fillRect(actor.x * magnification, actor.y * magnification, magnification, magnification);
                    ctx.fillStyle = 'rgb(255, 0, 0)';
                    ctx.fillRect(target.x * magnification, target.y * magnification, magnification, magnification);

                    learn();
                }, 2500);
            }
        });
    }, 1);
}

function stop() {
    clearTimeout(timer);
}

function save() {
    model.model.save('localstorage://my-model').then(() => {
        console.info('Saved model to local storage');
    });
}

function load() {
    model.loadFromFile('localstorage://my-model').then((loadedModel) => {
        console.log(arguments);
        model = loadedModel;
    });
    model.compile({loss: 'meanSquaredError', optimizer: 'sgd'})
}
