import { useState, useRef, useEffect, useCallback } from 'react';
import { loadFaceModels, getFaceDescriptor, isFaceMatch, descriptorFromJson } from '../utils/faceRecognition';

const FaceVerification = ({ userFaceDescriptor, onSuccess, onCancel, onError }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('Initializing camera...');
  const [countdown, setCountdown] = useState(null);

  // Load face models
  useEffect(() => {
    loadFaceModels()
      .then(() => {
        setModelsLoading(false);
        setMessage('Starting camera...');
      })
      .catch((err) => {
        console.error('Failed to load face models:', err);
        setModelsLoading(false);
        onError?.('Failed to load face recognition. Please try again.');
      });
  }, [onError]);

  // Start camera
  useEffect(() => {
    if (modelsLoading) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
            setMessage('Position your face in the circle');
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          onError?.('Camera permission denied. Please allow camera access.');
        } else {
          onError?.('Failed to access camera. Please try again.');
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [modelsLoading, onError]);

  const captureAndVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    setVerifying(true);
    setMessage('Verifying face...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      ctx.drawImage(video, 0, 0);

      // Get face descriptor from captured frame
      const capturedDescriptor = await getFaceDescriptor(canvas);

      if (!capturedDescriptor) {
        setMessage('No face detected. Please try again.');
        setVerifying(false);
        return;
      }

      // Parse stored descriptor
      const storedDescriptor = descriptorFromJson(userFaceDescriptor);

      if (!storedDescriptor) {
        onError?.('Face data not found. Please update your profile photo.');
        return;
      }

      // Compare faces
      const result = isFaceMatch(capturedDescriptor, storedDescriptor, 0.6);

      if (result.match) {
        setMessage(`Face verified! (${result.confidence}% match)`);
        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        // Wait a moment to show success message
        setTimeout(() => {
          onSuccess?.(result);
        }, 500);
      } else {
        setMessage(`Face not matched (${result.confidence}% similarity). Try again.`);
        setVerifying(false);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setMessage('Verification failed. Please try again.');
      setVerifying(false);
    }
  }, [cameraReady, userFaceDescriptor, onSuccess, onError]);

  // Auto capture with countdown
  const startCountdown = useCallback(() => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          captureAndVerify();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [captureAndVerify]);

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
          Face Verification
        </h2>

        {/* Camera View */}
        <div className="relative mb-4">
          <div className="relative overflow-hidden rounded-xl bg-gray-900 aspect-[4/3]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Face Guide Circle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 ${
                verifying ? 'border-yellow-400' : cameraReady ? 'border-green-400' : 'border-white'
              } transition-colors`}>
                {/* Corner guides */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-8 h-1 bg-current rounded"></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-8 h-1 bg-current rounded"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 h-8 bg-current rounded"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-1 h-8 bg-current rounded"></div>
              </div>
            </div>

            {/* Countdown */}
            {countdown && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <span className="text-6xl font-bold text-white">{countdown}</span>
              </div>
            )}

            {/* Loading Overlay */}
            {(modelsLoading || !cameraReady) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center">
                  <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-white text-sm">{message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Status Message */}
        <div className={`text-center mb-4 text-sm font-medium ${
          message.includes('verified') ? 'text-green-600' :
          message.includes('not matched') || message.includes('No face') ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {cameraReady && message}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={verifying}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={countdown ? captureAndVerify : startCountdown}
            disabled={!cameraReady || verifying || modelsLoading}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
          >
            {verifying ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </>
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center mt-3">
          Look directly at the camera with good lighting
        </p>
      </div>
    </div>
  );
};

export default FaceVerification;
