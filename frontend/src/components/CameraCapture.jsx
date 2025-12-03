import { useState, useRef, useEffect, useCallback } from 'react';
import { loadFaceModels, analyzeFaceQuality } from '../utils/faceRecognition';

const CameraCapture = ({ onCapture, onCancel }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceStatus, setFaceStatus] = useState({
    isValid: false,
    qualityScore: 0,
    checks: {},
    overallMessage: 'Position your face in the frame'
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load face models
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoading(false))
      .catch((err) => {
        console.error('Failed to load face models:', err);
        setModelsLoading(false);
        setCameraError('Failed to load face detection. Please refresh and try again.');
      });
  }, []);

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
          };
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access.');
        } else {
          setCameraError('Failed to access camera. Please try again.');
        }
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [modelsLoading]);

  // Real-time face detection
  const detectFace = useCallback(async () => {
    if (!cameraReady || !videoRef.current || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const result = await analyzeFaceQuality(videoRef.current);
      setFaceStatus({
        isValid: result.isValid && result.qualityScore >= 50,
        qualityScore: result.qualityScore,
        checks: result.checks,
        overallMessage: result.qualityScore >= 70 ? 'Perfect! Capture now' :
                        result.qualityScore >= 50 ? 'Good - You can capture' :
                        result.qualityScore > 0 ? 'Adjust your position' :
                        'No face detected'
      });
    } catch (err) {
      console.error('Face detection error:', err);
    }

    setIsAnalyzing(false);
  }, [cameraReady, isAnalyzing]);

  // Run face detection every 500ms
  useEffect(() => {
    if (!cameraReady) return;

    const interval = setInterval(detectFace, 500);
    return () => clearInterval(interval);
  }, [cameraReady, detectFace]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored image (since video is mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });

        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  // Get border color based on quality
  const getBorderColor = () => {
    if (!cameraReady || faceStatus.qualityScore === 0) return 'border-gray-400';
    if (faceStatus.qualityScore >= 70) return 'border-green-500';
    if (faceStatus.qualityScore >= 50) return 'border-yellow-500';
    return 'border-red-500';
  };

  // Get quality bar color
  const getQualityColor = () => {
    if (faceStatus.qualityScore >= 70) return 'bg-green-500';
    if (faceStatus.qualityScore >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
          Take Profile Photo
        </h2>

        {cameraError ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 mb-4">{cameraError}</p>
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Camera View */}
            <div className="relative mb-4">
              <div className={`relative overflow-hidden rounded-xl border-4 ${getBorderColor()} transition-colors duration-300`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* Face Guide Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-40 h-52 sm:w-48 sm:h-60 border-2 rounded-[50%] ${
                    faceStatus.qualityScore >= 70 ? 'border-green-400' :
                    faceStatus.qualityScore >= 50 ? 'border-yellow-400' :
                    faceStatus.qualityScore > 0 ? 'border-red-400' : 'border-white/50'
                  } transition-colors duration-300`} />
                </div>

                {/* Quality Badge */}
                {cameraReady && faceStatus.qualityScore > 0 && (
                  <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-white text-sm font-bold ${getQualityColor()}`}>
                    {faceStatus.qualityScore}%
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
                      <p className="text-white text-sm">
                        {modelsLoading ? 'Loading face detection...' : 'Starting camera...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Quality Indicator */}
            {cameraReady && (
              <div className="mb-4 space-y-2">
                {/* Quality Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-16">Quality:</span>
                  <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getQualityColor()}`}
                      style={{ width: `${faceStatus.qualityScore}%` }}
                    />
                  </div>
                </div>

                {/* Status Message */}
                <p className={`text-center text-sm font-medium ${
                  faceStatus.qualityScore >= 70 ? 'text-green-600' :
                  faceStatus.qualityScore >= 50 ? 'text-yellow-600' :
                  faceStatus.qualityScore > 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {faceStatus.overallMessage}
                </p>

                {/* Quality Checks */}
                {faceStatus.qualityScore > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {Object.entries(faceStatus.checks).map(([key, check]) => (
                      <span
                        key={key}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          check.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {check.pass ? '✓' : '✗'} {check.message}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <p className="text-xs text-gray-500 text-center mb-4">
              Position your face in the oval. Wait for green indicator.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={!cameraReady || !faceStatus.isValid}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  faceStatus.isValid
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
