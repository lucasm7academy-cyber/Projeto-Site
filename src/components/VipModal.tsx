'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Loader, Crown, Sparkles, Gem, Zap, Shield, 
  Trophy, TrendingUp, CheckCircle, Copy, QrCode,
  Clock, CreditCard, Lock, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface VipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentData {
  orderId: string;
  qrCode: string;
  brCode: string;
  paymentUrl: string;
}

const VIP_BENEFITS = [
  { 
    icon: Sparkles, 
    title: 'Card RGB Animado', 
    description: 'Borda exclusiva que brilha e destaca seu perfil',
    color: '#fbbf24'
  },
  { 
    icon: Crown, 
    title: 'Badge VIP', 
    description: 'Selo de elite no perfil e nas salas de jogo',
    color: '#fbbf24'
  },
  { 
    icon: TrendingUp, 
    title: 'Histórico Ilimitado', 
    description: 'Acesso a todas as suas partidas e estatísticas',
    color: '#3b82f6'
  },
  { 
    icon: Trophy, 
    title: 'Prioridade em Torneios', 
    description: 'Vagas garantidas em campeonatos exclusivos',
    color: '#a855f7'
  },
  { 
    icon: Gem, 
    title: 'Recompensas em Dobro', 
    description: 'Ganhe 2x MP Coins em todas as partidas',
    color: '#ec4899'
  },
];

export default function VipModal({ isOpen, onClose }: VipModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [copied, setCopied] = useState(false);

  const handleBuyVip = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Você precisa estar logado para assinar VIP');
        setLoading(false);
        return;
      }

      const token = session.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgspcoclplcifigbtval.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-vip-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: session.user.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[VipModal] Error:', errorData);
        toast.error(errorData.error || 'Erro ao criar assinatura VIP. Tente novamente.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[VipModal] VIP order created:', data);

      setPaymentData(data);
      toast.success('QR Code gerado! Escaneie para ativar VIP.');
    } catch (error) {
      console.error('[VipModal] Unexpected error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPaymentData(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleCopyCode = () => {
    if (paymentData?.brCode) {
      navigator.clipboard.writeText(paymentData.brCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: 'rgba(13, 13, 13, 0.95)',
              border: '2px solid #FFB700',
              boxShadow: '0 0 60px -10px rgba(255, 183, 0, 0.4)',
              backdropFilter: 'blur(16px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFB700]/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB700]/5 blur-3xl rounded-full -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-3xl rounded-full -ml-32 -mb-32 pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 z-10 w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>

            <div className="relative z-10 p-6 md:p-8">
              {!paymentData ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFB700]/10 border border-[#FFB700]/30 mb-4">
                      <Crown className="w-4 h-4 text-[#FFB700]" />
                      <span className="text-[#FFB700] font-black text-xs uppercase tracking-widest">Exclusivo</span>
                    </div>
                    
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-3">
                      Torne-se <span className="text-[#FFB700]">VIP</span>
                    </h2>
                    <p className="text-white/40 text-sm max-w-md mx-auto">
                      Desbloqueie todos os benefícios premium e acelere sua jornada na M7 Academy
                    </p>
                  </div>

                  {/* Benefits Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {VIP_BENEFITS.map((benefit, idx) => {
                      const Icon = benefit.icon;
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 rounded-xl border border-white/10 hover:border-[#FFB700]/30 transition-all group"
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{ 
                                background: `${benefit.color}15`, 
                                border: `1px solid ${benefit.color}30` 
                              }}
                            >
                              <Icon className="w-5 h-5" style={{ color: benefit.color }} />
                            </div>
                            <div>
                              <h4 className="text-white font-black text-sm uppercase mb-0.5 group-hover:text-[#FFB700] transition-colors">
                                {benefit.title}
                              </h4>
                              <p className="text-white/40 text-[11px] leading-tight">
                                {benefit.description}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Price Card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-xl overflow-hidden border border-[#FFB700]/30 mb-6"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 183, 0, 0.1), rgba(255, 183, 0, 0.02))'
                    }}
                  >
                    <div className="absolute top-0 right-0">
                      <div className="bg-[#FFB700] text-black px-3 py-1 text-[10px] font-black uppercase rounded-bl-lg">
                        Melhor Oferta
                      </div>
                    </div>
                    
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-white/40 text-xs uppercase tracking-widest mb-1">Plano Mensal</p>
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black text-white">R$ 9,90</span>
                          <span className="text-white/40 text-sm mb-1">/mês</span>
                        </div>
                        <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">
                          Acesso ilimitado por 30 dias
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-green-400 text-xs font-bold">
                          <CheckCircle className="w-3 h-3" />
                          Cancele quando quiser
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* CTA Button */}
                  <button
                    onClick={handleBuyVip}
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-black text-sm uppercase text-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    style={{
                      background: 'linear-gradient(135deg, #FFB700, #FFB700dd)',
                      boxShadow: '0 10px 30px -5px rgba(255, 183, 0, 0.3)'
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Crown className="w-5 h-5" />
                        Assinar VIP Agora
                      </>
                    )}
                  </button>

                  {/* Security Info */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase">
                      <Lock className="w-3 h-3" />
                      Pagamento Seguro
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold uppercase">
                      <CreditCard className="w-3 h-3" />
                      PIX
                    </div>
                  </div>
                </>
              ) : (
                /* QR Code Payment Screen */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  {/* Header */}
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-4">
                      <QrCode className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-black text-xs uppercase tracking-widest">Pagamento PIX</span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-white uppercase mb-2">
                      Escaneie o <span className="text-[#FFB700]">QR Code</span>
                    </h3>
                    <p className="text-white/40 text-sm">
                      Use o app do seu banco para escanear o código
                    </p>
                  </div>

                  {/* QR Code */}
                  {paymentData.qrCode && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex justify-center mb-6"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-[#FFB700]/20 blur-2xl rounded-2xl" />
                        <div className="relative p-4 bg-white rounded-2xl border-2 border-[#FFB700]/30">
                          <img
                            src={`data:image/png;base64,${paymentData.qrCode}`}
                            alt="QR Code PIX"
                            className="w-56 h-56 md:w-64 md:h-64"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Copy Code Section */}
                  {paymentData.brCode && (
                    <div className="mb-6">
                      <p className="text-white/40 text-xs uppercase tracking-widest mb-3">
                        Ou copie o código PIX
                      </p>
                      <div className="flex items-center gap-2">
                        <div 
                          className="flex-1 p-3 rounded-xl border border-white/10 text-left"
                          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                        >
                          <code className="text-white/60 text-xs font-mono break-all line-clamp-2">
                            {paymentData.brCode.substring(0, 60)}...
                          </code>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          {copied ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 font-bold text-xs">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="font-bold text-xs">Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status Info */}
                  <div 
                    className="p-4 rounded-xl border border-[#FFB700]/20 mb-6"
                    style={{ background: 'rgba(255, 183, 0, 0.05)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#FFB700] animate-pulse" />
                      <div className="text-left">
                        <p className="text-white/80 text-sm font-bold mb-0.5">
                          Aguardando pagamento
                        </p>
                        <p className="text-white/40 text-xs">
                          Assim que o pagamento for confirmado, seu VIP será ativado automaticamente
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={handleClose}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/60 font-bold text-sm uppercase transition-all"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}