import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const getImageUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from('public-images')
    .getPublicUrl(fileName);
  return data.publicUrl;
};

const BACKGROUND_URL = getImageUrl('background.png');

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValidToken, setIsValidToken] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      // Verificar se veio erro na URL
      const params = new URLSearchParams(location.search);
      if (params.get('error') === 'invalid') {
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
        setIsValidToken(false);
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setError('Link inválido ou expirado. Solicite um novo link de recuperação.');
        setIsValidToken(false);
      } else {
        setIsValidToken(true);
      }
    };
    
    checkSession();
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      alert('Senha alterada com sucesso! Faça login com sua nova senha.');
      navigate('/');
    }
  };

  if (!isValidToken && error) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-black" />
        <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
        />
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-black/90 border border-red-500/30 p-8 rounded-2xl text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Link Inválido</h1>
            <p className="text-white mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-primary text-black px-6 py-3 rounded-xl font-bold hover:brightness-110"
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 z-0 bg-black" />
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-black/90 backdrop-blur-xl border border-white/5 p-8 rounded-2xl shadow-2xl">
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold text-primary uppercase tracking-tight">
                Redefinir Senha
              </h1>
              <p className="text-white/60 text-sm">
                Digite sua nova senha abaixo
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/60">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-white/60">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black font-bold rounded-xl hover:brightness-110 disabled:opacity-50"
              >
                {loading ? 'ALTERANDO...' : 'CONFIRMAR'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-white/40 hover:text-primary transition-colors text-sm"
              >
                VOLTAR PARA LOGIN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}