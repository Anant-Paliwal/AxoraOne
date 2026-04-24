import { ReactFlowProvider } from 'reactflow';
import { EnhancedKnowledgeGraph } from '@/components/graph/EnhancedKnowledgeGraph';

export function KnowledgeGraphPage() {
  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <ReactFlowProvider>
        <EnhancedKnowledgeGraph />
      </ReactFlowProvider>
    </div>
  );
}
