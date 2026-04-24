import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Trash2, Upload, Link, File, X, AlignLeft, AlignCenter, AlignRight, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ResizableMediaProps {
  src: string;
  alt?: string;
  type: 'image' | 'video';
  initialWidth?: number; // percentage (25, 50, 75, 100)
  alignment?: 'left' | 'center' | 'right';
  onResize?: (width: number) => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onDelete?: () => void;
  editable?: boolean;
}

// Helper to parse video URLs and get embed URL
function getVideoEmbedUrl(url: string): { embedUrl: string; type: 'youtube' | 'vimeo' | 'direct' } | null {
  if (!url) return null;
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`, type: 'youtube' };
  }
  
  // Vimeo
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return { embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`, type: 'vimeo' };
  }
  
  // Direct video URL (mp4, webm, etc.)
  if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return { embedUrl: url, type: 'direct' };
  }
  
  // Try as direct URL anyway
  return { embedUrl: url, type: 'direct' };
}

// Helper to get embed URL for various services
function getEmbedUrl(url: string): string {
  if (!url) return '';
  
  try {
    // Clean the URL first
    const cleanUrl = url.trim();
    
    // Google Maps - already an embed URL
    if (cleanUrl.includes('google.com/maps/embed')) {
      return cleanUrl;
    }
    
    // Figma
    if (cleanUrl.includes('figma.com')) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(cleanUrl)}`;
    }
    
    // CodePen - convert to embed
    if (cleanUrl.includes('codepen.io') && cleanUrl.includes('/pen/')) {
      return cleanUrl.replace('/pen/', '/embed/');
    }
    
    // Spotify - convert to embed
    if (cleanUrl.includes('open.spotify.com')) {
      return cleanUrl.replace('open.spotify.com/', 'open.spotify.com/embed/');
    }
    
    // Default - return as is (most sites work directly)
    return cleanUrl;
  } catch {
    // If any encoding error, return original URL
    return url;
  }
}

export function ResizableMedia({
  src,
  alt,
  type,
  initialWidth = 100,
  alignment = 'center',
  onResize,
  onAlignmentChange,
  onDelete,
  editable = true
}: ResizableMediaProps) {
  const [width, setWidth] = useState(initialWidth);
  const [align, setAlign] = useState(alignment);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const widthPresets = [25, 50, 75, 100];

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  const handleAlignmentChange = (newAlign: 'left' | 'center' | 'right') => {
    setAlign(newAlign);
    onAlignmentChange?.(newAlign);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.parentElement?.offsetWidth || 800;
      const deltaX = e.clientX - startXRef.current;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = Math.max(25, Math.min(100, startWidthRef.current + deltaPercent));
      
      setWidth(Math.round(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      onResize?.(width);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, onResize]);

  const handlePresetClick = (preset: number) => {
    setWidth(preset);
    onResize?.(preset);
  };

  // Alignment classes
  const alignmentClasses = {
    left: 'mr-auto ml-0',
    center: 'mx-auto',
    right: 'ml-auto mr-0'
  };

  // Float classes for text wrap (only when not 100% width)
  const floatClasses = width < 100 ? {
    left: 'float-left mr-4 mb-2',
    center: '',
    right: 'float-right ml-4 mb-2'
  } : { left: '', center: '', right: '' };

  return (
    <>
      <div className={cn("my-4 group relative clear-both", width < 100 && floatClasses[align])}>
        <motion.div
          ref={containerRef}
          style={{ width: `${width}%` }}
          className={cn(
            "relative rounded-lg overflow-hidden",
            alignmentClasses[align],
            isResizing && "ring-2 ring-primary"
          )}
          animate={{ width: `${width}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Media Content */}
          {type === 'image' ? (
            <img
              src={src}
              alt={alt || 'Image'}
              className="w-full h-auto block"
              draggable={false}
            />
          ) : (
            <video
              src={src}
              controls
              className="w-full h-auto block"
            />
          )}

          {/* Resize Handles */}
          {editable && (
            <>
              <div
                onMouseDown={handleResizeStart}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/50"
              />
              <div
                onMouseDown={handleResizeStart}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/50"
              />
            </>
          )}

          {/* Toolbar */}
          {editable && (
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onDelete}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </motion.div>

        {/* Controls - Width & Alignment */}
        {editable && (
          <div className="flex items-center justify-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Alignment Buttons */}
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
              <button
                onClick={() => handleAlignmentChange('left')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  align === 'left' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Align left (text wraps right)"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleAlignmentChange('center')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  align === 'center' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Center"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                onClick={() => handleAlignmentChange('right')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  align === 'right' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Align right (text wraps left)"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>

            {/* Width Presets */}
            <div className="flex items-center gap-1">
              {widthPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-colors",
                    width === preset
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Caption */}
        {alt && (
          <p className="text-center text-sm text-muted-foreground mt-2">{alt}</p>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setIsFullscreen(false)}
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
          {type === 'image' ? (
            <img
              src={src}
              alt={alt || 'Image'}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-full"
            />
          )}
        </div>
      )}
    </>
  );
}

// Image Block Component
export function ImageBlockComponent({ 
  block, 
  editable, 
  onUpdate, 
  onDelete 
}: { 
  block: any; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void;
}) {
  const [url, setUrl] = useState(block.data?.url || '');
  const [alt, setAlt] = useState(block.data?.alt || '');
  const [width, setWidth] = useState(block.data?.width || 100);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(block.data?.alignment || 'center');
  const [showInput, setShowInput] = useState(!block.data?.url);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate({ url, alt, width, alignment });
    setShowInput(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUrl(dataUrl);
        onUpdate({ url: dataUrl, alt: file.name, width, alignment });
        setShowInput(false);
      };
      reader.readAsDataURL(file);
    }
  };

  if (showInput && editable) {
    return (
      <div className="my-4 p-4 border border-dashed border-border rounded-lg bg-muted/20">
        <div className="space-y-4">
          {/* Tab Buttons */}
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              onClick={() => setInputMode('upload')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                inputMode === 'upload' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                inputMode === 'url' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <Link className="w-4 h-4" />
              URL
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, GIF, WebP up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="Paste image URL..."
                autoFocus
              />
              <Input
                type="text"
                value={alt}
                onChange={e => setAlt(e.target.value)}
                placeholder="Alt text (optional)"
              />
              <Button onClick={handleSave} disabled={!url} className="w-full">
                Add Image
              </Button>
            </div>
          )}

          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="w-full text-muted-foreground">
              Cancel
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!url) return null;

  return (
    <ResizableMedia
      src={url}
      alt={alt}
      type="image"
      initialWidth={width}
      alignment={alignment}
      onResize={(newWidth) => onUpdate({ url, alt, width: newWidth, alignment })}
      onAlignmentChange={(newAlign) => { setAlignment(newAlign); onUpdate({ url, alt, width, alignment: newAlign }); }}
      onDelete={onDelete}
      editable={editable}
    />
  );
}

