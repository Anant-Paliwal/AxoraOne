import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Block {
  id: string;
  type: string;
  position: number;
  data: Record<string, any>;
}

interface BlockInsertContextType {
  pendingBlocks: Block[];
  setPendingBlocks: (blocks: Block[]) => void;
  insertBlocks: (blocks: Block[]) => void;
  clearPendingBlocks: () => void;
  onBlocksInserted: (() => void) | null;
  setOnBlocksInserted: (callback: (() => void) | null) => void;
}

const BlockInsertContext = createContext<BlockInsertContextType | null>(null);

export function BlockInsertProvider({ children }: { children: ReactNode }) {
  const [pendingBlocks, setPendingBlocksState] = useState<Block[]>([]);
  const [onBlocksInserted, setOnBlocksInsertedState] = useState<(() => void) | null>(null);

  const setPendingBlocks = useCallback((blocks: Block[]) => {
    setPendingBlocksState(blocks);
  }, []);

  const insertBlocks = useCallback((blocks: Block[]) => {
    setPendingBlocksState(blocks);
  }, []);

  const clearPendingBlocks = useCallback(() => {
    setPendingBlocksState([]);
  }, []);

  const setOnBlocksInserted = useCallback((callback: (() => void) | null) => {
    setOnBlocksInsertedState(() => callback);
  }, []);

  return (
    <BlockInsertContext.Provider value={{
      pendingBlocks,
      setPendingBlocks,
      insertBlocks,
      clearPendingBlocks,
      onBlocksInserted,
      setOnBlocksInserted
    }}>
      {children}
    </BlockInsertContext.Provider>
  );
}

export function useBlockInsert() {
  const context = useContext(BlockInsertContext);
  if (!context) {
    throw new Error('useBlockInsert must be used within a BlockInsertProvider');
  }
  return context;
}
