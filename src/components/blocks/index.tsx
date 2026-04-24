// Unified Block System Exports
export {
  // Main Components
  UnifiedBlockRenderer,
  BlockEditor,
  BlockPicker,
  
  // Individual Block Components (with Component suffix)
  DatabaseBlockComponent,
  CalendarBlockComponent,
  GalleryBlockComponent,
  TimelineBlockComponent,
  ListBlockComponent,
  FormBlockComponent,
  CalloutBlockComponent,
  QuoteBlockComponent,
  DividerBlockComponent,
  ToggleBlockComponent,
  CodeBlockComponent,
  TextBlockComponent,
  ImageBlockComponent,
  VideoBlockComponent,
  
  // Types
  BLOCK_TYPES,
} from './UnifiedBlocks';

// Re-export types
export type { Block, BlockType, Column, Row } from './types';

// Re-export BlockRenderer for backward compatibility
export { BlockRenderer } from './BlockRenderer';

// Re-export standalone legacy blocks (simple interface: id, onRemove)
export { TableBlock } from './TableBlock';
export { TextBlock } from './TextBlock';
export { BlockMenu } from './BlockMenu';
export { GalleryBlock } from './GalleryBlock';
export { CalendarBlock } from './CalendarBlock';
export { TimelineBlock } from './TimelineBlock';
export { ListBlock } from './ListBlock';
export { FormBlock } from './FormBlock';
export { DatabaseBlock } from './DatabaseBlock';

// Legacy exports (deprecated - use UnifiedBlocks instead)
export { ImportDialog } from './ImportDialog';
export { BlockSidebar } from './BlockSidebar';