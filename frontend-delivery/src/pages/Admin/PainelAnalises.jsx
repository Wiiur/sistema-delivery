// src/pages/Admin/PainelAnalises.jsx
import React, { useMemo } from 'react';
import { DollarSign, Bike, MapPin, TrendingUp, Check, Package, Trophy } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import StatCard from '../../components/ui/StatCard';

export default function PainelAnalises({ 
  temaEscuro, 
  faturamentoHoje, 
  pedidosDeHoje, 
  pedidos, 
  produtosGerente 
}) {
  const totalDelivery = pedidosDeHoje.filter(p => p.tipo_pedido === 'delivery').length;
  const totalLocal = pedidosDeHoje.filter(p => p.tipo_pedido === 'local').length;
  const ticketMedio = pedidosDeHoje.length > 0 ? (faturamentoHoje / pedidosDeHoje.length).toFixed(2) : "0.00";
  
  const pagamentosPIX = pedidosDeHoje.filter(p => p.metodo_pagamento === 'pix' || p.metodo_pagamento === 'balcao_pago' || p.metodo_pagamento === 'pix_site').length;
  const pagamentosCartao = pedidosDeHoje.filter(p => p.metodo_pagamento === 'cartao').length;
  const pagamentosDinheiro = pedidosDeHoje.filter(p => p.metodo_pagamento === 'dinheiro').length;

  // ⚡ Sparkline dos últimos 7 dias (faturamento por dia)
  const { spark7d, trendPct } = useMemo(() => {
    const dias = [];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje); dia.setDate(hoje.getDate() - i);
      const soma = pedidos
        .filter(p => p.status !== 'cancelado' && new Date(p.criado_em).toDateString() === dia.toDateString())
        .reduce((acc, p) => acc + Number(p.total || 0), 0);
      dias.push(soma);
    }
    const hojeVal = dias[dias.length - 1];
    const anteriorMedia = dias.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
    const trend = anteriorMedia > 0 ? ((hojeVal - anteriorMedia) / anteriorMedia) * 100 : 0;
    return { spark7d: dias, trendPct: trend };
  }, [pedidos]);

  const sparkPedidos = useMemo(() => {
    const dias = [];
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje); dia.setDate(hoje.getDate() - i);
      dias.push(pedidos.filter(p => new Date(p.criado_em).toDateString() === dia.toDateString()).length);
    }
    return dias;
  }, [pedidos]);

  const dadosGraficoPagamento = [ 
    { name: 'PIX', value: pagamentosPIX, color: 'var(--primary)' }, 
    { name: 'Cartão', value: pagamentosCartao, color: 'var(--secondary)' }, 
    { name: 'Dinheiro', value: pagamentosDinheiro, color: 'var(--accent)' } 
  ].filter(i => i.value > 0);
  
  const dadosGraficoTipo = [ 
    { name: 'Delivery', value: totalDelivery, color: 'var(--primary)' }, 
    { name: 'Local', value: totalLocal, color: 'var(--secondary)' } 
  ].filter(i => i.value > 0);
  
  const dadosSemana = [{ dia: 'Seg', Receita: 150 }, { dia: 'Ter', Receita: 320 }, { dia: 'Hoje', Receita: faturamentoHoje } ];

  const traduzirProduto = (id) => produtosGerente.find(p => p.id === id)?.nome || `Produto #${id}`;
  const contagemProdutos = {};
  pedidos.forEach(p => { p.itens?.forEach(item => { contagemProdutos[item.produto_id] = (contagemProdutos[item.produto_id] || 0) + item.quantidade; }); });
  const dadosTopProdutos = Object.entries(contagemProdutos).map(([id, qtd]) => ({ nome: traduzirProduto(Number(id)), Vendas: qtd })).sort((a,b) => b.Vendas - a.Vendas).slice(0, 5);

  const rankingProdutos = pedidos
    .filter(p => p.status !== 'cancelado') 
    .flatMap(p => {
      let coisasVendidas = [];
      const linhasObsGerais = p.observacoes ? p.observacoes.split('\n') : [];

      (p.itens || []).forEach(item => {
        let identificouSabor = false;
        let obsParaAnalisar = item.obs;
        
        if (!obsParaAnalisar) {
           const nomeProduto = item.nome || traduzirProduto(Number(item.produto_id)) || '';
           if (nomeProduto) {
             const linhaCorrespondente = linhasObsGerais.find(l => l.includes('->') && l.includes(nomeProduto));
             if (linhaCorrespondente) {
                obsParaAnalisar = linhaCorrespondente.split('->')[1]; 
             }
           }
        }

        if (obsParaAnalisar) {
          if (obsParaAnalisar.toLowerCase().includes('sabor')) {
            identificouSabor = true;
            const partes = obsParaAnalisar.split(':');
            
            if (partes.length > 1) {
              const textoSabores = partes.slice(1).join(':'); 
              const listaSabores = textoSabores.split(','); 

              listaSabores.forEach(saborRaw => {
                let saborLimpo = saborRaw.replace(/\(\+R\$[^)]+\)/gi, '').trim();
                
                if (saborLimpo) {
                  let qtdSabor = item.quantidade || 1;
                  
                  const match = saborLimpo.match(/^(\d+)[xX]\s*(.*)$/);
                  if (match) {
                     qtdSabor = parseInt(match[1], 10); 
                     saborLimpo = match[2].trim();      
                  }

                  coisasVendidas.push({ nome: saborLimpo, qtd: qtdSabor });
                }
              });
            } else {
              identificouSabor = false;
            }
          }
        }

        if (!identificouSabor) {
          const nomeFinal = item.nome || traduzirProduto(Number(item.produto_id)) || 'Produto';
          coisasVendidas.push({ nome: nomeFinal, qtd: item.quantidade || 1 });
        }
      });

      return coisasVendidas;
    })
    .reduce((acc, venda) => {
      acc[venda.nome] = (acc[venda.nome] || 0) + venda.qtd;
      return acc;
    }, {});

  const topSabores = Object.entries(rankingProdutos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 flex-1 overflow-y-auto pr-2 animate-in fade-in custom-scrollbar pb-24 font-theme w-full max-w-[1400px] mx-auto">
      
      {/* LINHA 1: Cards Principais (KPIs) — StatCards com sparklines e trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" data-testid="kpi-grid">
        <StatCard
          testId="kpi-faturamento"
          label="Receita Bruta Diária"
          value={faturamentoHoje.toFixed(2)}
          prefix="R$"
          icon={<DollarSign size={20}/>}
          trend={trendPct}
          trendLabel="vs média 6d"
          sparkline={spark7d}
          color="primary"
        />
        <StatCard
          testId="kpi-entregas"
          label="Entregas Hoje"
          value={totalDelivery}
          icon={<Bike size={20}/>}
          sparkline={sparkPedidos}
          color="primary"
        />
        <StatCard
          testId="kpi-ticket-medio"
          label="Ticket Médio"
          value={ticketMedio}
          prefix="R$"
          icon={<TrendingUp size={20}/>}
          color="success"
        />
        <StatCard
          testId="kpi-comandas"
          label="Comandas Fechadas"
          value={pedidosDeHoje.length}
          icon={<Check size={20}/>}
          sparkline={sparkPedidos}
          color="info"
        />
      </div>

      {/* LINHA 2: Gráficos de Evolução e Tipos de Pagamento */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom-8" style={{ animationDelay: '200ms' }}>
        
        {/* GRÁFICO DE EVOLUÇÃO */}
        <div className="p-5 sm:p-6 rounded-card border border-stroke col-span-1 lg:col-span-2 h-80 flex flex-col shadow-theme bg-bg-surface">
          <h3 className="text-xs font-bold uppercase mb-6 tracking-wide flex items-center gap-2 text-tx-muted"><TrendingUp size={16}/> Evolução Financeira (D-7)</h3>
          <div className="flex-1 min-h-0 w-full relative -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosSemana} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="corReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" vertical={false} opacity={0.5} />
                <XAxis dataKey="dia" stroke="var(--tx-muted)" tick={{fontSize: 11, fontWeight: '600', fill: 'var(--tx-muted)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--tx-muted)" tick={{fontSize: 11, fontWeight: '600', fill: 'var(--tx-muted)'}} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <RechartsTooltip contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-theme)', border: '1px solid var(--stroke)', fontWeight: 'bold', color: 'var(--tx-main)', boxShadow: 'var(--shadow-theme)' }} itemStyle={{ color: 'var(--tx-main)' }} />
                <Area type="monotone" dataKey="Receita" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#corReceita)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* GRÁFICO MEIOS DE PAGAMENTO */}
        <div className="p-5 sm:p-6 rounded-card border border-stroke h-80 flex flex-col shadow-theme bg-bg-surface">
          <h3 className="text-xs font-bold uppercase mb-2 tracking-wide flex items-center gap-2 text-tx-muted"><DollarSign size={16}/> Meios de Pagamento</h3>
          {dadosGraficoPagamento.length === 0 ? <div className="flex-1 flex items-center justify-center text-xs font-bold uppercase tracking-wide text-tx-muted border border-dashed border-stroke rounded-theme m-4 opacity-50">Aguardando Vendas</div> : (
            <div className="flex-1 relative flex flex-col min-h-0">
              <div className="flex-1 relative min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosGraficoPagamento} innerRadius="65%" outerRadius="90%" paddingAngle={4} dataKey="value" stroke="var(--bg-surface)" strokeWidth={2} cornerRadius={4} animationDuration={1000}>
                      {dadosGraficoPagamento.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-theme)', border: '1px solid var(--stroke)', fontWeight: 'bold', color: 'var(--tx-main)' }} itemStyle={{ color: 'var(--tx-main)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center gap-3 sm:gap-4 flex-wrap p-3 rounded-theme border border-stroke bg-bg-input shrink-0">
                {dadosGraficoPagamento.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-tx-main">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>{item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* GRÁFICO ORIGEM DE VENDA */}
        <div className="p-5 sm:p-6 rounded-card border border-stroke h-80 flex flex-col shadow-theme bg-bg-surface">
          <h3 className="text-xs font-bold uppercase mb-2 tracking-wide flex items-center gap-2 text-tx-muted"><MapPin size={16}/> Origem de Venda</h3>
          {dadosGraficoTipo.length === 0 ? <div className="flex-1 flex items-center justify-center text-xs font-bold uppercase tracking-wide text-tx-muted border border-dashed border-stroke rounded-theme m-4 opacity-50">Aguardando Vendas</div> : (
            <div className="flex-1 relative flex flex-col min-h-0">
              <div className="flex-1 relative min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosGraficoTipo} innerRadius="65%" outerRadius="90%" paddingAngle={4} dataKey="value" stroke="var(--bg-surface)" strokeWidth={2} cornerRadius={4} animationDuration={1000}>
                      {dadosGraficoTipo.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-theme)', border: '1px solid var(--stroke)', fontWeight: 'bold', color: 'var(--tx-main)' }} itemStyle={{ color: 'var(--tx-main)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center gap-3 sm:gap-4 flex-wrap p-3 rounded-theme border border-stroke bg-bg-input shrink-0">
                {dadosGraficoTipo.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-tx-main">
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>{item.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* LINHA 3: Pódio de Sabores e Gráfico de Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-8" style={{ animationDelay: '300ms' }}>
        
        {/* PÓDIO DE SABORES */}
        <div className="p-5 sm:p-6 md:p-8 rounded-card border border-stroke shadow-theme flex flex-col h-80 bg-bg-surface">
          <h3 className="text-xs font-bold text-primary uppercase mb-5 tracking-wide flex items-center gap-2">
            <Trophy size={16} /> Pódio de Sabores e Adicionais
          </h3>

          {topSabores.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-6 border border-dashed border-stroke rounded-theme">
              <Trophy size={32} className="mb-2 text-tx-muted" />
              <p className="text-xs font-bold uppercase tracking-widest text-tx-muted">Aguardando vendas.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {topSabores.map(([nome, quantidade], index) => {
                let corMedalha = 'bg-bg-input text-tx-muted border border-stroke';
                if (index === 0) corMedalha = 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-400/30'; 
                else if (index === 1) corMedalha = 'bg-gray-300 text-gray-800 shadow-lg shadow-gray-300/30'; 
                else if (index === 2) corMedalha = 'bg-orange-400 text-orange-900 shadow-lg shadow-orange-400/30'; 

                return (
                  <div key={nome} className="flex items-center justify-between p-3 rounded-theme transition-all border border-transparent hover:border-stroke bg-bg-main hover:bg-bg-input">
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${corMedalha}`}>
                        {index + 1}º
                      </span>
                      <span className="text-sm font-bold truncate text-tx-main">
                        {nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-theme border border-primary/20">
                        {quantidade}x
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Gráfico Original de Produtos em Barras */}
        <div className="p-5 sm:p-6 md:p-8 rounded-card border border-stroke h-80 flex flex-col shadow-theme bg-bg-surface">
          <h3 className="text-xs font-bold text-primary uppercase mb-6 tracking-wide flex items-center gap-2">
            <Package size={16}/> Ranking de Produtos (Top 5)
          </h3>
          <div className="flex-1 min-h-0 w-full relative -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosTopProdutos} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="nome" stroke="var(--tx-muted)" tick={{fontSize: 10, fontWeight: 'bold', fill: 'var(--tx-muted)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--tx-muted)" tick={{fontSize: 10, fontWeight: 'bold', fill: 'var(--tx-muted)'}} axisLine={false} tickLine={false} allowDecimals={false} />
                <RechartsTooltip cursor={{fill: 'var(--bg-input)'}} contentStyle={{ backgroundColor: 'color-mix(in srgb, var(--bg-surface) 90%, transparent)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-theme)', border: `1px solid var(--stroke)`, fontWeight: 'bold', color: 'var(--tx-main)', boxShadow: 'var(--shadow-theme)' }} itemStyle={{ color: 'var(--tx-main)' }} />
                <Bar dataKey="Vendas" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={35} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
}