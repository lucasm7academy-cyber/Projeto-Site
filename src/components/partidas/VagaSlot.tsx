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

export function VagaSlot(props: VagaSlotProps) {
    const {
        ocupada,
        nome,
        tag,
        icone,
        isTimeA,
        role,
        isConfirmado,
        aoEntrar,
        roleIconImg,
    } = props;

    const teamColor = isTimeA ? '#3B82F6' : '#ef4444';

    const avatarEl = icone
        ? <img src={icone} alt={nome} className="w-[4.5vmin] h-[4.5vmin] rounded object-cover" />
            : <span className="text-white/20 text-[1.6vmin] font-bold">{nome?.[0] || '?'}</span>;
    
    if (ocupada) {
        return (
            <div className="relative w-[42vmin] h-[8.5vmin] bg-black rounded-lg border border-white/10 shadow-lg flex flex-row items-center px-[1.5vmin]">

                {isConfirmado && (
                    <div className={`absolute ${isTimeA ? 'left-[1.5vmin]' : 'right-[1.5vmin]'}`}>
                        <div className="w-[2.5vmin] h-[2.5vmin] bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-[1.6vmin] h-[1.6vmin] text-black" />
                        </div>
                    </div>
                )}
                
                {isTimeA ?(
                    <div className="flex items-center gap-[1vmin] overflow-hidden">
                        <span style={{ color: teamColor }}>{nome}</span>
                        <span>{tag}</span>
                        {avatarEl}
                        <img src={roleIconImg} alt={role} />
                    </div>
                ) : (
                    <div className="flex items-center gap-[1vmin] overflow-hidden">
                        <img src={roleIconImg} alt={role} />
                        {avatarEl}
                        <span style={{ color: teamColor }}>{nome}</span>
                        <span>{tag}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button onClick={aoEntrar} 
            className="w-[42vmin] h-[8.5vmin] bg-white/10 rounded-lg border border-white/10 shadow-lg flex items-center justify-center gap-[1vmin] hover:bg-white/20 transition-colors">
                <div className="w-[4.5vmin] h-[4.5vmin] rounded border border-white/5 bg-white/5 flex items-center justify-center">
                    <UserPlus className="w-[2vmin] h-[2vmin] text-white/10 group-hover:text-white/40 transition-colors"/>    
                </div>
            <div className="flex flex-col">
                <span className="text-[1.2vmin] font-black text-white/10 uppercase tracking-[0.2em] group-hover:text-white/30 transition-colors">ENTRAR</span>
                <div className="flex items-center gap-[0.7vmin] mt-[0.2vmin]">
                    <img src={roleIconImg} className="w-[1.5vmin] h-[1.5vmin] opacity-10 group-hover:opacity-30 transition-opacity" alt={role} />
                    <span className="text-[1.1vmin] font-black text-white/5 uppercase tracking-widest">{role}</span>
                </div>
            </div>
        </button>
    );



}