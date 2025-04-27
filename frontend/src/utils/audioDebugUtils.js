/**
 * Utility functions for debugging audio issues
 */

/**
 * Analyze audio data and return information about it
 * @param {Float32Array} audioData - The audio data to analyze
 * @returns {Object} Analysis result
 */
export const analyzeAudioData = (audioData) => {
  if (!audioData || audioData.length === 0) {
    return { hasSignal: false, maxLevel: 0, avgLevel: 0, rms: 0 };
  }
  
  let sum = 0;
  let sumOfSquares = 0;
  let maxLevel = 0;
  let silentSamples = 0;
  
  for (let i = 0; i < audioData.length; i++) {
    const absValue = Math.abs(audioData[i]);
    
    if (absValue < 0.01) {
      silentSamples++;
    }
    
    sum += absValue;
    sumOfSquares += audioData[i] * audioData[i];
    maxLevel = Math.max(maxLevel, absValue);
  }
  
  const avgLevel = sum / audioData.length;
  const rms = Math.sqrt(sumOfSquares / audioData.length);
  const silentPercent = (silentSamples / audioData.length) * 100;
  const hasSignal = maxLevel > 0.01;
  
  return {
    hasSignal,
    maxLevel,
    avgLevel,
    rms,
    silentPercent,
    totalSamples: audioData.length,
    silentSamples
  };
};

/**
 * Test if the microphone is working and returning signal
 * @returns {Promise<Object>} Test results
 */
export const testMicrophone = async () => {
  try {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const tracks = stream.getAudioTracks();
    
    if (tracks.length === 0) {
      return { success: false, error: "No audio tracks found" };
    }
    
    // Create audio context for testing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    
    // Create analyzer
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    
    // Get data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);
    
    // Analyze for signal
    const analysis = analyzeAudioData(dataArray);
    
    // Clean up
    tracks.forEach(track => track.stop());
    audioContext.close();
    
    return { 
      success: true, 
      hasSignal: analysis.hasSignal,
      ...analysis 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Unknown error accessing microphone" 
    };
  }
};
