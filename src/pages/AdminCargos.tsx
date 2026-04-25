import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Shield, Search, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CARGO_LABELS, CARGO_COLORS, type CargoAdmin } from '../config/adminPermissoes';

interface UsuarioComCargo {
  id: string;
  user_id: string;
  email: string;
  cargo: CargoAdmin;
}

export default function AdminCargos() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioComCargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [novosCargos, setNovosCargos] = useState<Record<string, CargoAdmin>>({});

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const [{ data: admins }, { data: profiles }] = await Promise.all([
        supabase.from('admin_usuarios').select('id, user_id, cargo'),
        supabase.from('profiles').select('id, email'),
      ]);

      if (!admins) { setLoading(false); return; }

      const emailMap: Record<string, string> = {};
      profiles?.forEach(p => { emailMap[p.id] = p.email || 'Sem email'; });

      setUsuarios(admins.map(a => ({
        id: a.id,
        user_id: a.user_id,
        email: emailMap[a.user_id] || 'Sem email',
        cargo: a.cargo as CargoAdmin,
      })));
    } catch (e) {
      setErro('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.email.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSalvar = async (userId: string) => {
    const novoCargo = novosCargos[userId];
    if (!novoCargo) return;

    const { error } = await supabase
      .from('admin_usuarios')
      .update({ cargo: novoCargo, atualizado_em: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      setErro('Erro ao atualizar cargo.');
      return;
    }

    setUsuarios(prev => prev.map(u =>
      u.user_id === userId ? { ...u, cargo: novoCargo } : u
    ));
    setEditando(null);
    const { [userId]: _, ...restante } = novosCargos;
    setNovosCargos(restante);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60 hover:text-white" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Gerenciar Cargos</h1>
          <p className="text-white/40 text-xs uppercase tracking-widest">Atribua funções a usuários</p>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">{erro}</div>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text" placeholder="Buscar por email..." value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/10 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-bold text-white/80 uppercase tracking-widest text-xs">Email</th>
              <th className="px-4 py-3 font-bold text-white/80 uppercase tracking-widest text-xs">Cargo</th>
              <th className="px-4 py-3 font-bold text-white/80 uppercase tracking-widest text-xs">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {usuariosFiltrados.map((usuario) => {
              const colors = CARGO_COLORS[usuario.cargo];
              const isEditando = editando === usuario.user_id;
              const cargoSelecionado = novosCargos[usuario.user_id] || usuario.cargo;
              const cargoColorsSelecionado = CARGO_COLORS[cargoSelecionado];

              return (
                <tr key={usuario.user_id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white/80">{usuario.email}</td>
                  <td className="px-4 py-3">
                    {isEditando ? (
                      <select
                        value={cargoSelecionado}
                        onChange={(e) => setNovosCargos({
                          ...novosCargos,
                          [usuario.user_id]: e.target.value as CargoAdmin
                        })}
                        className={`px-2.5 py-1.5 rounded border font-bold text-xs cursor-pointer ${cargoColorsSelecionado.bg} ${cargoColorsSelecionado.border} ${cargoColorsSelecionado.text} focus:outline-none`}
                      >
                        {(['proprietario', 'admin', 'streamer', 'coach', 'jogador'] as CargoAdmin[]).map(cargo => (
                          <option key={cargo} value={cargo}>{CARGO_LABELS[cargo]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 rounded font-bold text-xs ${colors.bg} ${colors.border} ${colors.text} border inline-block`}>
                        {CARGO_LABELS[usuario.cargo]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditando ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleSalvar(usuario.user_id)} className="p-2 rounded bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => {
                          setEditando(null);
                          const { [usuario.user_id]: _, ...restante } = novosCargos;
                          setNovosCargos(restante);
                        }} className="p-2 rounded bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => {
                        setEditando(usuario.user_id);
                        setNovosCargos({ ...novosCargos, [usuario.user_id]: usuario.cargo });
                      }} className="p-2 rounded bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {usuariosFiltrados.length === 0 && (
          <div className="p-8 text-center text-white/40">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>
      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <p className="text-xs text-blue-300">
          <strong>ℹ Informação:</strong> Novos usuários recebem cargo "Jogador" automaticamente.
        </p>
      </div>
    </div>
  );
}