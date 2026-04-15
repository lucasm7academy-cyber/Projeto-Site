'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { VipCrown, VipLabel } from './VipBadge';

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
  '✨ Card com borda RGB animada (destaque visual)',
  '👑 Badge VIP no perfil e nas salas',
  '⚡ Status de elite entre os jogadores',
  '🎯 Acesso prioritário a torneios',
  '💎 Benefícios exclusivos (em breve)',
];

export default function VipModal({ isOpen, onClose }: VipModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const handleBuyVip = async () => {
    setLoading(true);
    try {
      // Get current session with token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Você precisa estar logado para assinar VIP');
        setLoading(false);
        return;
      }

      const token = session.access_token;

      // Call the create-vip-order edge function
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

      // Store payment data (QR code, etc)
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
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="vip-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="vip-modal-content"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl mx-auto rounded-3xl bg-gradient-to-b from-[#0a0b0f] to-black border border-white/10 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-4">
                <Crown size={40} className="text-primary" />
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tight text-white mb-2">
                Torne-se VIP
              </h2>
              <p className="text-white/60 text-sm">
                Acesso exclusivo a benefícios premium — R$ 9,90/mês
              </p>
            </div>

            {!paymentData ? (
              <>
                {/* Benefits List */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
                >
                  <h3 className="text-white font-black mb-4">Benefícios VIP:</h3>
                  <ul className="space-y-3">
                    {VIP_BENEFITS.map((benefit, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="text-white/80 text-sm flex items-start gap-3"
                      >
                        <span className="text-primary font-black mt-0.5">•</span>
                        <span>{benefit}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                {/* Price Card */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-primary/20 to-pink-500/20 border border-primary/30 rounded-2xl p-6 mb-8 text-center"
                >
                  <p className="text-white/60 text-sm mb-2">Valor mensal</p>
                  <p className="text-5xl font-black text-primary mb-1">R$ 9,90</p>
                  <p className="text-white/40 text-xs">Acesso ilimitado por 30 dias</p>
                </motion.div>

                {/* CTA Button */}
                <button
                  onClick={handleBuyVip}
                  disabled={loading}
                  className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-black transition-all ${
                    !loading
                      ? 'bg-gradient-to-r from-primary to-[#E6A600] hover:shadow-lg hover:shadow-primary/50 cursor-pointer'
                      : 'bg-white/20 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={18} className="animate-spin" />
                      Processando...
                    </span>
                  ) : (
                    '🔓 Assinar VIP Agora'
                  )}
                </button>

                {/* Info */}
                <p className="text-white/40 text-xs text-center mt-4">
                  ✓ Pagamento seguro via PIX • ✓ Cancelamento a qualquer momento
                </p>
              </>
            ) : (
              /* QR Code Payment Screen */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="mb-6">
                  <h3 className="text-xl font-black text-white mb-4">Escaneie o QR Code</h3>

                  {/* QR Code Image */}
                  {paymentData.qrCode && (
                    <div className="flex justify-center mb-6">
                      <img
                        src={`data:image/png;base64,${paymentData.qrCode}`}
                        alt="QR Code PIX"
                        className="w-64 h-64 bg-white p-4 rounded-2xl"
                      />
                    </div>
                  )}

                  <p className="text-white/60 text-sm mb-4">
                    Abra seu banco ou app do Mercado Pago e escaneie o código acima
                  </p>
                </div>

                {/* Copy Paste Code */}
                {paymentData.brCode && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                    <p className="text-white/60 text-sm mb-3">Ou copie o código:</p>
                    <div className="bg-black/30 p-3 rounded-lg mb-3 break-all max-h-24 overflow-y-auto">
                      <code className="text-primary text-xs font-mono">{paymentData.brCode}</code>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(paymentData.brCode);
                        toast.success('Código copiado!');
                      }}
                      className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                    >
                      Copiar Código
                    </button>
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                  <p className="text-sm text-white/60">
                    ✓ Após pagar, seu VIP será ativado automaticamente
                  </p>
                </div>

                <button
                  onClick={handleClose}
                  className="text-white/60 hover:text-white transition-colors text-sm"
                >
                  Fechar
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
