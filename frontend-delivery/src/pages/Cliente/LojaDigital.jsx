// src/pages/Cliente/LojaDigital.jsx
import React, { useState, useEffect } from 'react';
import { Moon, Sun, MapPin, Check, ChevronRight, Sparkles, X, FileText, Search, ShoppingBag, Plus, Lock, Coffee, Tag } from 'lucide-react';
import ModalProduto from '../../components/ModalProduto';
import Checkout from './Checkout'; 
import { useTheme } from "../../theme/ThemeProvider";
import confetti from 'canvas-confetti';
import { API_URL, publicFetch } from '../../services/api';
import { toast } from 'sonner';

export default function LojaDigital({ 
  temaEscuro, setTemaEscuro, setTelaAtual, 
  produtosLoja = [], produtosGerente = [], estoque = [], pedidos = [], 
  enderecoLoja, configTaxa, telefoneLojaWhatsApp, buscarGeral 
}) {
  const [categoriaAtivaLoja, setCategoriaAtivaLoja] = useState('Todas');
  const [carrinho, setCarrinho] = useState([]);
  const [exibirCheckout, setExibirCheckout] = useState(false);
  const [pedidoGeradoZap, setPedidoGeradoZap] = useState(null); 
  const [modalSacolaAberto, setModalSacolaAberto] = useState(false);

  // 👉 Estados do Sistema de Cupons
  const [codigoCupom, setCodigoCupom] = useState('');
  const [cupomAtivo, setCupomAtivo] = useState(null); 
  const [validandoCupom, setValidandoCupom] = useState(false);

  // Estados do Upsell "Gatuno" Inteligente
  const [modalUpsellAberto, setModalUpsellAberto] = useState(false);
  const [produtoSugerido, setProdutoSugerido] = useState(null);

  // Estados do Histórico de Pedidos
  const [modalHistorico, setModalHistorico] = useState(false);
  const [cpfHistorico, setCpfHistorico] = useState('');
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [pesquisouHistorico, setPesquisouHistorico] = useState(false);
  const [modalProduto, setModalProduto] = useState(null);

  // Estados para o Relógio da Loja
  const [statusLoja, setStatusLoja] = useState({ texto: 'Carregando...', cor: 'text-tx-muted', isAberto: false });

  useEffect(() => {
    if (pedidoGeradoZap) {
      const coresDaLoja = [configTaxa?.cor_primaria || '#FF6B00', '#FFF3E0', '#22C55E'];
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: coresDaLoja });
    }
  }, [pedidoGeradoZap, configTaxa]);

  useEffect(() => {
    const verificarHorario = () => {
      if (!configTaxa) return; 
      if (configTaxa.status_manual === 'fechado') { setStatusLoja({ texto: 'Fechado', cor: 'text-red-500 bg-red-500/10 border-red-500/20', isAberto: false }); return; }
      if (configTaxa.status_manual === 'aberto') { setStatusLoja({ texto: 'Aberto Agora', cor: 'text-green-500 bg-green-500/10 border-green-500/20', isAberto: true }); return; }

      const agora = new Date();
      let minutosAtual = agora.getHours() * 60 + agora.getMinutes();
      const abreStr = configTaxa.hora_abre || "14:00"; const fechaStr = configTaxa.hora_fecha || "23:00";
      const [horaAbre, minAbre] = abreStr.split(':').map(Number); const [horaFecha, minFecha] = fechaStr.split(':').map(Number);
      
      const minutosAbertura = (horaAbre * 60) + minAbre; let minutosFechamento = (horaFecha * 60) + minFecha;
      if (minutosFechamento < minutosAbertura) { minutosFechamento += 1440; if (minutosAtual < minutosAbertura) minutosAtual += 1440; }

      if (minutosAtual < minutosAbertura || minutosAtual >= minutosFechamento) setStatusLoja({ texto: 'Fechado', cor: 'text-red-500 bg-red-500/10 border-red-500/20', isAberto: false });
      else if (minutosFechamento - minutosAtual <= 30) setStatusLoja({ texto: 'Fechamos em breve', cor: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', isAberto: true });
      else setStatusLoja({ texto: 'Aberto Agora', cor: 'text-green-500 bg-green-500/10 border-green-500/20', isAberto: true });
    };
    verificarHorario(); const intervalo = setInterval(verificarHorario, 60000); return () => clearInterval(intervalo);
  }, [configTaxa]); 

  const { mode, toggleMode } = useTheme();
  useEffect(() => { setTemaEscuro(mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)); }, [mode, setTemaEscuro]);

  const formatarCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const formatarDataCompleta = (d) => !d ? '--:--' : new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const traduzirProduto = (id) => produtosGerente.find(p => p.id === id)?.nome || `Produto #${id}`;
  const valorTotalCarrinho = carrinho.reduce((total, item) => total + (item.preco_venda * item.quantidade), 0);
  const corDoStatus = (s) => {
    if(s === 'recebido') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    if(s === 'em_preparo') return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
    if(s === 'em_consumo') return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
    if(s === 'saiu_entrega' || s === 'entregue') return 'bg-green-500/10 text-green-500 border border-green-500/20';
    return 'bg-bg-input text-tx-muted border border-stroke';
  };

  const ordemDesejada = configTaxa?.ordem_categorias 
    ? configTaxa.ordem_categorias.split(',').map(c => c.trim()) 
    : [];

  const produtosAgrupadosLoja = (produtosLoja || []).reduce((acc, prod) => { 
    const categoriasRaw = prod.categoria_temp || 'Geral'; 
    const categoriasLista = categoriasRaw.split(',').map(c => c.trim());
    
    categoriasLista.forEach(cat => {
      if(!acc[cat]) acc[cat] = []; 
      acc[cat].push(prod); 
    });
    return acc; 
  }, {});

  const categoriasEncontradas = Object.keys(produtosAgrupadosLoja);
  categoriasEncontradas.sort((a, b) => {
    if (ordemDesejada.length === 0) return 0;
    const posA = ordemDesejada.indexOf(a) === -1 ? 999 : ordemDesejada.indexOf(a);
    const posB = ordemDesejada.indexOf(b) === -1 ? 999 : ordemDesejada.indexOf(b);
    return posA - posB;
  });
  
  const categoriasDisponiveis = ['Todas', ...categoriasEncontradas];

  // 👉 Função de Validação do Cupom via Backend
  const aplicarCupom = async () => {
    if (!codigoCupom.trim()) return toast.error("Digite o código do cupom!");
    setValidandoCupom(true);
    
    try {
      const res = await publicFetch(`/validar-cupom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          codigo: codigoCupom, 
          valor_subtotal: valorTotalCarrinho,
          tenant_id: 1 
        })
      });
      
      const dados = await res.json();
      
      if (res.ok) {
        setCupomAtivo(dados);
        toast.success(dados.mensagem || "Cupom aplicado!");
      } else {
        setCupomAtivo(null);
        toast.error(dados.erro || "Cupom inválido.");
      }
    } catch (e) {
      toast.error("Erro ao validar o cupom. Tente novamente.");
    } finally {
      setValidandoCupom(false);
    }
  };

  const removerCupom = () => {
    setCupomAtivo(null);
    setCodigoCupom('');
    toast.info("Cupom removido.");
  };

  // Se a pessoa tirar itens da sacola, valida se o subtotal baixou pra ver se o cupom ainda é válido
  useEffect(() => {
    if (cupomAtivo && valorTotalCarrinho > 0) {
       aplicarCupom(); // Revalida silenciosamente
    } else if (valorTotalCarrinho === 0 && cupomAtivo) {
       removerCupom();
    }
  }, [valorTotalCarrinho]);

  const dispararWhatsApp = (pedidoObj) => {
    let msg = `👋 *Olá! Acabei de fazer um pedido pelo cardápio digital.*\nAqui estão os detalhes do meu pedido (*#${pedidoObj.id}*):\n━━━━━━━━━━━━━━━━━━━━\n\n👤 *Meu Nome:* ${pedidoObj.cliente_nome}\n📞 *Meu Contato:* ${pedidoObj.cliente_telefone}\n📍 *Meu Endereço:* ${pedidoObj.cliente_endereco}\n\n🛒 *O QUE EU PEDI:*\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
    pedidoObj.itens.forEach(i => { msg += `🔸 *${i.quantidade}x* ${i.nome} - R$ ${(i.preco_unitario * i.quantidade).toFixed(2)}\n`; if (i.obs) msg += `   ↳ _Obs: ${i.obs}_\n`; });
    msg += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n\n`;
    const subtotal = pedidoObj.total - (pedidoObj.taxa_entrega || 0) + (pedidoObj.desconto || 0);
    msg += `🧾 *Subtotal:* R$ ${subtotal.toFixed(2)}\n🛵 *Taxa de Entrega:* R$ ${Number(pedidoObj.taxa_entrega || 0).toFixed(2)}\n`;
    if (pedidoObj.desconto && Number(pedidoObj.desconto) > 0) msg += `🎟️ *Desconto:* - R$ ${Number(pedidoObj.desconto).toFixed(2)}\n`;
    msg += `💰 *TOTAL A PAGAR: R$ ${Number(pedidoObj.total).toFixed(2)}*\n\n💳 *Vou pagar via:* ${pedidoObj.metodo_pagamento.toUpperCase()}\n`;
    let obsParaCliente = pedidoObj.observacoes || ""; obsParaCliente = obsParaCliente.replace(/\n💵 TROCO:.*/g, "").trim();
    if (obsParaCliente && obsParaCliente !== "App Web") msg += `\n⚠️ *Minhas Observações:*\n${obsParaCliente}\n`; 
    window.open(`https://wa.me/${telefoneLojaWhatsApp}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const buscarHistoricoCliente = async (e) => {
    e.preventDefault(); const cp = cpfHistorico.replace(/\D/g, ''); if (cp.length !== 11) return alert("Digite 11 números no CPF.");
    const hist = pedidos.filter(p => p.cliente_cpf === cp); hist.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
    setMeusPedidos(hist); setPesquisouHistorico(true);
  };

  const handleAddCart = (item) => {
    if (navigator && navigator.vibrate) navigator.vibrate(50);
    setCarrinho(p => [...p, item]);
  };

  const abrirModalProduto = (produto) => {
    if (!statusLoja.isAberto) return alert("Ops! Nossa loja está fechada no momento. Voltamos em breve!");
    const semComp = (!produto.complementos || produto.complementos === '[]' || produto.complementos === 'null');
    if (semComp && produto.disponibilidade !== 'local_peso') { 
        handleAddCart({ cartItemId: `${produto.id}-${Date.now()}`, produto_id: produto.id, nome: produto.nome, preco_venda: Number(produto.preco_venda), quantidade: 1, obs: '' }); 
        return; 
    }
    setModalProduto(produto);
  };

  const avaliarUpsellEAvancar = () => {
    const isBebida = (cat) => /bebida|refrigerante|suco|água|agua|drink/i.test(cat);
    const categoriasNoCarrinho = carrinho.map(i => {
       const p = produtosLoja.find(prod => prod.id === i.produto_id);
       return p ? p.categoria_temp : '';
    });

    const temBebida = categoriasNoCarrinho.some(c => isBebida(c));
    const temComida = categoriasNoCarrinho.some(c => !isBebida(c));

    if (temComida && !temBebida) {
      const bebidasLoja = produtosLoja.filter(p => isBebida(p.categoria_temp));
      if (bebidasLoja.length > 0) {
        const sugestao = bebidasLoja.sort((a, b) => Number(a.preco_venda) - Number(b.preco_venda))[0];
        setProdutoSugerido(sugestao);
        setModalUpsellAberto(true);
        return; 
      }
    }
    prosseguirParaCheckout();
  };

  const prosseguirParaCheckout = () => {
    setModalUpsellAberto(false);
    setModalSacolaAberto(false);
    setExibirCheckout(true);
  };

  // Calcula o valor real após desconto
  const valorTotalComDesconto = Math.max(0, valorTotalCarrinho - (cupomAtivo ? Number(cupomAtivo.valor_descontado) : 0));

  return (
    <div className="min-h-screen w-full flex flex-col font-theme bg-bg-main text-tx-main transition-colors duration-500 pb-28">
      
      {/* CABEÇALHO MODERNO */}
      <header className="relative w-full mb-8" data-testid="loja-hero">
         {/* Ações flutuantes no topo */}
         <div className="absolute top-4 right-4 sm:right-6 z-50 flex gap-2">
           <button
             onClick={toggleMode}
             aria-label="Alternar tema"
             data-testid="btn-toggle-theme"
             className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 hover:scale-110 transition-all shadow-lg border border-white/20"
           >
             <Sun size={18} className={temaEscuro ? 'hidden' : 'block'} />
             <Moon size={18} className={temaEscuro ? 'block' : 'hidden'} />
           </button>
           <button
             onClick={() => setModalHistorico(true)}
             data-testid="btn-meus-pedidos"
             className="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all shadow-lg border border-white/20"
           >
             <FileText size={16} /> Meus Pedidos
           </button>
         </div>

         {/* Capa */}
         <div className="relative h-52 md:h-72 w-full overflow-hidden">
            <div className="absolute inset-0 w-full h-full">
              <img 
                src={configTaxa?.capa_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&auto=format&fit=crop&q=75'} 
                alt="Capa da Loja" 
                className="w-full h-full object-cover animate-in fade-in duration-1000 scale-105" 
              />
            </div>
            {/* Overlay gradiente dupla camada — profundidade e legibilidade */}
            <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${temaEscuro ? 'from-bg-main/95 via-bg-main/40' : 'from-bg-main via-bg-main/40'}`} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
            {/* Textura sutil (dot grain) */}
            <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }} />
         </div>

         {/* Info da loja */}
         <div className="max-w-5xl mx-auto px-4 sm:px-8 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 -mt-20 sm:-mt-24 w-full relative z-10 text-center sm:text-left">
               <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-card border-4 border-bg-main bg-bg-surface overflow-hidden flex items-center justify-center shrink-0 transition-transform duration-500 hover:scale-105 shadow-2xl ring-1 ring-black/5">
                  {configTaxa?.logo_url ? (
                     <img src={configTaxa.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                     <span className="text-primary font-black text-xl md:text-3xl italic tracking-tighter">LOGO</span>
                  )}
               </div>
               
               <div className="mb-2 sm:mb-4 sm:pb-1 animate-in slide-in-from-bottom-4 duration-500 flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-tx-main leading-tight" data-testid="loja-nome">
                    {configTaxa?.nome_loja || "D'Varano Sorvetes"}
                  </h1>
                  
                  <div className="flex items-center gap-2 mt-3 flex-wrap justify-center sm:justify-start">
                     <div className="flex items-center gap-1.5 bg-bg-surface backdrop-blur-sm border border-stroke px-3 py-1.5 rounded-full shadow-sm">
                       <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-3.5 h-3.5" />
                       <span className="text-xs font-black text-tx-main">{configTaxa?.nota_loja || '5.0'}</span>
                       <span className="text-[10px] font-bold text-tx-muted">({configTaxa?.avaliacoes_loja || '100+'})</span>
                     </div>
                     <div
                       data-testid="loja-status"
                       className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${statusLoja.cor} bg-bg-surface backdrop-blur-sm`}
                     >
                       {statusLoja.isAberto && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>}
                       {statusLoja.texto}
                     </div>
                     <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stroke text-[10px] font-black uppercase tracking-widest text-tx-muted bg-bg-surface backdrop-blur-sm shadow-sm">
                       ⏱ {configTaxa?.hora_abre || '14:00'} — {configTaxa?.hora_fecha || '23:00'}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </header>

      {/* FILTRO DE CATEGORIAS */}
      {!pedidoGeradoZap && !exibirCheckout && (
        <div className="sticky top-0 z-40 glass-effect py-3 mb-6 shadow-sm" data-testid="loja-categorias">
          <div className="max-w-5xl mx-auto px-4 sm:px-8">
            <div className="flex gap-2 overflow-x-auto custom-scrollbar scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden snap-x">
              {categoriasDisponiveis.map(cat => {
                const count = cat === 'Todas' ? produtosLoja.length : (produtosAgrupadosLoja[cat]?.length || 0);
                const ativo = categoriaAtivaLoja === cat;
                return (
                  <button 
                    key={cat}
                    onClick={() => setCategoriaAtivaLoja(cat)}
                    data-testid={`cat-chip-${cat}`}
                    className={`snap-start px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-black whitespace-nowrap transition-all border-2 flex items-center gap-2 ${ativo ? 'bg-primary text-tx-primary border-primary shadow-theme scale-[1.03]' : 'bg-bg-surface text-tx-main border-stroke hover:border-primary/50 hover:bg-bg-input'}`}
                  >
                    {cat}
                    {count > 0 && (
                      <span className={`inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full font-black ${ativo ? 'bg-black/20 text-tx-primary' : 'bg-bg-input text-tx-muted'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8">
        
        {pedidoGeradoZap ? (
          <div data-testid="pedido-sucesso" className="bg-bg-surface border border-stroke p-8 sm:p-12 rounded-card shadow-2xl text-center animate-in zoom-in-95 duration-500 max-w-md mx-auto mt-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping opacity-50"></div>
              <div className="relative w-24 h-24 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center border-2 border-emerald-500/30 shadow-lg">
                <Check size={48} strokeWidth={3}/>
              </div>
            </div>
            <h2 className="text-tx-main text-3xl font-black mb-2 tracking-tight">Pedido Enviado! 🎉</h2>
            <p className="text-tx-muted font-bold mb-8 uppercase tracking-widest text-xs leading-relaxed">Acompanhe seu pedido pelo WhatsApp<br/>Estamos preparando com carinho.</p>
            <button 
              onClick={() => { dispararWhatsApp(pedidoGeradoZap); window.location.reload(); }} 
              className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-tx-primary rounded-full py-4 px-8 font-black uppercase tracking-widest shadow-theme text-sm w-full flex items-center justify-center gap-2"
            >
              Fazer Novo Pedido <ChevronRight size={18}/>
            </button>
          </div>  
        ) : exibirCheckout ? (
          
          <Checkout 
            carrinho={carrinho} 
            valorTotalCarrinho={valorTotalComDesconto} 
            cupomAtivo={cupomAtivo}
            configTaxa={configTaxa} 
            temaEscuro={temaEscuro} 
            telefoneLojaWhatsApp={telefoneLojaWhatsApp} 
            buscarGeral={buscarGeral}
            onVoltar={() => setExibirCheckout(false)}
            onSucesso={(pedidoData) => { setPedidoGeradoZap(pedidoData); setCarrinho([]); setExibirCheckout(false); dispararWhatsApp(pedidoData); }}
          />
          
        ) : produtosLoja.length === 0 ? (
          
          <div className="space-y-10 animate-in fade-in">
             <div>
                <div className="h-6 w-40 bg-stroke/30 rounded-md animate-pulse mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                   {[1, 2, 3, 4, 5, 6].map(sk => (
                     <div key={sk} className="flex h-32 sm:h-36 rounded-card bg-bg-surface border border-stroke shadow-sm overflow-hidden animate-pulse">
                        <div className="flex-1 p-4 flex flex-col justify-between">
                           <div>
                              <div className="h-4 bg-stroke/30 rounded w-3/4 mb-2"></div>
                              <div className="h-2.5 bg-stroke/30 rounded w-full mb-1"></div>
                              <div className="h-2.5 bg-stroke/30 rounded w-5/6"></div>
                           </div>
                           <div className="h-4 bg-stroke/40 rounded w-1/4"></div>
                        </div>
                        <div className="w-28 sm:w-36 bg-stroke/20"></div>
                     </div>
                   ))}
                </div>
             </div>
          </div>

        ) : (
          
          <div className="space-y-12">
             {categoriasDisponiveis.filter(c => categoriaAtivaLoja === 'Todas' || c === categoriaAtivaLoja).map(categoria => {
                const produtosDaCategoria = produtosAgrupadosLoja[categoria] || (categoria === 'Todas' ? produtosLoja : []);
                if (produtosDaCategoria.length === 0) return null;
                
                return (
                   <div key={categoria} className="animate-in fade-in scroll-mt-24 slide-in-from-bottom-4" id={`cat-${categoria}`}>
                      {categoria !== 'Todas' && (
                        <h2 className="text-xl md:text-2xl font-black mb-6 tracking-tight flex items-center gap-2 text-tx-main border-b border-stroke pb-2">
                          {categoria === 'Promoções' || categoria === 'Destaques' ? <Sparkles size={24} className="text-primary"/> : <ChevronRight size={24} className="text-primary"/>}
                          {categoria}
                        </h2>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5" data-testid={`categoria-${categoria}-grid`}>
                        {produtosDaCategoria.map(produto => (
                          <button
                            type="button"
                            key={produto.id}
                            onClick={() => abrirModalProduto(produto)}
                            data-testid={`produto-card-${produto.id}`}
                            className="group flex flex-row h-32 sm:h-36 rounded-card overflow-hidden border-2 transition-all duration-300 shadow-sm cursor-pointer bg-bg-surface border-stroke hover:border-primary hover:shadow-xl hover:-translate-y-1 text-left relative"
                          >
                            {/* Fita "TOP" para em destaque */}
                            {produto.em_destaque && (
                              <div className="absolute top-0 left-0 z-20 bg-primary text-tx-primary text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-br-lg shadow-md flex items-center gap-1">
                                <Sparkles size={10}/> Top
                              </div>
                            )}

                            <div className="flex-1 flex flex-col justify-between p-3.5 sm:p-4 min-w-0 border-r border-stroke">
                              <div>
                                <h3 className="text-sm sm:text-base font-black leading-tight line-clamp-1 text-tx-main group-hover:text-primary transition-colors mb-1">
                                  {produto.nome}
                                </h3>
                                <p className="text-[11px] sm:text-xs leading-snug font-medium line-clamp-2 text-tx-muted pr-2">
                                  {produto.descricao || 'Delicioso preparado com carinho.'}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-black text-base sm:text-lg text-tx-main group-hover:text-primary transition-colors">
                                  R$ {Number(produto.preco_venda).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="w-28 sm:w-36 relative shrink-0 bg-bg-input overflow-hidden">
                              <img
                                src={produto.imagem_url || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=70"}
                                alt={produto.nome}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                onError={e => { e.target.src = "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=70"; }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-2 right-2 z-10 w-9 h-9 sm:w-10 sm:h-10 bg-bg-surface text-tx-main rounded-full flex items-center justify-center shadow-lg font-black transition-all group-hover:bg-primary group-hover:text-tx-primary group-hover:scale-110 group-active:scale-95 border-2 border-bg-surface">
                                <Plus size={18} strokeWidth={2.5}/>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                   </div>
                );
             })}
          </div>
        )}
      </main>

      <footer className="w-full py-8 mt-auto flex flex-col justify-center items-center gap-2">
        <a href="#" className="dropa-signature hover:-translate-y-0.5" title="Conheça o Sistema Dropa">&copy; {new Date().getFullYear()} • ⚡ POWERED BY DROPA DELIVERY</a>
      </footer>

      {/* BOTÃO FLUTUANTE DO CARRINHO */}
      {!pedidoGeradoZap && carrinho.length > 0 && !exibirCheckout && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50 animate-in slide-in-from-bottom-10 duration-500">
          <button
            data-testid="ver-sacola-btn"
            onClick={() => setModalSacolaAberto(true)}
            className="w-full bg-primary text-tx-primary p-4 rounded-full shadow-2xl flex items-center justify-between hover:bg-primary-hover hover:scale-[1.02] active:scale-95 transition-all border-2 border-primary/20 backdrop-blur-md"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 bg-black/25 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner">
                <ShoppingBag size={20} strokeWidth={2.5} />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-tx-primary text-[10px] font-black rounded-full flex items-center justify-center border-2 border-primary shadow-md pop-in">
                  {carrinho.reduce((acc, i) => acc + i.quantidade, 0)}
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 leading-none">Ver Sacola</p>
                <p className="text-sm font-black leading-tight">Finalizar Pedido</p>
              </div>
            </div>
            <span className="font-black text-xl tracking-tight">R$ {valorTotalComDesconto.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* MODAL PRODUTO */}
      <ModalProduto produto={modalProduto} onClose={() => setModalProduto(null)} onAddToCart={handleAddCart} temaEscuro={temaEscuro} estoque={estoque} />

      {/* MODAL DE HISTÓRICO */}
      {modalHistorico && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[300] animate-in fade-in font-theme">
          <div className="w-full max-w-lg rounded-card shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden bg-bg-surface border border-stroke animate-in zoom-in-95">
            <div className="p-6 border-b border-stroke flex justify-between items-center shrink-0 bg-bg-input">
              <h2 className="text-xl font-black flex items-center gap-2 tracking-tight text-tx-main"><FileText size={20} className="text-primary"/> Consultar Pedidos</h2>
              <button onClick={() => setModalHistorico(false)} className="p-2 rounded-theme transition-colors text-tx-muted hover:text-red-500 hover:bg-red-500/10 bg-bg-surface border border-stroke"><X size={20}/></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-bg-main">
              <form onSubmit={buscarHistoricoCliente} className="flex gap-3 mb-6">
                <input required type="text" value={cpfHistorico} onChange={e => setCpfHistorico(formatarCPF(e.target.value))} placeholder="Digite seu CPF..." className="flex-1 p-4 text-center text-lg font-bold tracking-widest rounded-theme outline-none transition-all border border-stroke bg-bg-surface text-tx-main focus:border-primary shadow-sm" />
                <button type="submit" className="px-6 bg-primary text-tx-primary font-bold rounded-theme active:scale-95 transition-all shadow-theme hover:bg-primary-hover"><Search size={20} /></button>
              </form>
              
              {pesquisouHistorico && (
                <div className="space-y-4">
                  {meusPedidos.length === 0 ? (
                    <div className="text-center py-10 rounded-card border border-dashed border-stroke text-tx-muted bg-bg-surface">
                      <FileText size={32} className="mx-auto mb-3 opacity-20"/>
                      <p className="font-bold text-sm">Nenhum pedido encontrado.</p>
                    </div>
                  ) : (
                    meusPedidos.map(p => (
                      <div key={p.id} className="p-5 rounded-card border border-stroke shadow-sm transition-colors hover:border-primary/50 bg-bg-surface">
                        <div className="flex justify-between items-start mb-3 border-b border-stroke pb-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-tx-muted">{formatarDataCompleta(p.criado_em)}</p>
                            <p className="font-black text-lg tracking-tight text-tx-main">Pedido #{p.id}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2.5 py-1 rounded-theme text-[10px] font-bold uppercase tracking-wider ${corDoStatus(p.status)}`}>{p.status.replace('_', ' ')}</span>
                            <p className="text-primary font-black mt-2 text-lg">R$ {Number(p.total).toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {p.itens?.map((item, i) => (
                            <p key={i} className="text-xs font-bold text-tx-muted">
                              <span className="text-primary font-black mr-1.5 bg-primary/10 px-1.5 py-0.5 rounded-theme">{item.quantidade}x</span>
                              {traduzirProduto(item.produto_id)}
                              {item.obs && <span className="block mt-1 font-bold opacity-70 italic pl-6 text-[10px]">- {item.obs}</span>}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DA SACOLA DE COMPRAS */}
      {modalSacolaAberto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[400] animate-in fade-in">
          <div className="w-full max-w-lg bg-bg-surface rounded-t-[32px] sm:rounded-card shadow-2xl border border-stroke relative flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95">

            <div className="p-6 border-b border-stroke flex justify-between items-center shrink-0">
               <h2 className="text-xl font-black flex items-center gap-2 text-tx-main">
                 <ShoppingBag className="text-primary"/> Sua Sacola
               </h2>
               <button onClick={() => setModalSacolaAberto(false)} className="p-2 rounded-theme text-tx-muted hover:text-red-500 transition-colors bg-bg-input border border-stroke hover:bg-red-500/10 hover:border-red-500/20">
                 <X size={20}/>
               </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-bg-main pb-20 sm:pb-6">
               {carrinho.length === 0 ? (
                  <div className="text-center py-10 text-tx-muted font-bold text-sm uppercase tracking-widest opacity-50">Sua sacola está vazia.</div>
               ) : (
                  carrinho.map((item, idx) => (
                     <div key={item.cartItemId || idx} className="flex justify-between items-start gap-4 border border-stroke bg-bg-surface p-4 rounded-theme shadow-sm transition-colors hover:border-primary/30">
                        <div className="flex gap-3">
                           <span className="text-tx-primary bg-primary w-7 h-7 flex items-center justify-center rounded-md font-black text-xs shrink-0 shadow-sm">{item.quantidade}x</span>
                           <div>
                             <p className="font-bold text-sm text-tx-main leading-tight">{item.nome}</p>
                             {item.obs && <p className="text-[10px] text-tx-muted font-medium italic mt-1 leading-snug break-words">↳ {item.obs}</p>}
                             <p className="text-primary font-black text-sm mt-1.5">R$ {(item.preco_venda * item.quantidade).toFixed(2)}</p>
                           </div>
                        </div>
                        <button onClick={() => { const novoCarrinho = carrinho.filter(i => i.cartItemId !== item.cartItemId); setCarrinho(novoCarrinho); if(novoCarrinho.length === 0) setModalSacolaAberto(false); }} className="p-2 text-tx-muted hover:text-red-500 hover:bg-red-500/10 rounded-theme transition-colors border border-transparent hover:border-red-500/20"><X size={18}/></button>
                     </div>
                  ))
               )}

               {/* 👉 ÁREA DO CUPOM DE DESCONTO */}
               {carrinho.length > 0 && (
                 <div className="mt-8 pt-6 border-t border-stroke">
                   <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-3 block flex items-center gap-1.5"><Tag size={12}/> Cupom Promocional</label>
                   
                   {!cupomAtivo ? (
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={codigoCupom} 
                         onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())} 
                         placeholder="CÓDIGO DE DESCONTO" 
                         className="flex-1 p-3.5 rounded-theme bg-bg-input border border-stroke text-tx-main font-black uppercase tracking-widest outline-none focus:border-primary transition-colors text-xs"
                       />
                       <button 
                         type="button" 
                         onClick={aplicarCupom} 
                         disabled={validandoCupom || !codigoCupom}
                         className="px-5 bg-bg-surface border border-stroke text-tx-main font-black rounded-theme uppercase tracking-widest text-[10px] hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                       >
                         {validandoCupom ? '...' : 'Aplicar'}
                       </button>
                     </div>
                   ) : (
                     <div className="flex justify-between items-center p-3.5 rounded-theme bg-green-500/10 border border-green-500/30 animate-in fade-in">
                       <div className="flex items-center gap-3 text-green-500">
                         <div className="bg-green-500/20 p-2 rounded-md"><Check size={16} /></div>
                         <div>
                           <p className="text-sm font-black uppercase tracking-widest">{cupomAtivo.codigo}</p>
                           <p className="text-[10px] font-bold mt-0.5 opacity-80">Desconto garantido!</p>
                         </div>
                       </div>
                       <button type="button" onClick={removerCupom} className="p-2 text-tx-muted hover:text-red-500 bg-bg-surface rounded-theme border border-stroke transition-colors">
                         <X size={16} />
                       </button>
                     </div>
                   )}
                 </div>
               )}
            </div>

            {carrinho.length > 0 && (
              <div className="p-6 border-t border-stroke bg-bg-surface shrink-0 sm:rounded-b-card shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-tx-muted">Subtotal Itens:</span>
                    <span className={`text-base font-bold ${cupomAtivo ? 'text-tx-muted line-through decoration-red-500' : 'text-tx-main'}`}>R$ {valorTotalCarrinho.toFixed(2)}</span>
                 </div>
                 
                 {cupomAtivo && (
                   <div className="flex justify-between items-end mb-4 animate-in slide-in-from-top-2">
                      <span className="text-xs font-black uppercase tracking-widest text-green-500 flex items-center gap-1"><Tag size={14}/> Desconto:</span>
                      <span className="text-base font-black text-green-500">- R$ {Number(cupomAtivo.valor_descontado).toFixed(2)}</span>
                   </div>
                 )}

                 <div className="flex justify-between items-end mb-5 pt-3 border-t border-stroke">
                    <span className="text-xs font-black uppercase tracking-widest text-tx-muted">Total a Pagar:</span>
                    <span className="text-3xl font-black text-primary tracking-tighter">R$ {valorTotalComDesconto.toFixed(2)}</span>
                 </div>

                 <button onClick={avaliarUpsellEAvancar} className="w-full bg-primary hover:bg-primary-hover active:scale-95 transition-all text-tx-primary font-black uppercase tracking-widest py-4 rounded-theme shadow-theme flex justify-center items-center gap-2 text-sm">
                    Avançar para Entrega <ChevronRight size={20}/>
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DO UPSELL GATUNO */}
      {modalUpsellAberto && produtoSugerido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[500] animate-in fade-in">
           <div className="bg-bg-surface w-full max-w-sm rounded-card p-6 shadow-2xl border border-stroke text-center relative animate-in zoom-in-95">
              <button onClick={prosseguirParaCheckout} className="absolute top-4 right-4 text-tx-muted hover:text-tx-main bg-bg-input p-1.5 rounded-theme transition-colors"><X size={20}/></button>
              
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                 <Coffee className="text-blue-500" size={28}/>
              </div>
              <h3 className="text-xl font-black text-tx-main mb-2">Esqueceu a Bebida?</h3>
              <p className="text-xs font-bold text-tx-muted mb-6 leading-relaxed">Seu lanche fica muito melhor acompanhado. Que tal adicionar para refrescar?</p>
              
              <div className="border border-stroke rounded-theme p-3 flex items-center gap-3 mb-6 text-left bg-bg-input shadow-inner">
                 <img src={produtoSugerido.imagem_url || "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300"} alt="Bebida" className="w-16 h-16 rounded-md object-cover shadow-sm border border-stroke" />
                 <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-tx-main truncate">{produtoSugerido.nome}</p>
                    <p className="font-black text-primary text-base">R$ {Number(produtoSugerido.preco_venda).toFixed(2)}</p>
                 </div>
              </div>
              
              <div className="flex gap-3">
                 <button onClick={prosseguirParaCheckout} className="flex-1 py-3 px-2 rounded-theme font-bold text-[10px] uppercase tracking-widest text-tx-muted bg-bg-main border border-stroke hover:text-tx-main transition-colors">
                    Não, obrigado
                 </button>
                 <button 
                    onClick={() => {
                       handleAddCart({ cartItemId: `${produtoSugerido.id}-${Date.now()}`, produto_id: produtoSugerido.id, nome: produtoSugerido.nome, preco_venda: Number(produtoSugerido.preco_venda), quantidade: 1, obs: '' });
                       prosseguirParaCheckout();
                    }} 
                    className="flex-[1.5] py-3 px-2 rounded-theme font-black text-[10px] uppercase tracking-widest text-tx-primary bg-primary hover:bg-primary-hover shadow-theme transition-all flex items-center justify-center gap-1.5 active:scale-95"
                 >
                    <Plus size={14}/> Adicionar
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}