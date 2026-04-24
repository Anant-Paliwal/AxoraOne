// Re-export from UnifiedBlocks for backward compatibility
export { 
  UnifiedBlockRenderer as BlockRenderer,
  BlockEditor,
  BlockPicker,
  BLOCK_TYPES,
} from './UnifiedBlocks';

export type { Block, BlockType } from './types';

// Legacy interface for backward compatibility
export interface BlockRendererProps {
  block: {
    id: string;
    type: string;
    data?: any;
    position?: number;
  };
  editable?: boolean;
  onUpdate?: (blockId: string, data: any) => void;
  onDelete?: (blockId: string) => void;
}