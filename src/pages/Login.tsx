import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Check, X, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const getImageUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from('public-images')
    .getPublicUrl(fileName);
  return data.publicUrl;
};

const BACKGROUND_URL = getImageUrl('background.png');
const LOGO_URL = getImageUrl('logo-m7.png');
const MAPA_BACKGROUND = '/images/mapa2.png';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/lobby', { replace: true });
      }
      setIsLoading(false);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/lobby', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Função para alternar entre login e cadastro, limpando os campos
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setErrorMessage(null);
    setSuccessMessage(null);
    // Limpar campos ao trocar de modo
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/lobby`,
        }
      });
      
      if (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } catch (err) {
      setErrorMessage('Erro ao fazer login com Google.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMessage("Digite seu e-mail.");
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
      setSuccessMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setTimeout(() => {
        setSuccessMessage(null);
        setShowResetModal(false);
        setResetEmail("");
      }, 3000);
    }
  };

  const traduzirErro = (msg: string): string => {
    if (msg.includes('Invalid login credentials'))   return 'E-mail ou senha incorretos.';
    if (msg.includes('Email not confirmed'))          return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered'))      return 'Este e-mail já está cadastrado. Faça login.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('Unable to validate email'))     return 'E-mail inválido.';
    if (msg.includes('Email rate limit exceeded'))    return 'Muitas tentativas. Aguarde alguns minutos.';
    if (msg.includes('signup_disabled'))              return 'Cadastro desativado no momento.';
    if (msg.includes('over_email_send_rate_limit'))   return 'Muitos e-mails enviados. Aguarde e tente novamente.';
    return msg;
  };

  const showError = (msg: string, duration = 4000) => {
    setErrorMessage(traduzirErro(msg));
    setTimeout(() => setErrorMessage(null), duration);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegistering) {
      if (!email || !senha || !confirmarSenha) { showError('Preencha todos os campos.'); return; }
      if (senha !== confirmarSenha)             { showError('As senhas não coincidem!'); return; }
      if (senha.length < 6)                     { showError('A senha deve ter pelo menos 6 caracteres.'); return; }

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
        setSuccessMessage('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-0 md:p-4 lg:p-8 overflow-hidden font-sans">
      {/* Background Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: `url(${MAPA_BACKGROUND})` }}
      />
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[1px]" />
      <div className="absolute inset-0 z-0 bg-grid-white opacity-20" />
      <div className="absolute inset-0 z-0 scanline opacity-10" />
      
      {/* Dynamic Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: [null, "-20vh"],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* Toast Messages */}
      <AnimatePresence>
        {(errorMessage || successMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0a0b0f] border border-white/10 w-full max-w-md p-8 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <button 
                onClick={() => setShowResetModal(false)}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center text-center mb-8 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-headline font-black text-white uppercase tracking-tight mb-2">
                  Recuperar Senha
                </h2>
                <p className="text-white/50 text-sm">
                  Enviaremos um link de redefinição para o seu e-mail.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-white/40 ml-1">E-mail cadastrado</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(255, 215, 0, 0.2)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-4 bg-primary text-black font-headline font-black uppercase tracking-widest rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {isSendingReset ? 'Enviando...' : 'Enviar Link'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-5xl 2xl:max-w-6xl flex flex-col md:flex-row rounded-none md:rounded-3xl lg:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] md:max-h-[95vh] lg:max-h-[90vh]"
      >
        {/* Left Side - Form Section */}
        <div className="flex-1 bg-white p-5 sm:p-6 md:p-8 lg:px-10 xl:px-14 flex flex-col relative overflow-y-auto order-2 md:order-1">
          {/* Subtle Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative cursor-pointer flex items-center gap-2 md:gap-3"
              >
                <img src={LOGO_URL} alt="Logo" className="h-8 md:h-10 lg:h-12 w-auto" />
                <span className="hidden lg:block text-base xl:text-lg font-headline font-black text-black uppercase tracking-tighter">
                  M7 Academy
                </span>
              </motion.div>
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-headline font-black uppercase tracking-widest text-black/30">Status:</span>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-headline font-black uppercase tracking-widest text-green-600">Online</span>
                </div>
              </div>
            </div>

            {/* Title Section */}
            <div className="mb-4 md:mb-6">
              <motion.h1
                key={isRegistering ? 'reg' : 'log'}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-headline font-black text-black uppercase tracking-tight leading-none mb-2 md:mb-3"
              >
                {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta'}
              </motion.h1>
              <p className="text-black/40 text-xs sm:text-sm font-medium">
                {isRegistering
                  ? 'Inicie sua jornada rumo ao topo do ranking mundial.'
                  : 'Acesse sua conta para continuar sua evolução.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
              <div className="space-y-3 md:space-y-4">
                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-black/30 ml-1">E-mail</label>
                  <div className="relative group">
                    <motion.div
                      animate={{
                        color: focusedField === 'email' ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                        scale: focusedField === 'email' ? 1.1 : 1
                      }}
                      className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none"
                    >
                      <Mail className="w-4 h-4 md:w-5 md:h-5" />
                    </motion.div>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-12 md:pl-14 pr-4 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-black text-sm md:text-base placeholder:text-black/20 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-black/30">Senha</label>
                    {!isRegistering && (
                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="text-[10px] font-headline font-bold uppercase tracking-widest text-primary-dark hover:text-primary transition-colors"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <motion.div
                      animate={{
                        color: focusedField === 'password' ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                        scale: focusedField === 'password' ? 1.1 : 1
                      }}
                      className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none"
                    >
                      <Lock className="w-4 h-4 md:w-5 md:h-5" />
                    </motion.div>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onChange={(e) => setSenha(e.target.value)}
                      className="block w-full pl-12 md:pl-14 pr-12 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-black text-sm md:text-base placeholder:text-black/20 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Registration Only) */}
                {isRegistering && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1"
                  >
                    <label className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-black/30 ml-1">Confirmar Senha</label>
                    <div className="relative group">
                      <motion.div
                        animate={{
                          color: focusedField === 'confirm' ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                          scale: focusedField === 'confirm' ? 1.1 : 1
                        }}
                        className="absolute inset-y-0 left-0 pl-4 md:pl-5 flex items-center pointer-events-none"
                      >
                        <Lock className="w-4 h-4 md:w-5 md:h-5" />
                      </motion.div>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmarSenha}
                        onFocus={() => setFocusedField('confirm')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        className="block w-full pl-12 md:pl-14 pr-12 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl text-black text-sm md:text-base placeholder:text-black/20 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-black/20 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Remember Me & Terms */}
              <div className="flex items-center justify-between px-1 py-1 md:py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                    />
                    <div className={`w-4 h-4 md:w-5 md:h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-primary border-primary' : 'border-gray-200 group-hover:border-primary/50'}`}>
                      {rememberMe && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-black stroke-[4px]" />}
                    </div>
                  </div>
                  <span className="text-[10px] md:text-[11px] font-bold text-black/40 uppercase tracking-wider select-none">Lembrar</span>
                </label>

                {isRegistering && (
                  <p className="text-[10px] text-black/30 font-medium text-right max-w-[150px]">
                    Ao criar conta, você aceita nossos <span className="text-primary-dark font-bold cursor-pointer hover:underline">Termos</span>.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                <motion.button
                  whileHover={{ scale: isSubmitting ? 1 : 1.01, boxShadow: "0 10px 30px -10px rgba(255, 183, 0, 0.4)" }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 md:py-4 bg-primary text-black font-headline font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-sm md:text-base rounded-2xl shadow-xl shadow-primary/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2 md:gap-3"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="truncate">{isRegistering ? 'Criar Conta' : 'Acessar'}</span>
                      <ArrowRight className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                    </>
                  )}
                </motion.button>

                <div className="relative flex items-center justify-center py-1 md:py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <span className="relative px-3 md:px-4 bg-white text-[9px] md:text-[10px] font-headline font-black text-black/20 uppercase tracking-[0.2em] md:tracking-[0.3em]">Ou</span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01, backgroundColor: "#f9fafb" }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={signInWithGoogle}
                  className="w-full py-3 md:py-4 bg-white border border-gray-100 text-black font-headline font-bold uppercase tracking-widest text-sm md:text-base rounded-2xl flex items-center justify-center gap-2 md:gap-3 transition-all"
                >
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-4 h-4 md:w-5 md:h-5" />
                  Google
                </motion.button>
              </div>
            </form>

            {/* Footer Links */}
            <div className="mt-auto pt-6 md:pt-8 flex flex-col items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="h-px w-6 md:w-8 bg-gray-100" />
                <p className="text-[11px] md:text-xs font-medium text-black/40">
                  {isRegistering ? 'Já tem conta?' : 'Não tem conta?'}
                  <button
                    onClick={toggleMode}
                    className="ml-1.5 md:ml-2 text-primary-dark font-bold hover:text-primary transition-colors uppercase tracking-wider"
                  >
                    {isRegistering ? 'Login' : 'Cadastre-se'}
                  </button>
                </p>
                <div className="h-px w-6 md:w-8 bg-gray-100" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Hero Section */}
        <div className="w-full md:w-[40%] lg:w-[38%] bg-black p-5 sm:p-6 md:p-6 lg:px-8 lg:py-6 flex flex-col relative overflow-hidden order-1 md:order-2">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-grid-white opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

          {/* Animated Glows */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/4 w-64 h-64 md:w-72 md:h-72 lg:w-96 lg:h-96 bg-primary/20 rounded-full blur-[80px] md:blur-[100px] pointer-events-none"
          />

          <div className="relative z-10 flex flex-col h-full items-center justify-center">
            {/* Character Image with Floating Animation */}
            <motion.div
              animate={{
                y: [0, -15, 0],
                rotate: [0, 1, 0]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative mb-6 md:mb-8 w-full max-w-[200px] sm:max-w-[260px] md:max-w-[200px] lg:max-w-[280px] xl:max-w-[320px]"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[40px] md:blur-[60px] rounded-full pointer-events-none" />
              <img
                src={getImageUrl('Yasuo1.webp')}
                alt="Character"
                className="w-full h-auto object-contain relative z-10 drop-shadow-[0_15px_40px_rgba(255,215,0,0.3)]"
              />

              {/* Floating Badges/Info */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute -top-2 -right-2 md:-top-3 md:-right-3 px-2.5 py-1.5 md:px-4 md:py-2 bg-black/80 backdrop-blur-md border border-primary/30 rounded-xl z-20"
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Zap className="w-3 h-3 md:w-4 md:h-4 text-primary fill-primary" />
                  <span className="text-[9px] md:text-[10px] font-headline font-black text-white uppercase tracking-widest">Elite</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: 2 }}
                className="absolute -bottom-2 -left-2 md:-bottom-3 md:-left-3 px-2.5 py-1.5 md:px-4 md:py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl z-20"
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Trophy className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                  <span className="text-[9px] md:text-[10px] font-headline font-black text-white uppercase tracking-widest">Rank #1</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Text */}
            <div className="text-center space-y-2 md:space-y-4 max-w-[200px] sm:max-w-[240px] md:max-w-[180px] lg:max-w-xs">
              <h2 className="text-xl sm:text-2xl md:text-xl lg:text-2xl xl:text-3xl font-headline font-black text-white uppercase tracking-tight leading-none">
                Domine a <span className="text-primary">Arena</span>
              </h2>
              <p className="text-white/40 text-[10px] sm:text-xs md:text-[10px] lg:text-xs font-medium leading-relaxed">
                A plataforma definitiva para equipes profissionais.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
