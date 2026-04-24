import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

export const ConceptNode = memo(({ data, selected }: NodeProps) => {
  const usageCount = data.usage_count || 0;
  const importance = data.importance || 0.5;
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      <div className={`w-[180px] rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-sm border-2 ${
        selected ? 'border-amber-500 shadow-lg shadow-amber-500/50' : 'border-amber-500/50'
      } p-4 transition-all`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/30 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate mb-1">
              {data.label}
            </h4>
            {usageCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  Used {usageCount}x
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Importance indicator */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full transition-all" 
            style={{ width: `${importance * 100}%` }} 
          />
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-amber-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-amber-500 !border-2 !border-white"
      />
    </motion.div>
  );
});

ConceptNode.displayName = 'ConceptNode';
