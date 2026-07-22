// src/pages/Admin/GestaoComplementos.jsx
import React, { useState, useEffect } from 'react';
import { Plus, List, PackagePlus, Info, Trash2, Wand2 } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function GestaoComplementos() {
  const [grupos, setGrupos] = useState([]);
  const [nomeNovoGrupo, setNomeNovoGrupo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [novoItem, setNovoItem] = useState({ nome: '', preco: '' });
  const [grupoIdExpandido, setGrupoIdExpandido] = useState(null);

  const buscarGrupos = async () => {
    try {
      const res = await apiFetch(`/complementos/grupos`);
      if (res.ok) setGrupos(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { buscarGrupos(); }, []);

  const criarGrupo = async (e) => {
    e.preventDefault();
    if (!nomeNovoGrupo.trim()) return;
    setCarregando(true);
    try {
      const res = await apiFetch(`/complementos/grupos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: nomeNovoGrupo })
      });
      if (res.ok) { setNomeNovoGrupo(''); buscarGrupos(); }
    } catch (e) {} finally { setCarregando(false); }
  };

  const adicionarItem = async (e, grupoId) => {
    e.preventDefault();
    if (!novoItem.nome.trim()) return;
    setCarregando(true);
    try {
      const res = await apiFetch(`/complementos/grupos/${grupoId}/itens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoItem.nome, preco: novoItem.preco || 0 })
      });
      if (res.ok) { setNovoItem({ nome: '', preco: '' }); buscarGrupos(); }
    } catch (e) {} finally { setCarregando(false); }
  };

  const excluirGrupo = async (e, id) => {
    e.stopPropagation(); // Evita de abrir/fechar a sanfona
    if (!window.confirm("⚠️ ATENÇÃO: Isso vai excluir o grupo e TODOS os itens dentro dele. Tem certeza?")) return;
    try {
      const res = await apiFetch(`/complementos/grupos/${id}`, { method: 'DELETE' });
      if (res.ok) buscarGrupos();
    } catch (e) { alert("Erro ao excluir"); }
  };

  const excluirItem = async (id) => {
    if (!window.confirm("Excluir este item?")) return;
    try {
      const res = await apiFetch(`/complementos/itens/${id}`, { method: 'DELETE' });
      if (res.ok) buscarGrupos();
    } catch (e) { alert("Erro ao excluir"); }
  };

  const autoImportarLegado = async () => {
    if (!window.confirm("🤖 O Robô vai ler todos os seus produtos antigos e extrair as listas de adicionais para cá. Deseja continuar?")) return;
    setCarregando(true);
    try {
      const res = await apiFetch(`/complementos/migrar-antigos`, { method: 'POST' });
      if (res.ok) {
        const dados = await res.json();
        alert(`🎉 Migração de Legado Concluída!\nForam criadas ${dados.gruposMigrados} novas listas contendo ${dados.itensMigrados} itens.`);
        buscarGrupos();
      }
    } catch (e) {} finally { setCarregando(false); }
  };

  return (
    <div className="animate-in fade-in space-y-6">
      
      {/* Robô Migrador */}
      <div className="p-4 rounded-theme bg-secondary/10 border border-secondary/30 flex justify-between items-center shadow-sm flex-wrap gap-4">
        <div className="flex gap-3 items-start flex-1 min-w-[250px]">
          <Info className="text-secondary shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-black text-sm uppercase tracking-widest text-secondary mb-1">Templates Globais</h4>
            <p className="text-xs font-medium text-tx-main opacity-80 leading-relaxed">
              As listas que você criar aqui poderão ser conectadas a qualquer produto do seu cardápio com 1 clique.
            </p>
          </div>
        </div>
        <button onClick={autoImportarLegado} disabled={carregando} className="py-2.5 px-4 bg-secondary text-white font-black rounded-theme hover:bg-opacity-90 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest text-[10px] shadow-theme whitespace-nowrap">
          <Wand2 size={16}/> Puxar de Produtos Antigos
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRIAR NOVO GRUPO */}
        <div className="lg:col-span-1">
          <div className="p-5 rounded-card border border-stroke bg-bg-surface shadow-theme sticky top-0">
            <h3 className="font-black mb-4 flex items-center gap-2 text-tx-main text-sm uppercase tracking-widest border-b border-stroke pb-3">
              <PackagePlus size={18} className="text-primary"/> Criar Nova Lista
            </h3>
            <form onSubmit={criarGrupo} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted ml-1 mb-1 block">Nome do Grupo</label>
                <input type="text" placeholder='Ex: "Caldas"' value={nomeNovoGrupo} onChange={e => setNomeNovoGrupo(e.target.value)} className="w-full p-3.5 rounded-theme outline-none text-sm font-bold border border-stroke bg-bg-input text-tx-main focus:border-primary transition-all" required />
              </div>
              <button disabled={carregando || !nomeNovoGrupo.trim()} className="w-full py-3.5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs disabled:opacity-50">
                <Plus size={16}/> Salvar Lista
              </button>
            </form>
          </div>
        </div>

        {/* LISTAGEM DOS GRUPOS (VISUAL COMPACTO) */}
        <div className="lg:col-span-2 space-y-4">
          {grupos.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-tx-muted opacity-40 border border-dashed border-stroke rounded-card p-4">
              <List size={32} className="mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">Nenhuma lista criada</span>
            </div>
          ) : (
            grupos.map(grupo => (
              <div key={grupo.id} className="rounded-card border border-stroke bg-bg-surface shadow-sm overflow-hidden transition-all duration-300">
                <div className="p-4 bg-bg-input flex justify-between items-center cursor-pointer hover:bg-bg-input/80 transition-colors border-b border-stroke" onClick={() => setGrupoIdExpandido(grupoIdExpandido === grupo.id ? null : grupo.id)}>
                  <div className="flex items-center gap-3">
                    <List size={18} className="text-secondary"/>
                    <h3 className="font-black text-tx-main uppercase tracking-wide">{grupo.nome}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-bg-surface border border-stroke rounded-md text-tx-muted">{grupo.itens.length} ITENS</span>
                  </div>
                  <button onClick={(e) => excluirGrupo(e, grupo.id)} className="p-1.5 text-tx-muted hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Excluir Grupo Inteiro">
                    <Trash2 size={16}/>
                  </button>
                </div>

                {grupoIdExpandido === grupo.id && (
                  <div className="p-4 bg-bg-main">
                    {/* CHIPS DOS ITENS (QUADRADINHOS COMPACTOS) */}
                    <div className="flex flex-wrap gap-2.5 mb-5">
                      {grupo.itens.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 rounded-theme bg-bg-surface border border-stroke shadow-sm animate-in zoom-in-95">
                          <span className="text-xs font-bold text-tx-main">{item.nome}</span>
                          <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{Number(item.preco) > 0 ? `R$ ${Number(item.preco).toFixed(2)}` : 'Grátis'}</span>
                          <button onClick={() => excluirItem(item.id)} className="text-tx-muted hover:text-red-500 ml-1 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      ))}
                      {grupo.itens.length === 0 && <span className="text-xs text-tx-muted font-medium italic">Vazio. Adicione opções abaixo.</span>}
                    </div>

                    <form onSubmit={(e) => adicionarItem(e, grupo.id)} className="flex flex-wrap sm:flex-nowrap gap-2 p-3 bg-bg-input rounded-theme border border-stroke border-dashed items-end">
                      <div className="flex-1 min-w-[150px]">
                        <input type="text" placeholder="Novo Item (Ex: Nutella)" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} className="w-full p-2.5 rounded-md outline-none text-xs font-bold border border-stroke bg-bg-surface text-tx-main focus:border-secondary" required />
                      </div>
                      <div className="w-24 shrink-0">
                        <input type="number" step="0.01" placeholder="R$ 0.00" value={novoItem.preco} onChange={e => setNovoItem({...novoItem, preco: e.target.value})} className="w-full p-2.5 rounded-md outline-none text-xs font-bold border border-stroke bg-bg-surface text-tx-main focus:border-secondary text-center" />
                      </div>
                      <button disabled={carregando || !novoItem.nome.trim()} className="p-2.5 bg-secondary text-white font-black rounded-md hover:bg-opacity-90 transition-all uppercase tracking-widest text-[10px] shrink-0 disabled:opacity-50 flex items-center gap-1">
                        <Plus size={14} /> ADD
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}