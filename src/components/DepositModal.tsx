'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface PackageOption {
  id: string;
  label: string;
  priceInReais: number;
  mcs: number;
  productId: string;
  popular?: boolean;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PACKAGES: PackageOption[] = [
  {
    id: 'test',
    label: 'R$ 2',
    priceInReais: 2,
    mcs: 110,
    productId: 'test_product_2',
    popular: false,
  },
  {
    id: 'starter',
    label: 'R$ 10',
    priceInReais: 10,
    mcs: 550,
    productId: '4nphvqr_850185',
    popular: false,
  },
  {
    id: 'plus',
    label: 'R$ 20',
    priceInReais: 20,
    mcs: 1187,
    productId: 'prgoz44',
    popular: true,
  },
  {
    id: 'pro',
    label: 'R$ 50',
    priceInReais: 50,
    mcs: 3100,
    productId: 'etgawgo',
    popular: false,
  },
  {
    id: 'elite',
    label: 'R$ 100',
    priceInReais: 100,
    mcs: 6547,
    productId: '358aqek',
    popular: false,
  },
];

interface PaymentData {
  orderId: string;
  qrCode: string;
  brCode: string;
  paymentUrl: string;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const handleSelectPackage = (pkg: PackageOption) => {
    setSelectedPackage(pkg);
  };

  const handleBuyClick = async () => {
    if (!selectedPackage) return;

    setLoading(true);
    try {
      // Get current session with token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Você precisa estar logado para comprar MCs');
        setLoading(false);
        return;
      }

      const token = session.access_token;

      // Call the create-mercado-pago-order edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgspcoclplcifigbtval.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-mercado-pago-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: session.user.id,
            productId: selectedPackage.productId,
            amount: selectedPackage.priceInReais,
            mcs: selectedPackage.mcs,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[DepositModal] Error:', errorData);
        toast.error(errorData.error || 'Erro ao criar pagamento. Tente novamente.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[DepositModal] Payment created:', data);

      // Store payment data (QR code, etc)
      setPaymentData(data);
      toast.success('QR Code gerado! Escaneie para pagar.');
    } catch (error) {
      console.error('[DepositModal] Unexpected error:', error);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedPackage(null);
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
          key="deposit-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="deposit-modal-content"
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
            <div className="mb-8">
              <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">
                Comprar MCs
              </h2>
              <p className="text-white/60 text-sm">
                Selecione um pacote de M7 Coins (MCs) para gastar em sua conta
              </p>
            </div>

            {/* Packages Grid */}
            {!paymentData ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {PACKAGES.map((pkg) => (
                    <motion.button
                      key={pkg.id}
                      onClick={() => handleSelectPackage(pkg)}
                      className={`relative p-4 rounded-2xl border-2 transition-all ${
                        selectedPackage?.id === pkg.id
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 bg-[#0a0b0f] hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-3 right-4 bg-primary px-3 py-1 rounded-full text-black text-xs font-black uppercase">
                          Popular
                        </div>
                      )}

                      <div className="text-left">
                        <div className="text-2xl font-black text-primary mb-1">{pkg.label}</div>
                        <div className="text-sm text-white/80 font-semibold">
                          {pkg.mcs.toLocaleString('pt-BR')} MCs
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Selected Package Details */}
                {selectedPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-white/60 text-sm mb-1">Pacote selecionado</p>
                        <p className="text-2xl font-black text-white">{selectedPackage.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-sm mb-1">MCs a receber</p>
                        <p className="text-3xl font-black text-primary">
                          {selectedPackage.mcs.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/30 border-t border-white/5 pt-4">
                      <p className="text-white/40 text-xs">
                        ✓ Pagamento via PIX • ✓ Instantâneo • ✓ Sem taxa escondida
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Buy Button */}
                <button
                  onClick={handleBuyClick}
                  disabled={!selectedPackage || loading}
                  className={`w-full py-3 rounded-full font-black uppercase tracking-widest text-black transition-all ${
                    selectedPackage && !loading
                      ? 'bg-gradient-to-r from-primary to-[#E6A600] hover:shadow-lg hover:shadow-primary/50 cursor-pointer'
                      : 'bg-white/20 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={18} className="animate-spin" />
                      Processando...
                    </span>
                  ) : selectedPackage ? (
                    'Comprar Agora'
                  ) : (
                    'Selecione um Pacote'
                  )}
                </button>
              </>
            ) : (
              /* QR Code Payment Screen */
              paymentData && (
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
                      <div className="bg-black/30 p-3 rounded-lg mb-3 break-all">
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
                      ✓ Após pagar, seus MCs serão creditados automaticamente
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="text-white/60 hover:text-white transition-colors text-sm"
                  >
                    Fechar
                  </button>
                </motion.div>
              )
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
