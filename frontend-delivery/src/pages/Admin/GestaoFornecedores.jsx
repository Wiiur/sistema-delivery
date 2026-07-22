// src/pages/Admin/GestaoFornecedores.jsx
import React, { useState } from 'react';
import { Plus, Package, Trash2, X, Check, Phone, TrendingDown } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function GestaoFornecedores({
  temaEscuro, 
  fornecedores,
  buscarGeral,
  usuarioLogado
}) {
  const [novoFornecedor, setNovoFornecedor] = useState({ ingrediente: '', nome_empresa: '', telefone: '', preco: '' });
  const [fornecedorExpandidoId, setFornecedorExpandidoId] = useState(null); 
  
  // Estados para o Modal de Pedidos
  const [modalPedidoAtivo, setModalPedidoAtivo] = useState(false);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);
  const [historicoSelecionado, setHistoricoSelecionado] = useState([]);
  const [qtdPedido, setQtdPedido] = useState('');
  const [descPedido, setDescPedido] = useState('');

  const formatarDataCompleta = (d) => !d ? '--:--' : new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const fornecedoresAgrupados = fornecedores.reduce((grupos, item) => { if (!grupos[item.ingrediente]) grupos[item.ingrediente] = []; grupos[item.ingrediente].push(item); return grupos; }, {});
  const encontrarMaisBarato = (lista) => lista.length === 0 ? null : lista.reduce((menor, atual) => (Number(atual.preco) < Number(menor.preco) ? atual : menor));

  const cadastrarFornecedor = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/fornecedores`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ingrediente: novoFornecedor.ingrediente, nome_empresa: novoFornecedor.nome_empresa, telefone: novoFornecedor.telefone || "", preco: Number(novoFornecedor.preco.toString().replace(',', '.')) }) });
      setNovoFornecedor({ ingrediente: '', nome_empresa: '', telefone: '', preco: '' }); buscarGeral();
    } catch (e) {}
  };

  const excluirFornecedor = async (id) => { 
    if(window.confirm("Certeza que deseja excluir este parceiro?")) {
      try { await apiFetch(`/fornecedores/${id}`, { method: 'DELETE' }); buscarGeral(); } catch (e) {} 
    }
  };

  const abrirModalPedido = (fornecedor, historicoAtual) => {
    setFornecedorSelecionado(fornecedor);
    setHistoricoSelecionado(historicoAtual);
    setQtdPedido('');
    setDescPedido('');
    setModalPedidoAtivo(true);
  };

  const confirmarPedidoModal = async () => {
    if (!qtdPedido || isNaN(qtdPedido) || Number(qtdPedido) <= 0) return alert("Digite uma quantidade válida!");
    
    const totalCusto = Number(qtdPedido) * Number(fornecedorSelecionado.preco);
    const novoPedidoLog = { 
       id: Date.now(), 
       data: formatarDataCompleta(new Date()), 
       descricao: `${qtdPedido}x ${descPedido ? descPedido : fornecedorSelecionado.ingrediente}`, 
       total: totalCusto, 
       operador: usuarioLogado ? usuarioLogado.nome : 'Gerente' 
    };
    
    try { 
       await apiFetch(`/fornecedores/${fornecedorSelecionado.id}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ datas_pedidos: JSON.stringify([...historicoSelecionado, novoPedidoLog]) }) 
       }); 
       buscarGeral(); 
       setModalPedidoAtivo(false); 
    } catch (e) {
       alert("Erro ao gravar pedido.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24 font-theme w-full max-w-[1400px] mx-auto animate-in fade-in">
      
      {/* FORMULÁRIO DE CADASTRO */}
      <form onSubmit={cadastrarFornecedor} className="p-5 sm:p-6 md:p-8 rounded-card border border-stroke flex flex-col lg:flex-row gap-5 lg:gap-6 items-end mb-8 shadow-theme bg-bg-surface animate-in slide-in-from-top-4">
        
        <div className="flex-1 w-full relative group">
          <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Matéria Prima</span>
          <input required value={novoFornecedor.ingrediente} onChange={e=>setNovoFornecedor({...novoFornecedor, ingrediente:e.target.value})} placeholder="Ex: Hambúrguer 180g" className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
        </div>
        
        <div className="flex-1 w-full relative group">
          <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Empresa Parceira</span>
          <input required value={novoFornecedor.nome_empresa} onChange={e=>setNovoFornecedor({...novoFornecedor, nome_empresa:e.target.value})} placeholder="Ex: Frigorífico Boi Gordo" className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
        </div>
        
        <div className="w-full lg:w-48 relative group">
          <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">WhatsApp</span>
          <input value={novoFornecedor.telefone} onChange={e=>setNovoFornecedor({...novoFornecedor, telefone:e.target.value})} placeholder="(11) 9999-9999" className="w-full p-4 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
        </div>
        
        <div className="w-full lg:w-40 relative group">
          <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Custo Un (R$)</span>
          <input required type="number" step="0.01" value={novoFornecedor.preco} onChange={e=>setNovoFornecedor({...novoFornecedor, preco:e.target.value})} placeholder="0.00" className="w-full p-4 rounded-theme outline-none text-base font-black transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
        </div>
        
        <button type="submit" className="w-full lg:w-auto p-4 bg-primary text-tx-primary rounded-theme font-black shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex justify-center uppercase tracking-widest text-sm sm:text-base">
          <span className="lg:hidden">Cadastrar Parceiro</span>
          <Plus size={20} className="hidden lg:block mx-auto"/>
        </button>
      </form>

      {/* LISTA DE FORNECEDORES AGRUPADOS */}
      {Object.keys(fornecedoresAgrupados).length === 0 ? (
         <div className="flex flex-col items-center justify-center p-10 opacity-50 border border-dashed border-stroke rounded-card bg-bg-surface">
            <Package size={40} className="mb-3 text-tx-muted" />
            <p className="text-xs font-black uppercase tracking-widest text-tx-muted">Nenhum fornecedor cadastrado.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
           {Object.entries(fornecedoresAgrupados).map(([n, l], index) => {
             const maisB = encontrarMaisBarato(l);
             return (
               <div key={n} className="p-5 sm:p-6 md:p-8 rounded-card border border-stroke shadow-theme relative group bg-bg-surface content-start animate-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                 
                 <h3 className="font-black text-primary mb-6 uppercase text-lg tracking-tight border-b border-stroke pb-3 flex items-center gap-2">
                   <Package size={20}/> {n}
                 </h3>
                 
                 <div className="space-y-4">
                   {l.map(f => {
                     const hist = f.datas_pedidos && f.datas_pedidos !== '[]' ? JSON.parse(f.datas_pedidos) : []; 
                     const isMaisBarato = f.id === maisB.id && l.length > 1; // Só destaca se tiver mais de um para comparar
                     const isExpanded = fornecedorExpandidoId === f.id;
                     
                     return (
                       <div key={f.id} className={`flex flex-col rounded-theme border transition-all duration-300 shadow-sm overflow-hidden ${isMaisBarato ? 'bg-[var(--accent)]/5 border-[var(--accent)]/50 shadow-[var(--accent)]/10 ring-1 ring-[var(--accent)]/20' : 'bg-bg-input border-stroke hover:border-primary/40 hover:shadow-md'}`}>
                         
                         <div className="p-4 sm:p-5 flex justify-between items-start gap-4">
                           <div className="min-w-0">
                             <span className={`font-black text-base sm:text-lg flex items-center gap-2 tracking-tight truncate ${isMaisBarato ? 'text-[var(--accent)]' : 'text-tx-main'}`}>
                               {f.nome_empresa} 
                               {isMaisBarato && <span className="flex items-center gap-1 text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-[var(--accent)] text-white shadow-sm"><TrendingDown size={10}/> Melhor Custo</span>}
                             </span>
                             
                             {f.telefone && (
                               <a href={`https://wa.me/${f.telefone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] mt-2 font-bold text-tx-muted hover:text-[#25D366] transition-colors uppercase tracking-widest bg-bg-surface border border-stroke px-2.5 py-1.5 rounded-md shadow-sm">
                                  <Phone size={10}/> {f.telefone}
                               </a>
                             )}
                           </div>
                           
                           <div className="flex flex-col items-end gap-2 shrink-0">
                             <strong className={`text-xl sm:text-2xl font-black tracking-tighter ${isMaisBarato ? 'text-[var(--accent)]' : 'text-tx-main'}`}>
                               R$ {Number(f.preco).toFixed(2)}
                             </strong>
                             <button onClick={()=>excluirFornecedor(f.id)} className="p-2 rounded-theme transition-colors shadow-sm border border-stroke bg-bg-surface text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500">
                               <Trash2 size={14}/>
                             </button>
                           </div>
                         </div>
                         
                         {/* RODAPÉ DO CARD (Botões de Ação) */}
                         <div className={`flex justify-between items-center p-3 sm:p-4 border-t ${isMaisBarato ? 'border-[var(--accent)]/20 bg-[var(--accent)]/10' : 'border-stroke bg-bg-surface/50'}`}>
                           <button onClick={() => setFornecedorExpandidoId(isExpanded ? null : f.id)} className="text-[10px] sm:text-xs font-bold transition-colors text-tx-muted hover:text-primary uppercase tracking-widest px-2 py-1">
                             {isExpanded ? 'Ocultar Histórico' : `Histórico (${hist.length})`}
                           </button>
                           <button onClick={() => abrirModalPedido(f, hist)} className="text-[10px] sm:text-xs bg-primary hover:bg-primary-hover text-tx-primary px-4 py-2.5 rounded-theme font-black uppercase tracking-wider shadow-sm active:scale-95 flex items-center gap-1.5 transition-all">
                             <Plus size={14} strokeWidth={3}/> <span>Fazer Pedido</span>
                           </button>
                         </div>

                         {/* HISTÓRICO EXPANDIDO */}
                         {isExpanded && (
                           <div className="p-4 border-t border-stroke bg-bg-main max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 shadow-inner">
                             {hist.length === 0 ? (
                               <p className="text-[10px] font-bold uppercase tracking-widest text-center text-tx-muted py-6 border border-dashed border-stroke rounded-theme">Nenhuma requisição registrada.</p>
                             ) : hist.map((req, i) => {
                               if (typeof req === 'string') return <div key={i} className="mb-2 p-3 rounded-theme text-[10px] font-bold bg-bg-surface border border-stroke text-tx-muted">{req}</div>;
                               return (
                                 <div key={req.id} className="flex justify-between items-center p-3 sm:p-4 rounded-theme mb-2 border border-stroke bg-bg-surface shadow-sm transition-colors hover:border-primary/30 group">
                                   <div>
                                     <p className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase mb-1.5 text-tx-muted flex items-center gap-1.5">
                                       <span className="text-primary font-black scale-75">●</span> {req.data} <span className="opacity-50">|</span> <span className="text-tx-main opacity-80">{req.operador}</span>
                                     </p>
                                     <p className="text-xs sm:text-sm font-bold text-tx-main leading-snug">{req.descricao}</p>
                                   </div>
                                   <span className="font-black text-primary shrink-0 ml-3 bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                                     R$ {Number(req.total).toFixed(2)}
                                   </span>
                                 </div>
                               )
                             }).reverse()}
                           </div>
                         )}

                       </div>
                     )
                   })}
                 </div>
               </div>
             )
           })}
         </div>
      )}

      {/* 👉 MODAL PREMIUM DE REGISTRO DE PEDIDO (Comanda de Compra) */}
      {modalPedidoAtivo && fornecedorSelecionado && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[400] animate-in fade-in font-theme">
           <div className="w-full max-w-sm p-6 sm:p-8 rounded-card shadow-2xl border border-stroke bg-bg-surface relative overflow-hidden animate-in zoom-in-95">
             
             <button onClick={() => setModalPedidoAtivo(false)} className="absolute top-4 right-4 text-tx-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-theme transition-colors">
               <X size={20}/>
             </button>

             <div className="mb-8">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-theme flex items-center justify-center mb-4 border border-primary/20">
                   <Package size={24} />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-tx-main mb-1">Registrar Compra</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-tx-muted">{fornecedorSelecionado.nome_empresa}</p>
             </div>

             <div className="space-y-6">
               <div className="relative group">
                 <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Unidades / Caixas</span>
                 <input 
                    type="number" 
                    value={qtdPedido} 
                    onChange={e => setQtdPedido(e.target.value)} 
                    placeholder="Ex: 5" 
                    className="w-full p-4 text-2xl font-black text-center rounded-theme outline-none transition-all duration-300 border-2 border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" 
                 />
               </div>
               
               <div className="relative group">
                 <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Detalhes Adicionais (Opcional)</span>
                 <textarea 
                    value={descPedido} 
                    onChange={e => setDescPedido(e.target.value)} 
                    placeholder={`Ex: Caixas de ${fornecedorSelecionado.ingrediente}...`} 
                    className="w-full p-4 h-24 resize-none text-sm font-bold rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm custom-scrollbar" 
                 />
               </div>

               {/* Calculadora em Tempo Real dentro do Modal */}
               <div className="flex justify-between items-end pt-5 border-t border-stroke mt-2">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-1">Custo Estimado</span>
                     <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md inline-block w-fit shadow-sm">
                       R$ {Number(fornecedorSelecionado.preco).toFixed(2)} CADA
                     </span>
                  </div>
                  <span className="text-4xl font-black text-primary tracking-tighter">
                     R$ {(Number(qtdPedido || 0) * Number(fornecedorSelecionado.preco)).toFixed(2)}
                  </span>
               </div>

               <button 
                 onClick={confirmarPedidoModal} 
                 className="w-full mt-4 py-4 sm:py-5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
               >
                 Confirmar Compra <Check size={18}/>
               </button>
             </div>

           </div>
         </div>
      )}
    </div>
  );
}