import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Brain, TrendingUp } from 'lucide-react';

export const SkillNode = memo(({ data, selected }: NodeProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      <div className={`w-[200px] rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm border-2 ${
        selected ? 'border-purple-500 shadow-lg shadow-purple-500/50' : 'border-purple-500/50'
      } p-4 transition-all`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate mb-1">
              {data.label}
            </h4>
            {data.level && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-muted-foreground">{data.level}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-purple-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-purple-500 !border-2 !border-white"
      />
    </motion.div>
  );
});

SkillNode.displayName = 'SkillNode';
