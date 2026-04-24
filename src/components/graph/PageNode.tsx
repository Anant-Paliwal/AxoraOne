import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export const PageNode = memo(({ data, selected }: NodeProps) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      <div className={`w-[200px] rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm border-2 ${
        selected ? 'border-blue-500 shadow-lg shadow-blue-500/50' : 'border-blue-500/50'
      } p-4 transition-all`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center flex-shrink-0">
            {data.icon ? (
              <span className="text-xl">{data.icon}</span>
            ) : (
              <FileText className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate mb-1">
              {data.label}
            </h4>
            {data.tags && data.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.tags.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-blue-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-blue-500 !border-2 !border-white"
      />
    </motion.div>
  );
});

PageNode.displayName = 'PageNode';
