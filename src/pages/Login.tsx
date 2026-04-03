import React, { useState, useEffect } from 'react';
import { Mail, Lock, Instagram, MessageCircle, Disc, Eye, EyeOff, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegistering) {
      // Validações de cadastro
      if (!email || !senha || !confirmarSenha) {
        setErrorMessage("Preencha todos os campos.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      if (senha !== confirmarSenha) {
        setErrorMessage("As senhas não coincidem!");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      if (senha.length < 6) {
        setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email: email,
        password: senha,
        options: {
          emailRedirectTo: `${window.location.origin}/lobby`,
        }
      });

      if (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        setSuccessMessage("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        setTimeout(() => {
          setSuccessMessage(null);
          // Limpar campos após sucesso
          setEmail("");
          setSenha("");
          setConfirmarSenha("");
          // Opcional: mudar para tela de login após alguns segundos
          setTimeout(() => setIsRegistering(false), 2000);
        }, 3000);
      }

    } else {
      // Login
      if (!email || !senha) {
        setErrorMessage("Preencha email e senha.");
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
      });

      if (error) {
        setErrorMessage(error.message);
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        navigate("/lobby");
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
    <main className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans">
      {/* Background com overlay gradiente animado */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-110"
        style={{ backgroundImage: `url(${BACKGROUND_URL})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/80 via-black/70 to-black/90" />
      
      {/* Efeito de partículas sutis */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, -100, -200],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Modal de Mensagens */}
      <AnimatePresence>
        {(errorMessage || successMessage) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
              errorMessage ? 'bg-red-500/90' : 'bg-green-500/90'
            } text-white`}
          >
            {errorMessage ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            <span className="font-medium">{errorMessage || successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Recuperar Senha com efeitos */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0b0f] border border-primary/30 w-full max-w-md p-8 rounded-2xl shadow-2xl relative"
              style={{ boxShadow: '0 0 30px -5px rgba(255,215,0,0.2)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />
              <button 
                onClick={() => setShowResetModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-primary transition-colors z-10"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <Lock className="w-5 h-5 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-headline font-black text-white uppercase tracking-tight">
                  Recuperar Senha
                </h2>
              </div>
              <p className="text-white/60 text-sm mb-6 relative z-10">
                Digite seu e-mail para receber o link de recuperação.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-4 relative z-10">
                <div className="relative w-full group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="seu e-mail"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black font-bold rounded-xl hover:brightness-110 disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isSendingReset ? 'Enviando...' : 'Enviar Link'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Card Principal com efeito de vidro e glow */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        style={{ boxShadow: '0 0 50px -15px rgba(255,215,0,0.15)' }}
      >
        {/* Lado Esquerdo - Formulário */}
        <motion.section 
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1 bg-gradient-to-br from-white/98 to-[#F8F8F8] p-8 md:p-12 flex flex-col items-center justify-center order-2 md:order-1 relative overflow-hidden"
        >
          {/* Efeito de brilho sutil */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="mb-6 relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <img src={LOGO_URL} alt="M7 Academy Logo" className="h-20 w-auto mx-auto relative z-10" />
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-headline font-black bg-gradient-to-r from-primary to-[#E6A600] bg-clip-text text-transparent mb-2 text-center uppercase tracking-tight"
          >
            {isRegistering ? 'Criar uma conta' : 'Entrar na sua conta'}
          </motion.h1>
          
          <p className="text-gray-400 text-sm mb-8 text-center">
            {isRegistering ? 'Junte-se à elite dos invocadores' : 'Bem-vindo de volta, invocador!'}
          </p>

          <div className="w-full max-w-sm relative z-10">
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Campo Email */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="relative w-full group"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              >
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'email' ? 'text-primary' : 'text-gray-400'}`} />
                <input
                  type="email"
                  placeholder="digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </motion.div>

              {/* Campo Senha */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="relative w-full group"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              >
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'password' ? 'text-primary' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" /> : <Eye className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />}
                </button>
              </motion.div>

              {/* Esqueceu senha */}
              {!isRegistering && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex justify-end"
                >
                  <button 
                    type="button" 
                    onClick={() => setShowResetModal(true)} 
                    className="text-xs text-gray-500 hover:text-primary transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </motion.div>
              )}

              {/* Confirmar Senha */}
              {isRegistering && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative w-full group"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                >
                  <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${focusedField === 'confirm' ? 'text-primary' : 'text-gray-400'}`} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="confirme sua senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" /> : <Eye className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />}
                  </button>
                </motion.div>
              )}

              {/* Botões de Ação */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-3 pt-4"
              >
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  className="w-full py-3 bg-gradient-to-r from-primary to-[#E6A600] text-black font-bold rounded-xl hover:brightness-110 shadow-lg shadow-primary/20 transition-all"
                >
                  {isRegistering ? 'CADASTRAR' : 'ENTRAR'} 
                  <ArrowRight className="inline w-4 h-4 ml-2" />
                </motion.button>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button" 
                  onClick={signInWithGoogle} 
                  className="flex items-center justify-center gap-3 bg-black text-white py-3 rounded-xl hover:bg-gray-900 transition-all w-full border border-white/10"
                >
                  <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" className="w-5 h-5" />
                  {isRegistering ? 'Cadastrar com Google' : 'Entrar com Google'}
                </motion.button>
              </motion.div>
            </form>
          </div>

          {/* Indicadores de página */}
          <div className="flex space-x-2 mt-8">
            <motion.button 
              whileHover={{ scale: 1.2 }}
              onClick={() => setIsRegistering(false)} 
              className={`h-2 rounded-full transition-all ${!isRegistering ? 'w-6 bg-primary' : 'w-2 bg-gray-300'}`} 
            />
            <motion.button 
              whileHover={{ scale: 1.2 }}
              onClick={() => setIsRegistering(true)} 
              className={`h-2 rounded-full transition-all ${isRegistering ? 'w-6 bg-primary' : 'w-2 bg-gray-300'}`} 
            />
          </div>
        </motion.section>

        {/* Lado Direito - Hero com efeitos */}
        <motion.section 
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full md:w-2/5 p-8 md:p-12 bg-gradient-to-br from-[#0a0b0f] via-[#121212] to-[#1A1A1A] flex flex-col items-center justify-center text-center order-1 md:order-2 relative overflow-hidden"
        >
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
          
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <img 
              src={getImageUrl('Yasuo1.webp')}
              alt="Character" 
              className="w-full max-h-[400px] object-contain relative z-10"
            />
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/70 text-sm mb-6"
          >
            {isRegistering ? "Já tem conta? Faça login." : "Ainda não é membro? Cadastre-se!"}
          </motion.p>
          
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleMode} 
            className="border-2 border-primary text-primary px-8 py-2.5 rounded-full hover:bg-primary hover:text-black transition-all font-bold tracking-wider"
          >
            {isRegistering ? 'FAZER LOGIN' : 'CRIAR CONTA'}
          </motion.button>
          
          {/* Social Links */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex space-x-6 mt-8"
          >
            {[
              { icon: MessageCircle, href: "#", label: "Discord" },
              { icon: Instagram, href: "#", label: "Instagram" },
              { icon: Disc, href: "#", label: "Discord" },
            ].map((social, idx) => (
              <motion.a
                key={idx}
                whileHover={{ scale: 1.2, y: -3 }}
                href={social.href}
                className="text-white/40 hover:text-primary transition-all"
              >
                <social.icon className="w-5 h-5" />
              </motion.a>
            ))}
          </motion.div>

          {/* Badge de segurança */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-6 flex items-center gap-2 text-[10px] text-white/20"
          >
            <Shield className="w-3 h-3" />
            <span>Ambiente seguro • criptografia SSL</span>
          </motion.div>
        </motion.section>
      </motion.div>
    </main>
  );
}