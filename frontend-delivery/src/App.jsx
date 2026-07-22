// src/App.jsx
import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Moon, Sun, FileText, Users, Bike, Check, Plus, ShoppingCart, MessageSquare, Printer, X, MapPin, Shield, Trophy } from 'lucide-react';
import { API_URL, apiFetch, publicFetch, tokenStore, onAuthEvent } from './services/api';

import { Toaster, toast } from 'sonner';

import MenuLateral from './components/MenuLateral';
import MenuMobile from './components/MenuMobile'; 
import LojaDigital from './pages/Cliente/LojaDigital';
import Login from './pages/Admin/Login';
import Dialog from './components/ui/Dialog';
import { SkeletonGrid, SkeletonRow, Skeleton } from './components/ui/Skeleton';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

const GestaoWhatsApp = lazy(() => import('./pages/Admin/GestaoWhatsApp'));
const PainelCozinha = lazy(() => import('./pages/Admin/PainelCozinha'));
const Caixa = lazy(() => import('./pages/Admin/PainelCaixa'));
const GestaoEstoque = lazy(() => import('./pages/Admin/GestaoEstoque'));
const GestaoEquipe = lazy(() => import('./pages/Admin/GestaoEquipe'));
const GestaoCardapio = lazy(() => import('./pages/Admin/GestaoCardapio'));
const PainelAnalises = lazy(() => import('./pages/Admin/PainelAnalises'));
const PainelFechamento = lazy(() => import('./pages/Admin/PainelFechamento'));
const GestaoFornecedores = lazy(() => import('./pages/Admin/GestaoFornecedores'));
const GestaoLogistica = lazy(() => import('./pages/Admin/GestaoLogistica'));
const GestaoConfiguracoes = lazy(() => import('./pages/Admin/GestaoConfiguracoes'));
const PainelAtendimento = lazy(() => import('./pages/Admin/PainelAtendimento'));
const GestaoComplementos = lazy(() => import('./pages/Admin/GestaoComplementos'));
// 👉 Importando a tela nova de Tracking
const LojaTracking = lazy(() => import('./pages/Cliente/LojaTracking'));

