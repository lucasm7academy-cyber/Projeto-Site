import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { supabase } from '../../lib/supabase';
import { Team, Role, ROLE_CONFIG } from '../../types/team';
import ModalBase from './ModalBase';

interface JoinRequestModalProps {
  team: Team;
  onClose: () => void;
  alreadyInTeam?: boolean;
}

const JoinRequestModal = ({ team, onClose, alreadyInTeam = false }: JoinRequestModalProps) => {
  const { playSound } = useSound();
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const roles: Role[] = ['TOP', 'JG', 'MID', 'ADC', 'SUP', 'RES'];

  const handleSubmit = async () => {
    if (!selectedRole || alreadyInTeam) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data: riotData } = await supabase
      .from('contas_riot')
      .select('riot_id')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('time_convites').insert({
      time_id:    team.id,
      de_user_id: user.id,
      riot_id:    riotData?.riot_id || null,
      role:       selectedRole,
      mensagem:   message || null,
      tipo:       'solicitacao',
      status:     'pendente',
    });

    setSubmitting(false);
    playSound('success');
    setSent(true);
    setTimeout(onClose, 2500);
  };

  if (sent) {
    return (
      <ModalBase onClose={onClose} gradientFrom={team.gradientFrom} title="">
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto border border-green-500/30">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-white font-black text-lg">Solicitação Enviada!</p>
            <p className="text-white/50 text-sm mt-2">
              Solicitação enviada para entrar no time{' '}
              <span className="text-white font-bold">{team.name}</span>
            </p>
          </div>
        </div>
      </ModalBase>
    );
  }

  return (
    <ModalBase onClose={onClose} gradientFrom={team.gradientFrom} title="Solicitar Entrada">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Escolha sua Rota</label>
          <div className="grid grid-cols-3 gap-2">
            {roles.map((role) => {
              const cfg = ROLE_CONFIG[role];
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => { playSound('click'); setSelectedRole(role); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-white/10 border-white/20 scale-[1.02]'
                      : 'bg-black/40 border-white/[0.04] hover:bg-white/5 opacity-50'
                  }`}
                >
                  <img src={cfg.img} alt={cfg.label} className="w-5 h-5 object-contain" />
                  <span className={`text-[10px] font-black tracking-widest ${isSelected ? cfg.color : 'text-white'}`}>{role}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 block">Mensagem (Opcional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Conte um pouco sobre sua experiência..."
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all min-h-[100px] resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedRole || submitting}
          className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all flex items-center justify-center gap-2 ${
            selectedRole && !submitting
              ? 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-xl shadow-white/10'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
          ) : (
            'CONFIRMAR SOLICITAÇÃO'
          )}
        </button>
      </div>
    </ModalBase>
  );
};

export default JoinRequestModal;
