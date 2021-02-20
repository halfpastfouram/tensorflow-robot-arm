export class Model {
    constructor(hiddenLayerSizesOrModel, numStates, numActions, batchSize) {
        this.numStates = numStates;
        this.numActions = numActions;
        this.batchSize = batchSize;

        if (hiddenLayerSizesOrModel instanceof tf.LayersModel) {
            this.network = hiddenLayerSizesOrModel;
            this.network.summary();
            this.network.compile({optimizer: 'adam', loss: 'meanSquaredError'});
        } else {
            this.defineModel(hiddenLayerSizesOrModel)
        }
    }

    defineModel(hiddenLayerSizes) {
        if (!Array.isArray(hiddenLayerSizes)) {
            hiddenLayerSizes = [hiddenLayerSizes];
        }

        this.network = tf.sequential();
        hiddenLayerSizes.forEach((hiddenLayerSize, i) => {
            this.network.add(tf.layers.dense({
                units: hiddenLayerSize,
                activation: 'relu',
                inputShape: i === 0 ? [this.numStates] : undefined
            }));
        });

        this.network.add(tf.layers.dense({units: this.numActions}));

        this.network.summary();
        this.network.compile({optimizer: 'adam', loss: 'meanSquaredError'});
    }

    predict(states) {
        return tf.tidy(() => this.network.predict(states));
    }

    async train(xBatch, yBatch) {
        await this.network.fit(xBatch, yBatch, {
            batchSize: 32,
            epochs: 1
        });
    }

    chooseAction(state, epsilon) {
        const min = 0;
        const max = this.numActions - 1;
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * (max - min + 1) + min);
        } else {
            return tf.tidy(() => {
                return this.network.predict(state).argMax(1).dataSync()[0];
            });
        }
    }
}