// src/pages/SalaMod1.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftFromLine, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { useSalaSimples } from '../hooks/useSalaSimples';
import { VagaSlot } from '../components/partidas/VagaSlot';
import { ROLE_CONFIG, type Role } from '../api/salamod1';
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
        mostrarFalha,
        entrar, sair, confirmar, votar, solicitarFinalizacao,
    } = useSalaSimples(salaId, usuarioAtual);

    if (loading) {
        return (
            <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1510_0%,#050505_100%)]" />
                <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="relative z-10 w-16 h-16 rounded-full border-2 border-[#FFB700]/20 border-t-[#FFB700] shadow-[0_0_20px_rgba(255,183,0,0.2)]" 
                />
                <p className="mt-6 text-[#FFB700] font-black uppercase tracking-[0.5em] text-[1.4vmin] animate-pulse">Invocando Sala...</p>
            </div>
        );
    }

    if (erro || !sala) {
        return (
            <div className="flex-1 bg-[#050505] flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#050505]" />
                <AlertTriangle className="w-16 h-16 text-red-500/20 mb-6 relative z-10" />
                <p className="text-white/40 font-black mb-8 relative z-10 uppercase tracking-widest">{erro ?? 'Sala não encontrada'}</p>
                <button onClick={() => navigate('/jogar')}
                    className="relative z-10 px-[4vmin] py-[1.5vmin] rounded-full bg-white/5 border border-white/10 text-white font-black text-[1.4vmin] uppercase tracking-widest hover:bg-white/10 transition-all">
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
        '1v1': 'text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]', 
        'aram': 'text-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]', 
        '5v5': 'text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]',
    };

    return (
        <div className="flex-1 w-full h-full bg-[#050505] flex flex-col items-center justify-between p-0 font-sans relative overflow-hidden text-white">

            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[#050505]" />
                <img 
                    src="https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt6d5d115ee8d98d01/5e73e970a05a41103c809e53/summoners-rift-bg.jpg" 
                    alt="Mapa" 
                    className="absolute inset-0 w-full h-full object-cover opacity-10 grayscale brightness-50 contrast-125" 
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,183,0,0.05)_0%,#050505_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
            </div>

            <AnimatePresence>
                {erro && (
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}
                        className="absolute top-24 left-1/2 -translate-x-1/2 z-[100]">
                        <div className="px-6 py-3 rounded-2xl bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-100 text-[1.4vmin] font-black uppercase tracking-widest shadow-2xl">
                            {erro}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP BAR */}
            <div className="w-full h-[12vh] flex items-center justify-center z-50 pointer-events-none px-6 mt-4">
                <motion.div 
                    initial={{ y: -100 }} animate={{ y: 0 }}
                    className="w-full max-w-[140vmin] h-[8vh] bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 flex items-center px-[3vmin] shadow-[0_20px_50px_rgba(0,0,0,0.5)] justify-between pointer-events-auto"
                >
                    <div className="flex items-center gap-[3vmin]">
                        <motion.button 
                            whileHover={{ scale: 1.1, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate('/jogar')} 
                            className="w-[5vmin] h-[5vmin] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-yellow-500 hover:text-red-500 transition-colors"
                        >
                            <ArrowLeftFromLine className="w-[2vmin] h-[2vmin]" />
                        </motion.button>
                        <div className="flex flex-col">
                            <h1 className="text-[2.2vmin] font-black tracking-widest text-white uppercase leading-none">{sala.nome}</h1>
                            <span className="text-[1.8vmin] font-black text-[#FFB700] tracking-widest mt-1">PK-#{String(sala.id).padStart(6, '0')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-[4vmin]">
                        <div className="flex items-center gap-[1.5vmin] px-[2.5vmin] py-[1.2vmin] bg-white/[0.03] rounded-xl border border-white/[0.05]">
                            <div className="flex flex-col">
                                <span className="text-[1vmin] font-bold text-white/40 uppercase tracking-widest">Estado</span>
                                <span className="text-[1.4vmin] font-black text-[#FFB700] uppercase tracking-widest">{sala.estado.replace('_', ' ')}</span>
                            </div>
                            <div className="w-[1px] h-[3vmin] bg-white/10 mx-2" />
                            <div className="flex flex-col">
                                <span className="text-[1vmin] font-bold text-white/40 uppercase tracking-widest">Modo</span>
                                <span className={`text-[1.4vmin] font-black uppercase tracking-widest ${coresModo[sala.modo] || 'text-white'}`}>{sala.modo}</span>
                            </div>
                            <div className="w-[1px] h-[3vmin] bg-white/10 mx-2" />
                            <div className="flex flex-col">
                                <span className="text-[1vmin] font-bold text-white/40 uppercase tracking-widest">Premiação</span>
                                <span className="text-[1.4vmin] font-black text-green-400 uppercase tracking-widest">{sala.mpoints || 0} MC</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* MAIN CENTRAL AREA */}
            <div className="flex-1 w-full relative flex items-center justify-center overflow-visible">
                {/* CÍRCULO CENTRAL HUB */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vmin] h-[55vmin] rounded-full z-10 flex items-center justify-center">
                    {/* Outer rings */}
                    <div className="absolute inset-[-8vmin] rounded-full border border-white/[0.02] border-dashed animate-[spin_100s_linear_infinite]" />
                    <div className="absolute inset-[-4vmin] rounded-full border-t-4 border-l-2 border-[#FFB700]/10 opacity-30 animate-[spin_60s_linear_infinite]" />
                    
                    {/* Main Hub Body */}
                    <div className="relative w-full h-full rounded-full bg-black shadow-[0_0_100px_rgba(0,0,0,1)] border-[6px] border-white/5 flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(40,30,20,0.6)_0%,transparent_100%)] opacity-50" />
                        <ArcaneIndicators />
                        <CentralDisplay />
                        
                        {/* HUB HUD Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
                            <div className="absolute top-10 flex flex-col items-center">
                                <div className="w-[6vmin] h-[2px] bg-gradient-to-r from-transparent via-[#FFB700]/40 to-transparent mb-2" />
                                <span className="text-[0.9vmin] font-black text-[#FFB700]/60 uppercase tracking-[0.8em]">SISTEMA ANALÍTICO</span>
                            </div>
                            <div className="absolute bottom-10 flex flex-col items-center">
                                <span className="text-[0.9vmin] font-black text-white/20 uppercase tracking-[0.5em]">STATUS DE CONEXÃO: ESTÁVEL</span>
                                <div className="w-[10vmin] h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent mt-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDE GRID SECTION */}
                <div className={`w-full flex items-center justify-center z-20 ${isX1 ? 'gap-[62vmin]' : 'gap-[58vmin]'}`}>
                    {/* BLUE SIDE */}
                    <div className="flex flex-col gap-[2vmin] items-start">
                        <div className="relative mb-[2vmin] ml-[1vmin] group">
                            <motion.div 
                                initial={{ width: 0 }} animate={{ width: '100%' }}
                                className="absolute inset-0 bg-[#3B82F6]/10 skew-x-[-15deg] border-l-[6px] border-[#3B82F6] shadow-[0_0_30px_rgba(59,130,246,0.2)]" 
                            />
                            <span className="relative z-10 px-8 py-2 block text-[2vmin] font-black text-[#3B82F6] uppercase tracking-[0.5em]">LADO AZUL</span>
                        </div>
                        <div className="flex flex-col gap-[1.5vmin]">
                            {roles.map((role) => {
                                const jogador = timeA.find((j: any) => j.role === role);
                                return (
                                    <VagaSlot key={`A-${role}`} ocupada={!!jogador}
                                        nome={jogador?.nome} tag={jogador?.tag} icone={jogador?.avatar}
                                        isTimeA={true} role={role as any} isConfirmado={jogador?.confirmado}
                                        aoEntrar={() => entrar(role, true)} roleIconImg={ROLE_CONFIG[role].img} />
                                );
                            })}
                        </div>
                    </div>

                    {/* RED SIDE */}
                    <div className="flex flex-col gap-[2vmin] items-end">
                        <div className="relative mb-[2vmin] mr-[1vmin] group">
                            <motion.div 
                                 initial={{ width: 0 }} animate={{ width: '100%' }}
                                className="absolute inset-0 bg-[#ef4444]/10 skew-x-[15deg] border-r-[6px] border-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.2)]" 
                            />
                            <span className="relative z-10 px-8 py-2 block text-[2vmin] font-black text-[#ef4444] uppercase tracking-[0.5em]">LADO VERMELHO</span>
                        </div>
                        <div className="flex flex-col gap-[1.5vmin]">
                            {roles.map((role) => {
                                const jogador = timeB.find((j: any) => j.role === role);
                                return (
                                    <VagaSlot key={`B-${role}`} ocupada={!!jogador}
                                        nome={jogador?.nome} tag={jogador?.tag} icone={jogador?.avatar}
                                        isTimeA={false} role={role as any} isConfirmado={jogador?.confirmado}
                                        aoEntrar={() => entrar(role, false)} roleIconImg={ROLE_CONFIG[role].img} />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* OVERLAYS (CONFIRMATION / VOTING/ ETC IN THE MIDDLE) */}

                <AnimatePresence>
                    {/* CONFIRMAÇÃO */}
                    {sala.estado === 'confirmacao' && (
                        <motion.div 
                            key="overlay-confirmacao"
                            initial={{ opacity: 0, scale: 1.1 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vmin] h-[55vmin] rounded-full bg-black/60 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-[5vmin] border border-[#FFB700]/20"
                        >
                            <motion.span 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }}
                                className="text-[15vmin] font-black text-white tabular-nums leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                            >
                                {timer}
                            </motion.span>
                            <motion.div 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex flex-col items-center gap-4 mt-4"
                            >
                                <span className="text-[1.8vmin] font-black text-[#FFB700] uppercase tracking-[1em]">CONFIRME AGORA</span>
                                <div className="w-[12vmin] h-[4px] bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                        className="h-full bg-[#FFB700]" 
                                        initial={{ width: '100%' }}
                                        animate={{ width: `${(timer / 40) * 100}%` }}
                                        transition={{ duration: 1, ease: 'linear' }}
                                    />
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* FALHA NA CONFIRMAÇÃO */}
                    {mostrarFalha && (
                        <motion.div 
                            key="overlay-falha"
                            initial={{ opacity: 0, scale: 0.8 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vmin] h-[55vmin] rounded-full bg-red-500/10 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-[5vmin] border border-red-500/30"
                        >
                            <motion.div
                                initial={{ rotate: -90, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                            >
                                <X className="w-[12vmin] h-[12vmin] text-red-500 stroke-[3px]" />
                            </motion.div>
                            <motion.p 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-[2vmin] font-black text-red-400 uppercase tracking-[0.5em] mt-4"
                            >
                                Falha Crítica
                            </motion.p>
                            <motion.p 
                                initial={{ y: 20, opacity: 0 }} 
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-[1.2vmin] font-bold text-red-300/60 uppercase tracking-[0.2em] mt-2"
                            >
                                Nem todos confirmaram
                            </motion.p>
                        </motion.div>
                    )}

                    {/* PARTIDA CONFIRMADA */}
                    {sala.estado === 'aguardando_inicio' && jogadorAtual && (
                        <motion.div 
                            key="overlay-partida-confirmada"
                            initial={{ opacity: 0, filter: 'blur(10px)' }} 
                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vmin] h-[55vmin] rounded-full bg-[#FFB700]/5 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-[6vmin] text-center border border-[#FFB700]/20"
                        >
                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                                <p className="text-[1.6vmin] font-black text-[#FFB700] uppercase tracking-[0.6em] mb-4">Preparar para a Batalha!</p>
                                <p className="text-[1.2vmin] text-white/60 mb-6 max-w-[25vmin]">Use o código abaixo para entrar na sala oficial no League of Legends.</p>
                                
                                {codigoPartida ? (
                                    <motion.button 
                                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,183,0,0.2)' }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(codigoPartida);
                                        }}
                                        className="group flex flex-col items-center gap-2 px-[4vmin] py-[2vmin] rounded-2xl bg-[#FFB700]/10 border-2 border-[#FFB700]/30 transition-all shadow-[0_0_30px_rgba(255,183,0,0.1)]"
                                    >
                                        <span className="text-[0.9vmin] font-black text-[#FFB700]/60 uppercase tracking-widest group-hover:text-[#FFB700]">Clique para Copiar</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[2.5vmin] font-black text-white tracking-[0.2em]">{codigoPartida}</span>
                                            <Copy className="w-[2vmin] h-[2vmin] text-[#FFB700]" />
                                        </div>
                                    </motion.button>
                                ) : (
                                    <div className="text-white/20 animate-pulse font-black text-[1.8vmin] uppercase tracking-widest">Gerando Chave...</div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}

                    {/* VOTAÇÃO */}
                    {sala.estado === 'finalizacao' && jogadorAtual && (
                        <motion.div 
                            key="overlay-votacao"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vmin] h-[55vmin] rounded-full bg-black/80 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-[5vmin] text-center border border-white/10"
                        >
                            {meuVoto ? (
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
                                    <div className="w-[10vmin] h-[10vmin] rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                                        <Check className="w-[5vmin] h-[5vmin] text-green-400 stroke-[3px]" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-white font-black text-[2vmin] uppercase tracking-widest">Justiça Aplicada</p>
                                        <p className="text-green-500/60 font-bold text-[1.2vmin] uppercase tracking-[0.3em]">Voto Computado</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center gap-6 w-full">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[2.5vmin] font-black text-white uppercase tracking-[0.4em]">Fim da Linha</p>
                                        <p className="text-[1.2vmin] font-bold text-white/40 uppercase tracking-[0.4em]">Quem venceu?</p>
                                    </div>

                                    <div className="flex gap-4 w-full px-2">
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => votar('time_a')}
                                            className="flex-1 py-4 rounded-2xl border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/20 transition-all flex flex-col items-center gap-1 group shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                                        >
                                            <span className="text-[1.8vmin] font-black text-blue-400 uppercase tracking-widest group-hover:text-blue-300">{sala.timeANome || 'Azul'}</span>
                                            <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-[1vmin] font-black text-blue-400/80">{votosA} Votos</span>
                                        </motion.button>
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => votar('time_b')}
                                            className="flex-1 py-4 rounded-2xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/20 transition-all flex flex-col items-center gap-1 group shadow-[0_0_30px_rgba(239,68,68,0.1)]"
                                        >
                                            <span className="text-[1.8vmin] font-black text-red-500 uppercase tracking-widest group-hover:text-red-400">{sala.timeBNome || 'Red'}</span>
                                            <span className="px-2 py-0.5 bg-red-500/20 rounded-full text-[1vmin] font-black text-red-500/80">{votosB} Votos</span>
                                        </motion.button>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-[1.2vmin] font-black text-white/20 uppercase tracking-[0.5em]">{formatTime(timerFinalizacao)} para encerramento</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ACTION FOOTER */}
            <div className="w-full h-[15vh] flex flex-col items-center justify-center z-[70] pb-[5vh] pointer-events-none">
                <AnimatePresence>
                    {sala.estado === 'confirmacao' && jogadorAtual && !jogadorAtual.confirmado && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                            <motion.button 
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={confirmar}
                                className="pointer-events-auto px-[12vmin] py-[2.5vmin] font-black uppercase tracking-[0.5em] text-[1.8vmin] rounded-2xl bg-white text-black hover:bg-[#FFB700] hover:shadow-[0_0_50px_rgba(255,183,0,0.4)] transition-all shadow-2xl relative overflow-hidden group"
                            >
                                <span className="relative z-10">Confirmar Presença</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            </motion.button>
                        </motion.div>
                    )}

                    {sala.estado === 'aguardando_inicio' && jogadorAtual && (
                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}>
                            <motion.button 
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={solicitarFinalizacao}
                                className="pointer-events-auto px-[12vmin] py-[2.5vmin] font-black uppercase tracking-[0.5em] text-[1.8vmin] rounded-2xl bg-orange-500/10 border-2 border-orange-500/40 text-orange-400 hover:bg-orange-500 hover:text-white transition-all shadow-2xl"
                            >
                                Encerrar Partida
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Status Bar */}
                <div className="mt-8 flex items-center gap-[4vmin] opacity-20 hover:opacity-100 transition-opacity duration-500">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[1vmin] font-black uppercase tracking-widest text-white">Servidor BR</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[1vmin] font-black uppercase tracking-widest text-white">Ping: 12ms</span>
                    </div>
                </div>
            </div>

            {/* Edge Fog */}
            <div className="absolute inset-y-0 left-0 w-[15vw] bg-gradient-to-r from-black via-black/40 to-transparent z-[5] pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-[15vw] bg-gradient-to-l from-black via-black/40 to-transparent z-[5] pointer-events-none" />
            <div className="absolute bottom-0 inset-x-0 h-[30vh] bg-gradient-to-t from-black via-black/40 to-transparent z-[5] pointer-events-none" />
        </div>
    );
}

