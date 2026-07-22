// src/pages/Admin/PainelCaixa.jsx
import React, { useState, useMemo, useRef } from 'react';
import { ShoppingCart, Users, MapPin, X, Check, Calendar, Banknote, Coins, PlusSquare } from 'lucide-react';
import ModalProduto from '../../components/ModalProduto';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

// 👉 COMPONENTE: Calculadora de Troco (Fica escondido até ser chamado)
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

export default function Caixa({
  temaEscuro, 
  produtosGerente,
  carrinhoCaixa,
  setCarrinhoCaixa,
  finalizarPedidoCaixa,
  removerDoCarrinho,
  mesaInput,
  setMesaInput,
  clienteCaixaInput,
  setClienteCaixaInput,
  metodoPagamentoCaixa,
  setMetodoPagamentoCaixa,
  precisaTrocoCaixa,
  setPrecisaTrocoCaixa,
  estoque
}) {
  
  const [modalProduto, setModalProduto] = useState(null);
  const [modalTrocoAberto, setModalTrocoAberto] = useState(false);
  
  // 👉 NOVO ESTADO: Armazena o ID da comanda para adicionar itens
  const [comandaExistenteInput, setComandaExistenteInput] = useState(''); 

  // Refs para focar os inputs magicamente
  const inputClienteRef = useRef(null);
  const selectPagamentoRef = useRef(null);

  // Atalhos de Teclado (F2 = Cliente, F4 = Pagamento)
  useHotkeys('f2', (e) => { e.preventDefault(); inputClienteRef.current?.focus(); });
  useHotkeys('f4', (e) => { e.preventDefault(); selectPagamentoRef.current?.focus(); });

  const abrirModalProduto = (produto) => {
    if (!produto) { setModalProduto(null); return; }
    
    // Tratativa contra venda grátis de produto variável
    const semComp = (!produto.complementos || produto.complementos === '[]' || produto.complementos === 'null');
    const precoMaiorQueZero = Number(produto.preco_venda) > 0;

    if (semComp && produto.disponibilidade !== 'local_peso' && precoMaiorQueZero) { 
        const itemF = { cartItemId: `${produto.id}-${Date.now()}`, produto_id: produto.id, nome: produto.nome, preco_venda: Number(produto.preco_venda), quantidade: 1, obs: '' }; 
        setCarrinhoCaixa(p => [...p, itemF]);
        return; 
    }
    setModalProduto(produto);
  };

  const totalCarrinho = carrinhoCaixa.reduce((acc, i) => acc + (i.preco_venda * i.quantidade), 0);
  const valorTrocoCalculado = Number(precisaTrocoCaixa) - totalCarrinho;

  const handleBotaoFinalizar = () => {
    if (metodoPagamentoCaixa === 'dinheiro' && valorTrocoCalculado > 0) {
      setModalTrocoAberto(true);
    } else {
      finalizarPedidoCaixa(true);
    }
  };

  const confirmarTrocoEFinalizar = () => {
    setModalTrocoAberto(false);
    finalizarPedidoCaixa(true);
  };

  // Função Interceptadora para o "Undo Inteligente"
  const handleRemoverComUndo = (cartItemId) => {
    const itemRemovido = carrinhoCaixa.find(i => i.cartItemId === cartItemId);
    if (!itemRemovido) return;

    removerDoCarrinho(cartItemId); // Deleta via App.jsx
    
    toast.error(`${itemRemovido.quantidade}x ${itemRemovido.nome} removido(s).`, {
      action: {
        label: 'Desfazer',
        onClick: () => setCarrinhoCaixa(p => [...p, itemRemovido]) // Ressuscita o item
      },
      duration: 5000,
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 animate-in fade-in font-theme pb-20 lg:pb-0">
      
      {/* GRADE DE PRODUTOS (LADO ESQUERDO) */}
      <div className="lg:w-2/3 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 custom-scrollbar content-start">
        {produtosGerente.filter(p => p.disponibilidade !== 'delivery' && p.disponibilidade !== 'inativo').map((produto, index) => (
          <button 
            key={produto.id} 
            onClick={() => abrirModalProduto(produto)} 
            className="relative w-full h-36 sm:h-44 xl:h-48 rounded-card overflow-hidden border border-stroke text-left flex flex-col justify-end transition-all duration-300 active:scale-95 group shadow-theme hover:border-primary hover:shadow-lg bg-bg-surface animate-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <img 
              src={produto.imagem_url || "https://thumbs.dreamstime.com/b/vector-cartoon-set-theme-food-isolated-colored-doodles-fruits-vegetables-bakery-products-meat-sausage-grocery-vector-187259405.jpg"} 
              alt={produto.nome}
              className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
              onError={e => e.target.src="https://thumbs.dreamstime.com/b/vector-cartoon-set-theme-food-isolated-colored-doodles-fruits-vegetables-bakery-products-meat-sausage-grocery-vector-187259405.jpg"} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-80"></div>
            
            <div className="relative z-10 p-3 sm:p-4 w-full">
              <p className="font-black text-white text-xs sm:text-sm leading-tight mb-2 truncate drop-shadow-md uppercase tracking-tight group-hover:text-primary transition-colors">
                {produto.nome}
              </p>
              <span className="font-black text-[10px] sm:text-xs px-2.5 py-1.5 rounded-theme border border-white/20 shadow-md backdrop-blur-md inline-block bg-bg-surface/90 text-primary">
                {Number(produto.preco_venda) > 0 
                  ? `R$ ${Number(produto.preco_venda).toFixed(2)}${produto.disponibilidade === 'local_peso' ? '/kg' : ''}`
                  : (produto.disponibilidade === 'local_peso' ? 'A Pesar' : 'Variável')
                }
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* CARRINHO DO CAIXA / COMANDA (LADO DIREITO) */}
      <div className="lg:w-1/3 p-5 sm:p-6 rounded-card border border-stroke flex flex-col h-fit lg:h-full shadow-theme bg-bg-surface sticky top-0 animate-in slide-in-from-right-8">
        <h3 className="font-black mb-6 flex items-center gap-2 text-primary text-sm uppercase tracking-widest border-b border-stroke pb-4">
          <ShoppingCart size={20}/> Comanda Ativa
        </h3>
        
        {/* IDENTIFICAÇÃO */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <span className="absolute top-4 left-3 text-tx-muted group-focus-within:text-primary transition-colors"><Users size={16}/></span>
              <input 
                ref={inputClienteRef} 
                placeholder="Cliente (F2)" 
                value={clienteCaixaInput} 
                onChange={e => setClienteCaixaInput(e.target.value)} 
                className="w-full p-4 pl-10 rounded-theme outline-none text-sm font-bold transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" 
              />
            </div>
            <div className="relative w-24 sm:w-28 group">
              <span className="absolute top-4 left-3 text-tx-muted group-focus-within:text-primary transition-colors"><MapPin size={16}/></span>
              <input 
                placeholder="Mesa" 
                value={mesaInput} 
                onChange={e => setMesaInput(e.target.value)} 
                className="w-full p-4 pl-9 rounded-theme outline-none text-sm font-bold transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm text-center" 
              />
            </div>
          </div>
        </div>

        {/* LISTA DE ITENS DINÂMICA */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 custom-scrollbar pr-2 min-h-[150px]">
          {carrinhoCaixa.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-tx-muted opacity-40 gap-2 border border-dashed border-stroke rounded-card p-4">
              <ShoppingCart size={32} />
              <span className="text-xs font-bold uppercase tracking-widest text-center">Nenhum item na comanda</span>
            </div>
          ) : (
            carrinhoCaixa.map((item, idx) => (
              <div key={idx} className="p-4 rounded-theme relative border border-stroke shadow-sm bg-bg-main group transition-all hover:border-primary/40 animate-in fade-in">
                <div className="flex justify-between items-start pr-8">
                  <span className="text-sm font-bold flex-1 text-tx-main leading-tight">
                    <span className="text-primary font-black mr-1.5">{item.quantidade}x</span> {item.nome}
                  </span>
                  <span className="font-black text-sm text-tx-main ml-2">
                    R$ {(item.preco_venda * item.quantidade).toFixed(2)}
                  </span>
                </div>
                {item.obs && (
                  <p className="text-[10px] mt-2 italic break-words border-t border-stroke/50 pt-2 text-tx-muted font-medium">
                    {item.obs}
                  </p>
                )}
                <button 
                  onClick={() => handleRemoverComUndo(item.cartItemId)} 
                  className="absolute top-3.5 right-3 transition-colors text-tx-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-theme opacity-50 group-hover:opacity-100"
                >
                  <X size={16}/>
                </button>
              </div>
            ))
          )}
        </div>

        {/* FECHAMENTO E PAGAMENTO */}
        <div className="shrink-0 p-5 rounded-theme border border-stroke bg-bg-input shadow-inner">
          
          {/* 👉 CAMPO NOVO: Inserir Número da Comanda Existente para Acréscimo */}
          <div className="relative mb-4 group">
            <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-input text-blue-500">Nº Comanda (Acréscimo)</span>
            <input 
              type="number" 
              placeholder="Vazio para criar nova" 
              value={comandaExistenteInput} 
              onChange={e => setComandaExistenteInput(e.target.value)} 
              className="w-full p-4 rounded-theme border border-stroke outline-none text-sm font-black transition-all bg-bg-surface text-tx-main focus:border-blue-500 shadow-sm text-center" 
            />
          </div>

          <div className={`relative mb-4 group transition-opacity ${comandaExistenteInput ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-input text-primary">Meio de Pgto (F4)</span>
            <select 
              ref={selectPagamentoRef} 
              value={metodoPagamentoCaixa} 
              onChange={e => { setMetodoPagamentoCaixa(e.target.value); setPrecisaTrocoCaixa(''); }} 
              className="w-full p-4 rounded-theme border border-stroke outline-none text-sm font-black transition-all cursor-pointer bg-bg-surface text-tx-main focus:border-primary shadow-sm uppercase tracking-widest"
            >
              <option value="pix">PIX Instantâneo</option>
              <option value="dinheiro">Dinheiro Físico</option>
              <option value="cartao">Cartão (Crédito/Débito)</option>
            </select>
          </div>

          {metodoPagamentoCaixa === 'dinheiro' && !comandaExistenteInput && (
            <div className="relative mb-5 animate-in slide-in-from-top-2 group">
              <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-input text-secondary">Troco p/ quanto?</span>
              <input 
                type="number" 
                placeholder="Ex: 100" 
                value={precisaTrocoCaixa} 
                onChange={e => setPrecisaTrocoCaixa(e.target.value)} 
                className="w-full p-4 rounded-theme border border-stroke outline-none text-xl font-black transition-all bg-bg-surface text-tx-main focus:border-secondary shadow-sm text-center" 
              />
              
              {valorTrocoCalculado > 0 && (
                <div className="mt-3 p-3 bg-secondary/10 border border-secondary/20 rounded-theme text-secondary font-black text-xs flex justify-between items-center animate-in zoom-in-95">
                  <span className="uppercase tracking-widest">Troco a devolver:</span>
                  <span className="text-base">R$ {valorTrocoCalculado.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-end mb-6 px-1 border-t border-stroke/50 pt-4 mt-2">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted">Total a Receber</p>
              <p className="text-[10px] font-bold text-primary uppercase">
                {comandaExistenteInput ? 'ACRÉSCIMO' : metodoPagamentoCaixa}
              </p>
            </div>
            <p className="text-3xl font-black text-primary tracking-tighter">
              R$ {totalCarrinho.toFixed(2)}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 👉 BOTÃO DINÂMICO: Muda de "Finalizar" para "Adicionar na #X" */}
            {comandaExistenteInput ? (
              <button 
                onClick={() => finalizarPedidoCaixa(false, comandaExistenteInput)} 
                disabled={carrinhoCaixa.length === 0}
                className="w-full py-4 bg-blue-500 text-white font-black rounded-theme shadow-theme hover:bg-blue-600 active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm disabled:opacity-50"
              >
                <PlusSquare size={20}/> Adicionar na #{comandaExistenteInput}
              </button>
            ) : (
              <>
                <button 
                  onClick={handleBotaoFinalizar} 
                  disabled={carrinhoCaixa.length === 0}
                  className="w-full py-4 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm disabled:opacity-50 disabled:grayscale"
                >
                  <Check size={20}/> Finalizar Venda
                </button>
                <button 
                  onClick={() => finalizarPedidoCaixa(false)} 
                  disabled={carrinhoCaixa.length === 0}
                  className="w-full py-3.5 border-2 border-primary text-primary font-black rounded-theme active:scale-95 transition-all flex justify-center items-center gap-2 hover:bg-primary/10 uppercase tracking-widest text-xs disabled:opacity-50 disabled:grayscale disabled:border-stroke disabled:text-tx-muted"
                >
                  <Calendar size={18}/> Abrir Comanda
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      <ModalProduto 
        produto={modalProduto}
        onClose={() => setModalProduto(null)}
        onAddToCart={(item) => setCarrinhoCaixa(p => [...p, item])}
        temaEscuro={temaEscuro} 
        estoque={estoque}
      />

      {modalTrocoAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[400] animate-in fade-in font-theme">
          <div className="w-full max-w-md bg-bg-surface rounded-card p-6 sm:p-8 shadow-2xl border border-stroke relative text-center animate-in zoom-in-95">
            <button onClick={() => setModalTrocoAberto(false)} className="absolute top-4 right-4 text-tx-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-theme transition-colors">
              <X size={24}/>
            </button>
            
            <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
              <Banknote size={28} />
            </div>

            <h2 className="text-2xl font-black text-tx-main tracking-tight mb-2">Atenção ao Troco!</h2>
            <p className="text-sm font-bold text-tx-muted">Entregue o valor correto ao cliente antes de fechar a venda.</p>
            
            <CalculadoraTroco valorTroco={valorTrocoCalculado} />

            <button 
              onClick={confirmarTrocoEFinalizar}
              className="w-full mt-8 py-4 bg-secondary text-white font-black rounded-theme shadow-theme hover:bg-opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
            >
               <Check size={20}/> Confirmo que entreguei o troco
            </button>
          </div>
        </div>
      )}

    </div>
  );
}