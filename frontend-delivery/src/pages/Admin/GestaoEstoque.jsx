// src/pages/Admin/GestaoEstoque.jsx
import React, { useState, Fragment } from 'react';
import { Box, Edit, Plus, Check, Sparkles, Tag, AlertTriangle, Trash2 } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function GestaoEstoque({
  temaEscuro, 
  produtosGerente,
  estoque,
  buscarGeral
}) {
  const [novoEstoque, setNovoEstoque] = useState({ produto_id: '', quantidade: '', tipo_unidade: 'Unidade', descricao: '' });
  const [novoEstoqueVariante, setNovoEstoqueVariante] = useState(''); 
  const [estoqueEditandoId, setEstoqueEditandoId] = useState(null);

  const salvarEstoque = async (e) => {
    e.preventDefault(); 
    let descFinal = novoEstoque.descricao; 
    if (novoEstoqueVariante) descFinal = `[V: ${novoEstoqueVariante}] ${descFinal}`.trim();
    const carga = { produto_id: Number(novoEstoque.produto_id), quantidade: Number(novoEstoque.quantidade), tipo_unidade: novoEstoque.tipo_unidade, descricao: descFinal };
    try {
      if (estoqueEditandoId) await apiFetch(`/estoque/${estoqueEditandoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(carga) });
      else await apiFetch(`/estoque`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(carga) });
      setEstoqueEditandoId(null); setNovoEstoque({ produto_id: '', quantidade: '', tipo_unidade: 'Unidade', descricao: '' }); setNovoEstoqueVariante(''); buscarGeral(); alert("📦 Estoque atualizado no Banco!");
    } catch(e) { alert("❌ Falha de comunicação."); }
  };

  const prepararEdicaoEstoque = (item) => {
    setEstoqueEditandoId(item.id); let baseDesc = item.descricao || ''; let currVariante = '';
    const match = baseDesc.match(/\[V:\s*(.+?)\]/); if (match) { currVariante = match[1]; baseDesc = baseDesc.replace(/\[V:\s*.+?\]/, '').trim(); }
    setNovoEstoqueVariante(currVariante); setNovoEstoque({ produto_id: item.produto_id.toString(), quantidade: item.quantidade, tipo_unidade: item.tipo_unidade, descricao: baseDesc });
  };

  const excluirItemEstoque = async (id) => { if(window.confirm("Remover lote do estoque?")) { try { await apiFetch(`/estoque/${id}`, { method: 'DELETE' }); buscarGeral(); } catch(e) {} } };

  const estoqueVisual = produtosGerente.map(produto => {
    const lotesDoProduto = estoque.filter(e => e.produto_id === produto.id);
    const totalGeral = lotesDoProduto.reduce((acc, lote) => acc + lote.quantidade, 0);
    const porSabor = {}; let semSabor = 0;
    lotesDoProduto.forEach(lote => {
      const match = lote.descricao ? lote.descricao.match(/\[V:\s*(.+?)\]/) : null;
      if(match) porSabor[match[1]] = (porSabor[match[1]] || 0) + lote.quantidade;
      else semSabor += lote.quantidade;
    });
    return { produto_id: produto.id, nome: produto.nome, totalGeral, lotes: lotesDoProduto, porSabor, semSabor };
  }).filter(item => item.totalGeral > 0 || item.lotes.length > 0); 

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in pb-24 font-theme w-full max-w-[1400px] mx-auto">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-6">
        
        {/* =========================================
            FORMULÁRIO DE ESTOQUE (ESQUERDA)
            ========================================= */}
        <div className="lg:col-span-1 p-6 sm:p-8 rounded-card border border-stroke shadow-theme h-fit bg-bg-surface lg:sticky lg:top-0 animate-in slide-in-from-left-4">
            <h3 className="text-xl font-black text-primary mb-6 flex items-center gap-2 uppercase tracking-tight border-b border-stroke pb-4">
              {estoqueEditandoId ? <><Edit size={24}/> Editando Lote</> : <><Box size={24}/> Lançamento de Estoque</>}
            </h3>
            
            <form onSubmit={salvarEstoque} className="space-y-6">
              <div className="relative group">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Produto Principal</span>
                <select required value={novoEstoque.produto_id} onChange={e=>setNovoEstoque({...novoEstoque, produto_id: e.target.value})} className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm cursor-pointer">
                  <option value="">Selecione o Produto...</option>
                  {produtosGerente.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              
              {(() => { 
                const prodSel = produtosGerente.find(p => p.id === Number(novoEstoque.produto_id)); 
                let vars = []; 
                if(prodSel && prodSel.complementos) { 
                  try { JSON.parse(prodSel.complementos).forEach(c => c.opcoes.forEach(o => vars.push(o.nome))); } catch(e){} 
                } 
                if(vars.length > 0) { 
                  return (
                    <div className="relative group animate-in slide-in-from-top-2">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-secondary transition-colors">Vincular Variante (Sabor)</span>
                      <select value={novoEstoqueVariante} onChange={e=>setNovoEstoqueVariante(e.target.value)} className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-secondary/30 cursor-pointer bg-secondary/5 text-tx-main focus:border-secondary focus:bg-bg-surface shadow-sm ring-1 ring-transparent focus:ring-secondary/20">
                        <option value="">Lote Geral (Sem Variante)</option>
                        {vars.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  ) 
                } 
                return null; 
              })()}
              
              <div className="relative group">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Informações Extras</span>
                <input value={novoEstoque.descricao} onChange={e=>setNovoEstoque({...novoEstoque, descricao: e.target.value})} placeholder="Ex: Validade, Lote do Fornecedor..." className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="relative group">
                   <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Quantidade</span>
                   <input required type="number" value={novoEstoque.quantidade} onChange={e=>setNovoEstoque({...novoEstoque, quantidade: e.target.value})} placeholder="Ex: 50" className="w-full p-4 rounded-theme outline-none text-xl text-center font-black transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
                </div>
                <div className="relative group">
                   <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Formato</span>
                   <select value={novoEstoque.tipo_unidade} onChange={e=>setNovoEstoque({...novoEstoque, tipo_unidade: e.target.value})} className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm cursor-pointer">
                     <option value="Unidade">Und</option>
                     <option value="Caixa">Caixa</option>
                     <option value="Litro">Litro</option>
                     <option value="KG">Quilo</option>
                   </select>
                </div>
              </div>
              
              <button type="submit" className="w-full py-4 sm:py-5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 uppercase tracking-widest text-sm transition-all flex justify-center items-center gap-2 mt-6">
                {estoqueEditandoId ? <><Check size={18}/> Atualizar Lote</> : <><Plus size={18}/> Salvar Entrada</>}
              </button>
              
              {estoqueEditandoId && (
                <button type="button" onClick={() => {setEstoqueEditandoId(null); setNovoEstoque({ produto_id: '', quantidade: '', tipo_unidade: 'Unidade', descricao: '' }); setNovoEstoqueVariante('');}} className="w-full py-3.5 text-xs sm:text-sm font-bold rounded-theme transition-colors border border-stroke bg-bg-surface text-tx-muted hover:text-tx-main uppercase tracking-wider hover:border-tx-muted hover:bg-bg-input">
                  Cancelar Edição
                </button>
              )}
            </form>
        </div>

        {/* =========================================
            TABELA DE INVENTÁRIO DETALHADO (DIREITA)
            ========================================= */}
        <div className="lg:col-span-2 rounded-card border border-stroke shadow-theme p-0 overflow-hidden bg-bg-surface h-fit animate-in slide-in-from-right-4">
            <div className="p-6 sm:p-8 border-b border-stroke">
               <h3 className="text-lg sm:text-xl font-black text-primary flex items-center gap-2 uppercase tracking-tight">
                 <Sparkles size={24}/> Posição de Inventário Detalhado
               </h3>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar p-6 sm:p-8 pt-0 mt-4">
              <table className="w-full text-left border-separate border-spacing-y-3">
                  <thead className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-tx-muted">
                    <tr>
                      <th className="p-3 border-b border-stroke border-opacity-50">Produto Principal</th>
                      <th className="p-3 border-b border-stroke border-opacity-50 text-center">Unidade</th>
                      <th className="p-3 border-b border-stroke border-opacity-50 text-center">Disponível</th>
                      <th className="p-3 border-b border-stroke border-opacity-50 text-right">Ações</th>
                    </tr>
                  </thead>
                  
                  <tbody className="text-sm">
                    {estoqueVisual.length === 0 ? (
                      <tr><td colSpan="4" className="text-center p-12 font-bold text-tx-muted uppercase tracking-widest text-xs bg-bg-input rounded-theme border border-dashed border-stroke">Estoque não inicializado ou vazio.</td></tr>
                    ) : estoqueVisual.map(itemVisual => (
                      <Fragment key={itemVisual.produto_id}>
                        {/* Linha Mestre do Produto */}
                        <tr className="border border-stroke shadow-sm bg-bg-input group transition-colors hover:border-primary/30">
                          <td className="p-4 sm:p-5 font-bold rounded-l-theme min-w-[200px] border-y border-l border-stroke group-hover:border-primary/30">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-tx-muted bg-bg-surface px-2.5 py-1.5 rounded-theme shadow-sm border border-stroke">#{itemVisual.produto_id}</span>
                              <span className="text-base sm:text-lg tracking-tight text-tx-main font-black truncate">{itemVisual.nome}</span>
                            </div>
                          </td>
                          <td className="p-4 sm:p-5 text-center font-bold text-xs text-tx-muted border-y border-stroke group-hover:border-primary/30">--</td>
                          <td className="p-4 sm:p-5 text-center border-y border-stroke group-hover:border-primary/30">
                            <span className={`px-4 py-1.5 rounded-theme font-black text-base sm:text-lg shadow-sm border ${itemVisual.totalGeral < 10 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                              {itemVisual.totalGeral}
                            </span>
                          </td>
                          <td className="p-4 sm:p-5 text-right rounded-r-theme border-y border-r border-stroke group-hover:border-primary/30"></td>
                        </tr>
                        
                        {/* Linha de Resumo de Sabores */}
                        {Object.keys(itemVisual.porSabor || {}).length > 0 && (
                          <tr className="bg-bg-surface">
                            <td colSpan="4" className="p-4 sm:p-5 pl-4 sm:pl-12 rounded-theme border-x border-b border-stroke">
                              <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-tx-muted mr-2">Estoque Variante:</span>
                                {Object.entries(itemVisual.porSabor).map(([sabor, qtd]) => (
                                  <span key={sabor} className="px-3 py-1.5 rounded-theme font-black text-xs shadow-sm border border-secondary/30 bg-secondary/10 text-secondary flex items-center gap-1.5 hover:bg-secondary/20 transition-colors">
                                    <Tag size={12}/> {sabor}: {qtd}
                                  </span>
                                ))}
                                {itemVisual.semSabor > 0 && (
                                  <span className="px-3 py-1.5 rounded-theme font-bold text-xs shadow-sm border border-stroke bg-bg-input text-tx-muted">
                                    Geral: {itemVisual.semSabor}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Linhas de Lotes Individuais */}
                        {itemVisual.lotes.map((lote) => {
                            const isBaixo = lote.quantidade < 10; 
                            const variMatch = lote.descricao ? lote.descricao.match(/\[V:\s*(.+?)\]/) : null; 
                            const descClean = lote.descricao ? lote.descricao.replace(/\[V:\s*.+?\]/, '').trim() : '';
                            return (
                              <tr key={lote.id} className="transition-colors shadow-sm border border-stroke bg-bg-surface hover:bg-bg-input/80">
                                <td className="p-4 sm:p-5 pl-4 sm:pl-12 font-bold rounded-l-theme border-l border-b border-stroke border-t-0">
                                  {variMatch ? (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-theme text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-secondary/10 text-secondary border border-secondary/20">
                                      <Tag size={12}/> {variMatch[1]}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-tx-muted bg-bg-input px-2.5 py-1 rounded-theme border border-stroke">Lote Geral</span>
                                  )}
                                  {descClean && <div className="text-xs font-bold mt-2 ml-1 text-tx-muted line-clamp-2 leading-relaxed">{descClean}</div>}
                                </td>
                                <td className="p-4 sm:p-5 text-center font-bold text-xs text-tx-muted border-b border-stroke">{lote.tipo_unidade}</td>
                                <td className="p-4 sm:p-5 text-center border-b border-stroke">
                                  <span className={`px-3 py-1.5 rounded-theme font-black text-sm border ${isBaixo ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-bg-input border-stroke text-tx-main'}`}>
                                    {lote.quantidade}
                                  </span>
                                </td>
                                <td className="p-4 sm:p-5 text-right rounded-r-theme border-r border-b border-stroke whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-2">
                                    {isBaixo && (
                                      <span className="text-[10px] bg-red-500 text-white px-2.5 py-1.5 rounded-theme font-black tracking-wider uppercase shadow-sm flex items-center gap-1 animate-pulse">
                                        <AlertTriangle size={12}/> Baixo
                                      </span>
                                    )}
                                    <button onClick={() => prepararEdicaoEstoque(lote)} className="p-2 sm:p-2.5 rounded-theme transition-colors shadow-sm border border-stroke bg-bg-surface text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500">
                                      <Edit size={14}/>
                                    </button>
                                    <button onClick={() => excluirItemEstoque(lote.id)} className="p-2 sm:p-2.5 rounded-theme transition-colors shadow-sm border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500">
                                      <Trash2 size={14}/>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                        })}
                      </Fragment>
                    ))}
                  </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  );
}