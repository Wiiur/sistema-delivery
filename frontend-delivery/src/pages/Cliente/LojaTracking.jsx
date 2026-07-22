// src/pages/Cliente/LojaTracking.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Flame, Bike, Home, MapPin, Phone, ArrowLeft, Clock, X } from 'lucide-react';

export default function LojaTracking({ pedidos, motoboys, configTaxa }) {
  const [pedidoId, setPedidoId] = useState(null);

  useEffect(() => {
    // Captura o ID da URL: ?tracking=123
    const parametrosUrl = new URLSearchParams(window.location.search);
    const id = parametrosUrl.get('tracking');
    if (id) setPedidoId(Number(id));
  }, []);

  if (!pedidoId) return null;

  const pedido = pedidos.find(p => p.id === pedidoId);

  if (!pedido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-main text-tx-main font-theme px-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-tx-muted font-black uppercase tracking-widest text-sm">Localizando Pedido #{pedidoId}...</p>
      </div>
    );
  }

  // Definição dos Status e Etapas da Linha do Tempo
  const etapas = [
    { id: 'recebido', titulo: 'Recebido', icone: CheckCircle2, msg: 'Pedido confirmado pela loja.' },
    { id: 'em_preparo', titulo: 'Preparando', icone: Flame, msg: 'Sendo feito com muito carinho!' },
    { id: 'saiu_entrega', titulo: 'A Caminho', icone: Bike, msg: 'O entregador já está na rota.' },
    { id: 'entregue', titulo: 'Entregue', icone: Home, msg: 'Bom apetite!' }
  ];

  // Identifica em qual passo o pedido está
  const stepAtualIndex = etapas.findIndex(e => e.id === pedido.status);
  const entregador = pedido.motoboy_id ? motoboys.find(m => m.id === pedido.motoboy_id) : null;

  return (
    <div className="min-h-screen bg-bg-main text-tx-main font-theme flex flex-col items-center p-4 sm:p-8 animate-in fade-in">
      
      {/* Cabeçalho */}
      <div className="w-full max-w-lg mb-8 text-center mt-4">
        <div className="w-20 h-20 mx-auto rounded-card border-4 border-bg-main bg-bg-surface shadow-theme overflow-hidden flex items-center justify-center mb-4">
           {configTaxa?.logo_url ? (
             <img src={configTaxa.logo_url} alt="Logo" className="w-full h-full object-cover" />
           ) : (
             <span className="text-primary font-black text-sm italic">LOGO</span>
           )}
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-1">Acompanhe seu Pedido</h1>
        <p className="text-tx-muted font-bold text-sm uppercase tracking-widest bg-bg-input inline-block px-3 py-1 rounded-theme border border-stroke shadow-sm">
          Pedido #{pedido.id}
        </p>
      </div>

      <div className="w-full max-w-lg bg-bg-surface rounded-card shadow-2xl border border-stroke p-6 sm:p-8 relative overflow-hidden animate-in slide-in-from-bottom-4">
        
        {/* Linha do Tempo Visual */}
        <div className="relative mb-10 mt-4">
          <div className="absolute left-[21px] top-0 bottom-0 w-1 bg-bg-input rounded-full z-0"></div>
          
          <div className="space-y-8 relative z-10">
            {etapas.map((etapa, index) => {
              const Icone = etapa.icone;
              const isCompletado = stepAtualIndex >= index;
              const isAtual = stepAtualIndex === index;
              const isCancelado = pedido.status === 'cancelado';

              if (isCancelado) return null; // Esconde se estiver cancelado

              return (
                <div key={etapa.id} className={`flex gap-4 sm:gap-6 items-start transition-all duration-500 ${!isCompletado ? 'opacity-40 grayscale' : ''}`}>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-4 transition-all duration-500 ${isAtual ? 'bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(var(--color-primary),0.5)] animate-pulse' : isCompletado ? 'bg-primary border-primary text-white' : 'bg-bg-input border-stroke text-tx-muted'}`}>
                    <Icone size={20} strokeWidth={isAtual ? 3 : 2} />
                  </div>
                  <div className="pt-2">
                    <h3 className={`font-black text-lg sm:text-xl uppercase tracking-tight leading-none mb-1 ${isAtual ? 'text-primary' : 'text-tx-main'}`}>
                      {etapa.titulo}
                    </h3>
                    <p className="text-tx-muted font-medium text-xs sm:text-sm">{etapa.msg}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {pedido.status === 'cancelado' && (
            <div className="flex gap-4 items-center bg-red-500/10 p-4 rounded-theme border border-red-500/20 text-red-500">
               <X size={32} />
               <div>
                 <h3 className="font-black text-lg uppercase tracking-tight">Pedido Cancelado</h3>
                 <p className="text-xs font-bold">Entre em contato com a loja para mais informações.</p>
               </div>
            </div>
          )}
        </div>

        {/* Informações Extras (Entregador e Endereço) */}
        <div className="bg-bg-main rounded-theme p-5 border border-stroke space-y-4">
          
          {pedido.tipo_pedido === 'delivery' && pedido.status === 'saiu_entrega' && entregador && (
            <div className="flex items-center gap-3 bg-secondary/10 border border-secondary/20 p-3 rounded-theme animate-in zoom-in-95">
              <div className="w-10 h-10 bg-secondary text-white rounded-full flex items-center justify-center shrink-0">
                <Bike size={20}/>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-0.5">Seu Entregador</p>
                <p className="font-black text-sm text-tx-main">{entregador.nome}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 items-start">
            <MapPin size={16} className="text-tx-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-1">
                {pedido.tipo_pedido === 'local' ? 'Local de Retirada/Mesa' : 'Endereço de Entrega'}
              </p>
              <p className="font-bold text-sm text-tx-main leading-snug">
                {pedido.tipo_pedido === 'local' ? `Mesa: ${pedido.mesa || 'Balcão'}` : pedido.cliente_endereco}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 items-start pt-3 border-t border-stroke/50">
            <Clock size={16} className="text-tx-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-1">Feito em</p>
              <p className="font-bold text-sm text-tx-main">
                {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        <button onClick={() => window.location.href = window.location.pathname} className="w-full mt-6 py-4 rounded-theme border border-stroke font-black text-xs uppercase tracking-widest text-tx-muted hover:text-tx-main hover:bg-bg-input transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16}/> Voltar para o Cardápio
        </button>

      </div>
    </div>
  );
}