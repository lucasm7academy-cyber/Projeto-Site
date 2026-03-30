import React, { useState } from 'react';
import { Plus, X, Upload, Check, RefreshCw } from 'lucide-react';
import { useSound } from '../../hooks/useSound';
import { Team, COLOR_THEMES } from '../../types/team';
import { validarImagem } from '../../lib/uploadLogo';
import ModalBase from './ModalBase';

interface CreateTeamModalProps {
  onClose: () => void;
  onCreate: (newTeam: Partial<Team>) => void;
}

const CreateTeamModal = ({ onClose, onCreate }: CreateTeamModalProps) => {
  const { playSound } = useSound();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [theme, setTheme] = useState({ from: COLOR_THEMES[0].from, to: COLOR_THEMES[0].to });
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    const err = await validarImagem(file);
    if (err) { setLogoError(err); return; }
    playSound('click');
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!name || tag.length < 3 || logoUploading) return;
    playSound('success');
    onCreate({
      name,
      tag: tag.toUpperCase().slice(0, 3),
      gradientFrom: theme.from,
      gradientTo: theme.to,
      logoUrl: logoPreview || undefined,
      _logoFile: logoFile,
    } as any);
    onClose();
  };

  return (
    <ModalBase onClose={onClose}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: '#0d0d0d',
          border: '3px solid transparent',
          backgroundImage: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
          boxShadow: `0 0 35px -10px ${theme.from}70`
        }}
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[60px] opacity-15 pointer-events-none" style={{ background: theme.from }} />

        <div className="relative z-10">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between" style={{ background: `${theme.from}08` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${theme.from}25` }}>
                <Plus className="w-4 h-4" style={{ color: theme.from }} />
              </div>
              <h2 className="text-white font-black text-lg">Criar Equipe</h2>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Nome do Time</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: M7 Esports"
                maxLength={24}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Tag (3 letras)</label>
              <input
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase().slice(0, 3))}
                placeholder="Ex: M7E"
                maxLength={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold tracking-widest focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-white/40 text-xs uppercase tracking-widest">Logo do Time</label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden bg-white/5 shrink-0"
                  style={{
                    border: '2px solid transparent',
                    background: `linear-gradient(#0d0d0d, #0d0d0d) padding-box, linear-gradient(135deg, ${theme.from}, ${theme.to}) border-box`,
                    boxShadow: `0 0 12px -4px ${theme.from}80`,
                  }}
                >
                  <div className="absolute inset-0 opacity-15 blur-lg pointer-events-none" style={{ background: `radial-gradient(circle, ${theme.from}, transparent)` }} />
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover relative z-10" />
                  ) : (
                    <Upload className="w-6 h-6 text-white/30 relative z-10" />
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                  <div
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed transition-all hover:scale-105 cursor-pointer"
                    style={{ borderColor: `${theme.from}50`, background: `${theme.from}10`, color: theme.from }}
                  >
                    {logoUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span className="text-sm font-medium">{logoUploading ? 'Enviando...' : 'Enviar Logo'}</span>
                  </div>
                </label>
              </div>
              <p className="text-white/20 text-[10px]">PNG ou JPEG · máx. 1080×1080px</p>
              {logoError && <p className="text-red-400 text-[11px] font-medium">{logoError}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-white/40 text-xs uppercase tracking-widest">Tema de Cor</label>
              <div className="grid grid-cols-6 gap-2">
                {COLOR_THEMES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setTheme({ from: t.from, to: t.to })}
                    className="relative h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, borderColor: theme.from === t.from ? 'white' : 'transparent' }}
                    title={t.label}
                  >
                    {theme.from === t.from && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleCreate}
                disabled={!name || tag.length < 3}
                className="w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-xl"
                style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`, boxShadow: `0 10px 20px -5px ${theme.from}50` }}
              >
                Criar Equipe
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalBase>
  );
};

export default CreateTeamModal;
