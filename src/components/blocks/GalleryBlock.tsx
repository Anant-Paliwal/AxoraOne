import { useState, useCallback } from 'react';
import { Image, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Block } from './types';

interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
}

interface GalleryBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function GalleryBlockComponent({ block, editable, onUpdate, onDelete }: GalleryBlockProps) {
  const [images, setImages] = useState<GalleryImage[]>(block.data?.images || []);
  const [columns, setColumns] = useState(block.data?.columns || 3);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newImage, setNewImage] = useState({ url: '', title: '', description: '' });
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const saveData = useCallback((newImages: GalleryImage[], newColumns?: number) => {
    onUpdate({ images: newImages, columns: newColumns || columns });
  }, [onUpdate, columns]);

  const addImage = () => {
    if (!newImage.url) return;
    
    const image: GalleryImage = {
      id: Date.now().toString(),
      url: newImage.url,
      title: newImage.title,
      description: newImage.description
    };
    
    const newImages = [...images, image];
    setImages(newImages);
    saveData(newImages);
    setNewImage({ url: '', title: '', description: '' });
    setShowAddDialog(false);
    toast.success('Image added');
  };

  const deleteImage = (imageId: string) => {
    const newImages = images.filter(i => i.id !== imageId);
    setImages(newImages);
    saveData(newImages);
    toast.success('Image deleted');
  };

  return (
    <div className="my-2">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Gallery</span>
        </div>
        {editable && onDelete && (
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      <div className="p-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{images.length} images</span>
            <select
              value={columns}
              onChange={e => {
                const newCols = parseInt(e.target.value);
                setColumns(newCols);
                saveData(images, newCols);
              }}
              className="h-8 px-2 rounded border border-input bg-background text-sm"
            >
              <option value={2}>2 columns</option>
              <option value={3}>3 columns</option>
              <option value={4}>4 columns</option>
              <option value={5}>5 columns</option>
            </select>
          </div>
          {editable && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Image
            </Button>
          )}
        </div>

        {/* Gallery Grid */}
        {images.length > 0 ? (
          <div className={cn("grid gap-2", `grid-cols-${columns}`)}>
            {images.map(image => (
              <div
                key={image.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.url}
                  alt={image.title || 'Gallery image'}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Image+Error';
                  }}
                />
                {editable && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                    className="absolute top-2 right-2 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {image.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-sm truncate">{image.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <Image className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">No images yet</p>
            {editable && (
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add first image
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Image Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={newImage.url}
                onChange={e => setNewImage({ ...newImage, url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                value={newImage.title}
                onChange={e => setNewImage({ ...newImage, title: e.target.value })}
                placeholder="Image title"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={addImage}>Add Image</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <div>
              <img
                src={selectedImage.url}
                alt={selectedImage.title || 'Gallery image'}
                className="w-full max-h-[70vh] object-contain rounded-lg"
              />
              {selectedImage.title && (
                <h3 className="mt-4 font-semibold">{selectedImage.title}</h3>
              )}
              {selectedImage.description && (
                <p className="text-muted-foreground">{selectedImage.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
