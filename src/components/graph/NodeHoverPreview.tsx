import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Brain, CheckSquare, Lightbulb, Award, Link2, Calendar, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

interface NodeHoverPreviewProps {
  nodeId: string;
  nodeType: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function NodeHoverPreview({ nodeId, nodeType, position, onClose }: NodeHoverPreviewProps) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadPreview = async () => {
      try {
        const data = await api.getNodePreview(nodeId, nodeType);
        if (mounted) {
          setPreview(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
        if (mounted) setLoading(false);
      }
    };

    loadPreview();
    return () => { mounted = false; };
  }, [nodeId, nodeType]);

  const getIcon = () => {
    switch (nodeType) {
      case 'page': return FileText;
      case 'skill': return Brain;
      case 'task': return CheckSquare;
      case 'concept': return Lightbulb;
      case 'quiz': return Award;
      default: return FileText;
    }
  };

  const Icon = getIcon();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="fixed z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          maxWidth: 'calc(100vw - 40px)'
        }}
        onMouseLeave={onClose}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : preview ? (
          <>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {preview.icon ? (
                  <span className="text-xl">{preview.icon}</span>
                ) : (
                  <Icon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{preview.title}</h4>
                <span className="text-xs text-muted-foreground capitalize">{nodeType}</span>
              </div>
            </div>

            {preview.preview && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {preview.preview}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {preview.connection_count !== undefined && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  <span>{preview.connection_count} connections</span>
                </div>
              )}
              
              {preview.level && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{preview.level}</span>
                </div>
              )}
              
              {preview.status && (
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    preview.status === 'done' ? 'bg-emerald-500' :
                    preview.status === 'in_progress' ? 'bg-amber-500' :
                    'bg-slate-500'
                  }`} />
                  <span className="capitalize">{preview.status.replace('_', ' ')}</span>
                </div>
              )}
              
              {preview.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(preview.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {preview.tags && preview.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {preview.tags.slice(0, 3).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-secondary">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Preview not available
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
