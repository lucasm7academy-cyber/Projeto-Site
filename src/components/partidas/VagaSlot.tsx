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


}