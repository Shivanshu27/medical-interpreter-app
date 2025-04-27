// Audio processor worklet for efficient audio processing

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    console.log('AudioProcessor worklet initialized');
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      console.log('AudioProcessor: No input data');
      return true;
    }
    
    const inputChannel = input[0];
    
    // Check if we're getting audio signal
    let hasSound = false;
    let maxValue = 0;
    
    for (let i = 0; i < inputChannel.length; i += 50) {
      const value = Math.abs(inputChannel[i]);
      maxValue = Math.max(maxValue, value);
      if (value > 0.01) {
        hasSound = true;
      }
    }
    
    // Log audio activity periodically
    if (Math.random() < 0.01) { // Log ~1% of the time to avoid console spam
      console.log(`AudioProcessor: Processing audio chunk, max value: ${maxValue.toFixed(4)}, has sound: ${hasSound}`);
    }
    
    // Add samples to buffer
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];
      
      // When buffer is full, send it
      if (this.bufferIndex >= this.bufferSize) {
        this.port.postMessage({
          buffer: this.buffer.slice(),
          hasSound: hasSound,
          maxValue: maxValue
        });
        this.bufferIndex = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
console.log('Audio processor registered');
