import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { CheckSquare, Clock } from 'lucide-react';

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const statusColors = {
    'todo': 'text-gray-500',
    'in_progress': 'text-yellow-500',
    'completed': 'text-green-500',
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      <div className={`w-[200px] rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-sm border-2 ${
        selected ? 'border-yellow-500 shadow-lg shadow-yellow-500/50' : 'border-yellow-500/50'
      } p-4 transition-all`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate mb-1">
              {data.label}
            </h4>
            {data.status && (
              <div className="flex items-center gap-1">
                <Clock className={`w-3 h-3 ${statusColors[data.status as keyof typeof statusColors] || 'text-gray-500'}`} />
                <span className="text-xs text-muted-foreground capitalize">
                  {data.status.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-yellow-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-yellow-500 !border-2 !border-white"
      />
    </motion.div>
  );
});

TaskNode.displayName = 'TaskNode';