// Video Block Component - Supports YouTube, Vimeo, and direct video URLs
export function VideoBlockComponent({ 
  block, 
  editable, 
  onUpdate, 
  onDelete 
}: { 
  block: any; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void;
}) {
  const [url, setUrl] = useState(block.data?.url || '');
  const [width, setWidth] = useState(block.data?.width || 100);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>(block.data?.alignment || 'center');
  const [showUrlInput, setShowUrlInput] = useState(!block.data?.url);

  const handleSave = () => {
    onUpdate({ url, width, alignment });
    setShowUrlInput(false);
  };

  const videoInfo = getVideoEmbedUrl(url);

  // Alignment classes
  const alignmentClasses = {
    left: 'mr-auto ml-0',
    center: 'mx-auto',
    right: 'ml-auto mr-0'
  };

  // Float classes for text wrap
  const floatClasses = width < 100 ? {
    left: 'float-left mr-4 mb-2',
    center: '',
    right: 'float-right ml-4 mb-2'
  } : { left: '', center: '', right: '' };

  if (showUrlInput && editable) {
    return (
      <div className="my-4 p-4 border border-dashed border-border rounded-lg bg-muted/20">
        <div className="space-y-3">
          <div className="text-center mb-4">
            <p className="text-sm font-medium">Add Video</p>
            <p className="text-xs text-muted-foreground">Supports YouTube, Vimeo, or direct video URLs</p>
          </div>
          <Input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste video URL (YouTube, Vimeo, or direct link)..."
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!url} className="flex-1">
              Add Video
            </Button>
            {onDelete && (
              <Button variant="ghost" onClick={onDelete}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!url || !videoInfo) return null;

  // Render based on video type
  if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
    return (
      <div className={cn("my-4 group relative clear-both", width < 100 && floatClasses[alignment])} style={{ width: `${width}%` }}>
        <div className={cn("relative aspect-video rounded-lg overflow-hidden bg-black", alignmentClasses[alignment])}>
          <iframe
            src={videoInfo.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
        
        {/* Toolbar */}
        {editable && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onDelete}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* Controls */}
        {editable && (
          <div className="flex items-center justify-center gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Alignment Buttons */}
            <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
              <button
                onClick={() => { setAlignment('left'); onUpdate({ url, width, alignment: 'left' }); }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  alignment === 'left' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Align left"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setAlignment('center'); onUpdate({ url, width, alignment: 'center' }); }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  alignment === 'center' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Center"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                onClick={() => { setAlignment('right'); onUpdate({ url, width, alignment: 'right' }); }}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  alignment === 'right' ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Align right"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>

            {/* Width Presets */}
            {[50, 75, 100].map(preset => (
              <button
                key={preset}
                onClick={() => { setWidth(preset); onUpdate({ url, width: preset, alignment }); }}
                className={cn(
                  "px-2 py-1 text-xs rounded border transition-colors",
                  width === preset
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                {preset}%
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Direct video file
  return (
    <ResizableMedia
      src={videoInfo.embedUrl}
      type="video"
      initialWidth={width}
      alignment={alignment}
      onResize={(newWidth) => onUpdate({ url, width: newWidth, alignment })}
      onAlignmentChange={(newAlign) => { setAlignment(newAlign); onUpdate({ url, width, alignment: newAlign }); }}
      onDelete={onDelete}
      editable={editable}
    />
  );
}

// Embed Block Component - For external embeds (websites, Figma, CodePen, etc.)
export function EmbedBlockComponent({ 
  block, 
  editable, 
  onUpdate, 
  onDelete 
}: { 
  block: any; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void;
}) {
  const [url, setUrl] = useState(block.data?.url || '');
  const [height, setHeight] = useState(block.data?.height || 400);
  const [showInput, setShowInput] = useState(!block.data?.url);
  const [loadError, setLoadError] = useState(false);

  const handleSave = () => {
    if (!url) return;
    setLoadError(false);
    onUpdate({ url: url.trim(), height });
    setShowInput(false);
  };

  const embedUrl = getEmbedUrl(url);

  if (showInput && editable) {
    return (
      <div className="my-4 p-4 border border-dashed border-border rounded-lg bg-muted/20">
        <div className="space-y-3">
          <div className="text-center mb-4">
            <Code className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Embed External Content</p>
            <p className="text-xs text-muted-foreground">Paste any URL to embed</p>
          </div>
          <Input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com or embed URL..."
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Height:</span>
            <Input
              type="number"
              value={height}
              onChange={e => setHeight(parseInt(e.target.value) || 400)}
              className="w-24"
              min={100}
              max={1000}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!url.trim()} className="flex-1">
              Embed
            </Button>
            {onDelete && (
              <Button variant="ghost" onClick={onDelete}>
                Cancel
              </Button>
            )}
          </div>
          
          {/* Tips */}
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Tips: Works best with embed URLs from Figma, CodePen, Google Maps, Spotify, etc.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!url) return null;

  return (
    <div className="my-4 group relative">
      <div 
        className="rounded-lg overflow-hidden border border-border bg-muted/20"
        style={{ height: `${height}px` }}
      >
        {loadError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Code className="w-8 h-8 mb-2" />
            <p className="text-sm">Could not load embed</p>
            <p className="text-xs mt-1">Some sites block embedding</p>
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2"
            >
              Open in new tab →
            </a>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            title="Embedded content"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-modals"
            loading="lazy"
            onError={() => setLoadError(true)}
          />
        )}
      </div>
      
      {/* Toolbar */}
      {editable && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowInput(true)}
          >
            Edit
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-7 px-2 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Open
          </a>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
      
      {/* URL indicator */}
      <p className="text-xs text-muted-foreground mt-1 truncate">{url}</p>
    </div>
  );
}

// File Block Component - For file attachments
export function FileBlockComponent({ 
  block, 
  editable, 
  onUpdate, 
  onDelete 
}: { 
  block: any; 
  editable: boolean; 
  onUpdate: (data: any) => void; 
  onDelete?: () => void;
}) {
  const [name, setName] = useState(block.data?.name || '');
  const [url, setUrl] = useState(block.data?.url || '');
  const [size, setSize] = useState(block.data?.size || 0);
  const [showInput, setShowInput] = useState(!block.data?.url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 for local storage (in production, upload to server)
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setUrl(dataUrl);
        setName(file.name);
        setSize(file.size);
        onUpdate({ url: dataUrl, name: file.name, size: file.size });
        setShowInput(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    // Return different colors based on file type
    if (['pdf'].includes(ext || '')) return 'text-red-500';
    if (['doc', 'docx'].includes(ext || '')) return 'text-blue-500';
    if (['xls', 'xlsx'].includes(ext || '')) return 'text-green-500';
    if (['ppt', 'pptx'].includes(ext || '')) return 'text-orange-500';
    if (['zip', 'rar', '7z'].includes(ext || '')) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  if (showInput && editable) {
    return (
      <div className="my-4 p-4 border border-dashed border-border rounded-lg bg-muted/20">
        <div 
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <File className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Click to upload a file</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Any file type up to 50MB</p>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        {onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="w-full mt-2 text-muted-foreground">
            Cancel
          </Button>
        )}
      </div>
    );
  }

  if (!url) return null;

  return (
    <div className="my-4 group">
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
        <File className={cn("w-8 h-8 flex-shrink-0", getFileIcon(name))} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(size)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              const link = document.createElement('a');
              link.href = url;
              link.download = name;
              link.click();
            }}
          >
            Download
          </Button>
          {editable && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              onClick={onDelete}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
