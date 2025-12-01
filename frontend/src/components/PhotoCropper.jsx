import { useState, useRef, useEffect, useCallback } from 'react';

const PhotoCropper = ({ imageFile, onSave, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const CROP_SIZE = 200; // Size of the crop area

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        // Calculate initial zoom to fit image in crop area
        const minZoom = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
        setZoom(minZoom);
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

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

  const handleSave = () => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
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

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], 'profile_cropped.jpg', { type: 'image/jpeg' });
          onSave(croppedFile, canvas.toDataURL('image/jpeg'));
        }
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
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Photo
          </button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default PhotoCropper;
