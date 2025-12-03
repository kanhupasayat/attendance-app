import * as faceapi from 'face-api.js';

// Model loading status
let modelsLoaded = false;
let modelLoadingPromise = null;

// CDN URL for face-api models (faster load)
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

/**
 * Load face-api.js models (only loads once)
 */
export const loadFaceModels = async () => {
  if (modelsLoaded) return true;

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      console.log('Loading face recognition models...');

      // Load only required models for face recognition
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log('Face recognition models loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading face models:', error);
      modelLoadingPromise = null;
      throw new Error('Failed to load face recognition models');
    }
  })();

  return modelLoadingPromise;
};

/**
 * Check if models are loaded
 */
export const areModelsLoaded = () => modelsLoaded;

/**
 * Detect face and get descriptor from image element
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input
 * @returns {Float32Array|null} - 128-dimensional face descriptor or null
 */
export const getFaceDescriptor = async (input) => {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return detection.descriptor;
  } catch (error) {
    console.error('Error detecting face:', error);
    return null;
  }
};

/**
 * Detect face from image URL
 * @param {string} imageUrl
 * @returns {Float32Array|null}
 */
export const getFaceDescriptorFromUrl = async (imageUrl) => {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const img = await faceapi.fetchImage(imageUrl);
    return await getFaceDescriptor(img);
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
};

/**
 * Compare two face descriptors
 * @param {Float32Array|number[]} descriptor1
 * @param {Float32Array|number[]} descriptor2
 * @returns {number} - Distance between faces (lower = more similar)
 */
export const compareFaces = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2) return Infinity;

  // Convert to Float32Array if needed
  const d1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
  const d2 = descriptor2 instanceof Float32Array ? descriptor2 : new Float32Array(descriptor2);

  return faceapi.euclideanDistance(d1, d2);
};

/**
 * Check if two faces match
 * @param {Float32Array|number[]} descriptor1
 * @param {Float32Array|number[]} descriptor2
 * @param {number} threshold - Maximum distance for match (default 0.6)
 * @returns {object} - { match: boolean, distance: number, confidence: number }
 */
export const isFaceMatch = (descriptor1, descriptor2, threshold = 0.6) => {
  const distance = compareFaces(descriptor1, descriptor2);
  const match = distance < threshold;

  // Convert distance to confidence percentage (0-100%)
  // Distance 0 = 100% confidence, Distance >= threshold = 0% confidence
  const confidence = Math.max(0, Math.min(100, (1 - distance / threshold) * 100));

  return {
    match,
    distance: Math.round(distance * 1000) / 1000,
    confidence: Math.round(confidence)
  };
};

/**
 * Convert descriptor to JSON string for storage
 * @param {Float32Array} descriptor
 * @returns {string}
 */
export const descriptorToJson = (descriptor) => {
  if (!descriptor) return null;
  return JSON.stringify(Array.from(descriptor));
};

/**
 * Parse descriptor from JSON string
 * @param {string} json
 * @returns {Float32Array|null}
 */
export const descriptorFromJson = (json) => {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    return new Float32Array(arr);
  } catch {
    return null;
  }
};

/**
 * Detect if image has exactly one face
 * @param {HTMLImageElement|HTMLVideoElement|HTMLCanvasElement} input
 * @returns {object} - { hasFace: boolean, faceCount: number, message: string }
 */
export const validateFaceInImage = async (input) => {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions());

    if (detections.length === 0) {
      return {
        hasFace: false,
        faceCount: 0,
        message: 'No face detected. Please upload a clear photo with your face visible.'
      };
    }

    if (detections.length > 1) {
      return {
        hasFace: false,
        faceCount: detections.length,
        message: `Multiple faces detected (${detections.length}). Please upload a photo with only your face.`
      };
    }

    return {
      hasFace: true,
      faceCount: 1,
      message: 'Face detected successfully'
    };
  } catch (error) {
    console.error('Error validating face:', error);
    return {
      hasFace: false,
      faceCount: 0,
      message: 'Error processing image. Please try another photo.'
    };
  }
};
