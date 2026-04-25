// src/pages/SalaMod1.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftFromLine, Copy, Check, AlertTriangle } from 'lucide-react';
import { useSalaSimples } from '../hooks/useSalaSimples';
import { VagaSlot } from '../components/partidas/VagaSlot';
import { ROLE_CONFIG, type Role } from '../components/partidas/salaConfig';
import { useAuth } from '../contexts/AuthContext';
import { usePerfil } from '../contexts/PerfilContext';

// ── Componentes visuais ─────────────────────────────
function ArcaneIndicators() {
    return (
        <div className="absolute inset-0 rounded-full pointer-events-none z-10">
            {[...Array(30)].map((_, i) => (
                <div
                    key={`tick-${i}`}
                    className="absolute top-1/2 left-1/2 w-[1px] bg-white/5 origin-bottom"
                    style={{
                        transform: `translate(-50%, -50%) rotate(${i * 12}deg) translateY(-35vmin)`,
                        height: i % 5 === 0 ? '2.5vmin' : '1.2vmin',
                        backgroundColor: i % 5 === 0 ? 'rgba(255, 183, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    }}
                />
            ))}
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[2vmin] rounded-full border border-dashed border-white/[0.03]" />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 150, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[5vmin] rounded-full border border-dotted border-[#FFB700]/[0.02]" />
        </div>
    );
}

function CentralDisplay() {
    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-full">
            <AnimatePresence mode="wait">
                <motion.div
                    key="image-step"
                    initial={{ scale: 0.2, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ scale: 0.85, opacity: 0.8, filter: 'blur(0px)' }}
                    exit={{ scale: 1.1, opacity: 0, filter: 'blur(5px)' }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <img
                        src="https://static.wikia.nocookie.net/leagueoflegends/images/9/9c/Summoner%27s_Rift_LoL_Promo_01.png/revision/latest/scale-to-width-down/1000?cb=20220817091416"
                        alt="Summoner's Rift" loading="lazy"
                        className="w-[90%] h-[90%] object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                        referrerPolicy="no-referrer"
                    />
                </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%] z-20 opacity-20" />
        </div>
    );
}

function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

// ── PÁGINA ──────────────────────────────────────────
export default function SalaMod1() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const salaId = parseInt(id ?? '0', 10);
    const { user } = useAuth();
    const { perfil } = usePerfil();

    const usuarioAtual = perfil || {
        id: user?.id || '',
        nome: user?.email?.split('@')[0] || 'Jogador',
        tag: '',
        elo: 'Sem Elo',
    };

    if (!user) return <div className="flex-1 bg-[#050505] flex items-center justify-center text-white">Faça login</div>;

    const {
        sala, jogadores, loading, erro,
        timer, codigoPartida,
        meuVoto, votos, timerFinalizacao,
        entrar, sair, confirmar, votar, solicitarFinalizacao,
    } = useSalaSimples(salaId, usuarioAtual);

    if (loading) {
        return (
            <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FFB700] border-t-transparent mb-4" />
                <p className="text-white font-bold uppercase tracking-widest text-xs">Carregando sala...</p>
            </div>
        );
    }

    if (erro || !sala) {
        return (
            <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white p-6">
                <AlertTriangle className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/40 font-bold mb-4">{erro ?? 'Sala não encontrada'}</p>
                <button onClick={() => navigate('/jogar')}
                    className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10">
                    Voltar ao Lobby
                </button>
            </div>
        );
    }

    const isX1 = sala.modo === '1v1';
    const roles: Role[] = isX1 ? ['MID'] : ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
    const timeA = jogadores.filter((j: any) => j.is_time_a);
    const timeB = jogadores.filter((j: any) => !j.is_time_a);
    const jogadorAtual = jogadores.find((j: any) => j.user_id === usuarioAtual.id);
    const votosA = votos.filter((v: any) => v.opcao === 'time_a').length;
    const votosB = votos.filter((v: any) => v.opcao === 'time_b').length;

    const coresModo: Record<string, string> = {
        '1v1': 'text-red-500', 'aram': 'text-blue-500', '5v5': 'text-green-500',
    };

    return (
        <div className="flex-1 w-full h-full bg-[#050505] flex flex-col items-center justify-between p-0 font-sans relative overflow-hidden">

            <img src="/images/mapa1.png" alt="Mapa" className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none" />

            <AnimatePresence>
                {erro && (
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                        className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
                        <div className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm font-bold">{erro}</div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CÍRCULO CENTRAL */}
            <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black border-[4px] border-white/5 flex flex-col items-center justify-center z-10">
                <div className="absolute inset-10 rounded-full border border-white/[0.02]" />
                <ArcaneIndicators />
                <CentralDisplay />
            </div>

            {/* CONFIRMAÇÃO */}
            {sala.estado === 'confirmacao' && (
                <>
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 pointer-events-none">
                        <span className="text-[15vmin] font-black text-white tabular-nums">{timer}</span>
                        <span className="text-[2vmin] font-black text-white/40 uppercase tracking-[1em] mt-6">CONFIRME AGORA</span>
                    </div>
                </>
            )}

            {/* PARTIDA CONFIRMADA */}
            {sala.estado === 'aguardando_inicio' && jogadorAtual && (
                <>
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 p-[8vmin] text-center pointer-events-auto">
                        <p className="text-[1.4vmin] font-black text-white/40 uppercase tracking-[0.5em] mb-[1.5vmin]">Partida Confirmada!</p>
                        {codigoPartida && (
                            <button onClick={() => navigator.clipboard.writeText(codigoPartida)}
                                className="flex items-center gap-[1vmin] px-[3vmin] py-[1.2vmin] rounded-lg bg-[#FFB700]/10 border border-[#FFB700]/30 text-[#FFB700] font-black text-[1.3vmin] uppercase tracking-widest hover:bg-[#FFB700]/20">
                                <Copy className="w-[1.4vmin] h-[1.4vmin]" /> {codigoPartida}
                            </button>
                        )}
                    </div>
                </>
            )}

            {/* VOTAÇÃO */}
            {sala.estado === 'finalizacao' && jogadorAtual && (
                <>
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full bg-black/40 backdrop-blur-sm z-20 pointer-events-none" />
                    <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75vmin] h-[75vmin] rounded-full flex flex-col items-center justify-center z-50 p-[8vmin] text-center pointer-events-auto">
                        {meuVoto ? (
                            <div className="flex flex-col items-center gap-[2vmin]">
                                <div className="w-[6vmin] h-[6vmin] rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                    <Check className="w-[3vmin] h-[3vmin] text-green-400" />
                                </div>
                                <p className="text-green-400 font-black text-[1.5vmin] uppercase">Voto registrado!</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-[2vmin] w-full">
                                <p className="text-[1.1vmin] font-black text-white/30 uppercase tracking-[0.5em]">Quem venceu?</p>
                                <p className="text-[0.9vmin] text-white/20">{formatTime(timerFinalizacao)} restantes</p>
                                <div className="flex gap-[2vmin] w-full mt-[1vmin]">
                                    <button onClick={() => votar('time_a')}
                                        className="flex-1 py-[2vmin] rounded-xl border-2 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 text-blue-400 font-black text-[1.2vmin] uppercase tracking-widest">
                                        {sala.timeANome || 'Time Azul'}
                                        <span className="block text-[0.9vmin] opacity-60">{votosA} votos</span>
                                    </button>
                                    <button onClick={() => votar('time_b')}
                                        className="flex-1 py-[2vmin] rounded-xl border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 font-black text-[1.2vmin] uppercase tracking-widest">
                                        {sala.timeBNome || 'Time Vermelho'}
                                        <span className="block text-[0.9vmin] opacity-60">{votosB} votos</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* TOP BAR */}
            <div className="w-full h-[10vmin] flex items-start justify-center pt-[2vmin] z-50">
                <div className="w-full max-w-6xl h-[7vmin] bg-black rounded-xl border border-white/10 flex items-center px-[3vmin] shadow-2xl mx-4 justify-between">
                    <div className="flex items-center gap-[2vmin]">
                        <button onClick={() => navigate('/jogar')} className="text-yellow-500 hover:text-red-500">
                            <ArrowLeftFromLine className="w-[2.5vmin] h-[2.5vmin]" />
                        </button>
                        <h1 className="text-[2vmin] font-black tracking-tighter text-white/80">{sala.nome}</h1>
                        <span className="text-[2vmin] font-black text-[#FFB700]">#{String(sala.id).padStart(6, '0')}</span>
                    </div>
                    <div className="flex items-center gap-[2vmin]">
                        <div className="hidden sm:flex items-center gap-[1vmin] px-[1.5vmin] py-[0.8vmin] bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[1.5vmin] font-black uppercase">
                                <span className="text-white">MODO: </span>
                                <span className={coresModo[sala.modo] || 'text-white'}>{sala.modo}</span>
                            </span>
                            <span className="text-[1.5vmin] font-black text-white uppercase tracking-widest">MC</span>
                            <span className="text-[1.5vmin] font-black text-[#FFB700] uppercase">{sala.mpoints || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRID DE VAGAS */}
            <div className={`w-full flex-1 flex items-center justify-center z-20 mt-[-12vh] ${isX1 ? 'gap-[80vmin]' : 'gap-[85vmin]'}`}>
                <div className="flex flex-col gap-[1.2vmin] items-start">
                    <div className="relative mb-[1vmin] ml-[0.5vmin] w-[22vmin]">
                        <div className="absolute inset-0 bg-[#3B82F6]/0 skew-x-[-12deg] border-l-4 border-[#3B82F6]" />
                        <span className="text-[1.5vmin] font-black text-[#3B82F6] uppercase tracking-[0.4em]">Blue-Side</span>
                    </div>
                    {roles.map((role) => {
                        const jogador = timeA.find((j: any) => j.role === role);
                        return (
                            <VagaSlot key={`A-${role}`} ocupada={!!jogador}
                                nome={jogador?.nome} tag={jogador?.tag} icone={jogador?.avatar}
                                isTimeA={true} role={role} isConfirmado={jogador?.confirmado}
                                aoEntrar={() => entrar(role, true)} roleIconImg={ROLE_CONFIG[role].img} />
                        );
                    })}
                </div>
                <div className="flex flex-col gap-[1.2vmin] items-end text-right">
                    <div className="relative mb-[1vmin] mr-[0.5vmin] w-[22vmin]">
                        <div className="absolute inset-0 bg-[#ef4444]/0 skew-x-[12deg] border-r-4 border-[#ef4444]" />
                        <span className="text-[1.5vmin] font-black text-[#ef4444] uppercase tracking-[0.4em]">Red-Side</span>
                    </div>
                    {roles.map((role) => {
                        const jogador = timeB.find((j: any) => j.role === role);
                        return (
                            <VagaSlot key={`B-${role}`} ocupada={!!jogador}
                                nome={jogador?.nome} tag={jogador?.tag} icone={jogador?.avatar}
                                isTimeA={false} role={role} isConfirmado={jogador?.confirmado}
                                aoEntrar={() => entrar(role, false)} roleIconImg={ROLE_CONFIG[role].img} />
                        );
                    })}
                </div>
            </div>

            {/* BOTÕES */}
            {sala.estado === 'confirmacao' && jogadorAtual && !jogadorAtual.confirmado && (
                <div className="w-full flex justify-center pb-[4vmin] z-30">
                    <button onClick={confirmar}
                        className="px-[10vmin] py-[2vmin] font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm bg-white text-black hover:bg-[#FFB700] transition-all">
                        Confirmar Presença
                    </button>
                </div>
            )}

            {sala.estado === 'aguardando_inicio' && jogadorAtual && (
                <div className="w-full flex justify-center pb-[4vmin] z-30">
                    <button onClick={solicitarFinalizacao}
                        className="px-[10vmin] py-[2vmin] font-black uppercase tracking-[0.4em] text-[1.4vmin] rounded-sm bg-orange-500 text-white hover:bg-orange-600 transition-all">
                        Encerrar Partida
                    </button>
                </div>
            )}

            <div className="absolute inset-y-0 left-0 w-[20vmin] bg-gradient-to-r from-black via-black/60 to-transparent z-5 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-[20vmin] bg-gradient-to-l from-black via-black/60 to-transparent z-5 pointer-events-none" />
        </div>
    );
}
