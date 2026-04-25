// src/pages/Login.tsx
import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Check, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── URLs CONSTANTES (não mudam, não precisam de query) ──
const LOGO_URL = 'https://pgspcoclplcifigbtval.supabase.co/storage/v1/object/public/public-images/logo-m7.png';
const YASUO_URL = 'https://pgspcoclplcifigbtval.supabase.co/storage/v1/object/public/public-images/Yasuo1.webp';
const MAPA_BACKGROUND = '/images/mapa2.png';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Estados ──────────────────────────────────────
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Modais ────────────────────────────────────────
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // ── Redirecionar se já logado ─────────────────────
  if (user) {
    navigate('/lobby', { replace: true });
    return null;
  }

  // ── Ações ─────────────────────────────────────────
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/lobby` },
    });
    if (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMessage('Digite seu e-mail.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    if (error) {
      setErrorMessage(error.message);
      setTimeout(() => setErrorMessage(null), 3000);
    } else {
      setSuccessMessage('E-mail de recuperação enviado!');
      setTimeout(() => {
        setSuccessMessage(null);
        setShowResetModal(false);
        setResetEmail('');
      }, 3000);
    }
  };

  const traduzirErro = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado. Faça login.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('Unable to validate email')) return 'E-mail inválido.';
    if (msg.includes('Email rate limit exceeded')) return 'Muitas tentativas. Aguarde.';
    return msg;
  };

  const showError = (msg: string) => {
    setErrorMessage(traduzirErro(msg));
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegistering) {
      if (!email || !senha || !confirmarSenha) { showError('Preencha todos os campos.'); return; }
      if (senha !== confirmarSenha) { showError('As senhas não coincidem!'); return; }
      if (senha.length < 6) { showError('A senha deve ter pelo menos 6 caracteres.'); return; }

      setIsSubmitting(true);
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/lobby` },
      });
      setIsSubmitting(false);

      if (error) {
        showError(error.message);
      } else {
        setSuccessMessage('Conta criada! Verifique seu e-mail.');
        setEmail(''); setSenha(''); setConfirmarSenha('');
        setTimeout(() => { setSuccessMessage(null); setIsRegistering(false); }, 4000);
      }
    } else {
      if (!email || !senha) { showError('Preencha e-mail e senha.'); return; }

      setIsSubmitting(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setIsSubmitting(false);

      if (error) {
        showError(error.message);
      } else {
        navigate('/lobby');
      }
    }
  };

  // ── Render ────────────────────────────────────────
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${MAPA_BACKGROUND})` }} />
      <div className="absolute inset-0 z-0 bg-black/60" />

      {/* Toast Messages */}
      <AnimatePresence>
        {(errorMessage || successMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-8 left-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${
              errorMessage ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-green-500/10 border-green-500/50 text-green-200'
            } backdrop-blur-xl`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${errorMessage ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
              {errorMessage ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-headline font-bold text-sm uppercase tracking-wider">
                {errorMessage ? 'Atenção' : 'Sucesso'}
              </p>
              <p className="text-xs opacity-80">{errorMessage || successMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0a0b0f] border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-2xl"
            >
              <button onClick={() => setShowResetModal(false)} className="absolute top-6 right-6 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-headline font-black text-white uppercase">Recuperar Senha</h2>
                <p className="text-white/50 text-sm mt-2">Enviaremos um link para seu e-mail.</p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input
                    type="email" placeholder="exemplo@email.com" value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-primary/50"
                    required
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" disabled={isSendingReset}
                  className="w-full py-4 bg-primary text-black font-headline font-black uppercase tracking-widest rounded-2xl disabled:opacity-50"
                >
                  {isSendingReset ? 'Enviando...' : 'Enviar Link'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col md:flex-row rounded-none md:rounded-3xl overflow-hidden shadow-2xl mx-4 md:mx-8 my-4 md:my-8 max-h-[95vh] md:max-h-[600px]">
        
        {/* Form Section */}
        <div className="flex-1 bg-white p-6 md:p-10 flex flex-col justify-center order-2 md:order-1 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="Logo" className="h-10 md:h-12 w-auto" />
            <span className="hidden lg:block text-lg font-headline font-black text-black uppercase">M7 Academy</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-headline font-black text-black uppercase tracking-tight mb-2">
            {isRegistering ? 'Crie sua conta' : 'Bem-vindo'}
          </h1>
          <p className="text-black/40 text-sm mb-8">
            {isRegistering ? 'Inicie sua jornada.' : 'Acesse sua conta.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-black/30">E-mail</label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                <input
                  type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:outline-none focus:border-primary/50"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/30">Senha</label>
                {!isRegistering && (
                  <button type="button" onClick={() => setShowResetModal(true)} className="text-[10px] font-bold uppercase text-primary-dark">
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:outline-none focus:border-primary/50"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            {isRegistering && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-black/30">Confirmar Senha</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-black focus:outline-none focus:border-primary/50"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit" disabled={isSubmitting}
              className="w-full py-4 bg-primary text-black font-headline font-black uppercase tracking-widest rounded-2xl disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'Criar Conta' : 'Acessar'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative flex items-center py-2">
              <div className="w-full border-t border-gray-100" />
              <span className="px-4 bg-white text-[10px] font-bold text-black/20 uppercase">Ou</span>
              <div className="w-full border-t border-gray-100" />
            </div>

            {/* Google */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button" onClick={signInWithGoogle}
              className="w-full py-3.5 bg-white border border-gray-100 text-black font-bold uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-2"
            >
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-5 h-5" />
              Google
            </motion.button>
          </form>

          {/* Toggle Mode */}
          <p className="text-center text-sm text-black/40 mt-6">
            {isRegistering ? 'Já tem conta?' : 'Não tem conta?'}
            <button onClick={toggleMode} className="ml-2 text-primary-dark font-bold uppercase">
              {isRegistering ? 'Login' : 'Cadastre-se'}
            </button>
          </p>
        </div>

        {/* Hero Section */}
        <div className="w-full md:w-[40%] bg-black p-8 flex flex-col items-center justify-center relative overflow-hidden order-1 md:order-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 w-full max-w-[240px]"
          >
            <img src={YASUO_URL} alt="Character" className="w-full h-auto object-contain drop-shadow-[0_15px_40px_rgba(255,215,0,0.3)]" />
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              className="absolute -top-3 -right-3 px-4 py-2 bg-black/80 border border-primary/30 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary fill-primary" />
                <span className="text-[10px] font-headline font-black text-white uppercase">Elite</span>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              className="absolute -bottom-3 -left-3 px-4 py-2 bg-black/80 border border-white/10 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-headline font-black text-white uppercase">Rank #1</span>
              </div>
            </motion.div>
          </motion.div>
          <div className="relative z-10 text-center mt-6">
            <h2 className="text-2xl font-headline font-black text-white uppercase">
              Domine a <span className="text-primary">Arena</span>
            </h2>
            <p className="text-white/40 text-xs mt-2">A plataforma definitiva para equipes.</p>
          </div>
        </div>
      </div>
    </main>
  );
}