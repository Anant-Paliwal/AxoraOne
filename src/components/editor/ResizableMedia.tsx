import { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Maximize2, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResizableMediaProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  initialWidth?: number;
  initialAlignment?: 'left' | 'center' | 'right' | 'float-left' | 'float-right';
  onUpdate?: (data: { width: number; alignment: string }) => void;
  onDelete?: () => void;
  editable?: boolean;
}

export function ResizableMedia({
  src,
  type,
  alt = '',
  initialWidth = 100,
  initialAlignment = 'center',
  onUpdate,
  onDelete,
  editable = true
}: ResizableMediaProps) {
  const [width, setWidth] = useState(initialWidth);
  const [alignment, setAlignment] = useState(initialAlignment);
  const [isResizing, setIsResizing] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    if (onUpdate) {
      onUpdate({ width, alignment });
    }
  }, [width, alignment]);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = containerRef.current?.parentElement?.offsetWidth || 800;
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = Math.max(20, Math.min(100, startWidthRef.current + deltaPercent));
      setWidth(Math.round(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const getContainerStyles = () => {
    const baseStyles = {
      width: `${width}%`,
    };

    switch (alignment) {
      case 'left':
        return { ...baseStyles, marginLeft: 0, marginRight: 'auto' };
      case 'right':
        return { ...baseStyles, marginLeft: 'auto', marginRight: 0 };
      case 'center':
        return { ...baseStyles, marginLeft: 'auto', marginRight: 'auto' };
      case 'float-left':
        return { ...baseStyles, float: 'left' as const, marginRight: '1rem', marginBottom: '0.5rem' };
      case 'float-right':
        return { ...baseStyles, float: 'right' as const, marginLeft: '1rem', marginBottom: '0.5rem' };
      default:
        return baseStyles;
    }
  };

  const alignmentOptions = [
    { value: 'left', icon: AlignLeft, label: 'Align Left' },
    { value: 'center', icon: AlignCenter, label: 'Align Center' },
    { value: 'right', icon: AlignRight, label: 'Align Right' },
    { value: 'float-left', icon: AlignLeft, label: 'Float Left (text wraps)' },
    { value: 'float-right', icon: AlignRight, label: 'Float Right (text wraps)' },
  ];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group my-4",
        alignment.startsWith('float-') ? 'inline-block' : 'block'
      )}
      style={getContainerStyles()}
      onMouseEnter={() => editable && setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
    >
      {/* Media Content */}
      {type === 'image' ? (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-auto rounded-lg",
            editable && "cursor-pointer",
            isResizing && "pointer-events-none select-none"
          )}
          draggable={false}
        />
      ) : (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Controls Overlay */}
      {editable && showControls && (
        <div className="absolute inset-0 bg-black/5 rounded-lg border-2 border-primary pointer-events-none">
          {/* Width Indicator */}
          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-auto">
            {width}%
          </div>

          {/* Alignment Controls */}
          <div className="absolute top-2 right-2 flex gap-1 pointer-events-auto">
            {alignmentOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setAlignment(option.value as any)}
                className={cn(
                  "p-1.5 rounded bg-black/80 hover:bg-black transition-colors",
                  alignment === option.value ? "text-primary" : "text-white"
                )}
                title={option.label}
              >
                <option.icon className="w-3.5 h-3.5" />
              </button>
            ))}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Resize Handle */}
          <div
            className="absolute bottom-2 right-2 p-2 bg-black/80 rounded cursor-ew-resize pointer-events-auto hover:bg-black transition-colors"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          >
            <GripHorizontal className="w-4 h-4 text-white" />
          </div>

          {/* Quick Size Buttons */}
          <div className="absolute bottom-2 left-2 flex gap-1 pointer-events-auto">
            <button
              onClick={() => setWidth(50)}
              className="px-2 py-1 text-xs bg-black/80 hover:bg-black text-white rounded transition-colors"
            >
              50%
            </button>
            <button
              onClick={() => setWidth(75)}
              className="px-2 py-1 text-xs bg-black/80 hover:bg-black text-white rounded transition-colors"
            >
              75%
            </button>
            <button
              onClick={() => setWidth(100)}
              className="px-2 py-1 text-xs bg-black/80 hover:bg-black text-white rounded transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Resize Cursor Overlay */}
      {isResizing && (
        <div className="fixed inset-0 cursor-ew-resize z-50" />
      )}
    </div>
  );
}
