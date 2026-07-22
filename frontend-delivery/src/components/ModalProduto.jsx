// src/components/ModalProduto.jsx
import React, { useState, useEffect } from 'react';
import { X, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function ModalProduto({ 
  produto, 
  onClose, 
  onAddToCart, 
  temaEscuro, 
  estoque = [] 
}) {
  const [etapasModal, setEtapasModal] = useState([]);
  const [selecoesAdicionais, setSelecoesAdicionais] = useState({}); 
  const [obsProduto, setObsProduto] = useState('');
  const [pesoGramas, setPesoGramas] = useState('');

  // 👉 Novos estados para Busca e Sanfona (Sprint 3)
  const [termoBusca, setTermoBusca] = useState('');
  const [gruposColapsados, setGruposColapsados] = useState({});

  // Lógica do Preço Visual
  const descricaoOriginal = produto?.descricao || '';
  const isPrecoVisual = descricaoOriginal.includes('[VISUAL]');
  const descricaoLimpaParaOCliente = descricaoOriginal.replace('[VISUAL]', '').trim();

  useEffect(() => {
    if (produto) {
      setSelecoesAdicionais({});
      setObsProduto('');
      setPesoGramas('');
      setTermoBusca('');
      setGruposColapsados({});

      // Lógica da V2
      if (produto.etapas && produto.etapas.length > 0) {
        setEtapasModal(produto.etapas);
      } else if (produto.complementos) {
         try { 
            const antigo = JSON.parse(produto.complementos); 
            const convertidoV2 = antigo.map((cat, index) => ({
              id: `legado-${index}`,
              nome: cat.nome || cat.titulo || 'Adicionais',
              max_total: cat.maximo || 10,
              min_total: cat.minimo || 0,
              grupos: [{
                grupo: {
                  nome: '', 
                  itens: cat.opcoes || cat.itens || []
                }
              }]
            }));
            setEtapasModal(convertidoV2);
         } catch (e) { 
            setEtapasModal([]); 
         }
      } else {
         setEtapasModal([]);
      }
    }
  }, [produto]);

  if (!produto) return null;

  // Função para abrir/fechar a sanfona
  const toggleGrupo = (id) => setGruposColapsados(p => ({ ...p, [id]: !p[id] }));

  // NOVA MATEMÁTICA DE LIMITES GLOBAIS DA ETAPA
  const handleSelecaoAdicional = (etapaId, maximoGlobal, opcao, delta, isCheckbox = false) => {
    setSelecoesAdicionais(prev => {
      const selecoesDaEtapa = prev[etapaId] || []; 
      const index = selecoesDaEtapa.findIndex(o => o.nome === opcao.nome); 
      const qtdTotalEtapa = selecoesDaEtapa.reduce((acc, o) => acc + o.quantidade, 0); 
      
      if (isCheckbox) { 
        if (maximoGlobal === 1) return { ...prev, [etapaId]: [{ ...opcao, quantidade: 1 }] }; 
        if (index >= 0) return { ...prev, [etapaId]: selecoesDaEtapa.filter(o => o.nome !== opcao.nome) }; 
        if (qtdTotalEtapa >= maximoGlobal) return prev; 
        return { ...prev, [etapaId]: [...selecoesDaEtapa, { ...opcao, quantidade: 1 }] }; 
      } else { 
        if (index >= 0) { 
          const novaQtd = selecoesDaEtapa[index].quantidade + delta; 
          if (novaQtd <= 0) return { ...prev, [etapaId]: selecoesDaEtapa.filter(o => o.nome !== opcao.nome) }; 
          if (delta > 0 && qtdTotalEtapa >= maximoGlobal) return prev; 
          
          const novos = [...selecoesDaEtapa]; 
          novos[index] = { ...novos[index], quantidade: novaQtd };
          return { ...prev, [etapaId]: novos }; 
        } 
        return prev; 
      } 
    }); 
  };

  const calcularTotalModal = () => {
    let totalBase = Number(produto.preco_venda);
    if (produto.disponibilidade === 'local_peso') { 
        const peso = Number(pesoGramas) || 0; 
        totalBase = (totalBase / 1000) * peso; 
    }
    
    let somaDosAdicionais = 0;
    Object.values(selecoesAdicionais).forEach(lista => { 
        lista.forEach(op => { somaDosAdicionais += Number(op.preco) * op.quantidade; }); 
    }); 

    if (isPrecoVisual) return somaDosAdicionais > 0 ? somaDosAdicionais : totalBase;
    return totalBase + somaDosAdicionais;
  };

  const confirmarAdicaoCarrinho = () => {
    for (const etapa of etapasModal) {
      if (etapa.min_total > 0) {
        const selEtapa = selecoesAdicionais[etapa.id] || [];
        const marcados = selEtapa.reduce((acc, o) => acc + o.quantidade, 0);
        if (marcados < etapa.min_total) {
          alert(`Você precisa escolher pelo menos ${etapa.min_total} opção em "${etapa.nome}".`);
          return;
        }
      }
    }

    const precoFinal = calcularTotalModal(); 
    let nomeFinal = produto.nome;
    if (produto.disponibilidade === 'local_peso') { 
        if (Number(pesoGramas) <= 0) return alert("Digite o peso!"); 
        nomeFinal = `${produto.nome} (${pesoGramas}g)`; 
    }
    
    const compFormatados = Object.entries(selecoesAdicionais)
      .filter(([_, opcoes]) => opcoes.length > 0)
      .map(([etapaId, opcoes]) => {
         const etapaReferencia = etapasModal.find(e => e.id == etapaId);
         const titulo = etapaReferencia ? etapaReferencia.nome : "Adicionais";
         return `${titulo}: ` + opcoes.map(o => `${o.quantidade}x ${o.nome}${Number(o.preco) > 0 ? ` (+R$${(Number(o.preco) * o.quantidade).toFixed(2)})` : ''}`).join(', ');
      }).join(' | ');

    const obsFinal = [compFormatados, obsProduto].filter(x => x).join(' || Obs: ');
    
    const itemFormatado = { 
        cartItemId: `${produto.id}-${Date.now()}`, 
        produto_id: produto.id, 
        nome: nomeFinal, 
        preco_venda: precoFinal, 
        quantidade: 1, 
        obs: obsFinal 
    };
    
    onAddToCart(itemFormatado);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in p-4 sm:p-6 font-theme">
      <div className="w-full max-w-lg bg-bg-surface flex flex-col overflow-hidden shadow-2xl border border-stroke rounded-card max-h-[90vh] sm:max-h-[85vh] animate-in zoom-in-95">
        
        {/* IMAGEM IMERSIVA DE CABEÇALHO */}
        <div className="w-full h-48 sm:h-64 relative shrink-0 bg-bg-input">
          <img 
            src={produto.imagem_url || "https://placehold.co/600x400/2a2a2a/ffffff?text=Sem+Foto&font=Montserrat"} 
            className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
            onError={e => e.target.src="https://placehold.co/600x400/2a2a2a/ffffff?text=Sem+Foto&font=Montserrat"} 
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-surface via-bg-surface/60 to-transparent pointer-events-none"></div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2.5 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-red-500 transition-colors shadow-lg z-50 border border-white/20">
            <X size={18} strokeWidth={3}/>
          </button>
        </div>
        
        {/* CORPO DO MODAL */}
        <div className="p-6 sm:p-8 pt-0 flex-1 overflow-y-auto custom-scrollbar bg-bg-surface relative z-10 -mt-8">
          
          <div className="mb-8">
            <h3 className="text-2xl sm:text-3xl font-black mb-2 text-tx-main tracking-tight leading-tight">{produto.nome}</h3>
            <p className="text-sm font-medium leading-relaxed text-tx-muted">{descricaoLimpaParaOCliente}</p>
          </div>
          
          {produto.disponibilidade === 'local_peso' && (
            <div className="mb-8 p-6 rounded-card text-center border-2 border-primary/50 bg-primary/5 shadow-inner">
              <label className="text-[10px] font-black uppercase tracking-widest block mb-4 text-primary">Peso Aferido na Balança</label>
              <div className="relative w-2/3 mx-auto group">
                <input type="number" value={pesoGramas} onChange={e => setPesoGramas(e.target.value)} placeholder="0" className="w-full p-4 pr-12 rounded-theme font-black text-2xl sm:text-3xl outline-none text-center transition-all bg-bg-surface border-2 border-stroke text-tx-main focus:border-primary shadow-sm" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-tx-muted font-black text-xl pointer-events-none group-focus-within:text-primary transition-colors">g</span>
              </div>
            </div>
          )}

          {/* 👉 CAMPO DE BUSCA FIXO */}
          {etapasModal.length > 0 && (
            <div className="mb-6 sticky top-0 z-20 bg-bg-surface py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar sabor ou adicional..." 
                  value={termoBusca} 
                  onChange={e => setTermoBusca(e.target.value)} 
                  className="w-full p-3.5 pl-10 rounded-theme border border-stroke bg-bg-input text-tx-main outline-none focus:border-primary shadow-sm text-sm font-bold transition-colors" 
                />
              </div>
            </div>
          )}
          
          {/* 👉 RENDERIZAÇÃO DA V2 (ETAPAS E SEUS GRUPOS) COM SANFONA E FILTRO */}
          <div className="space-y-6 sm:space-y-8">
            {etapasModal.map((etapa) => {
              
              const selecoesDestaEtapa = selecoesAdicionais[etapa.id] || [];
              const qtdSelecionadaNaEtapa = selecoesDestaEtapa.reduce((acc, s) => acc + s.quantidade, 0);
              const limiteAtingido = qtdSelecionadaNaEtapa >= etapa.max_total;
              
              // Verifica se a sanfona está fechada
              const isFechado = gruposColapsados[etapa.id];

              // Aplica o filtro de busca inteligente
              const termo = termoBusca.toLowerCase();
              const gruposFiltrados = (etapa.grupos || []).map(rg => ({
                 ...rg, 
                 grupo: { 
                   ...rg.grupo, 
                   itens: (rg.grupo.itens || []).filter(i => i.nome.toLowerCase().includes(termo)) 
                 }
              })).filter(rg => rg.grupo.itens.length > 0);

              // Se a pessoa pesquisou algo e não tem nesse grupo, nem renderiza o bloco
              if (termo && gruposFiltrados.length === 0) return null;

              return (
                <div key={etapa.id} className="rounded-card border border-stroke bg-bg-main shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                  
                  {/* 👉 Cabeçalho da Etapa (Agora é clicável para a Sanfona) */}
                  <div onClick={() => toggleGrupo(etapa.id)} className="flex justify-between items-center p-4 sm:p-5 bg-bg-input border-b border-stroke cursor-pointer select-none hover:bg-bg-input/80 transition-colors">
                    <div>
                      <p className="text-sm sm:text-base font-black uppercase tracking-wide text-tx-main leading-tight">{etapa.nome}</p>
                      {etapa.min_total > 0 && (
                        <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-widest">Obrigatório (Escolha min. {etapa.min_total})</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 rounded-md border shadow-sm transition-colors ${limiteAtingido ? 'bg-primary/20 text-primary border-primary/30' : 'bg-bg-surface text-tx-muted border-stroke'}`}>
                        {qtdSelecionadaNaEtapa} / {etapa.max_total}
                      </span>
                      {isFechado ? <ChevronDown size={18} className="text-tx-muted"/> : <ChevronUp size={18} className="text-tx-muted"/>}
                    </div>
                  </div>
                  
                  {/* Lista de Itens (Aparece só se não estiver fechado) */}
                  {!isFechado && (
                    <div className="divide-y divide-stroke">
                      {(termo ? gruposFiltrados : (etapa.grupos || [])).map((relacaoGrupo, gIndex) => {
                        
                        const nomeDoSubGrupo = relacaoGrupo.grupo.nome;
                        const itensDoGrupo = relacaoGrupo.grupo.itens || [];

                        return (
                          <React.Fragment key={gIndex}>
                            
                            {nomeDoSubGrupo && (
                              <div className="px-4 py-2 bg-bg-surface border-b border-stroke/50 text-[10px] font-black uppercase tracking-widest text-tx-muted opacity-80">
                                ↳ {nomeDoSubGrupo}
                              </div>
                            )}

                            {itensDoGrupo.map((op, oi) => {
                              const temControleEstoqueSabor = estoque.some(e => e.produto_id === produto.id && e.descricao && e.descricao.includes('[V:'));
                              const lotesSabor = estoque.filter(e => e.produto_id === produto.id && e.descricao && e.descricao.includes(`[V: ${op.nome}]`));
                              const qtdDisponivelSabor = lotesSabor.reduce((acc, l) => acc + l.quantidade, 0);
                              
                              const isEsgotado = (temControleEstoqueSabor && qtdDisponivelSabor <= 0) || (op.ativo === false);
                              const selecaoDesteItem = selecoesDestaEtapa.find(s => s.nome === op.nome); 
                              const isMarcado = !!selecaoDesteItem; 
                              const bloquearClick = limiteAtingido && !isMarcado;
                              
                              return (
                                <div key={`${gIndex}-${oi}`} className={`flex items-center justify-between p-4 sm:p-5 text-sm transition-colors duration-300 ${isEsgotado ? 'opacity-50 grayscale bg-bg-surface' : (isMarcado ? 'bg-primary/5' : 'bg-bg-surface hover:bg-bg-input/50')}`}>
                                  
                                  <label className={`flex items-center gap-3 sm:gap-4 flex-1 ${isEsgotado ? 'cursor-not-allowed' : 'cursor-pointer group'}`}>
                                    <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${isMarcado ? 'bg-primary border-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)]' : 'bg-transparent border-stroke group-hover:border-primary/50'}`}>
                                      <input type={etapa.max_total === 1 ? "radio" : "checkbox"} disabled={bloquearClick || isEsgotado} checked={isMarcado} onChange={() => handleSelecaoAdicional(etapa.id, etapa.max_total, op, 0, true)} className="hidden" />
                                      {isMarcado && <Check size={14} strokeWidth={4} className="text-tx-primary" />}
                                    </div>
                                    <span className={`font-bold leading-tight transition-colors ${isMarcado ? 'text-tx-main' : 'text-tx-muted group-hover:text-tx-main'}`}>
                                      {op.nome} {isEsgotado && <span className="text-[9px] text-red-500 font-black ml-2 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded-sm">Esgotado</span>}
                                    </span>
                                  </label>
                                  
                                  <div className="flex items-center gap-3 shrink-0 ml-2">
                                    {isMarcado && etapa.max_total > 1 && (
                                      <div className="flex items-center gap-2 rounded-theme px-1.5 py-1 border border-stroke bg-bg-surface shadow-sm animate-in zoom-in-95">
                                        <button 
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelecaoAdicional(etapa.id, etapa.max_total, op, -1); }} 
                                          className="text-tx-muted hover:text-primary hover:bg-primary/10 rounded-md w-7 h-7 flex items-center justify-center font-black text-xl transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="text-sm font-black w-4 text-center text-tx-main">{selecaoDesteItem.quantidade}</span>
                                        <button 
                                          onClick={(e) => { 
                                            e.preventDefault(); e.stopPropagation(); 
                                            if (temControleEstoqueSabor && (selecaoDesteItem.quantidade >= qtdDisponivelSabor)) { alert(`Apenas ${qtdDisponivelSabor} unidades em estoque!`); } 
                                            else { handleSelecaoAdicional(etapa.id, etapa.max_total, op, 1); }
                                          }} 
                                          className="text-tx-muted hover:text-primary hover:bg-primary/10 rounded-md w-7 h-7 flex items-center justify-center font-black text-xl transition-colors"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                    <span className={`text-sm font-black ${isMarcado ? 'text-primary' : 'text-tx-muted'}`}>
                                      {Number(op.preco) > 0 ? `+R$${Number(op.preco).toFixed(2)}` : 'Grátis'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-8">
            <label className="text-[10px] font-black uppercase tracking-widest mb-3 block text-tx-muted ml-1">Observações do Preparo</label>
            <textarea value={obsProduto} onChange={e => setObsProduto(e.target.value)} placeholder="Ex: Tirar cebola, ponto da carne, sem canudo..." className="w-full p-4 sm:p-5 rounded-theme outline-none h-24 resize-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm text-sm font-medium custom-scrollbar" />
          </div>
        </div>
        
        {/* RODAPÉ E BOTÃO DE COMPRAR */}
        <div className="p-4 sm:p-6 border-t border-stroke bg-bg-surface shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-20">
          <button onClick={confirmarAdicaoCarrinho} className="w-full py-4 sm:py-5 bg-primary text-tx-primary font-black uppercase tracking-widest rounded-theme hover:bg-primary-hover shadow-theme active:scale-95 transition-all flex justify-between items-center px-6 sm:px-8 group">
            <span className="text-xs sm:text-sm transition-transform group-hover:translate-x-1">Adicionar</span>
            <span className="font-black text-xl sm:text-2xl transition-transform group-hover:-translate-x-1">R$ {calcularTotalModal().toFixed(2)}</span>
          </button>
        </div>
        
      </div>
    </div>
  );
}