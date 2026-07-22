// src/pages/Cliente/Checkout.jsx
import React, { useState } from 'react';
import { MapPin, ChevronRight, Clock, ShieldAlert, Check, ShoppingBag, MessageSquare, CreditCard, User, Tag } from 'lucide-react';
import BuscadorEndereco from '../../components/BuscadorEndereco';
import { API_URL, publicFetch } from '../../services/api';

export default function Checkout({
  carrinho,
  valorTotalCarrinho,
  configTaxa,
  onVoltar, 
  onSucesso, 
  temaEscuro,
  telefoneLojaWhatsApp,
  buscarGeral,
  cupomAtivo // 👉 1. NOVO PARÂMETRO RECEBIDO DA LOJADIGITAL
}) {
  const [passoCheckout, setPassoCheckout] = useState(1);
  const [carregandoCpf, setCarregandoCpf] = useState(false);
  const [dadosCliente, setDadosCliente] = useState({ nome: '', cpf: '', telefone: '', cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', metodo_pagamento: 'pix' });
  const [precisaTrocoCliente, setPrecisaTrocoCliente] = useState(''); 
  const [obsGeral, setObsGeral] = useState(''); 
  
  const [taxaCalculadaCliente, setTaxaCalculadaCliente] = useState(0);
  const [distanciaCalculadaCliente, setDistanciaCalculadaCliente] = useState(0);
  const [tempoEstimadoCliente, setTempoEstimadoCliente] = useState(0);
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [erroRaio, setErroRaio] = useState(false);

  const formatarCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');

  const verificarCpfEAvancar = async () => {
    const cpfLimpo = dadosCliente.cpf.replace(/\D/g, ''); 
    if (cpfLimpo.length !== 11) return alert("CPF incompleto.");
    setCarregandoCpf(true);
    try {
      const res = await publicFetch(`/clientes/${cpfLimpo}`);
      if (res.ok) { 
        const dados = await res.json(); 
        let ruaExtraida = ''; let numeroExtraido = '';
        if (dados.enderecoCompleto) {
           const partes = dados.enderecoCompleto.split(',');
           ruaExtraida = partes[0] ? partes[0].trim() : '';
           if (partes[1]) numeroExtraido = partes[1].trim().split(' ')[0].split('-')[0];
        }
        setDadosCliente(p => ({ 
          ...p, nome: dados.nome || p.nome, telefone: dados.telefone || p.telefone, rua: dados.rua || ruaExtraida, numero: dados.numero || numeroExtraido, bairro: dados.bairro || '', cep: dados.cep || '', lat: dados.lat || null, lon: dados.lon || null
        })); 
      } 
    } catch (e) {} 
    finally { setCarregandoCpf(false); setPassoCheckout(2); }
  };

  const calcularFreteAvancado = async (clienteCoords) => {
    const lojaLat = configTaxa?.latLoja;
    const lojaLon = configTaxa?.lonLoja;
    const raioMaximoKm = Number(configTaxa?.raioMaximoKm) || 15; 

    if (!lojaLat || !lojaLon) {
      console.warn("Localização da loja não configurada.");
      setCalculandoFrete(false); return;
    }
    
    setCalculandoFrete(true); setErroRaio(false);

    try {
      let kmFinal = 0; let usouAPI = false;

      try { 
        const LOCATIONIQ_KEY = "pk.1a96e13ee8575ca445f29fdfa4f4e1ee"; 
        const resRoute = await fetch(`https://us1.locationiq.com/v1/directions/driving/${lojaLon},${lojaLat};${clienteCoords.lon},${clienteCoords.lat}?key=${LOCATIONIQ_KEY}&overview=false`);
        if (resRoute.ok) { 
          const dataRoute = await resRoute.json(); 
          if (dataRoute.routes && dataRoute.routes.length > 0) { 
            kmFinal = dataRoute.routes[0].distance / 1000; usouAPI = true;
          } 
        } 
      } catch (e) {}

      if (!usouAPI) {
        const R = 6371; const dLat = (clienteCoords.lat - lojaLat) * Math.PI / 180; const dLon = (clienteCoords.lon - lojaLon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lojaLat * Math.PI / 180) * Math.cos(clienteCoords.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        kmFinal = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) * 1.3; 
      }

      if (kmFinal < 0.1) kmFinal = 0.1;

      if (kmFinal > raioMaximoKm) {
         setDistanciaCalculadaCliente(kmFinal.toFixed(1)); setErroRaio(true); return;
      }

      let base = Number(configTaxa?.base) || 5; 
      let pKm = Number(configTaxa?.porKm) || 1.5; 
      const min = Number(configTaxa?.tempoKmMinutos) || 4;

      if (configTaxa?.chovendo) { base += 2.00; pKm += 0.50; } 
      
      const taxa = base + (kmFinal * pKm); 
      const tempo = Math.ceil(kmFinal * min) + (configTaxa?.chovendo ? 25 : 15); 
      
      setDistanciaCalculadaCliente(kmFinal.toFixed(1)); 
      setTaxaCalculadaCliente(taxa); 
      setTempoEstimadoCliente(tempo);

    } catch (e) {} 
    finally { setCalculandoFrete(false); }
  };

  const enviarPedidoReal = async (e) => { 
    e.preventDefault(); 
    if (carrinho.length === 0) return alert("Carrinho vazio!"); 
    if (erroRaio) return alert("O endereço está fora da nossa área de entrega.");
    if (taxaCalculadaCliente === 0 && distanciaCalculadaCliente === 0) return alert("Aguarde o cálculo do frete no mapa!");

    const eFinal = `${dadosCliente.rua}, ${dadosCliente.numero} ${dadosCliente.complemento ? '('+dadosCliente.complemento+')' : ''} - ${dadosCliente.bairro}, ${dadosCliente.cidade} - CEP: ${dadosCliente.cep}`; 
    
    // 👉 LÓGICA FINAL MATEMÁTICA: Subtotal + Frete - Desconto
    const valorOriginalSemFrete = carrinho.reduce((total, item) => total + (item.preco_venda * item.quantidade), 0);
    const descontoCupom = cupomAtivo ? Number(cupomAtivo.valor_descontado) : 0;
    const totF = Math.max(0, valorOriginalSemFrete + Number(taxaCalculadaCliente) - descontoCupom); 
    
    let infoTr = ""; 
    if (dadosCliente.metodo_pagamento === 'dinheiro' && precisaTrocoCliente) { 
       const valorTrocoCalculado = Number(precisaTrocoCliente) - totF;
       infoTr = `\n💵 TROCO: Levar R$ ${valorTrocoCalculado.toFixed(2)} (Pago com R$ ${precisaTrocoCliente})`; 
    } 

    let observacoesFinais = "";
    if (obsGeral.trim()) observacoesFinais += `\n\n📌 OBSERVAÇÃO DO CLIENTE:\n${obsGeral.trim()}`;
    const obsItens = carrinho.filter(i => i.obs).map(i => `${i.quantidade}x ${i.nome} -> ${i.obs}`).join('\n'); 
    if (obsItens) observacoesFinais += `\n\n🛒 OBSERVAÇÕES DOS ITENS:\n${obsItens}`;
    

    // 👉 A MÁGICA AQUI: Salvar o cupom direto na observação para aparecer na comanda e na impressão!
    if (cupomAtivo) {
      observacoesFinais += `\n\n🎟️ CUPOM APLICADO: ${cupomAtivo.codigo} (- R$ ${descontoCupom.toFixed(2)})`;
    }

    observacoesFinais += infoTr;
    
    // 👉 2. PAYLOAD ATUALIZADO ENVIANDO CUPOM_ID e VALOR_DESCONTO
    const pedW = { 
      usuario_id: 1, metodo_pagamento: dadosCliente.metodo_pagamento, 
      observacoes: observacoesFinais.trim(), 
      cliente_nome: dadosCliente.nome, cliente_cpf: dadosCliente.cpf.replace(/\D/g, ''), cliente_telefone: dadosCliente.telefone, 
      cliente_endereco: eFinal, taxa_entrega: taxaCalculadaCliente, distancia_km: distanciaCalculadaCliente, total: totF, 
      cliente_lat: dadosCliente.lat || null, cliente_lon: dadosCliente.lon || null,
      cupom_id: cupomAtivo ? cupomAtivo.cupom_id : null,
      valor_desconto: descontoCupom,
      itens: carrinho.map(i => ({ produto_id: i.produto_id, nome: i.nome, quantidade: i.quantidade, preco_unitario: i.preco_venda, obs: i.obs })) 
    }; 
    
    try { 
      const res = await publicFetch(`/pedidos`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(pedW) 
      }); 
      
      if (res.ok) { 
        const pedidoSalvoNoBanco = await res.json(); 
        pedidoSalvoNoBanco.itens = carrinho.map(i => ({
          nome: i.nome,
          quantidade: i.quantidade,
          preco_unitario: i.preco_venda,
          obs: i.obs
        }));
        
        // Passa o desconto formatado pro WhatsApp
        pedidoSalvoNoBanco.desconto = descontoCupom; 

        buscarGeral(); 
        onSucesso(pedidoSalvoNoBanco); 
      } else {
        const erroJson = await res.json();
        alert(`Erro: ${erroJson.erro || "Falha ao enviar o pedido para a cozinha."}`);
      }
    } 
    catch (e) { 
      console.error(e);
      alert("Falha de comunicação com o servidor.");
    }
  };

  // Cálculo original para exibição limpa do resumo
  const valorOriginalSemFrete = carrinho.reduce((total, item) => total + (item.preco_venda * item.quantidade), 0);
  const descontoAtual = cupomAtivo ? Number(cupomAtivo.valor_descontado) : 0;
  const valorFinalTela = Math.max(0, valorOriginalSemFrete + Number(taxaCalculadaCliente) - descontoAtual);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 font-theme w-full max-w-2xl mx-auto pb-10">
      
      {/* Indicador de Passos */}
      <div className="flex justify-between items-center mb-8 px-2 sm:px-4">
        <div className={`flex flex-col items-center gap-2 ${passoCheckout >= 1 ? 'text-primary' : 'text-tx-muted opacity-50'}`}>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${passoCheckout >= 1 ? 'border-primary bg-primary/10' : 'border-stroke bg-bg-input'}`}>1</div>
           <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Identificação</span>
        </div>
        <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${passoCheckout >= 2 ? 'bg-primary' : 'bg-stroke'}`}></div>
        <div className={`flex flex-col items-center gap-2 ${passoCheckout >= 2 ? 'text-primary' : 'text-tx-muted opacity-50'}`}>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${passoCheckout >= 2 ? 'border-primary bg-primary/10' : 'border-stroke bg-bg-input'}`}>2</div>
           <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Endereço</span>
        </div>
        <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full ${passoCheckout >= 3 ? 'bg-primary' : 'bg-stroke'}`}></div>
        <div className={`flex flex-col items-center gap-2 ${passoCheckout >= 3 ? 'text-primary' : 'text-tx-muted opacity-50'}`}>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 ${passoCheckout >= 3 ? 'border-primary bg-primary/10' : 'border-stroke bg-bg-input'}`}>3</div>
           <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Pagamento</span>
        </div>
      </div>
      
      {passoCheckout === 1 && (
        <div className="p-6 md:p-8 rounded-card border border-stroke shadow-theme max-w-md mx-auto bg-bg-surface animate-in slide-in-from-left-8">
           <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <User size={28} />
              </div>
              <h2 className="text-2xl font-black text-tx-main tracking-tight">Quem é você?</h2>
              <p className="text-xs font-bold text-tx-muted mt-2">Precisamos do seu CPF para emitir o pedido e buscar seu histórico de endereços.</p>
           </div>
           
           <div className="space-y-6 mt-8">
             <div className="space-y-2 relative">
               <span className="absolute -top-2 left-3 bg-bg-surface px-1 text-[10px] font-black uppercase tracking-widest text-primary">Seu CPF</span>
               <input 
                 required 
                 value={dadosCliente.cpf} 
                 onChange={e => setDadosCliente({...dadosCliente, cpf: formatarCPF(e.target.value)})} 
                 type="text" 
                 inputMode="numeric"
                 placeholder="000.000.000-00" 
                 className="w-full p-5 text-xl font-black text-center tracking-widest rounded-theme outline-none transition-all border-2 border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface focus:shadow-md" 
               />
             </div>
             
             <div className="flex gap-3 pt-4">
               <button onClick={onVoltar} className="flex-1 p-4 font-bold rounded-theme border border-stroke transition-colors bg-bg-input text-tx-muted hover:text-primary hover:border-primary/30 uppercase tracking-wider text-xs shadow-sm">
                 Cancelar
               </button>
               <button onClick={verificarCpfEAvancar} disabled={carregandoCpf || dadosCliente.cpf.length < 14} className="flex-[2] p-4 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-2 uppercase tracking-wider text-sm">
                 {carregandoCpf ? 'Buscando...' : 'Avançar'} <ChevronRight size={18}/>
               </button>
             </div>
           </div>
        </div>
      )}

      {passoCheckout === 2 && (
         <div className="space-y-6 animate-in slide-in-from-right-8">
            <div className="p-6 md:p-8 rounded-card border border-stroke shadow-theme space-y-5 bg-bg-surface">
              <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-tx-main">
                <User size={16} className="text-primary"/> Seus Dados
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted">Nome Completo</span>
                  <input value={dadosCliente.nome} onChange={e => setDadosCliente({...dadosCliente, nome: e.target.value})} placeholder="Como quer ser chamado?" className="w-full p-4 text-sm font-bold rounded-theme outline-none border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface transition-all shadow-sm" />
                </div>
                <div className="relative mt-2 sm:mt-0">
                  <span className="absolute -top-2.5 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted">WhatsApp (Com DDD)</span>
                  <input value={dadosCliente.telefone} inputMode="numeric" onChange={e => setDadosCliente({...dadosCliente, telefone: e.target.value})} placeholder="Ex: 11999999999" className="w-full p-4 text-sm font-bold rounded-theme outline-none border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface transition-all shadow-sm" />
                </div>
              </div>
            </div>
            
            <BuscadorEndereco 
              temaEscuro={temaEscuro} 
              enderecoInicial={dadosCliente} 
              latLoja={configTaxa?.latLoja}
              lonLoja={configTaxa?.lonLoja}
              onEnderecoConfirmado={(dadosMapa) => {
                if (!dadosCliente.nome || !dadosCliente.telefone) return alert("Por favor, preencha seu Nome e WhatsApp antes de avançar.");
                setDadosCliente(prev => ({ ...prev, rua: dadosMapa.rua, numero: dadosMapa.numero, complemento: dadosMapa.complemento, bairro: dadosMapa.bairro, cidade: dadosMapa.cidade, cep: dadosMapa.cep, lat: dadosMapa.lat, lon: dadosMapa.lon }));
                calcularFreteAvancado(dadosMapa);
                setPassoCheckout(3);
              }}
            />
            
            <button onClick={() => setPassoCheckout(1)} className="w-full p-4 font-bold rounded-theme border border-stroke transition-colors text-xs uppercase tracking-wider bg-bg-input text-tx-muted hover:text-primary shadow-sm hover:border-primary/30">
              Voltar e corrigir CPF
            </button>
         </div>
      )}

      {passoCheckout === 3 && (
        <form onSubmit={enviarPedidoReal} className="space-y-6 animate-in slide-in-from-right-8">
            <div className="p-5 sm:p-8 rounded-card border border-stroke shadow-2xl relative overflow-hidden bg-bg-surface">
              
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-bl-full pointer-events-none"></div>
              
              {/* LISTA DE ITENS DO CARRINHO */}
              <div className="mb-6 border-b border-stroke pb-6 relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-widest mb-5 text-tx-main flex items-center gap-2">
                  <ShoppingBag size={14} className="text-primary"/> Revise seu Pedido
                </h3>
                <div className="space-y-3">
                  {carrinho.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 text-sm font-bold text-tx-main hover:bg-bg-input/80 p-3 -mx-3 rounded-theme transition-colors border border-transparent hover:border-stroke">
                       <div className="flex gap-3 items-start min-w-0">
                          <span className="text-tx-primary bg-primary w-6 h-6 flex items-center justify-center rounded-md shrink-0 text-xs shadow-sm">{item.quantidade}x</span>
                          <div className="flex flex-col">
                            <span className="leading-tight">{item.nome}</span>
                            {item.obs && <span className="text-[10px] text-tx-muted font-medium mt-1 leading-snug italic">↳ {item.obs}</span>}
                          </div>
                       </div>
                       <span className="shrink-0">R$ {(item.preco_venda * item.quantidade).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CAMPO DE OBSERVAÇÃO GERAL */}
              <div className="mb-6 border-b border-stroke pb-6 relative z-10">
                 <label className="text-[10px] font-black uppercase tracking-widest block mb-3 text-tx-main flex items-center gap-2">
                   <MessageSquare size={14} className="text-primary"/> Observações da Entrega
                 </label>
                 <textarea
                   value={obsGeral}
                   onChange={(e) => setObsGeral(e.target.value)}
                   placeholder="Ex: Tocar o interfone 202, deixar na portaria, sem cebola..."
                   className="w-full p-4 rounded-theme outline-none h-24 resize-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface text-sm font-medium shadow-sm placeholder:text-tx-muted/60"
                 />
              </div>

              {/* RESUMO FINANCEIRO E PAGAMENTO */}
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-5 text-tx-main flex items-center gap-2">
                <CreditCard size={14} className="text-primary" /> Financeiro e Pagamento
              </h3>

              {calculandoFrete ? (
                <div className="flex items-center gap-2 mb-6 w-fit px-4 py-2.5 rounded-theme bg-primary/10 text-primary animate-pulse border border-primary/20 shadow-sm"><Clock size={16}/><span className="text-[10px] font-bold uppercase tracking-wider">Mapeando Rota...</span></div>
              ) : erroRaio ? (
                <div className="flex items-center gap-2 mb-6 w-fit px-4 py-2.5 rounded-theme bg-red-500/10 border border-red-500/20 shadow-sm"><ShieldAlert size={16} className="text-red-500"/><span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Fora da Área ({distanciaCalculadaCliente} km)</span></div>
              ) : tempoEstimadoCliente > 0 && (
                <div className="flex items-center gap-2 mb-6 w-fit px-4 py-2.5 rounded-theme border border-secondary/20 bg-secondary/10 text-secondary shadow-sm"><Clock size={16} /><span className="text-[10px] font-bold uppercase tracking-wider">Entrega aprox. {tempoEstimadoCliente} min</span></div>
              )}

              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-xs font-bold text-tx-muted">Valor dos Produtos</span>
                <span className={`text-base font-bold ${cupomAtivo ? 'text-tx-muted line-through' : 'text-tx-main'}`}>R$ {valorOriginalSemFrete.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-xs font-bold flex items-center gap-2 text-primary">Frete Delivery</span>
                <span className={`text-base font-black ${erroRaio ? 'text-red-500' : 'text-primary'}`}>{erroRaio ? 'Bloqueado' : taxaCalculadaCliente > 0 ? `+ R$ ${taxaCalculadaCliente.toFixed(2)}` : 'Grátis'}</span>
              </div>

              {/* 👉 3. NOVA LINHA: EXIBIÇÃO DO DESCONTO ANTES DO FECHAMENTO */}
              {cupomAtivo && (
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-stroke px-1 animate-in slide-in-from-top-2">
                  <span className="text-xs font-black uppercase tracking-widest text-green-500 flex items-center gap-1.5"><Tag size={14}/> Desconto Especial</span>
                  <span className="text-base font-black text-green-500">- R$ {descontoAtual.toFixed(2)}</span>
                </div>
              )}

              {/* Se não tiver cupom, eu desenho a linha de baixo para o design ficar correto */}
              {!cupomAtivo && <div className="border-b border-stroke mb-6 w-full"></div>}
              
              <div className="flex justify-between items-end mb-8 bg-bg-input p-4 rounded-theme border border-stroke">
                <span className="text-[10px] text-tx-muted font-black uppercase tracking-widest">Custo Final</span>
                <span className="text-4xl sm:text-5xl text-primary font-black tracking-tighter leading-none">R$ {erroRaio ? '---' : valorFinalTela.toFixed(2)}</span>
              </div>
              
              <div className="relative pt-2">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-primary">Como vai pagar?</span>
                <select value={dadosCliente.metodo_pagamento} onChange={e => { setDadosCliente({...dadosCliente, metodo_pagamento: e.target.value}); setPrecisaTrocoCliente(''); }} className="w-full p-4 sm:p-5 rounded-theme outline-none font-black text-sm sm:text-base uppercase tracking-wide cursor-pointer border-2 border-stroke transition-colors bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm">
                  <option value="pix">PIX (Chave Celular/CPF)</option>
                  <option value="cartao">Máquina de Cartão (Na Entrega)</option>
                  <option value="dinheiro">Dinheiro (Na Entrega)</option>
                </select>
                
                  {dadosCliente.metodo_pagamento === 'dinheiro' && (
                    <div className="mt-6 animate-in slide-in-from-top-2 relative">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-secondary">Troco p/ quanto?</span>
                      <input type="number" placeholder="Ex: 100" value={precisaTrocoCliente} onChange={e => setPrecisaTrocoCliente(e.target.value)} className="w-full p-4 sm:p-5 rounded-theme outline-none font-black text-2xl transition-colors border-2 border-stroke bg-bg-input text-tx-main focus:border-secondary focus:bg-bg-surface shadow-sm text-center" />
                    </div>
                  )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10">
                <button type="button" onClick={() => setPassoCheckout(2)} className="w-full sm:w-1/3 p-4 font-bold rounded-theme border border-stroke transition-colors text-xs uppercase tracking-wider bg-bg-input text-tx-muted hover:text-primary hover:border-primary/30 shadow-sm">Voltar e Editar</button>
                
                <button type="submit" disabled={calculandoFrete || erroRaio || (taxaCalculadaCliente === 0 && distanciaCalculadaCliente === 0)} className="w-full sm:flex-[2] p-4 sm:p-5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2">
                  Confirmar Pedido <Check size={18}/>
                </button>
              </div>
            </div>
        </form>
      )}
    </div>
  );
}