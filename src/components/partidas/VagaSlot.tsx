import React from 'react';
import { motion } from 'motion/react';
import { UserPlus, Check } from 'lucide-react';

interface VagaSlotProps {
    ocupada: boolean;
    nome?: string;
    tag?: string;
    icone?: string;
    isTimeA: boolean;
    role: string;
    isConfirmado?: boolean;
    aoEntrar: () => void;
    roleIconImg: string;
}

export const VagaSlot: React.FC<VagaSlotProps> = ({
    ocupada,
    nome,
    tag,
    icone,
    isTimeA,
    role,
    isConfirmado,
    aoEntrar,
    roleIconImg,
}) => {

    const teamColor = isTimeA ? '#3B82F6' : '#ef4444';
    const teamGlow = isTimeA ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'shadow-[0_0_15px_rgba(239,68,68,0.3)]';

    const avatarEl = icone
        ? <img src={icone} alt={nome} className="w-[5vmin] h-[5vmin] rounded-lg object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10" />
        : <div className="w-[5vmin] h-[5vmin] bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
            <span className="text-white/20 text-[1.8vmin] font-black uppercase">{nome?.[0] || '?'}</span>
          </div>;
    
    if (ocupada) {
        return (
            <motion.div 
                initial={{ opacity: 0, x: isTimeA ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`relative w-[48vmin] h-[10vmin] bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex items-center px-[2.5vmin] transition-all group overflow-visible
                    ${isTimeA ? 'flex-row' : 'flex-row-reverse'}
                    ${isConfirmado ? 'border-green-500/30' : 'border-white/10'}
                `}
            >
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${teamGlow}`} />

                {isConfirmado && (
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }}
                        className={`absolute top-[-1.2vmin] ${isTimeA ? 'left-[-1.2vmin]' : 'right-[-1.2vmin]'} z-20`}
                    >
                        <div className="w-[3.5vmin] h-[3.5vmin] bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.6)] border-[3px] border-[#050505]">
                            <Check className="w-[2vmin] h-[2vmin] text-black stroke-[3px]" />
                        </div>
                    </motion.div>
                )}
                
                <div className={`flex items-center gap-[2.5vmin] flex-1 overflow-hidden ${isTimeA ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="shrink-0 flex items-center justify-center w-[6vmin] h-[6vmin] bg-white/5 rounded-xl border border-white/10 relative group-hover:bg-white/10 transition-colors">
                        <img src={roleIconImg} alt={role} className="w-[2.5vmin] h-[2.5vmin] object-contain brightness-0 invert opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {avatarEl}
                    <div className={`flex flex-col min-w-0 ${isTimeA ? 'text-left' : 'text-right'}`}>
                        <div className="flex items-center gap-2">
                             <span className="text-[2.2vmin] font-black truncate uppercase tracking-tight" style={{ color: teamColor, textShadow: `0 0 10px ${teamColor}44` }}>
                                {nome}
                            </span>
                        </div>
                        <span className="text-[1.3vmin] font-bold text-white/30 uppercase tracking-[0.2em] leading-none mt-1">
                            #{tag}
                        </span>
                    </div>
                </div>

                {/* Decorative element */}
                <div className={`absolute top-1/2 -translate-y-1/2 w-1 h-[40%] rounded-full opacity-20 ${isTimeA ? 'right-[1vmin]' : 'left-[1vmin]'}`} style={{ backgroundColor: teamColor }} />
            </motion.div>
        );
    }

    return (
        <motion.button 
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={aoEntrar} 
            className={`group relative w-[48vmin] h-[10vmin] bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/[0.08] shadow-lg flex items-center justify-center gap-[2.5vmin] hover:border-white/20 transition-all duration-300
                ${isTimeA ? 'flex-row' : 'flex-row-reverse'}
            `}
        >
            <div className="w-[6vmin] h-[6vmin] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:border-white/30 transition-all duration-300">
                <UserPlus className="w-[2.5vmin] h-[2.5vmin] text-white/10 group-hover:text-white/60 transition-colors" />    
            </div>
            <div className={`flex flex-col ${isTimeA ? 'items-start' : 'items-end'}`}>
                <span className="text-[1.6vmin] font-black text-white/10 uppercase tracking-[0.4em] group-hover:text-white/60 transition-colors">ENTRAR</span>
                <div className={`flex items-center gap-[1vmin] mt-[0.2vmin] ${isTimeA ? 'flex-row' : 'flex-row-reverse'}`}>
                    <img src={roleIconImg} className="w-[2vmin] h-[2vmin] opacity-[0.05] group-hover:opacity-40 transition-opacity brightness-0 invert" alt={role} />
                    <span className="text-[1.4vmin] font-black text-white/5 uppercase tracking-widest group-hover:text-white/20">{role}</span>
                </div>
            </div>
            
            {/* Corner deco */}
            <div className={`absolute bottom-0 ${isTimeA ? 'left-0' : 'right-0'} w-4 h-4 overflow-hidden border-b-2 border-white/5 ${isTimeA ? 'border-l-2' : 'border-r-2'} rounded-bl-2xl group-hover:border-[#FFB700]/30 transition-colors`} />
        </motion.button>
    );
}