function SistemaPrincipal() {
  const { mode, toggleMode } = useTheme();
  const temaEscuro = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [telaAtual, setTelaAtual] = useState(() => {
    // 1º: Olha se tem a palavra mágica na URL
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('acesso') === 'sistema') {
      return 'login';
    }
    // 👉 2º: Olha se o cliente está buscando um rastreamento
    if (parametrosUrl.get('tracking')) {
      return 'tracking';
    }
    // 3º: Se tem token JWT válido, entra no dashboard (perfil é carregado do /auth/me)
    return tokenStore.get() ? 'dashboard' : 'cliente';
  });

  const [abaAtiva, setAbaAtiva] = useState('pedidos');  

  const [abaBaixaComanda, setAbaBaixaComanda] = useState(false);
  const [metodoPagamentoBaixa, setMetodoPagamentoBaixa] = useState('pix');
  const [valorRecebidoBaixa, setValorRecebidoBaixa] = useState('');
  
  const [funcionarios, setFuncionarios] = useState([]);

  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [autenticando, setAutenticando] = useState(!!tokenStore.get());

  const [modalPin, setModalPin] = useState({ visivel: false, mensagem: '', acao: null });
  const [pinDigitado, setPinDigitado] = useState('');

  const [pedidos, setPedidos] = useState([]);
  const [faturamentoHoje, setFaturamentoHoje] = useState(0);
  const [fichaPedido, setFichaPedido] = useState(null);
  
  const [produtosGerente, setProdutosGerente] = useState([]);
  const traduzirProduto = (id) => produtosGerente.find(p => p.id === id)?.nome || `Produto #${id}`;
  const [produtosLoja, setProdutosLoja] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [motoboys, setMotoboys] = useState([]);

  const [enderecoLoja, setEnderecoLoja] = useState('Rua Quinze de Novembro, Nova Odessa, SP');
  const [configTaxa, setConfigTaxa] = useState({ base: 5.00, porKm: 1.50, tempoKmMinutos: 4 });
  const telefoneLojaWhatsApp = "5519991897778"; 

  const [carrinhoCaixa, setCarrinhoCaixa] = useState([]);
  const [mesaInput, setMesaInput] = useState('');
  const [clienteCaixaInput, setClienteCaixaInput] = useState(''); 
  const [metodoPagamentoCaixa, setMetodoPagamentoCaixa] = useState('pix'); 
  const [precisaTrocoCaixa, setPrecisaTrocoCaixa] = useState(''); 

  const [ultimoPedidoId, setUltimoPedidoId] = useState(null);

  // 👉 Ao montar, se tem token, valida e carrega o perfil do backend
  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!tokenStore.get()) { setAutenticando(false); return; }
      try {
        const res = await apiFetch('/auth/me');
        if (cancelado) return;
        if (res.ok) {
          const perfil = await res.json();
          setUsuarioLogado(perfil);
        } else {
          tokenStore.clear();
          setUsuarioLogado(null);
          setTelaAtual((t) => t === 'login' ? 'login' : 'cliente');
        }
      } catch {
        // Rede caiu — deixa o usuário no dashboard mas sem perfil (backend vai revalidar)
      } finally {
        if (!cancelado) setAutenticando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  // 👉 Listener global de sessão expirada (disparado pelo apiFetch)
  useEffect(() => {
    const off = onAuthEvent((event) => {
      if (event.type === 'unauthorized') {
        setUsuarioLogado(null);
        toast.error('Sua sessão expirou. Faça login novamente.');
        setTelaAtual((t) => (t === 'cliente' || t === 'tracking') ? t : 'login');
      }
    });
    return off;
  }, []);

  // 👉 Logout: limpa token e volta para login
  useEffect(() => {
    if (!usuarioLogado && !autenticando && tokenStore.get()) {
      // usuário fez logout via botão → limpar token
      tokenStore.clear();
    }
  }, [usuarioLogado, autenticando]);

  
  // 👉 LÊ A URL E LIMPA A PALAVRA SECRETA
  useEffect(() => {
    const parametrosUrl = new URLSearchParams(window.location.search);
    if (parametrosUrl.get('acesso') === 'sistema') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);


  const formatarDataCompleta = (d) => !d ? '--:--' : new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  // ⚡ useMemo evita recalcular a lista em cada render
  const pedidosDeHoje = useMemo(() => {
    const hj = new Date().toDateString();
    return pedidos.filter(p => new Date(p.criado_em).toDateString() === hj);
  }, [pedidos]);

  const buscarGeral = async () => {
    try {
      // Rotas públicas (loja pública precisa delas sem token)
      const publicRoutes = [publicFetch(`/produtos`).catch(() => null), publicFetch(`/config`).catch(() => null)];
      // Rotas protegidas (só se autenticado)
      // 🚀 Otimização: só busca pedidos dos últimos 7 dias no dashboard (backward-compatible)
      const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const authRoutes = usuarioLogado ? [
        apiFetch(`/pedidos?desde=${seteDiasAtras}&limit=500`).catch(() => null),
        apiFetch(`/fornecedores`).catch(() => null),
        apiFetch(`/motoboys`).catch(() => null),
        apiFetch(`/funcionarios`).catch(() => null),
        apiFetch(`/estoque`).catch(() => null)
      ] : [null, null, null, null, null];

      const [resProd, resConf, resPed, resForn, resMoto, resFunc, resEst] = await Promise.all([...publicRoutes, ...authRoutes]);
      
      if(resPed && resPed.ok) {
        const dadosPed = await resPed.json(); setPedidos(dadosPed);
        const hj = new Date().toDateString(); const pdHoje = dadosPed.filter(p => new Date(p.criado_em).toDateString() === hj);
        setFaturamentoHoje(pdHoje.filter(p => p.status !== 'cancelado').reduce((acc, pedido) => acc + Number(pedido.total), 0));
      }
      if(resProd && resProd.ok) {
        const dadosProd = await resProd.json(); setProdutosLoja(dadosProd.filter(p => p.disponibilidade !== 'local' && p.disponibilidade !== 'local_peso' && p.disponibilidade !== 'inativo')); setProdutosGerente(dadosProd);
      }
      if(resForn && resForn.ok) setFornecedores(await resForn.json());
      if(resMoto && resMoto.ok) setMotoboys(await resMoto.json());
      if(resFunc && resFunc.ok) setFuncionarios(await resFunc.json());
      if(resEst && resEst.ok) setEstoque(await resEst.json());
      if(resConf && resConf.ok) {
        const conf = await resConf.json();
        if(conf.endereco && conf.endereco !== '') setEnderecoLoja(conf.endereco);
        if(conf.taxa_base !== undefined) {
          setConfigTaxa({ 
            base: Number(conf.taxa_base), porKm: Number(conf.taxa_km), tempoKmMinutos: Number(conf.tempo_km_minutos),
            latLoja: Number(conf.lat_loja), lonLoja: Number(conf.lon_loja), raioMaximoKm: Number(conf.raio_maximo) || 15,
            chovendo: Boolean(conf.chovendo), nome_loja: conf.nome_loja, logo_url: conf.logo_url, capa_url: conf.capa_url,
            cor_primaria: conf.cor_primaria, cor_secundaria: conf.cor_secundaria, cor_fundo: conf.cor_fundo, tema_base: conf.tema_base,
            nota_loja: conf.nota_loja || '4.9',
            avaliacoes_loja: conf.avaliacoes_loja || '500+',
            hora_abre: conf.hora_abre,
            hora_fecha: conf.hora_fecha,
            status_manual: conf.status_manual,
            ordem_categorias: conf.ordem_categorias
          });
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (telaAtual === 'dashboard' && 'Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [telaAtual]);

  useEffect(() => {
    if (pedidos.length > 0 && telaAtual === 'dashboard') {
      const maxId = Math.max(...pedidos.map(p => p.id));
      
      if (ultimoPedidoId !== null && maxId > ultimoPedidoId) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('O navegador bloqueou o áudio automático.'));
        
        if (Notification.permission === 'granted') {
          new Notification('🔔 Novo Pedido Recebido!', { 
             body: `O Pedido #${maxId} acabou de chegar. Verifique o painel!`,
          });
        }
      }
      setUltimoPedidoId(maxId); 
    }
  }, [pedidos, ultimoPedidoId, telaAtual]);

  useEffect(() => {
    // 🚀 Polling inteligente: 15s + pausa quando aba oculta (Page Visibility API)
    if (telaAtual !== 'dashboard' && telaAtual !== 'tracking') {
      if (telaAtual === 'cliente') buscarGeral();
      return;
    }
    buscarGeral();
    let intId = null;
    const start = () => { if (!intId) intId = setInterval(buscarGeral, 15000); };
    const stop = () => { if (intId) { clearInterval(intId); intId = null; } };
    if (!document.hidden) start();
    const onVis = () => (document.hidden ? stop() : (buscarGeral(), start()));
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [telaAtual, usuarioLogado]);

  const abrirModalProduto = (produto, isCaixa = false) => {
    if (!produto) return;
    const semComp = (!produto.complementos || produto.complementos === '[]' || produto.complementos === 'null');
    
    if (semComp && produto.disponibilidade !== 'local_peso') { 
        const itemF = { 
          cartItemId: `${produto.id}-${Date.now()}`, produto_id: produto.id, nome: produto.nome, preco_venda: Number(produto.preco_venda), quantidade: 1, obs: '' 
        }; 
        if (isCaixa) setCarrinhoCaixa(p => [...p, itemF]); else setCarrinho(p => [...p, itemF]); 
        return; 
    }
    setModalProduto({ ...produto, origemCaixa: isCaixa });
  };

  const realizarAcaoProtegida = (mensagem, acao) => { setModalPin({ visivel: true, mensagem, acao }); setPinDigitado(''); };
  
  const confirmarPin = () => {
    // Limpando espaços ocultos e garantindo a conversão para maiúsculo
    const pinLimpo = String(pinDigitado).trim().toUpperCase();
    
    const func = funcionarios.find(f => 
      String(f.pin).trim().toUpperCase() === pinLimpo && 
      (f.ativo === true || f.ativo === 1 || f.ativo === '1')
    );
    
    if(func) { 
      setModalPin({ visivel: false, mensagem: '', acao: null }); 
      modalPin.acao(func); 
    } else { 
      toast.error("PIN Inválido ou inativo!"); 
    }
  };

  const despacharComMotoboy = async (pedido, mId) => {
    if(!mId) return toast.error("Selecione o entregador!");
    const motoboy = motoboys.find(x => x.id === Number(mId)); const km = Number(pedido.distancia_km || 0); let taxaTotal = Number(pedido.taxa_entrega || 0); 
    if (taxaTotal === 0 && pedido.tipo_pedido === 'delivery') {
       const txManual = window.prompt("O frete não foi salvo. Digite o valor cobrado do cliente (Ex: 5.50):");
       if(!txManual) return toast.error("Despacho cancelado."); taxaTotal = Number(txManual.replace(',','.'));
    }
    const comissaoGerada = (taxaTotal * Number(motoboy.comissao)) / 100;
    try { await apiFetch(`/pedidos/${pedido.id}/despachar`, { method: 'PUT', body: JSON.stringify({ motoboy_id: Number(mId), taxa_entrega: taxaTotal, distancia_km: km, valor_motoboy: comissaoGerada, status: 'saiu_entrega' }) }); buscarGeral(); toast.success(`🚀 Pedido Despachado!\nMotoboy: ${motoboy.nome}\nComissão: R$ ${comissaoGerada.toFixed(2)}`); } catch (e) {}
  };

  const mudarStatusPedido = async (id, novoStatus, funcNome, metodoPgto = null, extraObs = "") => {
    try {
      const auditLog = novoStatus === 'entregue' ? `\n[${formatarDataCompleta(new Date())}] ✅ Baixa por: ${funcNome}${extraObs}` : '';
      const payload = { status: novoStatus, finalizado_por: novoStatus === 'entregue' ? funcNome : null, audit: auditLog };
      if (metodoPgto) payload.metodo_pagamento = metodoPgto;

      await apiFetch(`/pedidos/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) });
      buscarGeral(); 
      if(fichaPedido && fichaPedido.id === id) {
        setFichaPedido({...fichaPedido, status: novoStatus, metodo_pagamento: metodoPgto || fichaPedido.metodo_pagamento});
        setAbaBaixaComanda(false); 
      }
    } catch(e){}
  };

  const imprimirComanda = (pedido) => {
    const janelaImpressao = window.open('', '', 'width=400,height=600'); 
    if (!janelaImpressao) return toast.error("Pop-up bloqueado. Libere os pop-ups para imprimir.");
    const nomeMoto = pedido.motoboy_id ? motoboys.find(m => m.id === pedido.motoboy_id)?.nome : null;
    let itensHTML = '';
    pedido.itens.forEach(i => {
      itensHTML += `<div class="row mt"><span class="bold">${i.quantidade}x ${traduzirProduto(i.produto_id)}</span><span>R$ ${(Number(i.preco_unitario) * i.quantidade).toFixed(2)}</span></div>`;
      if (i.obs) itensHTML += `<div style="font-size: 12px; padding-left: 10px; font-style: italic;">> Obs: ${i.obs}</div>`;
    });
    const nomeDaLoja = configTaxa?.nome_loja || 'Sua Loja'; // Puxa do banco
    const html = `<html><head><style>@page { margin: 0; size: 80mm auto; } * { box-sizing: border-box; color: #000 !important; font-family: 'Courier New', Courier, monospace; } body { width: 76mm; margin: 0 auto; padding: 4mm; font-size: 14px; font-weight: bold; line-height: 1.2; } .center { text-align: center; } .bold { font-weight: 900; } .divider { border-bottom: 1px dashed #000; margin: 6px 0; } .divider-bold { border-bottom: 2px dashed #000; margin: 8px 0; } .row { display: flex; justify-content: space-between; align-items: flex-start; } .text-lg { font-size: 16px; } .text-xl { font-size: 22px; font-weight: 900; } .mt { margin-top: 6px; }</style></head><body><div class="center text-xl">${nomeDaLoja}</div><div class="center text-lg mt">Comanda #${pedido.id}</div><div class="divider-bold"></div><div>Data: ${formatarDataCompleta(pedido.criado_em)}</div><div class="mt">Cliente: <span class="text-lg">${pedido.cliente_nome || 'Consumidor Local'}</span></div>${pedido.cliente_telefone ? `<div>WhatsApp: ${pedido.cliente_telefone}</div>` : ''}<div class="divider"></div><div class="text-lg">Tipo: <b>${pedido.tipo_pedido.toUpperCase()}</b></div>${pedido.tipo_pedido === 'local' ? `<div class="text-lg mt">Mesa/Ficha: ${pedido.mesa}</div>` : `<div class="mt">End: ${pedido.cliente_endereco}</div>`}${nomeMoto ? `<div class="text-lg mt">ENTREGADOR: ${nomeMoto}</div>` : ''}<div class="divider-bold"></div><div class="center text-lg bold">ITENS DO PEDIDO</div><div class="divider-bold"></div>${itensHTML}<div class="divider-bold"></div><div class="row"><span>Subtotal</span><span>R$ ${(Number(pedido.total) - Number(pedido.taxa_entrega || 0)).toFixed(2)}</span></div>${Number(pedido.taxa_entrega) > 0 ? `<div class="row mt"><span>Frete de Rota</span><span>R$ ${Number(pedido.taxa_entrega).toFixed(2)}</span></div>` : ''}<div class="divider"></div><div class="row text-lg bold mt"><span>TOTAL PAGO</span><span>R$ ${Number(pedido.total).toFixed(2)}</span></div><div class="divider-bold"></div><div class="text-lg">Pagamento: <b>${pedido.metodo_pagamento.toUpperCase()}</b></div>${pedido.observacoes && pedido.observacoes !== 'App Web' && pedido.observacoes !== 'Sem obs' ? `<div class="divider"></div><div class="mt"><b>Avisos/Troco:</b><br/>${pedido.observacoes}</div>` : ''}<div class="divider-bold"></div><div class="center bold mt">Obrigado pela preferência!</div><div class="divider-bold"></div><div class="center" style="font-size: 10px; color: #666; margin-top: 10px; letter-spacing: 1px;">⚡ Powered by Dropa Delivery</div></body></html>`;
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    setTimeout(() => { janelaImpressao.print(); janelaImpressao.close(); }, 500);
  };

  // 👉 NOVA VERSÃO: Suporta fechamento normal OU adicionar itens em comanda existente
  const finalizarPedidoCaixa = (pagoAgora, idComandaExistente = null) => {
    if (carrinhoCaixa.length === 0) return toast.error("Adicione itens!");

    // Fluxo 1: Se o caixa digitou um número de comanda, nós apenas ACRESCENTAMOS
    if (idComandaExistente) {
      realizarAcaoProtegida(`Adicionar itens na Comanda #${idComandaExistente}?`, async (funcAutorizado) => {
        try {
          const itensReq = carrinhoCaixa.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_venda, obs: i.obs }));
          const res = await apiFetch(`/pedidos/${idComandaExistente}/adicionar-item`, {
            method: 'POST', body: JSON.stringify({ itens: itensReq })
          });
          if(res.ok) {
            toast.success(`✅ Itens adicionados à Comanda #${idComandaExistente}!`);
            setCarrinhoCaixa([]); setMesaInput(''); setClienteCaixaInput(''); setPrecisaTrocoCaixa(''); buscarGeral();
          } else { toast.error("❌ Comanda não encontrada no sistema."); }
        } catch(e) { toast.error("Erro de conexão ao adicionar itens."); }
      });
      return;
    }

    // Fluxo 2: Criação de um pedido/comanda totalmente novo (Seu código original)
    realizarAcaoProtegida(pagoAgora ? "Confirmar Pagamento e Finalizar?" : "Abrir Nova Comanda?", async (funcAutorizado) => {
      const obsGerais = carrinhoCaixa.filter(i => i.obs).map(i => `${i.quantidade}x ${i.nome} -> ${i.obs}`).join('\n');
      let strTroco = "";
      if (metodoPagamentoCaixa === 'dinheiro' && precisaTrocoCaixa) {
         const total = carrinhoCaixa.reduce((acc, i) => acc + (i.preco_venda * i.quantidade), 0);
         strTroco = `\n💵 PAGAMENTO: Notas de R$ ${precisaTrocoCaixa} (Troco: R$ ${(Number(precisaTrocoCaixa) - total).toFixed(2)})`;
      }
      try {
        const res = await apiFetch(`/pedidos`, { method: 'POST', body: JSON.stringify({ usuario_id: 1, metodo_pagamento: pagoAgora ? metodoPagamentoCaixa : "pendente_local", cliente_nome: clienteCaixaInput || "Consumidor Local", tipo_pedido: "local", mesa: mesaInput || "Balcão", status: pagoAgora ? "entregue" : "em_consumo", observacoes: (obsGerais ? obsGerais + "\n" : "") + strTroco + "\n" + `[${formatarDataCompleta(new Date())}] 📄 Comanda Aberta por: ${funcAutorizado.nome}`, criado_por: funcAutorizado.nome, finalizado_por: pagoAgora ? funcAutorizado.nome : null, itens: carrinhoCaixa.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unitario: i.preco_venda })) }) });
        if(res.ok) { toast.success(pagoAgora ? "✅ Venda registrada!" : "📝 Comanda aberta!"); setCarrinhoCaixa([]); setMesaInput(''); setClienteCaixaInput(''); setPrecisaTrocoCaixa(''); buscarGeral(); }
      } catch (e) {}
    });
  };

  const removerDoCarrinho = (cartItemId) => { setCarrinhoCaixa(p => p.filter(i => i.cartItemId !== cartItemId)); };

  const renderModalConfirmacaoPin = () => {
    if(!modalPin.visivel) return null;
    return (
      <Dialog
        open={modalPin.visivel}
        onClose={() => setModalPin({ visivel: false, mensagem: '', acao: null })}
        title="Acesso Restrito"
        subtitle={modalPin.mensagem}
        icon={<Shield size={22} />}
        size="sm"
        testId="modal-pin"
      >
        <div className="flex flex-col items-center py-2">
          <input
            data-testid="modal-pin-input"
            type="password"
            value={pinDigitado}
            onChange={e => setPinDigitado(e.target.value)}
            placeholder="PIN"
            className="w-full p-4 text-center text-3xl font-black rounded-theme mb-6 outline-none tracking-[0.4em] uppercase transition-all bg-bg-input border border-stroke text-primary focus:border-primary shadow-inner"
            maxLength={8}
            autoComplete="off"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') confirmarPin(); }}
          />
          <button
            data-testid="modal-pin-confirm"
            onClick={confirmarPin}
            className="w-full py-4 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all uppercase tracking-widest text-xs sm:text-sm"
          >
            Confirmar e Assinar
          </button>
        </div>
      </Dialog>
    );
  };

  const renderizarAbaAtiva = () => {
    return (
      <Suspense fallback={
        <div className="w-full h-full flex flex-col gap-4 animate-in fade-in" data-testid="module-loading-skeleton">
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <SkeletonGrid count={6} />
        </div>
      }>
        {(() => {
          switch (abaAtiva) {
            case 'pedidos': return <PainelCozinha temaEscuro={temaEscuro} pedidos={pedidos} usuarioLogado={usuarioLogado} motoboys={motoboys} despacharComMotoboy={despacharComMotoboy} setFichaPedido={setFichaPedido} mudarStatusPedido={mudarStatusPedido} realizarAcaoProtegida={realizarAcaoProtegida} />;
            case 'caixa': return <Caixa temaEscuro={temaEscuro} produtosGerente={produtosGerente} carrinhoCaixa={carrinhoCaixa} setCarrinhoCaixa={setCarrinhoCaixa} finalizarPedidoCaixa={finalizarPedidoCaixa} removerDoCarrinho={removerDoCarrinho} mesaInput={mesaInput} setMesaInput={setMesaInput} clienteCaixaInput={clienteCaixaInput} setClienteCaixaInput={setClienteCaixaInput} metodoPagamentoCaixa={metodoPagamentoCaixa} setMetodoPagamentoCaixa={setMetodoPagamentoCaixa} precisaTrocoCaixa={precisaTrocoCaixa} setPrecisaTrocoCaixa={setPrecisaTrocoCaixa} estoque={estoque} />;
            case 'estoque': return <GestaoEstoque temaEscuro={temaEscuro} produtosGerente={produtosGerente} estoque={estoque} buscarGeral={buscarGeral} />;
            case 'equipe': return <GestaoEquipe temaEscuro={temaEscuro} funcionarios={funcionarios} buscarGeral={buscarGeral} />;
            case 'cardapio': return <GestaoCardapio temaEscuro={temaEscuro} produtosGerente={produtosGerente} buscarGeral={buscarGeral} configTaxa={configTaxa} />;
            case 'fornecedores': return <GestaoFornecedores temaEscuro={temaEscuro} fornecedores={fornecedores} buscarGeral={buscarGeral} usuarioLogado={usuarioLogado} />;
            case 'motoboys': return <GestaoLogistica temaEscuro={temaEscuro} motoboys={motoboys} pedidos={pedidos} pedidosDeHoje={pedidosDeHoje} enderecoLoja={enderecoLoja} setEnderecoLoja={setEnderecoLoja} configTaxa={configTaxa} setConfigTaxa={setConfigTaxa} buscarGeral={buscarGeral} />;
            case 'analises': return <PainelAnalises temaEscuro={temaEscuro} faturamentoHoje={faturamentoHoje} pedidosDeHoje={pedidosDeHoje} pedidos={pedidos} produtosGerente={produtosGerente} />;
            case 'configuracoes': return <GestaoConfiguracoes temaEscuro={temaEscuro} configTaxa={configTaxa} setConfigTaxa={setConfigTaxa} enderecoLoja={enderecoLoja} setEnderecoLoja={setEnderecoLoja} buscarGeral={buscarGeral} />;
            case 'fechamento': return <PainelFechamento temaEscuro={temaEscuro} pedidos={pedidos} pedidosDeHoje={pedidosDeHoje} faturamentoHoje={faturamentoHoje} usuarioLogado={usuarioLogado} realizarAcaoProtegida={realizarAcaoProtegida} />;
            case 'whatsapp': return <GestaoWhatsApp />;
            case 'atendimento': return <PainelAtendimento temaEscuro={temaEscuro} />;
            case 'complementos': return <GestaoComplementos temaEscuro={temaEscuro} />;

            default: return null;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <>
      {telaAtual === 'login' && (
        <Login temaEscuro={temaEscuro} setUsuarioLogado={setUsuarioLogado} setTelaAtual={setTelaAtual} setAbaAtiva={setAbaAtiva} />
      )}

      {telaAtual === 'dashboard' && (
        <div className="font-theme bg-bg-main text-tx-main min-h-screen flex flex-col md:flex-row transition-colors duration-500 overflow-hidden">
          <div className="hidden md:flex">
             <MenuLateral temaEscuro={temaEscuro} usuarioLogado={usuarioLogado} abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} setUsuarioLogado={setUsuarioLogado} setTelaAtual={setTelaAtual} />
          </div>

          <MenuMobile abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} usuarioLogado={usuarioLogado} setUsuarioLogado={setUsuarioLogado} setTelaAtual={setTelaAtual} />
          
          <main className="flex-1 p-4 md:p-6 flex flex-col h-[calc(100vh-65px)] md:h-screen overflow-hidden relative">
            <header className="flex justify-between items-center mb-6 shrink-0 border-b border-stroke pb-4">
              <h2 className="text-2xl font-black capitalize tracking-tight flex items-center gap-3">
                {abaAtiva.replace('_', ' ')}
                {usuarioLogado && (
                  <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-theme font-bold bg-bg-input text-tx-muted border border-stroke hidden sm:inline-block">
                    OPERADOR: {usuarioLogado.nome}
                  </span>
                )}
              </h2>
              <button onClick={toggleMode} className="p-2.5 rounded-theme shadow-sm transition-colors bg-bg-surface border border-stroke text-primary hover:bg-bg-input">
                <Sun size={20} className={temaEscuro ? 'hidden' : 'block'} />
                <Moon size={20} className={temaEscuro ? 'block' : 'hidden'} />
              </button>
            </header>
            {renderizarAbaAtiva()}
          </main>

          {renderModalConfirmacaoPin()}
          
          {/* MODAL DE COMANDA */}
          {fichaPedido && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] animate-in zoom-in-95 font-theme">
               <div className="w-full max-w-2xl rounded-card overflow-hidden flex flex-col max-h-[90vh] shadow-2xl bg-bg-surface border border-stroke">
                 
                  <div className="p-5 sm:p-6 border-b border-stroke flex justify-between items-start shrink-0 bg-bg-input">
                     <div className="flex gap-4">
                       <div className="w-12 h-12 rounded-theme bg-primary/10 flex items-center justify-center text-primary shadow-sm"><FileText size={24}/></div>
                       <div>
                         <h3 className="text-xl font-black uppercase tracking-tight text-tx-main leading-tight">Comanda #{fichaPedido.id}</h3>
                         <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-theme text-[10px] font-bold uppercase tracking-wider border border-stroke text-tx-muted bg-bg-surface">
                              {fichaPedido.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-0.5 rounded-theme text-[10px] font-bold uppercase tracking-wider ${fichaPedido.tipo_pedido === 'local' ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                              {fichaPedido.tipo_pedido}
                            </span>
                         </div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 flex-col sm:flex-row">
                        <button onClick={() => imprimirComanda(fichaPedido)} className="w-full sm:w-auto p-2.5 rounded-theme transition-all border border-stroke flex items-center justify-center gap-2 text-[10px] font-black uppercase bg-bg-surface text-tx-main hover:border-primary hover:text-primary shadow-sm">
                          <Printer size={16}/> <span className="hidden sm:inline">Imprimir</span>
                        </button>
                        <button onClick={() => setFichaPedido(null)} className="w-full sm:w-auto p-2.5 flex items-center justify-center rounded-theme transition-colors bg-bg-surface text-tx-muted border border-stroke hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm">
                          <X size={18}/>
                        </button>
                     </div>
                  </div>
                  
                  <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-bg-main relative">
                    {!abaBaixaComanda ? (
                      <div className="animate-in slide-in-from-left-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="p-4 sm:p-5 rounded-theme border border-stroke shadow-sm bg-bg-input">
                              <p className="text-[10px] font-bold uppercase mb-2 tracking-widest flex items-center gap-1.5 text-tx-muted"><Users size={14}/> Cliente</p>
                              <p className="font-black text-sm sm:text-base text-tx-main">{fichaPedido.cliente_nome || "Consumidor Físico"}</p>
                              {fichaPedido.cliente_telefone && (
                                <a href={`https://wa.me/${fichaPedido.cliente_telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#22C55E] hover:underline cursor-pointer bg-[#22C55E]/10 px-2 py-1 rounded-theme">
                                  <MessageSquare size={12}/> {fichaPedido.cliente_telefone}
                                </a>
                              )}
                           </div>
                           
                           <div className="p-4 sm:p-5 rounded-theme border border-stroke shadow-sm bg-bg-input">
                              <p className="text-[10px] font-bold uppercase mb-2 tracking-widest flex items-center gap-1.5 text-tx-muted">
                                 {fichaPedido.tipo_pedido === 'local' ? <MapPin size={14}/> : <Bike size={14}/>} Localização
                              </p>
                              <p className="font-black text-sm sm:text-base text-tx-main">
                                 {fichaPedido.tipo_pedido === 'local' ? `Mesa: ${fichaPedido.mesa}` : "Endereço:"}
                              </p>
                              {fichaPedido.tipo_pedido !== 'local' && (
                                <>
                                  <p className="text-xs mt-1 leading-relaxed text-tx-muted font-medium">{fichaPedido.cliente_endereco}</p>
                                  
                                  {fichaPedido.cliente_lat && fichaPedido.cliente_lon && (
                                    <a 
                                      href={`https://www.google.com/maps?q=${fichaPedido.cliente_lat},${fichaPedido.cliente_lon}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="inline-flex items-center gap-1 mt-3 text-[10px] font-bold text-blue-500 hover:text-blue-600 transition-colors bg-blue-500/10 px-2.5 py-1.5 rounded-theme border border-blue-500/20 uppercase tracking-widest w-fit"
                                    >
                                      <MapPin size={12} /> Ver no Mapa ({Number(fichaPedido.cliente_lat).toFixed(4)}, {Number(fichaPedido.cliente_lon).toFixed(4)})
                                    </a>
                                  )}
                                </>
                              )}
                           </div>
                         </div>

                         {fichaPedido.observacoes && fichaPedido.observacoes !== 'App Web' && fichaPedido.observacoes !== 'Sem obs' && (
                           <div className="p-5 rounded-theme border border-stroke shadow-sm bg-bg-input text-tx-main mt-4 border-l-4 border-l-primary">
                             <p className="text-[10px] font-black uppercase mb-2 flex items-center gap-1.5 tracking-widest text-primary"><MessageSquare size={14}/> Histórico / Avisos (Troco)</p>
                             <p className="font-bold text-xs whitespace-pre-wrap leading-relaxed opacity-90">{fichaPedido.observacoes}</p>
                           </div>
                         )}

                         <div className="mt-6">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-tx-muted ml-1">Itens do Pedido</p>
                           <div className="rounded-theme border border-stroke shadow-sm overflow-hidden bg-bg-surface">
                             {fichaPedido.itens?.map((item, i) => (
                               <div key={i} className="flex justify-between items-start p-4 sm:p-5 border-b border-stroke last:border-0 hover:bg-bg-input/50 transition-colors">
                                  <div className="flex gap-3 items-start min-w-0 pr-4">
                                     <span className="font-black text-sm w-8 h-8 flex items-center justify-center rounded-theme shrink-0 text-tx-primary bg-primary shadow-sm">{item.quantidade}x</span>
                                     <div>
                                       <span className="font-black text-sm sm:text-base leading-tight block text-tx-main">{traduzirProduto(item.produto_id)}</span>
                                       {item.obs && <span className="text-[10px] font-bold block mt-1.5 italic text-tx-muted leading-relaxed">↳ {item.obs}</span>}
                                     </div>
                                  </div>
                                  <span className="font-black text-sm sm:text-base shrink-0 text-tx-main">R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
                               </div>
                             ))}
                           </div>
                         </div>

                         <div className="pt-5 mt-6 border-t border-stroke space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold text-tx-muted">
                               <span>Subtotal dos Itens</span>
                               <span>R$ {(Number(fichaPedido.total) - Number(fichaPedido.taxa_entrega || 0)).toFixed(2)}</span>
                            </div>
                            {Number(fichaPedido.taxa_entrega) > 0 && (
                              <div className="flex justify-between items-center text-xs font-bold text-tx-muted">
                                 <span>Taxa de Frete/Rota</span>
                                 <span>+ R$ {Number(fichaPedido.taxa_entrega).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-end pt-4 mt-4 border-t border-stroke">
                               <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted">Total Faturado</p>
                                  <p className="text-[10px] font-black uppercase mt-1 text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block border border-primary/20">Via {fichaPedido.metodo_pagamento}</p>
                               </div>
                               <span className="text-4xl font-black text-primary tracking-tighter">R$ {Number(fichaPedido.total).toFixed(2)}</span>
                            </div>
                         </div>
                        
                         {fichaPedido.tipo_pedido === 'local' && fichaPedido.status !== 'entregue' && (
                           <div className="pt-5 mt-6 border-t border-stroke">
                             <button onClick={() => setAbaBaixaComanda(true)} className="w-full py-4 sm:py-5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs sm:text-sm active:scale-95">
                               💲 Receber e Encerrar Comanda
                             </button>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="space-y-6 animate-in slide-in-from-right-4 pt-2">
                         <div className="text-center mb-8 p-6 bg-bg-input rounded-theme border border-stroke">
                            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 text-tx-muted">Total a Receber</h4>
                            <span className="text-5xl font-black text-primary tracking-tighter">R$ {Number(fichaPedido.total).toFixed(2)}</span>
                         </div>
                         
                         <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted ml-1">Como o cliente vai pagar?</label>
                            <select value={metodoPagamentoBaixa} onChange={e => { setMetodoPagamentoBaixa(e.target.value); setValorRecebidoBaixa(''); }} className="w-full p-4 rounded-theme outline-none font-bold text-sm uppercase tracking-wide cursor-pointer border border-stroke bg-bg-surface text-tx-main focus:border-primary transition-colors shadow-sm">
                               <option value="pix">PIX Instantâneo</option>
                               <option value="cartao">Máquina de Cartão</option>
                               <option value="dinheiro">Dinheiro Físico</option>
                            </select>

                            {metodoPagamentoBaixa === 'dinheiro' && (
                               <div className="animate-in slide-in-from-top-2 relative mt-5">
                                  <span className="absolute -top-2 left-3 px-1 text-[10px] font-black uppercase tracking-widest bg-bg-main text-secondary">Valor Recebido (R$)</span>
                                  <input type="number" placeholder="Ex: 50" value={valorRecebidoBaixa} onChange={e => setValorRecebidoBaixa(e.target.value)} className="w-full p-4 sm:p-5 rounded-theme outline-none font-black text-2xl transition-colors border border-stroke bg-bg-surface text-tx-main focus:border-secondary shadow-sm text-center" />
                                  
                                  {Number(valorRecebidoBaixa) > Number(fichaPedido.total) && (
                                     <div className="mt-4 p-4 bg-secondary/10 border border-secondary/20 rounded-theme text-secondary font-black flex justify-between items-center shadow-theme animate-in zoom-in-95">
                                       <span className="text-xs uppercase tracking-widest">Devolver Troco:</span>
                                       <span className="text-2xl">R$ {(Number(valorRecebidoBaixa) - Number(fichaPedido.total)).toFixed(2)}</span>
                                     </div>
                                  )}
                               </div>
                            )}
                         </div>

                         <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 mt-6 border-t border-stroke">
                            <button onClick={() => setAbaBaixaComanda(false)} className="w-full sm:w-1/3 p-4 font-bold rounded-theme border border-stroke transition-colors text-xs uppercase tracking-wider bg-bg-input text-tx-muted hover:text-primary">Voltar</button>
                            
                            <button onClick={() => {
                                realizarAcaoProtegida("Confirmar Recebimento", (funcAutorizado) => {
                                   let obsTroco = "";
                                   if (metodoPagamentoBaixa === 'dinheiro' && valorRecebidoBaixa) {
                                      const troco = Number(valorRecebidoBaixa) - Number(fichaPedido.total);
                                      obsTroco = `\n💵 Pago c/ R$ ${valorRecebidoBaixa} (Troco: R$ ${troco.toFixed(2)})`;
                                   }
                                   mudarStatusPedido(fichaPedido.id, 'entregue', funcAutorizado.nome, metodoPagamentoBaixa, obsTroco);
                                });
                            }} className="w-full sm:flex-[2] p-4 bg-green-500 text-white font-black rounded-theme shadow-theme hover:bg-green-600 active:scale-95 text-xs sm:text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                               Confirmar Baixa <Check size={18}/>
                            </button>
                         </div>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {telaAtual === 'cliente' && (
        <LojaDigital 
          temaEscuro={temaEscuro} 
          setTemaEscuro={() => {}} 
          setTelaAtual={setTelaAtual} 
          produtosLoja={produtosLoja} 
          produtosGerente={produtosGerente} 
          estoque={estoque} 
          pedidos={pedidos} 
          enderecoLoja={enderecoLoja} 
          configTaxa={configTaxa} 
          telefoneLojaWhatsApp={telefoneLojaWhatsApp} 
          buscarGeral={buscarGeral} 
        />
      )}

      {/* 👉 RENDERIZA A TELA DE TRACKING SE A URL TIVER "?tracking=ID" */}
      {telaAtual === 'tracking' && (
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-bg-main text-primary">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <LojaTracking 
            pedidos={pedidos} 
            motoboys={motoboys} 
            configTaxa={configTaxa} 
          />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Toaster richColors position="bottom-right" theme="system" />
      <SistemaPrincipal />
    </ThemeProvider>
  );
}