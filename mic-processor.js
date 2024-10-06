class MicProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [];
    }

    constructor() {
        super();
        this.volume = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0]; // Use the first channel
            const rms = Math.sqrt(channelData.reduce((sum, value) => sum + value * value, 0) / channelData.length);
            this.volume = Math.max(rms, this.volume * 0.5);
            // Send volume data to the main thread if needed
            this.port.postMessage(this.volume);
        }
        return true; // Keep the processor alive
    }
}

registerProcessor('mic-processor', MicProcessor);
