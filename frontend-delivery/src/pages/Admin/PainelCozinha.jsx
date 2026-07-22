// src/pages/Admin/PainelCozinha.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Bike, FileText, Shield, Banknote, Coins, X, Check, XOctagon, ChefHat, Clock } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';

// 👉 COMPONENTE: Calculadora de Troco (Reaproveitado do Caixa)
function CalculadoraTroco({ valorTroco }) {
  const notasEMoedas = useMemo(() => {
    if (!valorTroco || valorTroco <= 0) return [];
    let centavosRestantes = Math.round(valorTroco * 100);
    
    const baseDinheiro = [
      { valor: 100, centavos: 10000, tipo: 'nota', cor: 'bg-blue-600/20 text-blue-500 border-blue-500/30' },
      { valor: 50, centavos: 5000, tipo: 'nota', cor: 'bg-orange-600/20 text-orange-500 border-orange-500/30' },
      { valor: 20, centavos: 2000, tipo: 'nota', cor: 'bg-yellow-600/20 text-yellow-600 border-yellow-600/30' },
      { valor: 10, centavos: 1000, tipo: 'nota', cor: 'bg-red-600/20 text-red-500 border-red-500/30' },
      { valor: 5, centavos: 500, tipo: 'nota', cor: 'bg-purple-600/20 text-purple-500 border-purple-500/30' },
      { valor: 2, centavos: 200, tipo: 'nota', cor: 'bg-indigo-600/20 text-indigo-500 border-indigo-500/30' },
      { valor: 1, centavos: 100, tipo: 'moeda', cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      { valor: 0.5, centavos: 50, tipo: 'moeda', cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      { valor: 0.25, centavos: 25, tipo: 'moeda', cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      { valor: 0.1, centavos: 10, tipo: 'moeda', cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
      { valor: 0.05, centavos: 5, tipo: 'moeda', cor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }
    ];

    const resultado = [];
    for (let item of baseDinheiro) {
      const quantidade = Math.floor(centavosRestantes / item.centavos);
      if (quantidade > 0) {
        resultado.push({ ...item, quantidade });
        centavosRestantes -= quantidade * item.centavos;
      }
    }
    return resultado;
  }, [valorTroco]);

  if (!valorTroco || valorTroco <= 0) return null;

  return (
    <div className="mt-6 p-5 rounded-theme border border-stroke bg-bg-main shadow-inner text-left animate-in slide-in-from-bottom-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-tx-muted mb-4 flex items-center gap-2">
        <Banknote size={16} className="text-secondary"/> Separar para o Cliente:
      </h4>
      <div className="flex flex-wrap gap-2.5">
        {notasEMoedas.map((item, index) => (
          <div key={index} className={`flex items-center gap-2 px-3.5 py-2 rounded-md border shadow-sm font-black ${item.cor}`}>
            <span className="text-xs uppercase tracking-wider opacity-80">{item.quantidade}x</span>
            {item.tipo === 'nota' ? (
              <span className="text-base">R$ {item.valor}</span>
            ) : (
              <span className="text-sm flex items-center gap-1.5"><Coins size={14}/> {item.valor < 1 ? `${item.valor * 100}¢` : `R$ ${item.valor}`}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PainelCozinha({
  temaEscuro,
  pedidos,
  usuarioLogado,
  motoboys,
  despacharComMotoboy,
  setFichaPedido,
  mudarStatusPedido,
  realizarAcaoProtegida
}) {
  const [filtroData, setFiltroData] = useState('hoje'); 
  const [motoboySelecionadoId, setMotoboySelecionadoId] = useState({});

  // Timer relativo para exibir "há X min" (atualiza a cada 30s)
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  // Estados do Modal de Troco na Cozinha
  const [modalTrocoAberto, setModalTrocoAberto] = useState(false);
  const [pedidoParaBaixa, setPedidoParaBaixa] = useState(null); 
  const [valorTrocoCalculado, setValorTrocoCalculado] = useState(0);

  const formatarData = (d) => !d ? '--:--' : new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // ⚡ Calcula "tempo desde o pedido" — urgência visual
  const calcularUrgencia = (criadoEm) => {
    if (!criadoEm) return { minutos: 0, cor: 'neutral', label: '--' };
    const min = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60000);
    let cor = 'success';
    if (min > 60) cor = 'danger';
    else if (min > 30) cor = 'warning';
    else if (min > 15) cor = 'info';
    const label = min < 1 ? 'Agora' : min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;
    return { minutos: min, cor, label };
  };
  
  const corDoStatus = (s) => {
    if(s === 'recebido') return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    if(s === 'em_preparo') return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30';
    if(s === 'em_consumo') return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
    if(s === 'saiu_entrega' || s === 'entregue') return 'bg-green-500/10 text-green-500 border-green-500/30';
    if(s === 'cancelado') return 'bg-red-500/10 text-red-500 border-red-500/30 opacity-80'; 
    return 'bg-bg-input text-tx-muted border-stroke';
  };

  // 🚀 useMemo evita refiltrar todos os pedidos a cada render
  const pedidosFiltrados = useMemo(() => pedidos.filter(p => {
    const dataPedido = new Date(p.criado_em); const hoje = new Date();
    if (filtroData === 'hoje') return dataPedido.toDateString() === hoje.toDateString();
    if (filtroData === 'ontem') { const ontem = new Date(); ontem.setDate(hoje.getDate() - 1); return dataPedido.toDateString() === ontem.toDateString(); }
    if (filtroData === 'semana') { const umaSemanaAtras = new Date(); umaSemanaAtras.setDate(hoje.getDate() - 7); return dataPedido >= umaSemanaAtras; }
    return true; 
  }), [pedidos, filtroData]);

  const handleDespachar = (pedido) => {
      const mId = motoboySelecionadoId[pedido.id];
      despacharComMotoboy(pedido, mId);
  };

  const handleTentativaDeBaixa = (pedido, ehAcaoProtegida = false) => {
    const obs = pedido.observacoes || "";
    const matchTroco = obs.match(/TROCO:\s*Levar\s*R\$\s*([\d.]+)/i);
    
    if (pedido.metodo_pagamento === 'dinheiro' && matchTroco) {
      setValorTrocoCalculado(Number(matchTroco[1]));
      setPedidoParaBaixa({ ...pedido, ehAcaoProtegida });
      setModalTrocoAberto(true);
    } else {
      executarBaixaReal(pedido, ehAcaoProtegida);
    }
  };

  const executarBaixaReal = (pedido, ehAcaoProtegida) => {
    if (ehAcaoProtegida) {
      realizarAcaoProtegida(`Finalizar pedido de ${pedido.cliente_nome}?`, (func) => mudarStatusPedido(pedido.id, 'entregue', func.nome));
    } else {
      mudarStatusPedido(pedido.id, 'entregue', usuarioLogado?.nome);
    }
  };

  const confirmarTrocoEFinalizar = () => {
    executarBaixaReal(pedidoParaBaixa, pedidoParaBaixa.ehAcaoProtegida);
    setModalTrocoAberto(false);
    setPedidoParaBaixa(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in fade-in font-theme pb-20 lg:pb-0 relative">
      
      {/* BARRA DE FILTROS SUPERIOR — modernizada */}
      <div className="flex gap-2 sm:gap-3 mb-6 shrink-0 overflow-x-auto custom-scrollbar pb-3" data-testid="cozinha-filtros">
        {[
          { id: 'hoje', label: 'Hoje' },
          { id: 'ontem', label: 'Ontem' },
          { id: 'semana', label: 'Semana' },
          { id: 'tudo', label: 'Tudo' }
        ].map(f => {
          const ativo = filtroData === f.id;
          const count = f.id === 'hoje'
            ? pedidos.filter(p => new Date(p.criado_em).toDateString() === new Date().toDateString()).length
            : null;
          return (
            <button 
              key={f.id}
              onClick={() => setFiltroData(f.id)}
              data-testid={`filtro-${f.id}`}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap flex items-center gap-2 ${
                ativo 
                ? 'bg-primary text-tx-primary border-primary shadow-theme scale-[1.03]' 
                : 'bg-bg-surface border-stroke text-tx-muted hover:text-primary hover:border-primary/50 hover:bg-bg-input'
              }`}
            >
              {f.label}
              {count !== null && count > 0 && (
                <span className={`inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full font-black min-w-[20px] ${ativo ? 'bg-black/25 text-tx-primary' : 'bg-bg-input text-tx-main'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* LISTA DE PEDIDOS / COMANDAS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 sm:space-y-5">
        {pedidosFiltrados.length === 0 ? (
            <EmptyState
              icon={ChefHat}
              title={filtroData === 'hoje' ? 'Cozinha calma por enquanto' : 'Nenhum pedido neste período'}
              description={filtroData === 'hoje'
                ? 'Assim que um novo pedido chegar, ele aparece aqui automaticamente com som e notificação.'
                : 'Ajuste o filtro para ver mais pedidos ou aguarde novos pedidos entrarem.'}
              testId="cozinha-empty"
            />
        ) : (
            pedidosFiltrados.map(pedido => (
          <div key={pedido.id} className="p-5 sm:p-6 rounded-card border flex flex-col xl:flex-row justify-between gap-5 transition-all duration-300 shadow-sm bg-bg-surface border-stroke hover:border-primary/40 hover:shadow-md animate-in slide-in-from-bottom-2 group">
            
            <div className="w-full xl:w-auto min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                  {/* Status do Pedido */}
                  <span className={`px-3 py-1.5 rounded-theme text-[10px] font-black uppercase tracking-widest border ${corDoStatus(pedido.status)} ${pedido.status === 'cancelado' ? 'line-through' : ''}`}>
                    {pedido.status.replace('_', ' ')}
                  </span>

                  {/* ⚡ TEMPO DESDE O PEDIDO (urgência visual) */}
                  {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (() => {
                    const u = calcularUrgencia(pedido.criado_em);
                    void tick; // usa a variável para refletir o re-render
                    return (
                      <Badge tone={u.cor} icon={<Clock size={11}/>} dot={u.minutos > 30 ? 'pulse' : undefined} testId={`urgencia-${pedido.id}`}>
                        {u.label}
                      </Badge>
                    );
                  })()}
                  
                  {/* Tipo de Pedido */}
                  <span className={`px-3 py-1.5 rounded-theme text-[10px] font-black uppercase tracking-widest border ${
                    pedido.tipo_pedido === 'local' 
                    ? 'border-secondary/30 text-secondary bg-secondary/10' 
                    : 'border-primary/30 text-primary bg-primary/10'
                  }`}>
                    {pedido.tipo_pedido}
                  </span>
                  
                  <span className="text-[11px] font-bold ml-auto xl:ml-2 text-tx-muted bg-bg-input px-2.5 py-1 rounded-theme border border-stroke">
                    {formatarData(pedido.criado_em)}
                  </span>
              </div>

              <h4 className={`text-xl sm:text-2xl font-black tracking-tight text-tx-main truncate ${pedido.status === 'cancelado' ? 'opacity-50 line-through' : ''}`}>
                #{pedido.id} <span className="text-tx-muted font-bold opacity-50 mx-1">|</span> {pedido.cliente_nome || 'Cliente'}
              </h4>
              
              <p className={`text-xs sm:text-sm mt-2 truncate max-w-full xl:max-w-md font-bold text-tx-muted uppercase tracking-wide ${pedido.status === 'cancelado' ? 'opacity-50' : ''}`}>
                {pedido.tipo_pedido === 'local' ? `🪑 MESA: ${pedido.mesa}` : `📍 ENDEREÇO: ${pedido.cliente_endereco}`}
              </p>
              
              <div className="flex gap-4 mt-4 bg-bg-input w-fit px-3 py-1.5 rounded-theme border border-stroke">
                  {pedido.criado_por && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-tx-muted">
                      👤 Por: <span className="text-tx-main ml-1">{pedido.criado_por}</span>
                    </p>
                  )}
                  {pedido.motoboy && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-tx-muted border-l border-stroke pl-4">
                      🚚 Rota: <span className="text-primary ml-1">{pedido.motoboy.nome}</span>
                    </p>
                  )}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between w-full xl:w-auto gap-4 pt-4 xl:pt-0 border-t xl:border-t-0 border-stroke">
              <div className="text-left sm:text-right w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold mb-1 block text-tx-muted tracking-widest">TOTAL • {pedido.metodo_pagamento}</span>
                  <span className={`text-tx-main font-black text-2xl sm:text-3xl block leading-none ${pedido.status === 'cancelado' ? 'opacity-50' : ''}`}>
                    R$ {Number(pedido.total).toFixed(2)}
                  </span>
              </div>
              
              {/* BOTÕES DE AÇÃO */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 items-stretch w-full sm:w-auto">
                
                {pedido.status === 'em_preparo' && pedido.tipo_pedido === 'delivery' && (
                  <div className="flex gap-1.5 p-1 rounded-theme border items-center shadow-sm bg-bg-input border-stroke w-full sm:w-auto focus-within:border-primary transition-colors">
                      <select 
                        value={motoboySelecionadoId[pedido.id] || ""} 
                        onChange={e=>setMotoboySelecionadoId({...motoboySelecionadoId, [pedido.id]: e.target.value})} 
                        className="bg-transparent text-xs outline-none flex-1 font-bold pl-3 pr-2 cursor-pointer text-tx-main uppercase tracking-wider min-w-[150px] h-10"
                      >
                          <option value="" className="bg-bg-surface text-tx-main font-bold">Selecionar Motoboy...</option>
                          {motoboys.map(m => (
                            <option key={m.id} value={m.id} className="bg-bg-surface text-tx-main font-bold">
                              {m.nome}
                            </option>
                          ))}
                      </select>
                      <button onClick={() => handleDespachar(pedido)} className="bg-primary w-12 h-10 rounded-theme text-tx-primary hover:bg-primary-hover active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0">
                        <Bike size={18}/>
                      </button>
                  </div>
                )}
                
                <button onClick={() => setFichaPedido(pedido)} className="px-5 border rounded-theme transition-all flex items-center justify-center shadow-sm font-bold text-sm border-stroke bg-bg-surface hover:bg-bg-input text-tx-main hover:border-primary/50 w-full sm:w-auto h-12 sm:h-auto active:scale-95">
                  <FileText size={20} />
                </button>
                
                {pedido.status === 'recebido' && (
                  <button onClick={() => mudarStatusPedido(pedido.id, 'em_preparo', usuarioLogado?.nome)} className="flex-1 sm:flex-none px-6 bg-primary hover:bg-primary-hover text-tx-primary font-black rounded-theme text-[11px] sm:text-xs uppercase tracking-widest transition-all shadow-theme active:scale-95 whitespace-nowrap h-12 sm:h-auto">
                    Ir p/ Cozinha
                  </button>
                )}

                {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                  <button 
                    onClick={() => realizarAcaoProtegida(`Tem certeza que deseja CANCELAR o pedido #${pedido.id}?`, (func) => mudarStatusPedido(pedido.id, 'cancelado', func.nome))} 
                    className="flex-1 sm:flex-none px-4 border border-red-500/30 text-red-500 bg-bg-surface hover:bg-red-500/10 font-black rounded-theme text-[11px] sm:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 whitespace-nowrap h-12 sm:h-auto flex items-center justify-center gap-1.5"
                  >
                    <XOctagon size={14} /> Cancelar
                  </button>
                )}
                
                {pedido.status === 'em_preparo' && pedido.tipo_pedido === 'local' && (
                  <button onClick={() => handleTentativaDeBaixa(pedido, false)} className="flex-1 sm:flex-none px-6 bg-secondary hover:bg-opacity-80 text-tx-primary font-black rounded-theme text-[11px] sm:text-xs uppercase tracking-widest transition-all shadow-theme active:scale-95 whitespace-nowrap h-12 sm:h-auto">
                    Servir Mesa
                  </button>
                )}
                
                {pedido.status === 'saiu_entrega' && (
                  <button onClick={() => handleTentativaDeBaixa(pedido, true)} className="flex-1 sm:flex-none px-6 bg-green-500 hover:bg-green-600 text-white font-black rounded-theme text-[11px] sm:text-xs uppercase tracking-widest transition-all shadow-theme active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap h-12 sm:h-auto">
                    <Shield size={16}/> Dar Baixa
                  </button>
                )}
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* O NOVO MODAL FLUTUANTE DO TROCO (Na Cozinha) */}
      {modalTrocoAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[500] animate-in fade-in">
          <div className="w-full max-w-md bg-bg-surface rounded-card p-6 sm:p-8 shadow-2xl border border-stroke relative text-center animate-in zoom-in-95">
            <button onClick={() => setModalTrocoAberto(false)} className="absolute top-4 right-4 text-tx-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-theme transition-colors">
              <X size={20}/>
            </button>
            
            <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
              <Banknote size={28} />
            </div>

            <h2 className="text-2xl font-black text-tx-main tracking-tight mb-2">Atenção ao Troco!</h2>
            <p className="text-sm font-bold text-tx-muted">O motoboy já devolveu o troco do Pedido #{pedidoParaBaixa?.id}?</p>
            
            <CalculadoraTroco valorTroco={valorTrocoCalculado} />

            <button 
              onClick={confirmarTrocoEFinalizar}
              className="w-full mt-8 py-4 bg-secondary text-white font-black rounded-theme shadow-theme hover:bg-opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
            >
               <Check size={20}/> Confirmo o Recebimento
            </button>
          </div>
        </div>
      )}

    </div>
  );
}