import { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, User, MoreHorizontal, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Block } from './types';

interface Comment {
  id: string;
  text: string;
  author: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  resolved?: boolean;
}

interface CommentBlockProps {
  block: Block;
  editable: boolean;
  onUpdate: (data: any) => void;
  onDelete?: () => void;
}

export function CommentBlockComponent({ block, editable, onUpdate, onDelete }: CommentBlockProps) {
  const [comments, setComments] = useState<Comment[]>(block.data?.comments || []);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isResolved, setIsResolved] = useState(block.data?.resolved || false);

  const saveData = (newComments: Comment[], resolved?: boolean) => {
    onUpdate({ 
      comments: newComments, 
      resolved: resolved !== undefined ? resolved : isResolved 
    });
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: 'You', // In real app, get from auth context
      createdAt: new Date().toISOString()
    };
    
    const newComments = [...comments, comment];
    setComments(newComments);
    saveData(newComments);
    setNewComment('');
  };

  const updateComment = (id: string) => {
    if (!editText.trim()) return;
    
    const newComments = comments.map(c => 
      c.id === id 
        ? { ...c, text: editText.trim(), updatedAt: new Date().toISOString() }
        : c
    );
    setComments(newComments);
    saveData(newComments);
    setEditingId(null);
    setEditText('');
  };

  const deleteComment = (id: string) => {
    const newComments = comments.filter(c => c.id !== id);
    setComments(newComments);
    saveData(newComments);
  };

  const toggleResolved = () => {
    const newResolved = !isResolved;
    setIsResolved(newResolved);
    saveData(comments, newResolved);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "my-2 rounded-lg overflow-hidden",
      isResolved ? "bg-green-500/5" : "bg-yellow-500/5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <MessageSquare className={cn(
            "w-4 h-4",
            isResolved ? "text-green-500" : "text-yellow-500"
          )} />
          <span className="font-medium text-sm">
            {isResolved ? 'Resolved Comment' : 'Comment Thread'}
          </span>
          <span className="text-xs text-muted-foreground">
            ({comments.length} {comments.length === 1 ? 'comment' : 'comments'})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleResolved}
              className={cn(
                "h-7 text-xs",
                isResolved ? "text-green-600" : "text-yellow-600"
              )}
            >
              {isResolved ? 'Reopen' : 'Resolve'}
            </Button>
          )}
          {editable && onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 w-7 p-0 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments List */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No comments yet. Start the discussion!
          </p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="group">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                      {comment.updatedAt && ' (edited)'}
                    </span>
                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent">
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setEditingId(comment.id);
                            setEditText(comment.text);
                          }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteComment(comment.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') updateComment(comment.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button onClick={() => updateComment(comment.id)} className="p-1">
                        <Check className="w-4 h-4 text-green-500" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{comment.text}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input */}
      {editable && !isResolved && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="h-9"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
