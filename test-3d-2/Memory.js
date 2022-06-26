import {sampleSize} from 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.20/lodash.min.js';

export class Memory {
    constructor(maxMemory) {
        this.maxMemory = maxMemory;
        this.samples = [];
    }

    addSample(sample) {
        this.samples.push(sample);
        if (this.samples.length > this.maxMemory) {
            this.samples.shift();
        }
    }

    sample(nSamples) {
        return sampleSize(this.samples, nSamples);
    }
}
