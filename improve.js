/////////////////////////////
// Actor and academy setup //
/////////////////////////////

ReImprove.setBackend('cpu');
const modelFitConfig = {
    epochs: 1,
    stepsPerEpoch: 24
};

const numActions = 10;
const inputSize = 4;
// The window of data which will be sent yo your agent. For instance the x previous inputs, and what actions
// the agent took
const temporalWindow = 2;

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
if (localStorage.getItem('tensorflowjs_models/RL-model-arm/info')) {
    model.loadFromFile('localstorage://RL-model-arm').then(() => {
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
