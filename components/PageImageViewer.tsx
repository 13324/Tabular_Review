import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from './Icons';
import { BBox } from '../types';

interface PageImageViewerProps {
  imageUrl: string;
  matchedBBoxes: BBox[];
  isLoading?: boolean;
}

export const PageImageViewer: React.FC<PageImageViewerProps> = ({
  imageUrl,
  matchedBBoxes,
  isLoading = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // Reset zoom/pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageUrl]);

  // Scroll to first highlighted bbox when matches change
  useEffect(() => {
    if (matchedBBoxes.length > 0 && containerRef.current && imgSize.height > 0) {
      // Find the topmost matched bbox
      const minY = Math.min(...matchedBBoxes.map(bb => Math.min(bb[0][1], bb[1][1], bb[2][1], bb[3][1])));
      const containerHeight = containerRef.current.clientHeight;
      const scaledY = (minY / imgSize.height) * containerRef.current.scrollHeight;
      containerRef.current.scrollTo({
        top: Math.max(0, scaledY - containerHeight / 3),
        behavior: 'smooth',
      });
    }
  }, [matchedBBoxes, imgSize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Loading page image...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-200">
      {/* Zoom controls */}
      <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
        <button onClick={handleZoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors" title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors" title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-colors ml-1" title="Reset zoom">
          <Maximize2 className="w-4 h-4" />
        </button>
        {matchedBBoxes.length > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            {matchedBBoxes.length} region{matchedBBoxes.length !== 1 ? 's' : ''} highlighted
          </span>
        )}
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <div
          className="relative inline-block mx-auto"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
        >
          <img
            src={imageUrl}
            alt="Document page"
            className="max-w-full block shadow-lg"
            onLoad={handleImageLoad}
            draggable={false}
          />

          {/* SVG overlay for bounding boxes */}
          {imgSize.width > 0 && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width="100%"
              height="100%"
              viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
              preserveAspectRatio="none"
            >
              {matchedBBoxes.map((bbox, i) => {
                const points = bbox.map(p => `${p[0]},${p[1]}`).join(' ');
                return (
                  <polygon
                    key={i}
                    points={points}
                    fill="rgba(251, 191, 36, 0.3)"
                    stroke="rgba(245, 158, 11, 0.8)"
                    strokeWidth="2"
                  >
                    <animate
                      attributeName="fill"
                      values="rgba(251, 191, 36, 0.3);rgba(251, 191, 36, 0.15);rgba(251, 191, 36, 0.3)"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
