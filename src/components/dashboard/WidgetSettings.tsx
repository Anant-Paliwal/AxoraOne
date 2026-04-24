import { useState } from 'react';
import { Settings, Maximize2, Minimize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { WidgetConfig, WIDGET_DEFINITIONS } from './WidgetTypes';

interface WidgetSettingsProps {
  widget: WidgetConfig;
  open: boolean;
  onClose: () => void;
  onUpdate: (widget: WidgetConfig) => void;
}

export function WidgetSettings({ widget, open, onClose, onUpdate }: WidgetSettingsProps) {
  const definition = WIDGET_DEFINITIONS.find(w => w.type === widget.type);
  const [width, setWidth] = useState(widget.w);
  const [height, setHeight] = useState(widget.h);

  if (!definition) return null;

  const handleSave = () => {
    onUpdate({
      ...widget,
      w: width,
      h: height,
    });
    onClose();
  };

  const handleReset = () => {
    setWidth(definition.defaultSize.w);
    setHeight(definition.defaultSize.h);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Widget Settings
          </DialogTitle>
          <DialogDescription>
            Customize the size and appearance of your widget
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Widget Info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{definition.name}</h4>
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            </div>
          </div>

          {/* Width Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Width</Label>
              <span className="text-xs text-muted-foreground">
                {width} column{width > 1 ? 's' : ''}
              </span>
            </div>
            <Slider
              value={[width]}
              onValueChange={([value]) => setWidth(value)}
              min={definition.minSize.w}
              max={definition.maxSize.w}
              step={1}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWidth(definition.minSize.w)}
                className="flex-1 gap-2"
              >
                <Minimize2 className="w-3 h-3" />
                Narrow
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWidth(definition.maxSize.w)}
                className="flex-1 gap-2"
              >
                <Maximize2 className="w-3 h-3" />
                Wide
              </Button>
            </div>
          </div>

          {/* Height Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Height</Label>
              <span className="text-xs text-muted-foreground">
                {height} row{height > 1 ? 's' : ''}
              </span>
            </div>
            <Slider
              value={[height]}
              onValueChange={([value]) => setHeight(value)}
              min={definition.minSize.h}
              max={definition.maxSize.h}
              step={1}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeight(definition.minSize.h)}
                className="flex-1 gap-2"
              >
                <Minimize2 className="w-3 h-3" />
                Short
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHeight(definition.maxSize.h)}
                className="flex-1 gap-2"
              >
                <Maximize2 className="w-3 h-3" />
                Tall
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
