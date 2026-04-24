import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Briefcase, Sparkles } from 'lucide-react';

export const WorkspaceNode = memo(({ data }: NodeProps) => {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="relative"
    >
      <div className="w-[300px] h-[150px] rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 shadow-2xl border-4 border-purple-400 p-6 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        {/* Icon */}
        <div className="relative z-10 mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-pulse" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 text-center">
          <h3 className="text-xl font-bold text-white mb-1">
            {data.label}
          </h3>
          <p className="text-sm text-purple-100">
            {data.description}
          </p>
        </div>

        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl -z-10" />
      </div>

      {/* Handles for connections */}
      <Handle
        type="source"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
      />
    </motion.div>
  );
});

WorkspaceNode.displayName = 'WorkspaceNode';
