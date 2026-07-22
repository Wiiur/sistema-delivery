// src/pages/Admin/GestaoConfiguracoes.jsx
import React, { useState, useEffect } from 'react';
import { Settings, Palette, MapPin, Store, Image as ImageIcon, Save, Check, LayoutTemplate, Droplets, Smartphone, Bot, QrCode, MessageSquarePlus, Zap, RefreshCw, X, Trash2, Ticket } from 'lucide-react';
import { ESTILOS, PALETAS } from '../../theme/themes'; 
import GestaoCupons from './GestaoCupons';

import { API_URL, apiFetch } from '../../services/api';

export default function GestaoConfiguracoes({ temaEscuro, configTaxa, setConfigTaxa, enderecoLoja, setEnderecoLoja, buscarGeral }) {
  const [abaAtual, setAbaAtual] = useState('visual');
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  // Estados do WhatsApp
  const [qrCodePronto, setQrCodePronto] = useState(false);
  const [botAtivo, setBotAtivo] = useState(false);
  const [mensagemBoasVindas, setMensagemBoasVindas] = useState("Olá! Sou o assistente virtual da D'Varano Sorvetes 🍦\n\nPara fazer um pedido, acesse: seu-site.com\nPara rastrear o status, digite: #NumeroDoPedido");
  
  // 👉 NOVO: Controle de Sub-abas
  const [abaInterna, setAbaInterna] = useState('geral');
  
  const [scriptsRapidos, setScriptsRapidos] = useState(() => {
    const salvos = localStorage.getItem('whatsapp_scripts');
    return salvos ? JSON.parse(salvos) : [
      { id: 1, titulo: 'CHAVE PIX', texto: 'Nossa chave PIX celular é: (19) 99782-2676. Por favor, envie o comprovante!' },
      { id: 2, titulo: 'ATRASO NA ROTA', texto: 'Tivemos um pequeno imprevisto, mas seu pedido já está a caminho e chega em 10 min!' }
    ];
  });

  const [modalScriptAberto, setModalScriptAberto] = useState(false);
  const [novoScript, setNovoScript] = useState({ titulo: '', texto: '' });

  const salvarNovoScript = () => {
    if (!novoScript.titulo || !novoScript.texto) return alert("Preencha título e texto!");
    const novaLista = [...scriptsRapidos, { id: Date.now(), ...novoScript }];
    setScriptsRapidos(novaLista);
    localStorage.setItem('whatsapp_scripts', JSON.stringify(novaLista)); 
    setModalScriptAberto(false);
    setNovoScript({ titulo: '', texto: '' });
  };

  const apagarScript = (id) => {
    if(!window.confirm("Deseja apagar este script rápido?")) return;
    const novaLista = scriptsRapidos.filter(s => s.id !== id);
    setScriptsRapidos(novaLista);
    localStorage.setItem('whatsapp_scripts', JSON.stringify(novaLista));
  };
  
  const [waStatus, setWaStatus] = useState({ connected: false, qrCode: null });

  const [dadosCarregados, setDadosCarregados] = useState(false);

  const [form, setForm] = useState({
    estilo_base: 'flat',
    paleta_base: 'fast_food',
    nome_loja: '',
    logo_url: '',
    capa_url: '',
    nota_loja: '',
    avaliacoes_loja: '',
    hora_abre: '',
    hora_fecha: '',
    status_manual: 'auto',
  });

  useEffect(() => {
    if (configTaxa && Object.keys(configTaxa).length > 0 && !dadosCarregados) {
      let est = 'flat';
      let pal = 'fast_food';
      
      if (configTaxa.tema_base && configTaxa.tema_base.includes(':')) {
        [est, pal] = configTaxa.tema_base.split(':');
      } else if (configTaxa.tema_base) {
        pal = configTaxa.tema_base;
      }

      setForm({
        estilo_base: est, 
        paleta_base: pal, 
        nome_loja: configTaxa.nome_loja || '', 
        logo_url: configTaxa.logo_url || '', 
        capa_url: configTaxa.capa_url || '', 
        nota_loja: configTaxa.nota_loja || '5.0', 
        avaliacoes_loja: configTaxa.avaliacoes_loja || '100+', 
        hora_abre: configTaxa.hora_abre || '14:00', 
        hora_fecha: configTaxa.hora_fecha || '23:00', 
        status_manual: configTaxa.status_manual || 'auto'
      });

      setDadosCarregados(true); 
    }
  }, [configTaxa, dadosCarregados]);

  useEffect(() => {
    let intervalo;
    if (abaAtual === 'whatsapp') {
      const fetchStatus = async () => {
        try {
          const res = await apiFetch(`/whatsapp/status`);
          if (res.ok) {
            const data = await res.json();
            setWaStatus(data);
            setQrCodePronto(data.connected);
          }
        } catch (error) {
           // Silencioso se o Node estiver offline
        }
      };
      fetchStatus(); 
      intervalo = setInterval(fetchStatus, 3000); 
    }
    return () => clearInterval(intervalo);
  }, [abaAtual]);

  const handleSalvarConfig = async () => {
    setSalvando(true);
    try {
      const payload = {
        endereco: enderecoLoja, taxa_base: configTaxa?.base, taxa_km: configTaxa?.porKm, tempo_km_minutos: configTaxa?.tempoKmMinutos, lat_loja: configTaxa?.latLoja, lon_loja: configTaxa?.lonLoja, raio_maximo: configTaxa?.raioMaximoKm, chovendo: configTaxa?.chovendo,
        tema_base: `${form.estilo_base}:${form.paleta_base}`,
        nome_loja: form.nome_loja, logo_url: form.logo_url, capa_url: form.capa_url,
        nota_loja: form.nota_loja, avaliacoes_loja: form.avaliacoes_loja, hora_abre: form.hora_abre, hora_fecha: form.hora_fecha, status_manual: form.status_manual
      };

      const res = await apiFetch(`/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (res.ok) { 
        setSalvoComSucesso(true); 
        buscarGeral(); 
        setTimeout(() => setSalvoComSucesso(false), 3000); 
      } else { 
        alert("Erro ao salvar configurações."); 
      }
    } catch (error) { 
      alert("Falha de conexão com o servidor."); 
    } finally { 
      setSalvando(false); 
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-20 animate-in fade-in font-theme w-full max-w-[1400px] mx-auto relative">
      
      {/* MENU DE SUB-ABAS (Navegação Superior) */}
      <div className="flex flex-wrap gap-4 sm:gap-6 mb-6 border-b border-stroke pb-px relative z-10 sticky top-0 bg-bg-main pt-2 shrink-0">
        <button 
          onClick={() => setAbaInterna('geral')} 
          className={`pb-3 text-xs sm:text-sm uppercase tracking-widest font-black transition-all border-b-2 ${abaInterna === 'geral' ? 'border-primary text-primary' : 'border-transparent text-tx-muted hover:text-tx-main'}`}
        >
          ⚙️ Ajustes da Loja
        </button>
        <button 
          onClick={() => setAbaInterna('cupons')} 
          className={`pb-3 text-xs sm:text-sm uppercase tracking-widest font-black transition-all border-b-2 ${abaInterna === 'cupons' ? 'border-green-500 text-green-500' : 'border-transparent text-tx-muted hover:text-tx-main'}`}
        >
          🎟️ Cupons e Descontos
        </button>
      </div>

      {abaInterna === 'cupons' ? (
        
        /* RENDERIZA A TELA DE CUPONS AQUI DENTRO */
        <GestaoCupons temaEscuro={temaEscuro} />
        
      ) : (

        /* CONTEÚDO ORIGINAL DE CONFIGURAÇÕES (Oculto se Cupons estiver ativo) */
        <div className="animate-in slide-in-from-left-4 flex flex-col">
          {/* CABEÇALHO */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shrink-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-tx-main"><Settings className="text-primary" size={32} /> Central Operacional</h2>
              <p className="text-sm mt-1 font-bold text-tx-muted">Construa o White-Label combinando estruturas e paletas emocionais.</p>
            </div>
            <button 
              onClick={handleSalvarConfig} 
              disabled={salvando} 
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-theme font-black shadow-theme transition-all active:scale-95 text-sm uppercase tracking-wider ${salvoComSucesso ? 'bg-green-500 text-white' : 'bg-primary text-tx-primary hover:bg-primary-hover'}`}
            >
              {salvoComSucesso ? <Check size={20} className="animate-in zoom-in" /> : <Save size={20} />} 
              {salvando ? 'Compilando...' : salvoComSucesso ? 'Aplicado com Sucesso!' : 'Salvar Sistema'}
            </button>
          </div>

          {/* TABS INTERNAS DE CONFIGURAÇÃO */}
          <div className="flex gap-2 p-1.5 rounded-theme border border-stroke mb-6 bg-bg-input overflow-x-auto custom-scrollbar shrink-0">
            <button onClick={() => setAbaAtual('visual')} className={`flex-1 min-w-[140px] py-2.5 rounded-theme text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${abaAtual === 'visual' ? 'bg-bg-surface text-tx-main shadow-md' : 'text-tx-muted hover:text-tx-main'}`}><Palette size={16} /> Loja e Visual</button>
            <button onClick={() => setAbaAtual('logistica')} className={`flex-1 min-w-[140px] py-2.5 rounded-theme text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${abaAtual === 'logistica' ? 'bg-bg-surface text-tx-main shadow-md' : 'text-tx-muted hover:text-tx-main'}`}><MapPin size={16} /> Horários e Controle</button>
            <button onClick={() => setAbaAtual('whatsapp')} className={`flex-1 min-w-[140px] py-2.5 rounded-theme text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${abaAtual === 'whatsapp' ? 'bg-[#25D366] text-white shadow-md' : 'text-tx-muted hover:text-tx-main'}`}><Smartphone size={16} /> WhatsApp & Robô</button>
          </div>

          {abaAtual === 'visual' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
              <div className="space-y-6">
                
                {/* INFORMAÇÕES DA MARCA */}
                <div className="p-5 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-tx-main"><Store size={18} className="text-primary"/> Identidade e Mídia</h3>
                  <div className="space-y-5">
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nome da Marca</span>
                      <input type="text" value={form.nome_loja} onChange={e => setForm({...form, nome_loja: e.target.value})} className="w-full p-4 rounded-theme border border-stroke outline-none font-black text-sm bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">URL do Logotipo (PNG/JPG)</span>
                      <input type="text" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} className="w-full p-4 rounded-theme border border-stroke outline-none font-medium text-xs bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">URL da Capa (Paisagem)</span>
                      <input type="text" value={form.capa_url} onChange={e => setForm({...form, capa_url: e.target.value})} className="w-full p-4 rounded-theme border border-stroke outline-none font-medium text-xs bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                  </div>
                </div>

                {/* SELEÇÃO 1: A FÍSICA (ESTILOS) */}
                <div className="p-5 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-tx-main"><LayoutTemplate size={18} className="text-primary"/> Estrutura de UI (Design System)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(ESTILOS).map(([key, estilo]) => (
                      <button key={key} onClick={() => setForm({...form, estilo_base: key})} className={`text-left p-4 rounded-theme border transition-all duration-300 ${form.estilo_base === key ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm scale-100' : 'border-stroke bg-bg-input hover:border-primary/50 hover:bg-bg-surface hover:shadow-sm scale-[0.98] hover:scale-100'}`}>
                        <span className="font-black text-sm uppercase tracking-wide block text-tx-main" style={{ fontFamily: estilo.fontBase }}>{estilo.nome}</span>
                        <span className="text-[10px] text-tx-muted font-bold block mt-1.5 opacity-80">Borda: {estilo.radiusCard} | Sombra: {estilo.shadow !== 'none' ? 'Sim' : 'Não'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SELEÇÃO 2: A EMOÇÃO (PALETAS) */}
                <div className="p-5 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme">
                  <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-tx-main"><Droplets size={18} className="text-primary"/> Paletas Emocionais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(PALETAS).map(([key, paleta]) => (
                      <button key={key} onClick={() => setForm({...form, paleta_base: key})} className={`flex justify-between items-center text-left p-4 rounded-theme border transition-all duration-300 ${form.paleta_base === key ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm scale-100' : 'border-stroke bg-bg-input hover:border-primary/50 hover:bg-bg-surface hover:shadow-sm scale-[0.98] hover:scale-100'}`}>
                        <span className="font-bold text-sm text-tx-main">{paleta.nome}</span>
                        <div className="flex rounded-full overflow-hidden shadow-md border border-white/10">
                          <div className="w-5 h-5" style={{ backgroundColor: paleta.dark.primary }}></div>
                          <div className="w-5 h-5" style={{ backgroundColor: paleta.dark.bgMain }}></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MOCKUP VISUAL - PREVIEW REALISTA (Estilo iPhone) */}
              <div className="rounded-card border border-stroke overflow-hidden flex flex-col shadow-theme bg-bg-main h-fit sticky top-6">
                <div className="p-4 border-b border-stroke text-center text-[10px] font-black tracking-widest uppercase bg-bg-surface text-tx-muted">Preview do Dispositivo Cliente</div>
                
                <div className="flex-1 p-8 flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-50">
                  <div 
                    className="w-full max-w-[320px] h-[600px] rounded-[3rem] shadow-2xl border-[12px] border-gray-900 overflow-hidden relative flex flex-col transition-colors duration-700" 
                    style={{ backgroundColor: PALETAS[form.paleta_base]?.dark?.bgMain }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-50"></div>

                    <div className="h-40 w-full relative">
                      <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${form.capa_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500'})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    </div>
                    
                    <div className="px-6 relative -mt-12 flex flex-col items-center text-center">
                      <div className="w-24 h-24 rounded-card border-4 shadow-lg overflow-hidden flex items-center justify-center transition-all duration-700" style={{ borderColor: PALETAS[form.paleta_base]?.dark?.bgMain, backgroundColor: PALETAS[form.paleta_base]?.dark?.bgSurface, borderRadius: ESTILOS[form.estilo_base]?.radiusCard }}>
                          {form.logo_url ? <img src={form.logo_url} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-tx-muted opacity-40"/>}
                      </div>
                      
                      <h3 className="font-black text-2xl mt-4 leading-tight transition-colors duration-500 tracking-tight" style={{ fontFamily: ESTILOS[form.estilo_base]?.fontBase, color: PALETAS[form.paleta_base]?.dark?.txMain }}>
                        {form.nome_loja || 'Sua Loja Aqui'}
                      </h3>
                      <p className="text-[10px] font-bold mt-1.5 opacity-80 uppercase tracking-widest" style={{ color: PALETAS[form.paleta_base]?.dark?.txMuted }}>⭐ {form.nota_loja || '5.0'} ({form.avaliacoes_loja || '100+'}) • Mín. R$ 20</p>
                    </div>

                    <div className="mt-8 px-4 flex flex-col gap-3">
                        <div className="h-24 w-full opacity-60 border" style={{ backgroundColor: PALETAS[form.paleta_base]?.dark?.bgSurface, borderRadius: ESTILOS[form.estilo_base]?.radiusCard, borderColor: PALETAS[form.paleta_base]?.dark?.stroke, boxShadow: ESTILOS[form.estilo_base]?.shadow }}></div>
                        <div className="h-24 w-full opacity-60 border" style={{ backgroundColor: PALETAS[form.paleta_base]?.dark?.bgSurface, borderRadius: ESTILOS[form.estilo_base]?.radiusCard, borderColor: PALETAS[form.paleta_base]?.dark?.stroke, boxShadow: ESTILOS[form.estilo_base]?.shadow }}></div>
                    </div>

                    <div className="mt-auto p-6 relative z-10 bg-gradient-to-t from-black/50 to-transparent">
                      <div 
                        className="w-full py-4 font-black text-center text-sm transition-all duration-500 uppercase tracking-widest flex items-center justify-center gap-2" 
                        style={{ 
                          backgroundColor: PALETAS[form.paleta_base]?.dark?.primary, 
                          color: PALETAS[form.paleta_base]?.dark?.txPrimary, 
                          borderRadius: ESTILOS[form.estilo_base]?.radiusBase,
                          boxShadow: ESTILOS[form.estilo_base]?.shadow
                        }}
                      >
                        Ver Sacola <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtual === 'logistica' && (
              <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
                <div className="p-6 sm:p-8 border border-stroke rounded-card bg-bg-surface shadow-theme">
                  <h3 className="text-lg font-black uppercase tracking-tight text-primary mb-6 border-b border-stroke pb-4 flex items-center gap-2">
                    <MapPin size={24}/> Horários de Funcionamento
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nota no Google (Ex: 4.9)</span>
                      <input type="text" value={form.nota_loja} onChange={e => setForm({...form, nota_loja: e.target.value})} className="w-full p-4 rounded-theme bg-bg-input border border-stroke text-tx-main font-black text-sm outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Avaliações (Ex: 500+)</span>
                      <input type="text" value={form.avaliacoes_loja} onChange={e => setForm({...form, avaliacoes_loja: e.target.value})} className="w-full p-4 rounded-theme bg-bg-input border border-stroke text-tx-main font-black text-sm outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Hora de Abertura</span>
                      <input type="time" value={form.hora_abre} onChange={e => setForm({...form, hora_abre: e.target.value})} className="w-full p-4 rounded-theme bg-bg-input border border-stroke text-tx-main font-black text-lg text-center outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                    <div className="relative group">
                      <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Hora de Fechamento</span>
                      <input type="time" value={form.hora_fecha} onChange={e => setForm({...form, hora_fecha: e.target.value})} className="w-full p-4 rounded-theme bg-bg-input border border-stroke text-tx-main font-black text-lg text-center outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 border border-stroke rounded-card bg-bg-surface shadow-theme">
                  <h3 className="text-lg font-black uppercase tracking-tight text-secondary mb-6 border-b border-stroke pb-4 flex items-center gap-2">
                    🚦 Botão do Pânico (Controle Manual)
                  </h3>
                  <div className="relative group">
                    <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-secondary">Status da Loja (Override)</span>
                    <select value={form.status_manual} onChange={e => setForm({...form, status_manual: e.target.value})} className="w-full p-5 rounded-theme bg-bg-input border-2 border-secondary/50 text-tx-main font-black text-sm outline-none uppercase tracking-widest cursor-pointer focus:border-secondary focus:bg-bg-surface shadow-sm transition-all">
                      <option value="auto">⏱️ Automático (Seguir relógio normal)</option>
                      <option value="aberto">🟢 Forçar Abertura (Ignorar relógio e abrir)</option>
                      <option value="fechado">🔴 Forçar Fechamento (Parar pedidos agora)</option>
                    </select>
                    <p className="text-[10px] font-bold text-tx-muted mt-3 ml-2 uppercase tracking-widest">Aviso: Isso altera instantaneamente o status do Delivery para os clientes.</p>
                  </div>
                </div>
              </div>
          )}

          {abaAtual === 'whatsapp' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* STATUS DO CELULAR */}
                  <div className="p-6 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg">
                    <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${qrCodePronto ? 'bg-[#25D366] shadow-[0_0_15px_rgba(37,211,102,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}></div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-6 flex items-center gap-2">
                        <QrCode size={16}/> Aparelho Mestre Conectado
                      </h3>
                      
                      {qrCodePronto ? (
                        <div className="flex items-center gap-4 animate-in zoom-in-95">
                          <div className="w-14 h-14 bg-[#25D366]/10 rounded-full flex items-center justify-center text-[#25D366] border border-[#25D366]/20 shadow-inner">
                            <Check size={28} />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-tx-main tracking-tight leading-none">WhatsApp Web</p>
                            <p className="text-[10px] font-black text-[#25D366] uppercase tracking-widest mt-1.5">Sincronizado e Ativo</p>
                          </div>
                        </div>
                      ) : waStatus.qrCode ? (
                        <div className="text-center py-2 flex flex-col items-center animate-in zoom-in-95">
                            <div className="bg-white p-3 rounded-2xl shadow-sm mb-4 border border-stroke">
                              <img src={waStatus.qrCode} alt="QR Code" className="w-40 h-40" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted leading-snug">Escaneie com o celular da loja.</p>
                          </div>
                      ) : (
                        <div className="text-center py-6">
                          <div className="relative w-fit mx-auto mb-4">
                              <QrCode size={56} className="text-tx-muted opacity-30" />
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#25D366]/30 to-transparent animate-[scan_2s_ease-in-out_infinite] h-full w-full"></div>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-tx-muted leading-snug">Aguardando servidor gerar QRCode...</p>
                        </div>
                      )}
                    </div>
                    
                    <button type="button" disabled className={`w-full mt-8 py-4 rounded-theme font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${qrCodePronto ? 'bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20' : 'bg-bg-input text-tx-muted border border-stroke'}`}>
                        <RefreshCw size={16} className={!qrCodePronto && !waStatus.qrCode ? 'animate-spin' : ''}/> 
                        {qrCodePronto ? 'Conexão Estável' : waStatus.qrCode ? 'Aguardando Leitura...' : 'Iniciando Motor Node.js...'}
                    </button>
                  </div>

                  {/* ROBO AUTO-ATENDIMENTO */}
                  <div className="lg:col-span-2 p-6 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme relative overflow-hidden transition-all hover:shadow-lg">
                      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${botAtivo ? 'bg-[#25D366]/20 scale-100' : 'bg-transparent scale-50'}`}></div>
                      
                      <div className="flex justify-between items-start mb-6 border-b border-stroke pb-6 relative z-10">
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-2 flex items-center gap-2">
                            <Bot size={16} className={`transition-colors duration-500 ${botAtivo ? 'text-[#25D366]' : 'text-tx-muted'}`}/> Inteligência Artificial
                          </h3>
                          <p className="text-2xl sm:text-3xl font-black text-tx-main tracking-tight">Robô: <span className={`transition-colors duration-500 ${botAtivo ? 'text-[#25D366]' : 'text-tx-muted'}`}>{botAtivo ? 'ATIVADO' : 'DESLIGADO'}</span></p>
                        </div>
                        
                        <button type="button" onClick={() => setBotAtivo(!botAtivo)} className={`w-16 h-8 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner outline-none ${botAtivo ? 'bg-[#25D366]' : 'bg-stroke border border-transparent'}`}>
                            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${botAtivo ? 'translate-x-8' : 'translate-x-0'}`}>
                              {botAtivo && <Zap size={10} className="text-[#25D366]"/>}
                            </div>
                        </button>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted ml-1">Mensagem de Boas-Vindas Automática</label>
                        <textarea 
                            value={mensagemBoasVindas}
                            onChange={(e) => setMensagemBoasVindas(e.target.value)}
                            disabled={!botAtivo}
                            className="w-full p-5 h-28 resize-none text-sm font-bold rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-[#25D366] focus:bg-bg-surface disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        />
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest w-fit px-3 py-2 rounded-theme border transition-colors duration-500 ${botAtivo ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20' : 'bg-bg-input text-tx-muted border-stroke'}`}>
                          <Zap size={14}/> O Robô já responde o status do delivery (Mande # + Número do Pedido)
                        </div>
                      </div>
                  </div>
                </div>

                {/* SCRIPTS RAPIDOS */}
                <div className="p-6 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stroke pb-6 mb-6 gap-4">
                      <h3 className="text-xl sm:text-2xl font-black text-tx-main tracking-tight flex items-center gap-2">
                        <MessageSquarePlus size={24} className="text-secondary"/> Banco de Respostas Rápidas
                      </h3>
                      <button type="button" onClick={() => setModalScriptAberto(true)} className="text-[10px] font-black uppercase tracking-widest bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2.5 rounded-theme hover:bg-secondary hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5">
                        + Adicionar Script
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {scriptsRapidos.map((script) => (
                        <div key={script.id} className="p-5 border border-stroke rounded-theme bg-bg-input relative group hover:border-secondary/50 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-black text-sm uppercase tracking-wider text-secondary flex-1">{script.titulo}</span>
                            <button onClick={() => apagarScript(script.id)} className="text-tx-muted hover:text-red-500 transition-colors opacity-50 group-hover:opacity-100 p-1 rounded-theme hover:bg-red-500/10">
                              <Trash2 size={14}/>
                            </button>
                          </div>
                          <p className="w-full text-xs font-medium text-tx-muted leading-relaxed line-clamp-3">{script.texto}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
          )}
        </div>
      )}

      {/* MODAL DE NOVO SCRIPT */}
      {modalScriptAberto && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[400] animate-in fade-in font-theme">
           <div className="w-full max-w-sm p-6 sm:p-8 rounded-card shadow-2xl border border-stroke bg-bg-surface relative animate-in zoom-in-95">
             <button onClick={() => setModalScriptAberto(false)} className="absolute top-4 right-4 text-tx-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-theme transition-colors">
               <X size={20}/>
             </button>
             
             <h2 className="text-xl font-black tracking-tight text-tx-main mb-6 border-b border-stroke pb-4">Novo Atalho</h2>
             
             <div className="space-y-5">
               <div className="relative group">
                 <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-secondary transition-colors">Título Curto</span>
                 <input value={novoScript.titulo} onChange={e=>setNovoScript({...novoScript, titulo: e.target.value})} className="w-full p-4 rounded-theme bg-bg-input border border-stroke text-tx-main font-bold text-sm outline-none focus:border-secondary focus:bg-bg-surface transition-all shadow-sm uppercase tracking-wider" placeholder="Ex: SAUDAÇÃO" />
               </div>
               <div className="relative group">
                 <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-secondary transition-colors">Mensagem Completa</span>
                 <textarea value={novoScript.texto} onChange={e=>setNovoScript({...novoScript, texto: e.target.value})} className="w-full p-4 h-32 resize-none rounded-theme bg-bg-input border border-stroke text-tx-main text-sm font-medium outline-none focus:border-secondary focus:bg-bg-surface transition-all shadow-sm custom-scrollbar" placeholder="Digite a mensagem exata..." />
               </div>
             </div>

             <button onClick={salvarNovoScript} className="w-full mt-8 py-4 rounded-theme font-black text-xs uppercase tracking-widest bg-secondary text-white shadow-theme hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                Salvar Atalho <Check size={16}/>
             </button>
           </div>
         </div>
      )}
    </div>
  );
}