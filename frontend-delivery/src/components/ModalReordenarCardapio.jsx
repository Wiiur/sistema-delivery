// src/components/ModalReordenarCardapio.jsx
import React, { useState, useEffect } from 'react';
import { X, GripVertical, Sparkles, Undo2, Save, MoveVertical, ArrowDownAZ, LayoutGrid, ArrowDown10, ArrowUp10 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { API_URL, apiFetch } from '../services/api';
import { toast } from 'sonner';

// ==========================================
// SUBCOMPONENTE: O Item que pode ser arrastado
// ==========================================
function ItemArraste({ produto }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: produto.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-3 p-3 mb-2 rounded-theme border bg-bg-surface transition-colors ${isDragging ? 'border-primary shadow-lg ring-1 ring-primary/30 scale-[1.02]' : 'border-stroke shadow-sm hover:border-primary/50'}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-tx-muted hover:text-primary transition-colors touch-none">
        <GripVertical size={20} />
      </div>
      
      <div className="w-12 h-12 rounded-md bg-bg-input overflow-hidden shrink-0 border border-stroke">
        {produto.imagem_url ? (
           <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
        ) : (
           <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-tx-muted uppercase">Sem Foto</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-tx-main truncate">{produto.nome}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-0.5">{produto.categoria_temp || 'Sem Categoria'}</p>
      </div>

      <div className="text-right shrink-0">
        <span className="font-black text-sm text-tx-main">R$ {Number(produto.preco_venda).toFixed(2)}</span>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL: O Modal de Organização
// ==========================================
export default function ModalReordenarCardapio({ isOpen, onClose, produtosIniciais, onSaveSuccess }) {
  // Ordena a lista inicial baseada na "ordem_visual" que vem do banco
  const [itens, setItens] = useState(() => {
    return [...produtosIniciais].sort((a, b) => (a.ordem_visual || 0) - (b.ordem_visual || 0));
  });
  
  const [modo, setModo] = useState('manual'); // 'manual' ou 'automatico'
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState([]); // Guarda os passos para poder dar "Undo / Desfazer"

  // Configuração dos sensores do Drag and Drop (Mouse e Touch p/ Mobile)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isOpen) return null;

  // Guarda o estado atual antes de fazer uma mudança (para o botão Restaurar)
  const salvarHistorico = (estadoAtual) => {
    setHistorico(prev => [...prev, estadoAtual]);
  };

  // Função disparada ao soltar o item na tela
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      salvarHistorico([...itens]); // Salva backup antes de mover
      setItens((itemsAtuais) => {
        const velhaPosicao = itemsAtuais.findIndex(i => i.id === active.id);
        const novaPosicao = itemsAtuais.findIndex(i => i.id === over.id);
        return arrayMove(itemsAtuais, velhaPosicao, novaPosicao);
      });
    }
  };

  // ==========================================
  // INTELIGÊNCIA AUTOMÁTICA
  // ==========================================
  const aplicarOrdemAutomatica = (tipo) => {
    salvarHistorico([...itens]);
    let novaOrdem = [...itens];

    switch (tipo) {
      case 'categoria_az':
        novaOrdem.sort((a, b) => {
          if (a.categoria_temp < b.categoria_temp) return -1;
          if (a.categoria_temp > b.categoria_temp) return 1;
          return a.nome.localeCompare(b.nome);
        });
        toast.success("Organizado por Categoria (A-Z)");
        break;
      case 'az':
        novaOrdem.sort((a, b) => a.nome.localeCompare(b.nome));
        toast.success("Organizado de A a Z");
        break;
      case 'menor_preco':
        novaOrdem.sort((a, b) => Number(a.preco_venda) - Number(b.preco_venda));
        toast.success("Mais baratos no topo");
        break;
      case 'maior_preco':
        novaOrdem.sort((a, b) => Number(b.preco_venda) - Number(a.preco_venda));
        toast.success("Mais caros no topo");
        break;
      default: break;
    }
    setItens(novaOrdem);
    setModo('manual'); // Volta para a tela manual para o gerente ver como ficou
  };

  // ==========================================
  // SALVAR NO BANCO DE DADOS
  // ==========================================
  const salvarNovaOrdem = async () => {
    setSalvando(true);
    
    // Calcula os índices espaçados (Multiplica por 10000 para criar o "Espaço" no banco)
    const pacoteParaSalvar = itens.map((prod, index) => ({
      id: prod.id,
      ordem_visual: (index + 1) * 10000
    }));

    try {
      const res = await apiFetch(`/produtos/reordenar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: 1, itensOrdenados: pacoteParaSalvar })
      });

      if (res.ok) {
        toast.success("Cardápio reorganizado com sucesso!");
        onSaveSuccess(); // Função passada pelo painel para atualizar a tela principal
        onClose();
      } else {
        toast.error("Erro ao reorganizar cardápio no servidor.");
      }
    } catch (e) {
      toast.error("Falha de conexão com o banco de dados.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 font-theme animate-in fade-in">
      <div className="bg-bg-main w-full max-w-2xl rounded-card shadow-2xl border border-stroke flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
        
        {/* CABEÇALHO */}
        <div className="p-5 border-b border-stroke bg-bg-surface flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-tx-main flex items-center gap-2">
              <MoveVertical size={20} className="text-primary"/> Organizar Catálogo
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-tx-muted mt-1">Defina a ordem que o cliente verá no app.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-theme text-tx-muted hover:text-red-500 hover:bg-red-500/10 transition-colors bg-bg-input">
            <X size={20} />
          </button>
        </div>

        {/* ABAS */}
        <div className="flex bg-bg-input p-1 border-b border-stroke shrink-0">
          <button onClick={() => setModo('manual')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${modo === 'manual' ? 'bg-bg-surface text-tx-main shadow-sm' : 'text-tx-muted hover:text-tx-main'}`}>
            <GripVertical size={16}/> Modo Manual
          </button>
          <button onClick={() => setModo('automatico')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${modo === 'automatico' ? 'bg-bg-surface text-tx-main shadow-sm' : 'text-tx-muted hover:text-tx-main'}`}>
            <Sparkles size={16} className="text-primary"/> Modo Automático
          </button>
        </div>

        {/* ÁREA CENTRAL */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-bg-main relative">
          
          {modo === 'manual' ? (
            <div className="max-w-xl mx-auto pb-4">
               {itens.length === 0 ? (
                 <p className="text-center text-tx-muted font-bold py-10 uppercase tracking-widest text-xs">Nenhum produto cadastrado para organizar.</p>
               ) : (
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                   <SortableContext items={itens} strategy={verticalListSortingStrategy}>
                     {itens.map(produto => (
                       <ItemArraste key={produto.id} produto={produto} />
                     ))}
                   </SortableContext>
                 </DndContext>
               )}
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-4 animate-in slide-in-from-right-4">
              <div className="p-5 border border-primary/20 bg-primary/5 rounded-theme mb-6">
                <p className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Sparkles size={16}/> Inteligência Artificial
                </p>
                <p className="text-sm font-medium text-tx-main">Escolha uma regra abaixo. O sistema organizará todos os itens e te mostrará uma prévia antes de salvar.</p>
              </div>

              <button onClick={() => aplicarOrdemAutomatica('categoria_az')} className="w-full p-4 rounded-theme border border-stroke bg-bg-surface hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-card bg-bg-input flex items-center justify-center text-tx-muted group-hover:text-primary transition-colors"><LayoutGrid size={24}/></div>
                <div>
                  <p className="font-black text-tx-main">Agrupar por Categoria (Recomendado)</p>
                  <p className="text-xs font-bold text-tx-muted mt-1">Ex: Bebidas juntas, Lanches juntos (Ordem A-Z)</p>
                </div>
              </button>

              <button onClick={() => aplicarOrdemAutomatica('az')} className="w-full p-4 rounded-theme border border-stroke bg-bg-surface hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-card bg-bg-input flex items-center justify-center text-tx-muted group-hover:text-primary transition-colors"><ArrowDownAZ size={24}/></div>
                <div>
                  <p className="font-black text-tx-main">Alfabética Geral (A-Z)</p>
                  <p className="text-xs font-bold text-tx-muted mt-1">Mistura categorias, focando apenas no nome</p>
                </div>
              </button>

              <button onClick={() => aplicarOrdemAutomatica('menor_preco')} className="w-full p-4 rounded-theme border border-stroke bg-bg-surface hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-card bg-bg-input flex items-center justify-center text-tx-muted group-hover:text-primary transition-colors"><ArrowDown10 size={24}/></div>
                <div>
                  <p className="font-black text-tx-main">Do mais Barato ao mais Caro</p>
                  <p className="text-xs font-bold text-tx-muted mt-1">Destaque para produtos promocionais e iscas</p>
                </div>
              </button>

              <button onClick={() => aplicarOrdemAutomatica('maior_preco')} className="w-full p-4 rounded-theme border border-stroke bg-bg-surface hover:border-primary hover:shadow-md transition-all text-left flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-card bg-bg-input flex items-center justify-center text-tx-muted group-hover:text-primary transition-colors"><ArrowUp10 size={24}/></div>
                <div>
                  <p className="font-black text-tx-main">Do mais Caro ao mais Barato</p>
                  <p className="text-xs font-bold text-tx-muted mt-1">Foco em Ticket Médio alto e combos principais</p>
                </div>
              </button>
            </div>
          )}

        </div>

        {/* RODAPÉ E AÇÕES */}
        <div className="p-5 border-t border-stroke bg-bg-surface shrink-0 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => {
              if (historico.length > 0) {
                const passoAnterior = historico[historico.length - 1];
                setItens(passoAnterior);
                setHistorico(historico.slice(0, -1)); // Remove o último histórico
                toast.info("Desfeito. Voltamos um passo atrás.");
              } else {
                toast.error("Não há mais alterações para desfazer.");
              }
            }} 
            disabled={historico.length === 0}
            className="px-6 py-3.5 rounded-theme font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border border-stroke bg-bg-input text-tx-muted hover:text-tx-main transition-colors disabled:opacity-50"
          >
            <Undo2 size={16}/> Restaurar Anterior
          </button>
          
          <button 
            onClick={salvarNovaOrdem}
            disabled={salvando || historico.length === 0}
            className="flex-1 px-6 py-3.5 bg-primary text-tx-primary rounded-theme font-black uppercase tracking-widest text-xs shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
          >
            {salvando ? 'Salvando no Banco...' : <><Save size={16}/> Salvar Nova Ordem do Cardápio</>}
          </button>
        </div>

      </div>
    </div>
  );
}