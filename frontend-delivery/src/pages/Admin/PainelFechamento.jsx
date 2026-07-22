// src/pages/Admin/PainelFechamento.jsx
import React, { useState } from 'react';
import { Smartphone, DollarSign, Calculator, Shield, Printer, Calendar } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function PainelFechamento({ 
  temaEscuro, 
  pedidosDeHoje, 
  faturamentoHoje, 
  pedidos, 
  usuarioLogado, 
  realizarAcaoProtegida,
  configTaxa // 👉 Adicionado para podermos puxar o nome da loja no recibo impresso
}) {
  const [valorManualGaveta, setValorManualGaveta] = useState(''); 
  const [valorSangria, setValorSangria] = useState('');
  
  const [periodoFiltro, setPeriodoFiltro] = useState('hoje');

  // Filtragem dinâmica de pedidos baseada na escolha
  const pedidosFiltrados = pedidos.filter(p => {
    if (p.status === 'cancelado') return false;
    
    const dataPedido = new Date(p.criado_em); 
    const hoje = new Date();
    
    if (periodoFiltro === 'hoje') return dataPedido.toDateString() === hoje.toDateString();
    
    if (periodoFiltro === 'semana') { 
      const umaSemanaAtras = new Date(); 
      umaSemanaAtras.setDate(hoje.getDate() - 7); 
      return dataPedido >= umaSemanaAtras; 
    }
    
    if (periodoFiltro === 'mes') { 
      return dataPedido.getMonth() === hoje.getMonth() && dataPedido.getFullYear() === hoje.getFullYear(); 
    }
    
    return true; 
  });

  // Cálculos baseados no filtro atual
  const somaPorMetodo = (metodo) => pedidosFiltrados.filter(p => p.metodo_pagamento === metodo || (metodo === 'pix' && p.metodo_pagamento === 'balcao_pago')).reduce((acc, p) => acc + Number(p.total), 0);
  const totaisCaixa = { 
    pix: somaPorMetodo('pix'), 
    dinheiro: somaPorMetodo('dinheiro'), 
    cartao: somaPorMetodo('cartao'), 
    geral: pedidosFiltrados.reduce((acc, p) => acc + Number(p.total), 0)
  };
  const totalEsperadoFechamento = totaisCaixa.geral - Number(valorSangria || 0);

  // 👉 AQUI ESTÁ A ASSINATURA DROPA NO RECIBO DE FECHAMENTO
  const imprimirFechamentoCaixa = () => {
    const janelaImpressao = window.open('', '', 'width=400,height=600'); 
    if (!janelaImpressao) return alert("Permita pop-ups.");
    
    const d = new Date(); 
    const diff = Number(valorManualGaveta) - totalEsperadoFechamento;
    const nomePeriodo = periodoFiltro === 'hoje' ? 'DIÁRIO' : periodoFiltro === 'semana' ? 'SEMANAL' : periodoFiltro === 'mes' ? 'MENSAL' : 'GERAL';
    const nomeDaLoja = configTaxa?.nome_loja || 'FECHAMENTO DE CAIXA';

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: 80mm auto; } 
            * { box-sizing: border-box; color: #000 !important; font-family: 'Courier New', Courier, monospace; } 
            body { width: 76mm; margin: 0 auto; padding: 4mm; font-size: 14px; font-weight: bold; line-height: 1.2; } 
            .center { text-align: center; } 
            .divider { border-bottom: 2px dashed #000; margin: 8px 0; } 
            .row { display: flex; justify-content: space-between; margin-top: 4px; }
            .bold { font-weight: 900; }
            .text-lg { font-size: 16px; }
            .text-xl { font-size: 20px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="center text-xl">${nomeDaLoja}</div>
          <div class="center text-lg mt">Extrato ${nomePeriodo}</div>
          <div class="divider"></div>
          <div>Data: ${d.toLocaleString()}</div>
          <div>Operador: ${usuarioLogado?.nome || 'Gerente'}</div>
          <div class="divider"></div>
          <div class="center text-lg bold">RESUMO DE ENTRADAS</div>
          <div class="divider"></div>
          <div class="row"><span>PIX / Cartão:</span><span>R$ ${(totaisCaixa.pix+totaisCaixa.cartao).toFixed(2)}</span></div>
          <div class="row"><span>Dinheiro Vivo:</span><span>R$ ${totaisCaixa.dinheiro.toFixed(2)}</span></div>
          <div class="row"><span>Sangrias/Desp:</span><span>- R$ ${Number(valorSangria || 0).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row text-lg bold"><span>LÍQUIDO ESPERADO:</span><span>R$ ${totalEsperadoFechamento.toFixed(2)}</span></div>
          <div class="row text-lg bold" style="margin-top: 8px;"><span>GAVETA DECLARADA:</span><span>R$ ${Number(valorManualGaveta).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row text-lg bold">
            <span>DIFERENÇA:</span>
            <span style="color: ${diff < 0 ? '#000' : '#000'}">R$ ${diff.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="center" style="margin-top:40px;">_________________________________</div>
          <div class="center" style="font-size: 12px; margin-top: 5px;">Assinatura do Responsável</div>
          <div class="center" style="font-size: 10px; color: #666; margin-top: 20px; letter-spacing: 1px;">⚡ POWERED BY DROPA DELIVERY</div>
        </body>
      </html>
    `;

    janelaImpressao.document.write(html);
    janelaImpressao.document.close(); 
    janelaImpressao.focus(); 
    setTimeout(() => { janelaImpressao.print(); janelaImpressao.close(); }, 500);
  };

  const handleFecharCaixa_Final = async () => {
    const informado = Number(valorManualGaveta); const diferenca = informado - totalEsperadoFechamento;
    if(!window.confirm(`Deseja fechar o caixa?\n\nEsperado Líquido: R$ ${totalEsperadoFechamento.toFixed(2)}\nInformado na Gaveta: R$ ${informado.toFixed(2)}\nDiferença: R$ ${diferenca.toFixed(2)}`)) return;
    try { 
      await apiFetch(`/caixa/fechamento`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          total_sistema: totalEsperadoFechamento, 
          total_informado: informado, 
          diferenca, 
          pix_total: totaisCaixa.pix, 
          dinheiro_total: totaisCaixa.dinheiro, 
          cartao_total: totaisCaixa.cartao, 
          observacoes: `Fechamento c/ Sangria R$ ${Number(valorSangria).toFixed(2)}` 
        }) 
      }); 
      imprimirFechamentoCaixa(); 
      alert("✅ Caixa fechado com sucesso!"); 
      setValorManualGaveta(''); 
      setValorSangria(''); 
    } catch (e) {}
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in pb-24 font-theme">
      
      {/* BARRA DE FILTRO DE PERÍODO SUPERIOR */}
      <div className="flex gap-2 sm:gap-3 mb-6 shrink-0 overflow-x-auto custom-scrollbar pb-3 animate-in slide-in-from-top-4">
        <div className="bg-bg-surface border border-stroke rounded-theme p-1.5 flex items-center gap-1 shadow-sm">
          <div className="px-3 text-tx-muted"><Calendar size={18}/></div>
          {['hoje', 'semana', 'mes', 'tudo'].map(f => (
            <button 
              key={f} 
              onClick={() => { setPeriodoFiltro(f); setValorManualGaveta(''); setValorSangria(''); }} 
              className={`px-4 sm:px-6 py-2.5 rounded-theme text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                periodoFiltro === f 
                ? 'bg-primary text-tx-primary shadow-md scale-100' 
                : 'text-tx-muted hover:text-tx-main hover:bg-bg-input scale-95 hover:scale-100'
              }`}
            >
              {f === 'tudo' ? 'Geral' : f}
            </button>
          ))}
        </div>
      </div>

      {/* 3 CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
        
        <div className="p-6 rounded-card border border-stroke flex flex-col items-center justify-center shadow-theme bg-bg-surface transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-primary/30">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-theme flex items-center justify-center mb-4"><Smartphone size={28}/></div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-tx-muted">Entradas Digitais (PIX/Cartão)</p>
          <p className="text-3xl font-black text-primary tracking-tight">R$ {(totaisCaixa.pix + totaisCaixa.cartao).toFixed(2)}</p>
        </div>
        
        <div className="p-6 rounded-card border border-stroke flex flex-col items-center justify-center shadow-theme bg-bg-surface transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-secondary/30">
          <div className="w-14 h-14 bg-secondary/10 text-secondary rounded-theme flex items-center justify-center mb-4"><DollarSign size={28}/></div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-tx-muted">Entradas Físicas (Espécie)</p>
          <p className="text-3xl font-black text-secondary tracking-tight">R$ {totaisCaixa.dinheiro.toFixed(2)}</p>
        </div>
        
        <div className="p-6 rounded-card bg-tx-main text-bg-main flex flex-col items-center justify-center shadow-lg transform hover:-translate-y-1 transition-all duration-300 border border-tx-muted/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-10 rounded-bl-full pointer-events-none"></div>
          <div className="w-14 h-14 bg-bg-main/20 rounded-theme flex items-center justify-center mb-4 relative z-10"><Calculator size={28}/></div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80 relative z-10">Faturamento Bruto {periodoFiltro === 'hoje' ? 'Diário' : periodoFiltro === 'semana' ? 'Semanal' : periodoFiltro === 'mes' ? 'Mensal' : 'Total'}</p>
          <p className="text-4xl sm:text-5xl font-black tracking-tight relative z-10">R$ {totaisCaixa.geral.toFixed(2)}</p>
        </div>
      </div>
      
      {/* PAINEL CENTRAL DE HOMOLOGAÇÃO */}
      <div className="p-6 sm:p-8 md:p-10 rounded-card border border-stroke shadow-theme flex flex-col items-center relative overflow-hidden bg-bg-surface animate-in slide-in-from-bottom-8">
        <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-primary via-secondary to-accent"></div>
        
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-8 flex items-center gap-3 text-tx-main text-center">
          <Shield size={28} className="text-primary"/> Homologação de Caixa
        </h3>
        
        <div className="w-full max-w-lg space-y-6">
          
          <div className="p-5 sm:p-6 rounded-theme border border-stroke text-center bg-bg-input">
            <button onClick={imprimirFechamentoCaixa} className="w-full py-4 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-theme transition-all border flex items-center justify-center gap-2 bg-bg-surface border-stroke text-tx-main hover:border-primary hover:text-primary shadow-sm active:scale-95">
              <Printer size={18}/> Imprimir Extrato Parcial
            </button>
          </div>
          
          <div className="p-5 sm:p-6 rounded-theme border border-stroke text-center bg-bg-input shadow-inner">
            <label className="text-xs font-bold uppercase tracking-wider block mb-4 text-tx-muted">Registro de Sangrias / Despesas</label>
            <div className="relative flex items-center justify-center group">
              <span className="absolute left-6 font-black text-xl text-tx-muted group-focus-within:text-red-500 transition-colors">R$</span>
              <input type="number" value={valorSangria} onChange={e => setValorSangria(e.target.value)} placeholder="0.00" className="w-full p-4 pl-16 text-2xl sm:text-3xl font-black rounded-theme border border-stroke outline-none text-center transition-all duration-300 bg-bg-surface text-tx-main focus:border-red-500 focus:text-red-500 focus:shadow-md shadow-sm" />
            </div>
          </div>
          
          <div className="p-5 sm:p-6 rounded-theme border border-stroke text-center bg-bg-input shadow-inner">
            <label className="text-xs font-bold uppercase tracking-wider block mb-4 text-tx-muted">Contagem Física na Gaveta</label>
            <div className="relative flex items-center justify-center group">
              <span className="absolute left-6 font-black text-xl text-tx-muted group-focus-within:text-primary transition-colors">R$</span>
              <input type="number" value={valorManualGaveta} onChange={e => setValorManualGaveta(e.target.value)} placeholder="0.00" className="w-full p-4 sm:p-5 pl-16 text-3xl sm:text-4xl font-black rounded-theme border border-stroke outline-none text-center transition-all duration-300 bg-bg-surface text-tx-main focus:border-primary focus:text-primary focus:shadow-md shadow-sm" />
            </div>
          </div>
          
          {valorManualGaveta && (
            <div className={`p-5 sm:p-6 rounded-theme flex flex-col sm:flex-row justify-between items-center sm:items-start text-center sm:text-left gap-4 border-2 transition-all duration-500 animate-in zoom-in-95 ${Number(valorManualGaveta) - totalEsperadoFechamento >= 0 ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]'}`}>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-tx-muted">Auditoria Analítica</span>
                <span className={`text-sm sm:text-base font-black uppercase tracking-widest mt-1 ${Number(valorManualGaveta) - totalEsperadoFechamento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Number(valorManualGaveta) - totalEsperadoFechamento >= 0 ? 'Excedente Positivo' : 'Déficit (Quebra de Caixa)'}
                </span>
              </div>
              <span className={`text-4xl sm:text-5xl font-black tracking-tighter ${Number(valorManualGaveta) - totalEsperadoFechamento >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                R$ {(Number(valorManualGaveta) - totalEsperadoFechamento).toFixed(2)}
              </span>
            </div>
          )}
          
          <button onClick={() => realizarAcaoProtegida("Auditoria de Encerramento", handleFecharCaixa_Final)} className="w-full py-5 sm:py-6 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover uppercase text-sm tracking-widest active:scale-95 transition-all flex justify-center items-center gap-2 mt-4">
            <Shield size={20}/> Autenticar Fechamento de Expediente
          </button>
          
        </div>
      </div>
    </div>
  );
}