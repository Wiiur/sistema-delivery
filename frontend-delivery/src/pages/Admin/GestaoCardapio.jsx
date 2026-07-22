// src/pages/Admin/GestaoCardapio.jsx
import React, { useState, useEffect } from 'react';
import { Edit, Plus, Sparkles, Trash2, X, Bot, Tag, DollarSign, DownloadCloud, Eye, EyeOff, ArrowUp, ArrowDown, Save, ListOrdered, MoveVertical } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';
import { toast } from 'sonner';

import GestaoComplementos from './GestaoComplementos';
// 👉 IMPORTAÇÃO DO NOVO MODAL DE REORDENAÇÃO (DRAG AND DROP)
import ModalReordenarCardapio from '../../components/ModalReordenarCardapio';

// ==========================================
// PAINEL: ORDEM DE CATEGORIAS
// ==========================================
function PainelOrdemCategorias({ produtosGerente, configTaxa, buscarGeral }) {
  const [ordem, setOrdem] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const categoriasUnicas = [...new Set(produtosGerente.flatMap(p => (p.categoria_temp || 'Geral').split(',').map(s => s.trim())))].filter(Boolean);
    const ordemSalva = configTaxa?.ordem_categorias ? configTaxa.ordem_categorias.split(',').map(s => s.trim()) : [];
    const novasCategorias = categoriasUnicas.filter(c => !ordemSalva.includes(c));
    setOrdem([...ordemSalva.filter(c => categoriasUnicas.includes(c)), ...novasCategorias]);
  }, [produtosGerente, configTaxa]);

  const mover = (index, direcao) => {
    const novaOrdem = [...ordem];
    if (direcao === 'up' && index > 0) {
      [novaOrdem[index - 1], novaOrdem[index]] = [novaOrdem[index], novaOrdem[index - 1]];
    } else if (direcao === 'down' && index < novaOrdem.length - 1) {
      [novaOrdem[index + 1], novaOrdem[index]] = [novaOrdem[index], novaOrdem[index + 1]];
    }
    setOrdem(novaOrdem);
  };

  const salvarNovaOrdem = async () => {
    setSalvando(true);
    try {
      const resGet = await apiFetch(`/config`);
      const configOriginal = await resGet.json();

      const novaConfig = {
        ...configOriginal,
        ordem_categorias: ordem.join(',')
      };

      const resPut = await apiFetch(`/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaConfig)
      });

      if (!resPut.ok) throw new Error("O Servidor rejeitou a atualização.");

      toast.success("Ordem do Cardápio atualizada para os clientes!");
      buscarGeral();
    } catch (e) {
      toast.error("Erro ao salvar ordem no servidor.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-left-4 p-5 sm:p-8 rounded-card border border-stroke shadow-theme bg-bg-surface max-w-3xl mx-auto">
      <div className="text-center mb-8 border-b border-stroke pb-6">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20"><ListOrdered size={32}/></div>
        <h3 className="text-xl font-black uppercase tracking-tight text-tx-main">Ordem de Exibição no Cardápio</h3>
        <p className="text-sm font-bold text-tx-muted mt-2">Use as setas para definir qual categoria aparece primeiro para o cliente.</p>
      </div>

      <div className="space-y-3 mb-8 bg-bg-main p-4 rounded-theme border border-stroke shadow-inner custom-scrollbar overflow-y-auto max-h-[50vh]">
        {ordem.length === 0 ? (
           <p className="text-center text-tx-muted font-bold py-6 uppercase tracking-widest text-xs">Cadastre produtos para ver as categorias.</p>
        ) : (
          ordem.map((cat, i) => (
            <div key={cat} className="flex justify-between items-center p-4 bg-bg-input border border-stroke rounded-theme shadow-sm group hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-bg-surface flex items-center justify-center font-black text-xs text-tx-muted border border-stroke">{i + 1}º</span>
                <span className="font-black text-tx-main text-sm sm:text-base">{cat}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => mover(i, 'up')} disabled={i === 0} className="p-2.5 rounded-md bg-bg-surface text-tx-muted border border-stroke hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:border-stroke disabled:hover:text-tx-muted transition-colors shadow-sm">
                  <ArrowUp size={18}/>
                </button>
                <button onClick={() => mover(i, 'down')} disabled={i === ordem.length - 1} className="p-2.5 rounded-md bg-bg-surface text-tx-muted border border-stroke hover:text-primary hover:border-primary disabled:opacity-30 disabled:hover:border-stroke disabled:hover:text-tx-muted transition-colors shadow-sm">
                  <ArrowDown size={18}/>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={salvarNovaOrdem} disabled={salvando || ordem.length === 0} className="w-full py-5 bg-primary text-tx-primary font-black uppercase tracking-widest rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
        <Save size={20}/> {salvando ? 'Salvando...' : 'Salvar Nova Ordem'}
      </button>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL: GESTÃO CARDÁPIO
// ==========================================
export default function GestaoCardapio({ temaEscuro, produtosGerente, buscarGeral, configTaxa }) {
  const [novoProduto, setNovoProduto] = useState({ nome: '', descricao: '', imagem_url: '', preco_custo: '', preco_venda: '', disponibilidade: 'ambos', categoria_temp: 'Geral', em_destaque: false });
  const [listaCategorias, setListaCategorias] = useState([]);
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [carregandoPrecoIA, setCarregandoPrecoIA] = useState(false);
  const [dicaPrecoIA, setDicaPrecoIA] = useState('');
  const [abaInterna, setAbaInterna] = useState('produtos'); // 'produtos', 'grupos', ou 'ordem'

  const [gruposGlobais, setGruposGlobais] = useState([]);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  
  // 👉 NOVO ESTADO: Controle do Modal de Reordenação de Produtos
  const [modalReordenarAberto, setModalReordenarAberto] = useState(false);

  const consultarPrecoIA = async () => {
    if(!novoProduto.nome || !novoProduto.preco_custo) return alert("Preencha o Nome e o Custo do produto primeiro.");
    setCarregandoPrecoIA(true);
    try {
      const res = await apiFetch(`/produtos/ia-preco`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoProduto.nome, custo: novoProduto.preco_custo, descricao: novoProduto.descricao }) });
      const dados = await res.json(); const partes = dados.sugestao.split('| MOTIVO:');
      if(partes.length === 2) { setNovoProduto({...novoProduto, preco_venda: partes[0].replace('PRECO:', '').trim()}); setDicaPrecoIA(partes[1].trim()); } else { setDicaPrecoIA(dados.sugestao); }
    } catch (e) { alert("Falha na comunicação com a IA."); } finally { setCarregandoPrecoIA(false); }
  };

  const editarProduto = (produto) => {
    setProdutoEditandoId(produto.id); 
    setNovoProduto({ nome: produto.nome, descricao: produto.descricao || '', imagem_url: produto.imagem_url || '', preco_custo: produto.preco_custo || '', preco_venda: produto.preco_venda || '', disponibilidade: produto.disponibilidade || 'ambos', categoria_temp: produto.categoria_temp || 'Geral', em_destaque: produto.em_destaque || false });
    try { setListaCategorias(produto.complementos && produto.complementos !== '[]' ? JSON.parse(produto.complementos) : []); } catch (e) { setListaCategorias([]); }
    const mainElement = document.querySelector('main');
    if(mainElement) mainElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const salvarProduto = async (e) => {
    e.preventDefault(); 
    const payload = { ...novoProduto, preco_custo: Number(novoProduto.preco_custo), preco_venda: Number(novoProduto.preco_venda), complementos: JSON.stringify(listaCategorias) };
    try {
      if (produtoEditandoId) await apiFetch(`/produtos/${produtoEditandoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      else await apiFetch(`/produtos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      setProdutoEditandoId(null); 
      setNovoProduto({ nome: '', descricao: '', imagem_url: '', preco_custo: '', preco_venda: '', disponibilidade: 'ambos', categoria_temp: 'Geral', em_destaque: false }); 
      setListaCategorias([]); 
      setDicaPrecoIA(''); 
      buscarGeral(); 
      toast.success("Produto salvo com sucesso!");
    } catch (e) { toast.error("Erro ao salvar o produto."); }
  };

  const excluirProduto = async (id) => { 
    if(!window.confirm("Apagar permanentemente?")) return; 
    try { await apiFetch(`/produtos/${id}`, { method: 'DELETE' }); buscarGeral(); toast.success("Produto apagado."); } catch (e) {} 
  };

  const alternarEstoqueRapido = async (produto) => {
    const novoStatus = produto.disponibilidade === 'inativo' ? 'ambos' : 'inativo';
    const payload = { ...produto, disponibilidade: novoStatus, preco_custo: Number(produto.preco_custo), preco_venda: Number(produto.preco_venda) };
    toast.success(`Status de ${produto.nome} alterado!`);
    try {
      await apiFetch(`/produtos/${produto.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      buscarGeral(); 
    } catch (e) { toast.error("Erro ao alterar o estoque."); }
  };

  const abrirModalImportacao = async () => {
    try {
      const res = await apiFetch(`/complementos/grupos`);
      if(res.ok) setGruposGlobais(await res.json());
      setModalImportarAberto(true);
    } catch(e) { toast.error("Erro ao carregar listas globais."); }
  };

  const importarGrupoGlobal = (grupo) => {
    const novaCat = { nome: grupo.nome, maximo: 1, fechado: false, opcoes: grupo.itens.map(i => ({ nome: i.nome, preco: Number(i.preco).toFixed(2) })) };
    setListaCategorias([...listaCategorias, novaCat]);
    setModalImportarAberto(false);
    toast.success(`Lista "${grupo.nome}" importada!`);
  };

  return (
    <div className="space-y-8 flex-1 overflow-y-auto pr-2 animate-in fade-in custom-scrollbar pb-24 font-theme w-full max-w-[1400px] mx-auto relative">
      
      {/* TABS DE NAVEGAÇÃO SUPERIOR */}
      <div className="flex flex-wrap gap-4 sm:gap-6 mb-2 border-b border-stroke pb-px relative z-10 sticky top-0 bg-bg-main pt-2">
        <button onClick={() => setAbaInterna('produtos')} className={`pb-3 text-xs sm:text-sm uppercase tracking-widest font-black transition-all border-b-2 ${abaInterna === 'produtos' ? 'border-primary text-primary' : 'border-transparent text-tx-muted hover:text-tx-main'}`}>
          📦 Lista de Produtos
        </button>
        <button onClick={() => setAbaInterna('grupos')} className={`pb-3 text-xs sm:text-sm uppercase tracking-widest font-black transition-all border-b-2 ${abaInterna === 'grupos' ? 'border-secondary text-secondary' : 'border-transparent text-tx-muted hover:text-tx-main'}`}>
          🧩 Grupos de Adicionais
        </button>
        <button onClick={() => setAbaInterna('ordem')} className={`pb-3 text-xs sm:text-sm uppercase tracking-widest font-black transition-all border-b-2 ${abaInterna === 'ordem' ? 'border-green-500 text-green-500' : 'border-transparent text-tx-muted hover:text-tx-main'}`}>
          📋 Ordem das Categorias
        </button>
      </div>

      {abaInterna === 'ordem' ? (
        <PainelOrdemCategorias produtosGerente={produtosGerente} configTaxa={configTaxa} buscarGeral={buscarGeral} />
      ) : abaInterna === 'grupos' ? (
        <GestaoComplementos />
      ) : (
        <div className="animate-in slide-in-from-left-4 space-y-8">
          
          {/* PAINEL SUPERIOR: FORMULÁRIO DE PRODUTO */}
          <div className="p-5 sm:p-8 rounded-card border border-stroke shadow-theme bg-bg-surface">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-stroke pb-5 gap-4">
              <h3 className="text-lg sm:text-xl font-black flex items-center gap-2 text-primary uppercase tracking-tight">
                {produtoEditandoId ? <><Edit size={24}/> Modificando Receita</> : <><Plus size={24}/> Engenharia de Produto</>}
              </h3>
              {produtoEditandoId && (
                <button type="button" onClick={() => { setProdutoEditandoId(null); setNovoProduto({ nome: '', descricao: '', imagem_url: '', preco_custo: '', preco_venda: '', disponibilidade: 'ambos', categoria_temp: 'Geral', em_destaque: false }); setListaCategorias([]); }} className="w-full sm:w-auto px-5 py-3 rounded-theme text-xs font-bold transition-all shadow-sm border border-stroke bg-bg-input text-tx-muted hover:text-tx-main hover:border-tx-muted uppercase tracking-widest active:scale-95">
                  Cancelar Edição
                </button>
              )}
            </div>
            
            <form onSubmit={salvarProduto} className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-6">
                
                <div className="flex gap-4">
                  <div className="relative flex-1 group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nome Comercial do Item</span>
                    <input required value={novoProduto.nome} onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})} placeholder="Ex: X-Bacon Artesanal" className="w-full p-4 sm:p-5 text-base sm:text-lg font-black rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
                  </div>
                  <label className={`flex flex-col items-center justify-center p-3 rounded-theme border cursor-pointer transition-all duration-300 shrink-0 w-24 shadow-sm ${novoProduto.em_destaque ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-[var(--accent)]/30 scale-[1.02]' : 'bg-bg-input border-stroke text-tx-muted hover:border-[var(--accent)]/50 hover:text-[var(--accent)]'}`}>
                    <input type="checkbox" checked={novoProduto.em_destaque} onChange={e => setNovoProduto({...novoProduto, em_destaque: e.target.checked})} className="hidden" />
                    <Sparkles size={20} className="mb-1.5"/>
                    <span className="text-[9px] font-black uppercase tracking-wider">Top Venda</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
                  <div className="relative group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Categoria(s) (Separe por vírgula)</span>
                    <input required value={novoProduto.categoria_temp} onChange={e => setNovoProduto({...novoProduto, categoria_temp: e.target.value})} placeholder="Ex: Açaí, Promoções" className="w-full p-4 rounded-theme outline-none font-bold text-sm transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
                  </div>
                  <div className="relative group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Onde vai vender?</span>
                    <select value={novoProduto.disponibilidade} onChange={e => setNovoProduto({...novoProduto, disponibilidade: e.target.value})} className="w-full p-4 rounded-theme outline-none font-bold text-sm transition-all duration-300 border border-stroke cursor-pointer bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm uppercase tracking-wide">
                      <option value="ambos">Loja Web + Balcão</option>
                      <option value="delivery">Só Delivery (Web)</option>
                      <option value="local">Exclusivo: PDV Caixa</option>
                      <option value="local_peso">Sorvete / Açaí por Quilo</option>
                      <option value="inativo">Pausar Vendas (Inativo)</option>
                    </select>
                  </div>
                </div>
                
                <div className="relative group">
                  <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Composição / Ingredientes</span>
                  <textarea required value={novoProduto.descricao} onChange={e => setNovoProduto({...novoProduto, descricao: e.target.value})} placeholder="Descreva os detalhes deliciosos deste item..." className="w-full p-4 text-sm font-bold rounded-theme outline-none h-28 resize-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm custom-scrollbar" />
                </div>
                
                <div className="p-5 sm:p-6 rounded-card border-2 border-dashed mt-8 border-secondary/30 bg-secondary/5 relative">
                  <h4 className="font-black text-secondary mb-6 text-sm flex items-center gap-2 uppercase tracking-wide"><Plus size={18}/> Montagem Dinâmica (Sabores e Adicionais)</h4>
                  
                  {listaCategorias.map((cat, catIdx) => {
                    const isFechado = cat.fechado || false; 
                    return (
                    <div key={catIdx} className="mb-6 p-4 sm:p-5 rounded-theme border border-stroke shadow-sm bg-bg-surface relative group/card">
                      <div className="flex flex-col sm:flex-row gap-4 mb-5 items-start sm:items-center">
                        <div className="relative flex-1 w-full group/input">
                          <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within/input:text-secondary">Título do Grupo</span>
                          <input placeholder="Ex: Escolha o Sabor Principal" value={cat.nome} onChange={e => { const nc = [...listaCategorias]; nc[catIdx].nome = e.target.value; setListaCategorias(nc); }} className="w-full p-4 rounded-theme text-sm font-bold outline-none border border-stroke bg-bg-input text-tx-main focus:border-secondary" />
                        </div>
                        <div className="flex w-full sm:w-auto gap-3">
                          <div className="relative flex-1 sm:flex-none w-full sm:w-28 group/input">
                            <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within/input:text-secondary">Máx. Itens</span>
                            <input type="number" min="1" value={cat.maximo} onChange={e => { const nc = [...listaCategorias]; nc[catIdx].maximo = Number(e.target.value); setListaCategorias(nc); }} className="w-full p-4 rounded-theme text-base outline-none text-center font-black border border-stroke bg-bg-input text-tx-main focus:border-secondary" />
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => { const nc = [...listaCategorias]; nc[catIdx].fechado = !isFechado; setListaCategorias(nc); }} className="w-14 h-14 rounded-theme flex items-center justify-center transition-colors border border-stroke bg-bg-input text-tx-muted hover:bg-bg-surface hover:text-tx-main">
                               {isFechado ? <span className="font-black text-xs uppercase">ABRIR</span> : <span className="font-black text-xs uppercase">OCULTAR</span>}
                            </button>
                            <button type="button" onClick={() => { const nc = [...listaCategorias]; nc.splice(catIdx, 1); setListaCategorias(nc); }} className="w-14 h-14 rounded-theme flex items-center justify-center transition-colors border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white" title="Excluir Grupo Inteiro">
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {!isFechado && (
                        <>
                          <div className="space-y-3 mb-5 pl-2 sm:pl-4 border-l-2 border-stroke/50">
                            {cat.opcoes.map((op, opIdx) => (
                              <div key={opIdx} className="flex gap-2 sm:gap-3 items-center group/linha animate-in fade-in">
                                <div className="relative flex-[2] w-full min-w-0">
                                  <input placeholder="Nome (Ex: Morango)" value={op.nome} onChange={e => { const nc = [...listaCategorias]; nc[catIdx].opcoes[opIdx].nome = e.target.value; setListaCategorias(nc); }} className="w-full p-3 rounded-theme text-sm font-bold outline-none border border-stroke bg-bg-main text-tx-main focus:border-secondary" />
                                </div>
                                <div className="relative flex-1 w-full min-w-0">
                                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-tx-muted"><DollarSign size={14}/></div>
                                  <input type="number" step="0.01" placeholder="0.00" value={op.preco} onChange={e => { const nc = [...listaCategorias]; nc[catIdx].opcoes[opIdx].preco = e.target.value; setListaCategorias(nc); }} className="w-full p-3 pl-8 rounded-theme text-sm font-black outline-none border border-stroke bg-bg-main text-tx-main focus:border-secondary" />
                                </div>
                                <button type="button" onClick={() => { const nc = [...listaCategorias]; nc[catIdx].opcoes.splice(opIdx, 1); setListaCategorias(nc); }} className="p-3 transition-colors bg-bg-main rounded-theme border border-stroke text-tx-muted opacity-50 hover:opacity-100 hover:text-white hover:bg-red-500 hover:border-red-500"><X size={16}/></button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => { const nc = [...listaCategorias]; nc[catIdx].opcoes.push({nome: '', preco: ''}); setListaCategorias(nc); }} className="px-5 py-3 w-full sm:w-auto rounded-theme text-xs font-black transition-all shadow-sm bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary hover:text-white uppercase tracking-wider flex items-center justify-center gap-1.5 mx-auto">
                            <Plus size={14}/> Inserir Opção
                          </button>
                        </>
                      )}
                    </div>
                  )})}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => setListaCategorias([...listaCategorias, {nome: '', maximo: 1, fechado: false, opcoes: [{nome: '', preco: ''}]}])} className="flex-1 py-4 sm:py-5 border-2 border-dashed font-black rounded-theme transition-all shadow-sm text-xs border-secondary/40 text-secondary hover:bg-secondary/10 bg-bg-surface uppercase tracking-widest flex items-center justify-center gap-2">
                      <Tag size={16}/> Adicionar Manual
                    </button>
                    <button type="button" onClick={abrirModalImportacao} className="flex-1 py-4 sm:py-5 font-black rounded-theme transition-all shadow-theme text-xs bg-secondary text-white hover:bg-secondary/90 uppercase tracking-widest flex items-center justify-center gap-2">
                      <DownloadCloud size={18}/> Importar Lista Global
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-2 sm:mt-0">
                  <div className="relative group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-red-500 transition-colors">Custo Fábrica</span>
                    <input required type="number" step="0.01" value={novoProduto.preco_custo} onChange={e => setNovoProduto({...novoProduto, preco_custo: e.target.value})} className="w-full p-4 sm:p-5 text-xl sm:text-2xl rounded-theme outline-none font-black text-center transition-all duration-300 border border-stroke bg-bg-input text-red-500 focus:border-red-500 focus:bg-bg-surface shadow-sm" placeholder="0.00" />
                  </div>
                  <div className="relative group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-green-500 transition-colors">Venda Público</span>
                    <input required type="number" step="0.01" value={novoProduto.preco_venda} onChange={e => setNovoProduto({...novoProduto, preco_venda: e.target.value})} className="w-full p-4 sm:p-5 text-xl sm:text-2xl rounded-theme outline-none font-black text-center transition-all duration-300 border border-stroke bg-bg-input text-green-500 focus:border-green-500 focus:bg-bg-surface shadow-sm" placeholder="0.00" />
                  </div>
                </div>
                
                <button type="button" onClick={consultarPrecoIA} disabled={carregandoPrecoIA} className="w-full py-4 text-xs font-black uppercase tracking-widest rounded-theme flex items-center justify-center gap-2 transition-all shadow-sm border bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:grayscale">
                  <Bot size={18}/> {carregandoPrecoIA ? 'Calculando Sugestão...' : 'Pedir Análise de Lucro (IA)'}
                </button>
                
                {dicaPrecoIA && (
                  <div className="p-5 rounded-theme text-sm font-bold leading-relaxed shadow-sm border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-tx-muted animate-in slide-in-from-top-4 flex gap-3 items-start">
                    <div className="text-xl">🧠</div>
                    <div><span className="text-tx-main font-black">Análise da IA:</span> {dicaPrecoIA}</div>
                  </div>
                )}
                
                <div className="relative group mt-6">
                  <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">URL da Fotografia</span>
                  <input value={novoProduto.imagem_url} onChange={e => setNovoProduto({...novoProduto, imagem_url: e.target.value})} placeholder="Link da imagem (https://...) Ideal: 500px" className="w-full p-4 text-sm rounded-theme outline-none font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
                </div>
                
                <button type="submit" className="w-full py-5 sm:py-6 text-sm sm:text-base font-black rounded-theme active:scale-95 transition-all duration-300 shadow-theme hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center gap-2 bg-primary text-tx-primary hover:bg-primary-hover uppercase tracking-widest mt-8">
                  {produtoEditandoId ? 'Gravar Alterações Definitivas' : 'Adicionar Item ao Cardápio'}
                </button>
              </div>
            </form>
          </div>
          
          {/* ========================================== */}
          {/* BOTÃO E LISTA DE PRODUTOS */}
          {/* ========================================== */}
          
          {/* 👉 NOVO BOTÃO DE REORDENAÇÃO */}
          <div className="flex justify-end mt-8 border-t border-stroke pt-6">
            <button 
              onClick={() => setModalReordenarAberto(true)} 
              className="flex items-center gap-2 px-5 py-3 bg-secondary/10 text-secondary border border-secondary/20 rounded-theme font-black uppercase tracking-widest text-[11px] hover:bg-secondary hover:text-white transition-all shadow-sm active:scale-95"
            >
              <MoveVertical size={16}/> Organizar Visão dos Produtos (Drag & Drop)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 mt-6">
            {/* 👉 GARANTINDO QUE A LISTA NA TELA DO GERENTE TAMBÉM RESPEITE A NOVA ORDEM */}
            {produtosGerente.sort((a, b) => (a.ordem_visual || 0) - (b.ordem_visual || 0)).map((p, index) => (
              <div key={p.id} className="rounded-card border border-stroke overflow-hidden flex flex-col group transition-all duration-300 shadow-theme bg-bg-surface hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="h-40 sm:h-44 bg-bg-input relative overflow-hidden border-b border-stroke">
                  <button onClick={() => alternarEstoqueRapido(p)} className={`absolute top-2 left-2 z-20 p-2 rounded-full backdrop-blur-md shadow-md transition-all border ${p.disponibilidade === 'inativo' ? 'bg-red-500/90 text-white border-red-500/50 hover:bg-red-600' : 'bg-bg-surface/90 text-tx-main border-stroke hover:text-primary hover:border-primary'}`} title={p.disponibilidade === 'inativo' ? "Produto Pausado. Clique para Ativar." : "Produto Ativo. Clique para Pausar."}>
                    {p.disponibilidade === 'inativo' ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <img src={p.imagem_url || "https://thumbs.dreamstime.com/b/vector-cartoon-set-theme-food-isolated-colored-doodles-fruits-vegetables-bakery-products-meat-sausage-grocery-vector-187259405.jpg"} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" onError={e => e.target.src="https://thumbs.dreamstime.com/b/vector-cartoon-set-theme-food-isolated-colored-doodles-fruits-vegetables-bakery-products-meat-sausage-grocery-vector-187259405.jpg"} loading="lazy"/>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className={`absolute top-2 right-2 text-[9px] px-2.5 py-1 rounded-theme font-black shadow-md uppercase tracking-wider backdrop-blur-md border ${p.disponibilidade === 'inativo' ? 'bg-red-500/90 text-white border-red-500/50' : 'bg-bg-surface/90 text-tx-main border-white/20'}`}>
                    {p.disponibilidade === 'ambos' ? 'Web+PDV' : p.disponibilidade}
                  </span>
                  {p.em_destaque && (
                    <span className="absolute bottom-2 left-2 text-[9px] px-2 py-0.5 rounded-sm font-black shadow-md uppercase tracking-wider bg-[var(--accent)] text-white flex items-center gap-1 z-10">
                      <Sparkles size={10}/> Top
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div>
                    <h4 className="text-sm font-black mb-1 leading-tight truncate text-tx-main group-hover:text-primary transition-colors">{p.nome}</h4>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-tx-muted truncate bg-bg-input w-fit px-2 py-0.5 rounded-md border border-stroke">{p.categoria_temp || 'Geral'}</p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-stroke mt-1">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-tx-muted">Custo</span>
                      <span className="text-red-500 font-black text-xs">R${Number(p.preco_custo).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-black uppercase tracking-widest text-tx-muted">Venda</span>
                      <span className="text-primary font-black text-base">R${Number(p.preco_venda).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2 pt-4">
                    <button onClick={() => editarProduto(p)} className="flex-1 p-2 sm:p-2.5 font-bold uppercase tracking-wider rounded-theme text-[10px] sm:text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-stroke bg-bg-input text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500">
                      <Edit size={14}/> Editar
                    </button>
                    <button onClick={() => excluirProduto(p.id)} className="p-2 sm:p-2.5 rounded-theme transition-colors shadow-sm border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalImportarAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in font-theme">
          <div className="w-full max-w-md bg-bg-surface rounded-card p-6 shadow-2xl border border-stroke relative animate-in zoom-in-95">
            <button type="button" onClick={() => setModalImportarAberto(false)} className="absolute top-4 right-4 p-1.5 bg-bg-input rounded-md text-tx-muted hover:text-red-500 transition-colors border border-transparent hover:border-red-500/20"><X size={20}/></button>
            <h3 className="text-lg font-black mb-1 flex items-center gap-2 text-tx-main">
              <DownloadCloud className="text-secondary"/> Importar Template
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-tx-muted mb-5">Escolha uma lista global para inserir neste produto</p>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {gruposGlobais.length === 0 ? (
                <div className="text-center py-8 rounded-theme border border-dashed border-stroke bg-bg-input">
                  <p className="text-xs font-bold text-tx-muted uppercase tracking-widest">Nenhuma lista encontrada.</p>
                  <p className="text-[10px] text-tx-muted/60 mt-1">Crie templates na aba "Grupos de Adicionais".</p>
                </div>
              ) : (
                gruposGlobais.map(g => (
                  <button type="button" key={g.id} onClick={() => importarGrupoGlobal(g)} className="w-full text-left p-4 rounded-theme border border-stroke bg-bg-input hover:border-secondary hover:shadow-md transition-all group active:scale-[0.98]">
                    <p className="font-black text-sm text-tx-main group-hover:text-secondary flex justify-between items-center">
                      {g.nome} <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </p>
                    <p className="text-[10px] font-bold text-tx-muted uppercase tracking-widest mt-1">{g.itens.length} opções cadastradas</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 👉 CHAMADA DO NOVO MODAL (INVISÍVEL ATÉ CLICAR NO BOTÃO) */}
      {modalReordenarAberto && (
        <ModalReordenarCardapio 
          isOpen={modalReordenarAberto} 
          onClose={() => setModalReordenarAberto(false)} 
          produtosIniciais={produtosGerente} 
          onSaveSuccess={buscarGeral} 
        />
      )}

    </div>
  );
}