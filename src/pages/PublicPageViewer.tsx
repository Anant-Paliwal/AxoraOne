import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Calendar, Clock, Globe } from 'lucide-react';
import { DraggableBlockEditor } from '@/components/blocks/DraggableBlocks';
import { ContentViewer } from '@/components/viewer/ContentViewer';
import '@/components/viewer/content-viewer.css';

export function PublicPageViewer() {
  const { pageId } = useParams<{ pageId: string }>();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPage();
  }, [pageId]);

  const loadPublicPage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch public page without authentication
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/pages/public/${pageId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Page not found or not public');
        } else {
          setError('Failed to load page');
        }
        return;
      }

      const data = await response.json();
      setPage(data);
    } catch (err) {
      console.error('Error loading public page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Available</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'This page does not exist or is not publicly accessible.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Public Banner */}
      <div className="bg-primary/10 border-b border-primary/20 py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Globe className="w-4 h-4" />
            <span className="font-medium">Public Page</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{page.view_count || 0} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Icon and Title */}
          <div className="flex items-start gap-4 mb-4">
            {page.icon && (
              <div className="text-5xl">{page.icon}</div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {page.title}
              </h1>
              
              {/* Metadata */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(page.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {page.estimated_reading_time > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{page.estimated_reading_time} min read</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          {page.cover_image && (
            <div className="rounded-xl overflow-hidden mb-6">
              <img
                src={page.cover_image}
                alt={page.title}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {page.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          {page.blocks && page.blocks.length > 0 ? (
            <DraggableBlockEditor 
              blocks={page.blocks}
              onChange={() => {}} // Read-only, no changes allowed
              editable={false}
            />
          ) : page.content ? (
            <ContentViewer content={page.content} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No content available</p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 pt-8 border-t border-border"
        >
          <div className="text-center text-sm text-muted-foreground">
            <p>This page was shared publicly</p>
            <p className="mt-2">
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
