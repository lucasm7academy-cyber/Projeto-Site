import React, { useState, useEffect } from 'react';
import { Mail, Lock, Instagram, MessageCircle, Disc, Eye, EyeOff, ArrowRight } from 'lucide-react';
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

  const navigate = useNavigate();

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Sessão:', session?.user?.email);
      
      if (session) {
        navigate('/lobby', { replace: true });
      }
      setIsLoading(false);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('📡 Evento:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        navigate('/lobby', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleMode = () => setIsRegistering(!isRegistering);

  const signInWithGoogle = async () => {
    try {
      console.log('🚀 Login com Google...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/lobby',
        }
      });
      
      if (error) {
        console.error('❌ Erro:', error);
        alert(error.message);
      }
    } catch (err) {
      console.error('❌ Erro:', err);
      alert('Erro ao fazer login com Google.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!resetEmail) {
    alert("Digite seu e-mail.");
    return;
  }

  setIsSendingReset(true);
  const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
    redirectTo: 'http://localhost:3000/reset-password',
  });

  setIsSendingReset(false);
  if (error) {
    alert(error.message);
  } else {
    alert("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    setShowResetModal(false);
    setResetEmail("");
  }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegistering) {
      if (senha !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email: email,
        password: senha,
      })

      if (error) {
        alert(error.message)
      } else {
        alert("Conta criada! Verifique seu e-mail.")
        setIsRegistering(false);
        setEmail("");
        setSenha("");
        setConfirmarSenha("");
      }

    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      })

      if (error) {
        alert(error.message)
      } else {
        navigate("/lobby")
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-primary text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
      />
      <div className="absolute inset-0 z-0 bg-black/70" />

      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0b0f] border border-white/10 w-full max-w-md p-8 rounded-2xl shadow-2xl relative"
            >
              <button 
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-primary"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-2xl font-headline font-black text-white uppercase tracking-tight">
                  Recuperar Senha
                </h2>
              </div>
              <p className="text-white/60 text-sm mb-6">
                Digite seu e-mail para receber o link de recuperação.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-white/40" />
                  </div>
                  <input
                    type="email"
                    placeholder="seu e-mail"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black font-bold rounded-xl hover:brightness-110 disabled:opacity-50"
                >
                  {isSendingReset ? 'Enviando...' : 'Enviar Link'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        
        <section className="flex-1 bg-gradient-to-br from-white/95 to-[#F5F5F5] p-8 md:p-12 flex flex-col items-center justify-center order-2 md:order-1">
          <div className="mb-6">
            <img src={LOGO_URL} alt="M7 Academy Logo" className="h-20 w-auto mx-auto" />
          </div>

          <h1 className="text-3xl font-headline font-black text-[#1A1A1A] mb-8 text-center uppercase tracking-tight">
            {isRegistering ? 'Criar uma conta' : 'Entrar na sua conta'}
          </h1>

          <div className="w-full max-w-sm">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="relative w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="relative w-full">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>

              {!isRegistering && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setShowResetModal(true)} className="text-xs text-gray-500 hover:text-primary">
                    Esqueceu sua senha?
                  </button>
                </div>
              )}

              {isRegistering && (
                <div className="relative w-full">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="confirme sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              )}

              <div className="space-y-3 pt-4">
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black font-bold rounded-xl hover:brightness-110">
                  {isRegistering ? 'CADASTRAR' : 'ENTRAR'} <ArrowRight className="inline w-4 h-4 ml-2" />
                </button>

                <button type="button" onClick={signInWithGoogle} className="flex items-center justify-center gap-3 bg-black text-white py-3 rounded-xl hover:bg-gray-900 w-full border border-white/10">
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-5 h-5" />
                  {isRegistering ? 'Cadastrar com Google' : 'Entrar com Google'}
                </button>
              </div>
            </form>
          </div>

          <div className="flex space-x-2 mt-8">
            <button onClick={() => setIsRegistering(false)} className={`w-2 h-2 rounded-full transition-all ${!isRegistering ? 'w-6 bg-primary' : 'bg-gray-300'}`} />
            <button onClick={() => setIsRegistering(true)} className={`w-2 h-2 rounded-full transition-all ${isRegistering ? 'w-6 bg-primary' : 'bg-gray-300'}`} />
          </div>
        </section>

        <section className="w-full md:w-2/5 p-8 md:p-12 bg-gradient-to-br from-[#0a0b0f] to-[#1A1A1A] flex flex-col items-center justify-center text-center order-1 md:order-2">
          <img 
            src={getImageUrl('Yasuo1.webp')}
            alt="Character" 
            className="w-full max-h-[400px] object-contain mb-8"
          />
          <p className="text-white/70 text-sm mb-8">
            {isRegistering ? "Já tem conta? Faça login." : "Ainda não é membro? Cadastre-se!"}
          </p>
          <button onClick={toggleMode} className="border-2 border-primary text-primary px-6 py-2 rounded-full hover:bg-primary hover:text-black transition-all">
            {isRegistering ? 'FAZER LOGIN' : 'CRIAR CONTA'}
          </button>
          <div className="flex space-x-6 mt-8">
            <a href="#" className="text-white/40 hover:text-primary transition-all">
              <MessageCircle className="w-5 h-5" />
            </a>
            <a href="#" className="text-white/40 hover:text-primary transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-white/40 hover:text-primary transition-all">
              <Disc className="w-5 h-5" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}