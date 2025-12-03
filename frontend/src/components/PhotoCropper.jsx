import { useState, useRef, useEffect, useCallback } from 'react';
import { loadFaceModels, getFaceDescriptor, analyzeFaceQuality, descriptorToJson } from '../utils/faceRecognition';

const PhotoCropper = ({ imageFile, onSave, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [faceStatus, setFaceStatus] = useState({
    checking: false,
    isValid: false,
    qualityScore: 0,
    checks: {},
    tips: [],
    overallMessage: ''
  });
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const CROP_SIZE = 200; // Size of the crop area

  // Load face-api models on mount
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsLoading(false))
      .catch((err) => {
        console.error('Failed to load face models:', err);
        setModelsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      const img = new Image();
      img.onload = async () => {
        setImageSize({ width: img.width, height: img.height });
        // Calculate initial zoom to fit image in crop area
        const minZoom = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
        setZoom(minZoom);
        imgRef.current = img;

        // Analyze face quality in image
        if (!modelsLoading) {
          setFaceStatus(prev => ({ ...prev, checking: true, overallMessage: 'Analyzing face...' }));
          const result = await analyzeFaceQuality(img);
          setFaceStatus({
            checking: false,
            isValid: result.isValid,
            qualityScore: result.qualityScore,
            checks: result.checks,
            tips: result.tips,
            overallMessage: result.overallMessage
          });
        }
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile, modelsLoading]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragStart.x;
    const newY = clientY - dragStart.y;

    // Calculate bounds
    const scaledWidth = imageSize.width * zoom;
    const scaledHeight = imageSize.height * zoom;
    const maxX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

    setPosition({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY))
    });
  }, [isDragging, dragStart, imageSize, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleZoomChange = (newZoom) => {
    const minZoom = Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
    setZoom(Math.max(minZoom, newZoom));

    // Adjust position if needed
    const scaledWidth = imageSize.width * newZoom;
    const scaledHeight = imageSize.height * newZoom;
    const maxX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);

    setPosition(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x)),
      y: Math.max(-maxY, Math.min(maxY, prev.y))
    }));
  };

  const handleSave = async () => {
    if (!imageUrl || !canvasRef.current) return;

    // Check if face quality is valid
    if (!faceStatus.isValid) {
      return;
    }

    setSaving(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      // Set canvas size to desired output size
      const outputSize = 300;
      canvas.width = outputSize;
      canvas.height = outputSize;

      // Clear canvas
      ctx.clearRect(0, 0, outputSize, outputSize);

      // Create circular clip
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Calculate source position based on current view
      const scale = outputSize / CROP_SIZE;
      const scaledWidth = imageSize.width * zoom * scale;
      const scaledHeight = imageSize.height * zoom * scale;
      const drawX = (outputSize - scaledWidth) / 2 + position.x * scale;
      const drawY = (outputSize - scaledHeight) / 2 + position.y * scale;

      ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

      // Get face descriptor from original image (better quality)
      let faceDescriptor = null;
      try {
        const descriptor = await getFaceDescriptor(imgRef.current);
        if (descriptor) {
          faceDescriptor = descriptorToJson(descriptor);
        }
      } catch (error) {
        console.error('Error getting face descriptor:', error);
      }

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'profile_cropped.jpg', { type: 'image/jpeg' });
          onSave(croppedFile, canvas.toDataURL('image/jpeg'), faceDescriptor);
        }
        setSaving(false);
      }, 'image/jpeg', 0.9);
    };

    img.src = imageUrl;
  };

  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 text-center">Adjust Photo</h2>

        {/* Crop Area */}
        <div className="flex justify-center mb-4">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full cursor-move border-4 border-blue-500"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <img
              src={imageUrl}
              alt="Crop preview"
              className="absolute select-none pointer-events-none"
              style={{
                width: imageSize.width * zoom,
                height: imageSize.height * zoom,
                left: `calc(50% - ${imageSize.width * zoom / 2}px + ${position.x}px)`,
                top: `calc(50% - ${imageSize.height * zoom / 2}px + ${position.y}px)`,
                maxWidth: 'none'
              }}
              draggable={false}
            />
          </div>
        </div>

        {/* Face Quality Status */}
        <div className="mb-3">
          {modelsLoading ? (
            <div className="flex items-center justify-center text-blue-600 text-sm">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading face detection...
            </div>
          ) : faceStatus.checking ? (
            <div className="flex items-center justify-center text-blue-600 text-sm">
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing face quality...
            </div>
          ) : faceStatus.qualityScore > 0 ? (
            <div className="space-y-2">
              {/* Quality Score Bar */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 w-24">Face Quality:</span>
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      faceStatus.qualityScore >= 70 ? 'bg-green-500' :
                      faceStatus.qualityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${faceStatus.qualityScore}%` }}
                  />
                </div>
                <span className={`text-sm font-bold min-w-[3rem] text-right ${
                  faceStatus.qualityScore >= 70 ? 'text-green-600' :
                  faceStatus.qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {faceStatus.qualityScore}%
                </span>
              </div>

              {/* Quality Checks */}
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(faceStatus.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      check.pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {check.pass ? (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                    {check.message}
                  </div>
                ))}
              </div>

              {/* Overall Message */}
              <div className={`text-center text-sm font-medium ${
                faceStatus.qualityScore >= 70 ? 'text-green-600' :
                faceStatus.qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {faceStatus.overallMessage}
              </div>

              {/* Tips */}
              {faceStatus.tips.length > 0 && faceStatus.qualityScore < 70 && (
                <div className="bg-blue-50 rounded-lg p-2 mt-1">
                  <p className="text-xs text-blue-700 font-medium mb-1">Tips:</p>
                  <ul className="text-xs text-blue-600 space-y-0.5">
                    {faceStatus.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : faceStatus.overallMessage ? (
            <div className="flex items-center justify-center text-red-600 text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {faceStatus.overallMessage}
            </div>
          ) : null}
        </div>

        {/* Instructions */}
        <p className="text-xs text-gray-500 text-center mb-3">
          Drag to position, use slider to zoom
        </p>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3 mb-6 px-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
          <input
            type="range"
            min={Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height) || 0.5}
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!faceStatus.isValid || saving || modelsLoading || faceStatus.checking}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Photo'
            )}
          </button>
        </div>

        {/* Help text if low quality */}
        {!faceStatus.isValid && !faceStatus.checking && !modelsLoading && faceStatus.qualityScore > 0 && faceStatus.qualityScore < 40 && (
          <p className="text-xs text-center text-red-500 mt-3">
            Photo quality too low. Please upload a clearer photo with your face visible.
          </p>
        )}

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default PhotoCropper;
