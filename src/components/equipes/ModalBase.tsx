import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalBaseProps {
  onClose: () => void;
  children: React.ReactNode;
  gradientFrom?: string;
  title?: string;
}

const ModalBase = ({ onClose, children, gradientFrom, title }: ModalBaseProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className="relative w-full max-w-lg rounded-2xl overflow-hidden"
      style={gradientFrom ? {
        border: '3px solid transparent',
        background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${gradientFrom}, ${gradientFrom}80) border-box`,
        boxShadow: `0 0 45px -10px ${gradientFrom}60`
      } : {
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      {title && (
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h2 className="text-white font-black text-lg tracking-tight uppercase">{title}</h2>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  </motion.div>
);

export default ModalBase;
