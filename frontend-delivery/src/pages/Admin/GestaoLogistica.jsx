// src/pages/Admin/GestaoLogistica.jsx
import React, { useState, Fragment } from 'react';
import { Navigation, MapPin, UserPlus, Phone, Edit, Trash2, CloudRain, ShieldAlert, Save } from 'lucide-react';
import BuscadorEndereco from '../../components/BuscadorEndereco'; 
import { API_URL, apiFetch } from '../../services/api';

export default function GestaoLogistica({
  temaEscuro, 
  motoboys, pedidos, pedidosDeHoje, 
  enderecoLoja, setEnderecoLoja, configTaxa, setConfigTaxa, buscarGeral
}) {
  const [novoMotoboy, setNovoMotoboy] = useState({ nome: '', placa: '', telefone: '', comissao: '' });
  const [motoboyEditandoId, setMotoboyEditandoId] = useState(null);
  const [motoboyExpandidoId, setMotoboyExpandidoId] = useState(null);
  const [abaHistoricoMoto, setAbaHistoricoMoto] = useState('hoje'); 

  const formatarDataCompleta = (d) => !d ? '--:--' : new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const salvarConfigLoja = async () => {
    try { 
      const res = await apiFetch(`/config`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          endereco: enderecoLoja || '', 
          taxa_base: Number(configTaxa.base) || 0, 
          taxa_km: Number(configTaxa.porKm) || 0, 
          tempo_km_minutos: Number(configTaxa.tempoKmMinutos) || 0,
          lat_loja: configTaxa.latLoja ? Number(configTaxa.latLoja) : -22.778842,
          lon_loja: configTaxa.lonLoja ? Number(configTaxa.lonLoja) : -47.294411,
          raio_maximo: Number(configTaxa.raioMaximoKm) || 15,
          chovendo: Boolean(configTaxa.chovendo)
        }) 
      }); 
      
      if (!res.ok) throw new Error(`Erro do servidor: ${res.status}`);
      alert("✅ Configurações de Logística atualizadas!"); 
    } catch (e) { 
      console.error(e);
      alert("❌ Erro ao salvar config. Verifique o console do seu Back-end."); 
    }
  };

  const salvarMotoboy = async (e) => {
    e.preventDefault();
    try { await fetch(motoboyEditandoId ? `${API_URL}/motoboys/${motoboyEditandoId}` : `${API_URL}/motoboys`, { method: motoboyEditandoId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoMotoboy.nome, placa: novoMotoboy.placa, telefone: novoMotoboy.telefone, comissao: Number(novoMotoboy.comissao) }) }); setNovoMotoboy({ nome: '', placa: '', telefone: '', comissao: '' }); setMotoboyEditandoId(null); buscarGeral(); alert("✅ Entregador salvo!"); } catch (e) { }
  };

  const deletarMotoboy = async (id) => { if(!window.confirm("Excluir entregador?")) return; try { await apiFetch(`/motoboys/${id}`, { method: 'DELETE' }); buscarGeral(); } catch(e) {} };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in h-full font-theme overflow-y-auto lg:overflow-hidden pb-24 lg:pb-0 w-full max-w-[1400px] mx-auto">
      
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-0 lg:pb-6">
        
        {/* =========================================
            COLUNA ESQUERDA: GPS E REGRAS
            ========================================= */}
        <div className="lg:w-1/2 flex flex-col p-5 sm:p-6 md:p-8 rounded-card border border-stroke shadow-theme h-fit lg:h-full lg:overflow-y-auto custom-scrollbar bg-bg-surface animate-in slide-in-from-left-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-5 mb-6 border-stroke shrink-0 sticky top-0 bg-bg-surface z-10 gap-4">
             <h3 className="text-base sm:text-xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
               <Navigation size={24}/> Matriz GPS e Regras
             </h3>
             <button onClick={salvarConfigLoja} className="w-full sm:w-auto bg-primary text-tx-primary px-6 py-3.5 rounded-theme text-xs font-black transition-all shadow-theme hover:bg-primary-hover active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2">
               <Save size={16}/> Salvar Config
             </button>
          </div>

          <div className="space-y-8 pb-4">
            
            {/* Localização */}
            <div className="animate-in slide-in-from-bottom-2">
              <label className="text-xs font-black uppercase tracking-widest mb-3 block text-tx-muted flex items-center gap-1.5"><MapPin size={14} className="text-primary"/> 1. Localização Fixa da Loja</label>
              <p className="text-[10px] mb-3 text-tx-muted uppercase tracking-widest bg-bg-input p-3 rounded-theme border border-stroke border-l-4 border-l-primary shadow-sm">
                Endereço Atual: <strong className="text-tx-main ml-1">{enderecoLoja}</strong>
              </p>
              <div className="rounded-card overflow-hidden shadow-sm border border-stroke">
                <BuscadorEndereco
                    temaEscuro={temaEscuro}
                    onEnderecoConfirmado={(dadosMapa) => {
                      const endFormatado = `${dadosMapa.rua}, ${dadosMapa.numero} - ${dadosMapa.bairro || dadosMapa.cidade}`;
                      setEnderecoLoja(endFormatado);
                      setConfigTaxa(prev => ({ ...prev, latLoja: dadosMapa.lat, lonLoja: dadosMapa.lon }));
                      alert("📍 Endereço capturado! Agora clique no botão azul 'Salvar Config'.");
                    }}
                />
              </div>
            </div>

            {/* Precificação */}
            <div className="border-t border-stroke pt-6 animate-in slide-in-from-bottom-2" style={{ animationDelay: '100ms' }}>
              <label className="text-xs font-black uppercase tracking-widest mb-4 block text-tx-muted">2. Precificação Base</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                <div className="relative group">
                  <span className="absolute -top-2 left-3 px-1.5 text-[9px] uppercase font-black text-tx-muted bg-bg-surface group-focus-within:text-primary transition-colors tracking-widest">Taxa Saída (R$)</span>
                  <input type="number" step="0.01" value={configTaxa.base || 0} onChange={e=>setConfigTaxa({...configTaxa, base: e.target.value})} className="w-full p-4 rounded-theme font-black outline-none text-center transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
                </div>
                <div className="relative group">
                  <span className="absolute -top-2 left-3 px-1.5 text-[9px] uppercase font-black text-tx-muted bg-bg-surface group-focus-within:text-primary transition-colors tracking-widest">Adicional/KM (R$)</span>
                  <input type="number" step="0.01" value={configTaxa.porKm || 0} onChange={e=>setConfigTaxa({...configTaxa, porKm: e.target.value})} className="w-full p-4 rounded-theme font-black outline-none text-center transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
                </div>
                <div className="relative group">
                  <span className="absolute -top-2 left-3 px-1.5 text-[9px] uppercase font-black text-tx-muted bg-bg-surface group-focus-within:text-primary transition-colors tracking-widest">Tempo/KM (Min)</span>
                  <input type="number" value={configTaxa.tempoKmMinutos || 0} onChange={e=>setConfigTaxa({...configTaxa, tempoKmMinutos: e.target.value})} className="w-full p-4 rounded-theme font-black outline-none text-center transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
                </div>
              </div>
            </div>

            {/* Dinâmicos */}
            <div className="border-t border-stroke pt-6 animate-in slide-in-from-bottom-2" style={{ animationDelay: '150ms' }}>
              <label className="text-xs font-black uppercase tracking-widest block mb-4 text-tx-muted">3. Modificadores Dinâmicos</label>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                 
                 <div className="flex-1 relative group bg-bg-surface">
                    <span className="absolute -top-2 left-3 px-1.5 text-[9px] uppercase font-black tracking-widest text-tx-muted bg-bg-surface group-focus-within:text-red-500 transition-colors flex items-center gap-1"><ShieldAlert size={10}/> Raio Máximo (KM)</span>
                    <input type="number" value={configTaxa.raioMaximoKm || ''} onChange={e=>setConfigTaxa({...configTaxa, raioMaximoKm: e.target.value})} placeholder="Ex: 15" className="w-full p-5 text-3xl font-black rounded-theme outline-none text-center transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-red-500 focus:text-red-500 focus:bg-bg-surface shadow-sm"/>
                 </div>
                 
                 {/* MODO CHUVA PREMIUM */}
                 <label className={`flex-1 p-5 rounded-theme border-2 flex flex-col justify-center items-center gap-2 cursor-pointer transition-all duration-300 shadow-sm relative overflow-hidden ${configTaxa.chovendo ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/30 scale-[1.02]' : 'bg-bg-input border-stroke text-tx-muted hover:border-secondary/50 hover:bg-bg-surface'}`}>
                    {configTaxa.chovendo && <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none"></div>}
                    <input type="checkbox" checked={configTaxa.chovendo || false} onChange={e=>setConfigTaxa({...configTaxa, chovendo: e.target.checked})} className="hidden" />
                    <CloudRain size={32} className={configTaxa.chovendo ? 'text-white' : 'text-tx-muted'}/>
                    <span className={`text-[10px] font-black uppercase text-center tracking-widest leading-relaxed ${configTaxa.chovendo ? 'text-white' : 'text-tx-muted'}`}>
                      Modo Chuva<br/>
                      <span className="opacity-80">(+R$2 / +Tempo)</span>
                    </span>
                 </label>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================
            COLUNA DIREITA: FORMULÁRIO E LISTA DE MOTOBOYS
            ========================================= */}
        <div className="lg:w-1/2 flex flex-col gap-6 h-fit lg:h-full lg:overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4">
           
           {/* Formulário Novo Motoboy */}
           <div className="p-5 sm:p-6 md:p-8 rounded-card border border-stroke shadow-theme shrink-0 bg-bg-surface">
             <div className="flex justify-between items-center mb-6 border-b border-stroke pb-4">
                <h3 className="text-base sm:text-xl font-black uppercase tracking-tight text-primary flex items-center gap-2">
                  {motoboyEditandoId ? <><Edit size={24}/> Editando Frota</> : <><UserPlus size={24}/> Novo Motoboy</>}
                </h3>
             </div>
             <form onSubmit={salvarMotoboy} className="space-y-5">
               <div className="relative group">
                 <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nome Completo</span>
                 <input required value={novoMotoboy.nome} onChange={e=>setNovoMotoboy({...novoMotoboy, nome: e.target.value})} placeholder="Ex: Carlos Silva" className="w-full p-4 rounded-theme text-sm font-bold outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-4">
                 <div className="relative group">
                   <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">WhatsApp</span>
                   <input value={novoMotoboy.telefone} onChange={e=>setNovoMotoboy({...novoMotoboy, telefone: e.target.value})} placeholder="(11) 9999-9999" className="w-full p-4 rounded-theme text-sm font-bold outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
                 </div>
                 <div className="relative group">
                   <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Placa</span>
                   <input required value={novoMotoboy.placa} onChange={e=>setNovoMotoboy({...novoMotoboy, placa: e.target.value})} placeholder="ABC1234" className="w-full p-4 rounded-theme text-sm font-black outline-none uppercase transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
                 </div>
               </div>
               
               <div className="flex flex-col sm:flex-row gap-5 sm:gap-4 pt-2">
                 <div className="flex-1 relative group">
                   <span className="absolute -top-2 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">% Repasse da Taxa</span>
                   <input required type="number" value={novoMotoboy.comissao} onChange={e=>setNovoMotoboy({...novoMotoboy, comissao: e.target.value})} placeholder="100" className="w-full p-4 rounded-theme text-2xl text-center font-black outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:text-primary focus:bg-bg-surface shadow-sm" />
                 </div>
                 <button type="submit" className="w-full sm:w-auto px-10 py-4 bg-primary rounded-theme text-tx-primary font-black uppercase tracking-widest active:scale-95 shadow-theme hover:bg-primary-hover transition-all flex items-center justify-center gap-2">
                   {motoboyEditandoId ? 'Atualizar Entregador' : 'Cadastrar na Frota'}
                 </button>
               </div>
             </form>
           </div>

           {/* Tabela de Motoboys */}
           <div className="rounded-card border border-stroke shadow-theme overflow-hidden flex-1 bg-bg-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="text-[10px] font-black uppercase tracking-widest border-b border-stroke bg-bg-input text-tx-muted">
                    <tr>
                      <th className="px-6 py-5">Entregador</th>
                      <th className="px-6 py-5 text-center">Repasse</th>
                      <th className="px-6 py-5 text-center">Hoje</th>
                      <th className="px-6 py-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-stroke">
                    {motoboys.length === 0 && (
                      <tr><td colSpan="4" className="text-center p-10 font-bold text-tx-muted uppercase tracking-widest text-xs">Nenhum motoboy cadastrado na frota.</td></tr>
                    )}
                    {motoboys.map(m => {
                      const entregasHoje = pedidosDeHoje.filter(p => p.motoboy_id && Number(p.motoboy_id) === m.id && p.tipo_pedido === 'delivery' && (p.status === 'saiu_entrega' || p.status === 'entregue'));
                      const totalReceberHoje = entregasHoje.reduce((acc, p) => acc + (Number(p.valor_motoboy) || 0), 0);
                      const isExpanded = motoboyExpandidoId === m.id;
                      const pedidosDesteMoto = pedidos.filter(p => p.motoboy_id && Number(p.motoboy_id) === m.id && p.tipo_pedido === 'delivery' && (p.status === 'saiu_entrega' || p.status === 'entregue'));
                      
                      let historicoFiltrado = [];
                      try {
                          if(abaHistoricoMoto === 'hoje') historicoFiltrado = pedidosDesteMoto.filter(p => new Date(p.criado_em).toDateString() === new Date().toDateString());
                          else if(abaHistoricoMoto === 'ontem') { const ontem = new Date(); ontem.setDate(ontem.getDate() - 1); historicoFiltrado = pedidosDesteMoto.filter(p => new Date(p.criado_em).toDateString() === ontem.toDateString()); }
                          else if(abaHistoricoMoto === 'semana') { const semana = new Date(); semana.setDate(semana.getDate() - 7); historicoFiltrado = pedidosDesteMoto.filter(p => new Date(p.criado_em) >= semana); }
                      } catch (err) { historicoFiltrado = []; }

                      return (
                        <Fragment key={m.id}>
                          <tr className={`transition-colors duration-300 group ${isExpanded ? 'bg-primary/5' : 'hover:bg-bg-input'}`}>
                            <td className="px-6 py-5">
                              <div className="font-black uppercase text-sm text-tx-main group-hover:text-primary transition-colors">{m.nome}</div>
                              <div className="text-[10px] font-bold mt-1 tracking-wider flex items-center gap-1.5 text-tx-muted"><Phone size={10} className="text-primary"/> {m.telefone || 'Sem contato'} <span className="mx-1 opacity-50">•</span> {m.placa ? m.placa.toUpperCase() : 'S/ PLACA'}</div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="px-3 py-1.5 rounded-theme text-xs font-black bg-primary/10 text-primary border border-primary/20 shadow-sm">{m.comissao}%</span>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="text-[10px] font-bold uppercase block mb-1 tracking-wider text-tx-muted">{entregasHoje.length} Entregas</span>
                              <strong className="text-primary text-base font-black tracking-tight">R$ {totalReceberHoje.toFixed(2)}</strong>
                            </td>
                            <td className="px-6 py-5 text-right whitespace-nowrap">
                              <button onClick={() => { setMotoboyExpandidoId(isExpanded ? null : m.id); setAbaHistoricoMoto('hoje'); }} className={`px-4 py-2.5 mr-2 text-[10px] font-black uppercase tracking-widest rounded-theme transition-all border shadow-sm ${isExpanded ? 'bg-primary text-tx-primary border-primary' : 'bg-bg-surface border-stroke text-tx-muted hover:text-primary hover:border-primary/50'}`}>Histórico</button>
                              <button onClick={()=>{setMotoboyEditandoId(m.id); setNovoMotoboy(m);}} className="p-2.5 rounded-theme mr-1.5 transition-colors border bg-bg-surface border-stroke text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 shadow-sm"><Edit size={14}/></button>
                              <button onClick={()=>deletarMotoboy(m.id)} className="p-2.5 rounded-theme transition-colors border bg-bg-surface border-stroke text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-sm"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                          
                          {/* Seção Expandida do Histórico Animada */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="4" className="p-0 border-t-0 border-b border-stroke bg-bg-main shadow-inner">
                                <div className="p-6 animate-in slide-in-from-top-4 fade-in duration-300">
                                  <div className="flex gap-6 mb-5 border-b border-stroke pb-3 overflow-x-auto custom-scrollbar">
                                    <button onClick={() => setAbaHistoricoMoto('hoje')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-colors whitespace-nowrap ${abaHistoricoMoto === 'hoje' ? 'text-primary border-primary' : 'text-tx-muted border-transparent hover:text-tx-main'}`}>Hoje</button>
                                    <button onClick={() => setAbaHistoricoMoto('ontem')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-colors whitespace-nowrap ${abaHistoricoMoto === 'ontem' ? 'text-primary border-primary' : 'text-tx-muted border-transparent hover:text-tx-main'}`}>Ontem</button>
                                    <button onClick={() => setAbaHistoricoMoto('semana')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-colors whitespace-nowrap ${abaHistoricoMoto === 'semana' ? 'text-primary border-primary' : 'text-tx-muted border-transparent hover:text-tx-main'}`}>Últimos 7 Dias</button>
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                    {historicoFiltrado.length === 0 ? <p className="text-[10px] font-bold uppercase tracking-widest pt-2 text-tx-muted col-span-full text-center">Nenhuma entrega neste período.</p> : historicoFiltrado.map(p => (
                                        <div key={p.id} className="p-4 rounded-theme flex justify-between items-center shadow-sm transition-colors border bg-bg-surface border-stroke hover:border-primary/40 group">
                                          <div className="min-w-0 pr-4">
                                              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-tx-muted">Pedido #{p.id} <span className="ml-1 opacity-60">| {formatarDataCompleta(p.criado_em)}</span></p>
                                              <p className="text-xs sm:text-sm font-black uppercase truncate text-tx-main group-hover:text-primary transition-colors">{p.cliente_nome}</p>
                                              <p className="text-[10px] font-bold mt-1 text-tx-muted">{p.distancia_km || '0'} KM Rodados</p>
                                          </div>
                                          <div className="text-right shrink-0">
                                              <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-primary opacity-80">Comissão</p>
                                              <p className="text-sm font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">R$ {Number(p.valor_motoboy || 0).toFixed(2)}</p>
                                          </div>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
        
      </div>
    </div>
  );
}