import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Users,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCachedUser } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useSound } from '../hooks/useSound';

export default function NotificationBell() {
  const { playSound } = useSound();
  const [user, setUser] = useState<any>(null);
  const [contaRiot, setContaRiot] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // ── Carrega notificações com debounce 500ms ───────────────────────────────
  const carregarNotificacoes = async (userId: string) => {
    const allNotifs: any[] = [];

    // ✅ OTIMIZADO: Combinar 3 queries em 1 com .or() — reduz de 3 para 1 query
    const { data: todos, error: errTodos } = await supabase
      .from('time_convites')
      .select('id, time_id, de_user_id, para_user_id, tipo, status, riot_id, role, mensagem, criado_em')
      .or(`para_user_id.eq.${userId},de_user_id.eq.${userId}`)
      .order('criado_em', { ascending: false })
      .limit(50);

    if (errTodos) {
      console.error('[NotificationBell] Erro ao carregar convites:', errTodos);
      return;
    }

    if (!todos || todos.length === 0) {
      setNotifications([]);
      return;
    }

    // Buscar times em 1 query (em vez de 3)
    const teamIds = [...new Set(todos.map((r: any) => r.time_id))];
    const { data: timesData } = await supabase
      .from('times')
      .select('id, nome')
      .in('id', teamIds);
    const teamMap: Record<string, string> = {};
    (timesData || []).forEach((t: any) => { teamMap[t.id] = t.nome; });

    // Processar todos os convites uma vez, separando por tipo/status
    todos.forEach((r: any) => {
      // 1. Solicitações pendentes para o usuário (é o capitão, recebe solicitação)
      if (r.tipo === 'solicitacao' && r.status === 'pendente' && r.para_user_id === userId) {
        allNotifs.push({
          id: r.id,
          type: 'join_request',
          convite_id: r.id,
          time_id: r.time_id,
          team_name: teamMap[r.time_id] || 'Time',
          player_riot_id: r.riot_id || 'Jogador',
          de_user_id: r.de_user_id,
          role: r.role,
          message: r.mensagem,
          criado_em: r.criado_em,
        });
      }

      // 2. Status dos meus convites/solicitações (enviei, recebi resposta)
      if (r.de_user_id === userId && (r.status === 'aceito' || r.status === 'recusado')) {
        allNotifs.push({
          id: r.id + '_status',
          type: 'status_update',
          subtype: r.status,
          convite_tipo: r.tipo,
          player_riot_id: r.riot_id || 'Jogador',
          convite_id: r.id,
          time_id: r.time_id,
          team_name: teamMap[r.time_id] || 'Time',
          de_user_id: r.de_user_id,
          criado_em: r.criado_em,
        });
      }

      // 3. Convites recebidos pendentes (capitão convidou)
      if (r.tipo === 'convite' && r.status === 'pendente' && r.para_user_id === userId) {
        allNotifs.push({
          id: r.id + '_invite',
          type: 'invite_received',
          convite_id: r.id,
          time_id: r.time_id,
          team_name: teamMap[r.time_id] || 'Time',
          role: r.role,
          message: r.mensagem,
          criado_em: r.criado_em,
        });
      }
    });

    setNotifications(allNotifs);
  };

  // ── Debounce wrapper: 500ms ────────────────────────────────────────────────
  const carregarNotificacoesDebounced = (userId: string) => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      carregarNotificacoes(userId);
    }, 500);
  };

  // ── Ações ─────────────────────────────────────────────────────────────────
  const handleAcceptInvite = async (notif: any) => {
    if (!user) return;

    const { data: membership } = await supabase
      .from('time_membros')
      .select('time_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      setErrorMsg('Você já pertence a um time. Saia antes de aceitar outro convite.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const { error: errInsert } = await supabase.from('time_membros').insert({
      time_id:   notif.time_id,
      user_id:   user.id,
      riot_id:   contaRiot?.riot_id || 'Jogador',
      cargo:     'jogador',
      role:      notif.role,
      is_leader: false,
      elo:       '',
      balance:   0,
    });

    if (errInsert) { console.error('Erro ao aceitar convite:', errInsert); return; }

    await supabase.from('time_convites').update({ status: 'aceito' }).eq('id', notif.convite_id);
    setNotifications(prev => prev.filter((n: any) => n.id !== notif.id));
    playSound('success');
  };

  const handleDeclineInvite = async (notif: any) => {
    await supabase.from('time_convites').update({ status: 'recusado' }).eq('id', notif.convite_id);
    setNotifications(prev => prev.filter((n: any) => n.id !== notif.id));
    playSound('click');
  };

  const handleAcceptRequest = async (notif: any) => {
    const { data: membership } = await supabase
      .from('time_membros')
      .select('time_id')
      .eq('user_id', notif.de_user_id)
      .maybeSingle();

    if (membership) {
      setErrorMsg(`${notif.player_riot_id} já pertence a outro time.`);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    const { error: errInsert } = await supabase.from('time_membros').insert({
      time_id:   notif.time_id,
      user_id:   notif.de_user_id,
      riot_id:   notif.player_riot_id,
      cargo:     'jogador',
      role:      notif.role,
      is_leader: false,
      elo:       '',
      balance:   0,
    });

    if (errInsert) { console.error('Erro ao aceitar solicitação:', errInsert); return; }

    const { error: errUpdate } = await supabase
      .from('time_convites')
      .update({ status: 'aceito' })
      .eq('id', notif.convite_id);

    if (errUpdate) { console.error('Erro ao atualizar convite:', errUpdate); return; }

    setNotifications(prev => prev.filter((n: any) => n.id !== notif.id));
    playSound('success');
  };

  const handleDeclineRequest = async (notif: any) => {
    await supabase.from('time_convites').update({ status: 'recusado' }).eq('id', notif.convite_id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
    playSound('click');
  };

  const handleClearAll = async () => {
    const statusIds = notifications
      .filter((n: any) => n.type === 'status_update')
      .map((n: any) => n.convite_id);
    if (statusIds.length > 0 && user) {
      await supabase.from('time_convites').delete()
        .in('id', statusIds)
        .eq('de_user_id', user.id);
    }
    setNotifications([]);
  };

  // ── Auth + Realtime ────────────────────────────────────────────────────────
  useEffect(() => {
    let channel: any = null;

    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      const { data: riotData } = await supabase
        .from('contas_riot')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      setContaRiot(riotData);

      carregarNotificacoes(u.id);

      // ✅ Filtro por userId + debounce 500ms — reduz broadcasts para apenas este usuário
      channel = supabase
        .channel('notif-bell-' + u.id)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'time_convites',
            filter: `or(para_user_id.eq.${u.id},de_user_id.eq.${u.id})`
          },
          () => carregarNotificacoesDebounced(u.id)
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'time_convites',
            filter: `or(para_user_id.eq.${u.id},de_user_id.eq.${u.id})`
          },
          () => carregarNotificacoesDebounced(u.id)
        )
        .subscribe();
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      // ✅ Remover TOKEN_REFRESHED: evita recarregar a cada token refresh (frequente)
      if (u && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        carregarNotificacoes(u.id);
      }
      if (event === 'SIGNED_OUT') setNotifications([]);
    });

    return () => {
      authListener.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // ── Fechar ao clicar fora ─────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          playSound('click');
          if (user) carregarNotificacoesDebounced(user.id);
          setIsOpen(prev => !prev);
        }}
        className="relative p-2 transition-all duration-150 group"
      >
        <div className="absolute inset-0 bg-primary/10 blur-lg rounded-full group-hover:bg-primary/20 transition-all" />
        <Bell className={`w-5 h-5 relative z-10 ${notifications.length > 0 ? 'text-primary' : 'text-white/60'} group-hover:text-primary transition-colors drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]`} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0a0b0f] animate-pulse z-20 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-3 w-80 bg-[#0a0b0f]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[60] rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Notificações</h3>
              <span className="text-[10px] text-white/40 uppercase font-semibold">Recentes</span>
            </div>
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-red-500/15 border-b border-red-500/20 flex items-center gap-2"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-red-400 text-[11px] font-medium">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="max-h-[440px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="p-2 space-y-1">
                  {notifications.map((notif: any) => (
                    <div key={notif.id} className="p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                      {notif.type === 'join_request' ? (
                        <div className="space-y-2">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Users className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium leading-relaxed">
                                <span className="text-primary font-bold">{notif.player_riot_id}</span>
                                {' '}quer entrar no time{' '}
                                <span className="font-bold">{notif.team_name}</span>
                                {' '}como{' '}
                                <span className="text-primary font-bold">{notif.role}</span>
                              </p>
                              {notif.message && (
                                <p className="text-white/30 text-[10px] mt-1 italic truncate">"{notif.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-11">
                            <button onClick={() => handleAcceptRequest(notif)} className="flex-1 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider">Aceitar</button>
                            <button onClick={() => handleDeclineRequest(notif)} className="flex-1 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider">Recusar</button>
                          </div>
                        </div>
                      ) : notif.type === 'invite_received' ? (
                        <div className="space-y-2">
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                              <Users className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium leading-relaxed">
                                Você foi convidado para o time{' '}
                                <span className="text-primary font-bold">{notif.team_name}</span>
                                {' '}como{' '}
                                <span className="text-blue-400 font-bold">{notif.role}</span>
                              </p>
                              {notif.message && (
                                <p className="text-white/30 text-[10px] mt-1 italic truncate">"{notif.message}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-11">
                            <button onClick={() => handleAcceptInvite(notif)} className="flex-1 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider">Aceitar</button>
                            <button onClick={() => handleDeclineInvite(notif)} className="flex-1 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-[10px] font-bold rounded-lg transition-colors uppercase tracking-wider">Recusar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <div className="mt-1 shrink-0">
                            {notif.subtype === 'aceito'
                              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                              : <AlertCircle className="w-4 h-4 text-red-400" />
                            }
                          </div>
                          <div>
                            <p className="text-white text-xs font-medium leading-relaxed">
                              {notif.convite_tipo === 'convite'
                                ? notif.subtype === 'aceito'
                                  ? <><span className="text-primary font-bold">{notif.player_riot_id}</span> aceitou seu convite para o time <span className="font-bold">{notif.team_name}</span>!</>
                                  : <><span className="text-primary font-bold">{notif.player_riot_id}</span> recusou seu convite para o time <span className="font-bold">{notif.team_name}</span></>
                                : notif.subtype === 'aceito'
                                  ? <>Agora você faz parte do time <span className="text-primary font-bold">{notif.team_name}</span>!</>
                                  : <>Solicitação para <span className="font-bold">{notif.team_name}</span> foi recusada</>
                              }
                            </p>
                            <p className="text-[10px] text-white/30 mt-1 uppercase tracking-tighter">
                              {new Date(notif.criado_em).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-6 text-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-white/60 text-sm font-medium">Nenhuma notificação</p>
                  <p className="text-white/30 text-[10px] mt-2 leading-relaxed uppercase tracking-widest">
                    Este é o lugar onde você receberá suas notificações e aprovações.
                  </p>
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="w-full py-3 text-[10px] text-primary font-bold uppercase tracking-widest hover:bg-primary/5 transition-colors border-t border-white/5"
              >
                Limpar tudo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
