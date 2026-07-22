// src/components/PixCheckout.jsx
// ⚡ Componente de checkout via Pix com polling de status
import React, { useEffect, useState, useMemo } from 'react';
import { Copy, Check, Clock, QrCode, Loader2, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { publicFetch } from '../services/api';

export default function PixCheckout({ pedidoId, email, valorTotal, onPago }) {
  const [gerando, setGerando] = useState(false);
  const [pix, setPix] = useState(null);
  const [status, setStatus] = useState('aguardando_pagamento');
  const [copiado, setCopiado] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(30 * 60);

  // Gera o QR ao montar o componente
  useEffect(() => {
    if (!pedidoId || !email) return;
    let cancelado = false;
    (async () => {
      setGerando(true);
      try {
        const res = await publicFetch('/pagamentos/pix/criar', {
          method: 'POST',
          body: JSON.stringify({ pedido_id: pedidoId, email })
        });
        const data = await res.json();
        if (cancelado) return;
        if (res.ok) {
          setPix(data);
          setStatus(data.status);
          if (data.expira_em) setTempoRestante(Math.max(0, Math.floor((new Date(data.expira_em).getTime() - Date.now()) / 1000)));
        } else {
          toast.error(data.erro || 'Não foi possível gerar o QR Pix.');
        }
      } catch {
        toast.error('Erro de conexão ao gerar Pix.');
      } finally {
        setGerando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [pedidoId, email]);

  // Polling do status (a cada 5s)
  useEffect(() => {
    if (!pix || status === 'pago') return;
    const int = setInterval(async () => {
      try {
        const res = await publicFetch(`/pagamentos/status/${pedidoId}`);
        if (res.ok) {
          const d = await res.json();
          setStatus(d.pagamento_status);
          if (d.pagamento_status === 'pago') {
            clearInterval(int);
            onPago && onPago(d);
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(int);
  }, [pix, pedidoId, status, onPago]);

  // Countdown
  useEffect(() => {
    if (!pix || status === 'pago') return;
    const t = setInterval(() => setTempoRestante(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [pix, status]);

  const mmss = useMemo(() => {
    const m = Math.floor(tempoRestante / 60);
    const s = tempoRestante % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [tempoRestante]);

  const copiarCodigo = () => {
    if (!pix?.copia_e_cola) return;
    navigator.clipboard.writeText(pix.copia_e_cola).then(() => {
      setCopiado(true);
      toast.success('Código copiado! Cole no seu app do banco.');
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  if (gerando) {
    return (
      <div data-testid="pix-loading" className="p-8 rounded-card bg-bg-surface border border-stroke shadow-sm flex flex-col items-center gap-4 min-h-[280px] justify-center font-theme">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-tx-muted">Gerando QR Pix...</p>
      </div>
    );
  }

  if (status === 'pago') {
    return (
      <div data-testid="pix-pago" className="p-8 rounded-card bg-emerald-500/5 border-2 border-emerald-500/30 text-center font-theme animate-in zoom-in-95">
        <div className="w-20 h-20 mx-auto mb-4 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border-2 border-emerald-500/30 relative">
          <PartyPopper size={40} strokeWidth={2.5} />
          <span className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping" />
        </div>
        <h3 className="text-2xl font-black text-tx-main mb-1">Pagamento Confirmado! 🎉</h3>
        <p className="text-xs font-black uppercase tracking-widest text-tx-muted">Seu pedido já está com a cozinha.</p>
      </div>
    );
  }

  if (!pix) return null;

  return (
    <div data-testid="pix-checkout" className="p-5 sm:p-6 rounded-card bg-bg-surface border border-stroke shadow-lg font-theme">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-theme bg-primary/10 text-primary flex items-center justify-center">
            <QrCode size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-tx-main leading-tight">Pague com Pix</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted">Aprovação instantânea</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Clock size={12} />
          <span className="text-xs font-black" data-testid="pix-timer">{mmss}</span>
        </div>
      </div>

      {pix.qr_code_base64 && (
        <div className="bg-white p-3 rounded-theme border-2 border-stroke mx-auto max-w-[240px] mb-4 shadow-inner">
          <img
            src={pix.qr_code_base64.startsWith('data:') ? pix.qr_code_base64 : `data:image/png;base64,${pix.qr_code_base64}`}
            alt="QR Code Pix"
            className="w-full h-auto"
            data-testid="pix-qrcode"
          />
        </div>
      )}

      <div className="mb-4">
        <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-2 block">Ou use o código copia-e-cola</label>
        <div className="flex gap-2">
          <input
            data-testid="pix-copia-cola"
            readOnly
            value={pix.copia_e_cola || ''}
            className="flex-1 p-3 rounded-theme border border-stroke bg-bg-input text-xs font-mono text-tx-main truncate outline-none focus:border-primary"
          />
          <button
            data-testid="pix-copy-btn"
            onClick={copiarCodigo}
            className={`px-4 rounded-theme font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 ${copiado ? 'bg-emerald-500 text-white' : 'bg-primary text-tx-primary hover:bg-primary-hover'}`}
          >
            {copiado ? <><Check size={14}/> Ok</> : <><Copy size={14}/> Copiar</>}
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-stroke space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-tx-muted uppercase tracking-widest">Total a pagar</span>
          <span className="text-2xl font-black text-primary tracking-tight">R$ {Number(valorTotal).toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-tx-muted font-medium">Aguardando pagamento… assim que confirmado, seu pedido é enviado automaticamente para a cozinha. Aprovação em segundos.</p>
      </div>
    </div>
  );
}
