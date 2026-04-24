import { 
  Type, 
  Heading1, 
  List, 
  Code, 
  Youtube, 
  Upload, 
  Sparkles, 
  FileText,
  HelpCircle,
  Link
} from 'lucide-react';

interface BlockMenuProps {
  onSelectBlock: (type: string) => void;
  onClose: () => void;
}

const blockTypes = [
  { type: 'text', label: 'Text', icon: Type, description: 'Regular paragraph' },
  { type: 'heading', label: 'Heading', icon: Heading1, description: 'Section heading' },
  { type: 'list', label: 'Bullet List', icon: List, description: 'Unordered list' },
  { type: 'code', label: 'Code', icon: Code, description: 'Code block' },
  { type: 'youtube', label: 'YouTube Video', icon: Youtube, description: 'Embed video' },
  { type: 'file', label: 'File Upload', icon: Upload, description: 'Upload file' },
  { type: 'ai-explain', label: 'AI Explain', icon: Sparkles, description: 'AI explanation' },
  { type: 'ai-summary', label: 'AI Summary', icon: FileText, description: 'AI summary' },
  { type: 'ai-quiz', label: 'AI Quiz', icon: HelpCircle, description: 'AI quiz' },
  { type: 'skill-link', label: 'Skill Link', icon: Link, description: 'Link to skill' },
];

export function BlockMenu({ onSelectBlock, onClose }: BlockMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="p-2 max-h-[500px] overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Insert Block
        </div>
        {blockTypes.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              onClick={() => {
                onSelectBlock(block.type);
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{block.label}</p>
                <p className="text-xs text-muted-foreground">{block.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
