// src/pages/Admin/PainelAtendimento.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, MoreVertical, Paperclip, Smile, CheckCheck, Clock, RefreshCw, Command } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function PainelAtendimento({ temaEscuro }) {
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagensDaConversa, setMensagensDaConversa] = useState([]);
  const [mensagemDigitada, setMensagemDigitada] = useState('');
  const [carregando, setCarregando] = useState(true);

  const [mostrarMenuScripts, setMostrarMenuScripts] = useState(false);
  const [scriptsRapidos] = useState(() => {
    const salvos = localStorage.getItem('whatsapp_scripts');
    return salvos ? JSON.parse(salvos) : [
      { id: 1, titulo: 'CHAVE PIX', texto: 'Nossa chave PIX celular é: (19) 99782-2676. Por favor, envie o comprovante!' },
      { id: 2, titulo: 'ATRASO NA ROTA', texto: 'Tivemos um pequeno imprevisto, mas seu pedido já está a caminho e chega em 10 min!' }
    ];
  });
  
  const mensagensEndRef = useRef(null); 

  // 1. CARREGAR LISTA DE CHATS (Atualiza a cada 5 segundos)
  const buscarChats = async () => {
    try {
      const res = await apiFetch(`/whatsapp/chats`);
      if (res.ok) {
        const data = await res.json();
        setConversas(data);
        setCarregando(false);
      }
    } catch (e) {
      console.error("Erro ao buscar chats");
    }
  };

  useEffect(() => {
    buscarChats();
    const intervaloChats = setInterval(buscarChats, 5000);
    return () => clearInterval(intervaloChats);
  }, []);

  // 2. CARREGAR MENSAGENS DO CHAT SELECIONADO (Atualiza a cada 3 segundos)
  useEffect(() => {
    let intervaloMsgs;
    if (conversaAtiva) {
      const buscarMensagens = async () => {
        try {
          const res = await apiFetch(`/whatsapp/chat/${conversaAtiva.id}/messages`);
          if (res.ok) {
            const data = await res.json();
            setMensagensDaConversa(data);
          }
        } catch (e) {
          console.error("Erro ao buscar mensagens");
        }
      };
      
      buscarMensagens();
      intervaloMsgs = setInterval(buscarMensagens, 3000);
    }
    return () => clearInterval(intervaloMsgs);
  }, [conversaAtiva]);

  // Rola para a última mensagem APENAS quando chegar uma mensagem nova
  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagensDaConversa.length]);

  // 3. ENVIAR MENSAGEM REAL
  const enviarMensagem = async () => {
    if (!mensagemDigitada.trim() || !conversaAtiva) return;

    const textoEnvio = mensagemDigitada;
    setMensagemDigitada(''); 
    setMostrarMenuScripts(false);

    // Feedback Imediato
    const novaMsgVisual = { id: Date.now(), body: textoEnvio, fromMe: true, hora: 'Enviando...' };
    setMensagensDaConversa(prev => [...prev, novaMsgVisual]);

    try {
      await apiFetch(`/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: conversaAtiva.id, message: textoEnvio })
      });
    } catch (e) {
      alert("Erro ao enviar mensagem.");
    }
  };

  return (
    <div className="flex-1 flex gap-0 h-full rounded-card border border-stroke overflow-hidden shadow-theme bg-bg-surface animate-in fade-in">
      
      {/* BARRA LATERAL (LISTA DE CHATS REAIS) */}
      <div className="w-full md:w-80 border-r border-stroke flex flex-col bg-bg-main shrink-0 relative z-10">
        <div className="p-4 border-b border-stroke bg-bg-surface flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center relative transition-colors duration-500 ${carregando ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                 <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-bg-surface rounded-full transition-colors duration-500 ${carregando ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              </div>
              <div>
                 <p className="text-sm font-black text-tx-main leading-none">Central WhatsApp</p>
                 <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors duration-500 ${carregando ? 'text-yellow-500' : 'text-green-500'}`}>
                    {carregando ? 'Sincronizando...' : 'Conectado'}
                 </p>
              </div>
           </div>
        </div>

        <div className="p-3 bg-bg-surface border-b border-stroke/50">
           <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Buscar cliente..." className="w-full bg-bg-input border border-stroke text-tx-main text-xs font-bold rounded-theme py-2.5 pl-9 pr-4 outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all" />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {conversas.length === 0 && !carregando && (
              <div className="p-6 text-center text-tx-muted font-bold text-xs uppercase tracking-widest">
                 Nenhuma conversa recente encontrada.
              </div>
           )}
           {conversas.map(chat => (
             <div 
                key={chat.id} 
                onClick={() => setConversaAtiva(chat)}
                className={`p-4 border-b border-stroke cursor-pointer transition-all duration-300 flex gap-3 hover:bg-bg-input/80 ${conversaAtiva?.id === chat.id ? 'bg-primary/5 border-l-4 border-l-primary shadow-[inset_4px_0_0_var(--primary)]' : 'border-l-4 border-l-transparent'}`}
             >
                <div className="w-12 h-12 rounded-full bg-bg-input border border-stroke flex items-center justify-center text-tx-muted font-black shrink-0">
                  {chat.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-black text-tx-main truncate pr-2">{chat.nome}</h4>
                      <span className="text-[10px] font-bold text-tx-muted shrink-0">{chat.hora}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <p className="text-xs font-medium text-tx-muted truncate pr-2">{chat.ultimaMensagem}</p>
                      {chat.naoLida > 0 && (
                         <span className="w-5 h-5 rounded-full bg-primary text-tx-primary flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm animate-pulse">
                           {chat.naoLida}
                         </span>
                      )}
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* ÁREA PRINCIPAL DO CHAT REAL */}
      {conversaAtiva ? (
        <div className="flex-1 flex flex-col bg-bg-main relative w-full overflow-hidden animate-in slide-in-from-right-4">
           
           {/* HEADER DO CHAT */}
           <div className="p-4 border-b border-stroke bg-bg-surface flex justify-between items-center shrink-0 shadow-sm z-10 glass-effect">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-bg-input border border-stroke flex items-center justify-center text-tx-main font-black">
                   {conversaAtiva.nome.charAt(0).toUpperCase()}
                 </div>
                 <div>
                    <h3 className="text-base font-black text-tx-main leading-tight flex items-center gap-2">
                      {conversaAtiva.nome}
                      {conversaAtiva.pedido && (
                        <span className="px-2 py-0.5 bg-secondary/10 border border-secondary/20 text-secondary text-[10px] uppercase tracking-widest rounded-md font-bold">
                          {conversaAtiva.pedido}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] font-bold text-tx-muted tracking-widest mt-0.5">+{conversaAtiva.numero}</p>
                 </div>
              </div>
           </div>

           {/* AREA DAS MENSAGENS */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 relative" style={{ backgroundColor: 'var(--bg-main)' }}>
              
              {/* O fundo do zap que tentamos manter neutro e clean */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

              <div className="flex justify-center mb-6 relative z-10">
                 <span className="px-3 py-1 bg-bg-surface/80 backdrop-blur-sm border border-stroke rounded-theme text-[10px] font-bold uppercase tracking-widest text-tx-muted shadow-sm flex items-center gap-1.5">
                   <Shield size={12}/> Mensagens Criptografadas
                 </span>
              </div>

              {mensagensDaConversa.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} relative z-10 animate-in fade-in`}>
                    <div className={`p-3 max-w-[85%] sm:max-w-[75%] shadow-sm relative border transition-all duration-300 ${
                       msg.fromMe 
                       ? `bg-primary text-tx-primary rounded-2xl rounded-tr-sm border-primary/20 ${msg.hora === 'Enviando...' ? 'opacity-80' : 'opacity-100'}` 
                       : 'bg-bg-surface text-tx-main rounded-2xl rounded-tl-sm border-stroke'
                    }`}>
                       
                       {msg.body === '' ? (
                         <p className="text-sm font-bold italic opacity-80 flex items-center gap-2"><Paperclip size={14}/> Arquivo de Mídia (Ver no Celular)</p>
                       ) : (
                         <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                       )}
                       
                       <div className={`flex items-center gap-1 mt-1.5 ${msg.fromMe ? 'justify-end' : 'justify-start ml-2'}`}>
                         <span className={`text-[9px] font-bold ${msg.fromMe ? 'text-tx-primary/70' : 'text-tx-muted'}`}>{msg.hora}</span>
                         {msg.fromMe && msg.hora !== 'Enviando...' && <CheckCheck size={12} className="text-tx-primary/90"/>}
                         {msg.fromMe && msg.hora === 'Enviando...' && <Clock size={10} className="text-tx-primary/70 animate-pulse"/>}
                       </div>
                    </div>
                 </div>
              ))}
              
              <div ref={mensagensEndRef} className="h-4" />
           </div>

           {/* INPUT DE ENVIO E SCRIPTS */}
           <div className="p-4 border-t border-stroke bg-bg-surface flex gap-2 sm:gap-3 items-center shrink-0 relative z-20">
              
              {/* MENU FLUTUANTE DE SCRIPTS */}
              {mostrarMenuScripts && scriptsRapidos.length > 0 && (
                <div className="absolute bottom-full left-0 mb-4 w-80 bg-bg-surface/95 backdrop-blur-md border border-stroke rounded-card shadow-2xl p-2 animate-in slide-in-from-bottom-4 z-[9999] ml-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-2 px-2 flex items-center gap-1.5">
                    <Command size={12}/> Scripts Rápidos
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {scriptsRapidos.map(script => (
                      <button 
                        key={script.id} 
                        onClick={() => {
                          setMensagemDigitada(script.texto);
                          setMostrarMenuScripts(false);
                        }}
                        className="w-full text-left p-3 hover:bg-bg-input rounded-theme transition-colors border border-transparent hover:border-stroke mb-1 group"
                      >
                        <strong className="text-xs font-black text-secondary block group-hover:text-primary transition-colors">{script.titulo}</strong>
                        <span className="text-[10px] font-medium text-tx-muted truncate block mt-0.5">{script.texto}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input 
                type="text" 
                value={mensagemDigitada}
                onChange={(e) => {
                  const val = e.target.value;
                  setMensagemDigitada(val);
                  if (val === '/' || val.endsWith(' /')) setMostrarMenuScripts(true);
                  else setMostrarMenuScripts(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()} 
                placeholder="Digite uma mensagem ou use / para atalhos..." 
                className="flex-1 bg-bg-input border border-stroke text-tx-main text-sm font-medium rounded-theme py-3.5 px-4 outline-none focus:border-primary focus:bg-bg-surface shadow-sm transition-all"
              />
              <button 
                 onClick={enviarMensagem}
                 disabled={!mensagemDigitada.trim()}
                 className={`p-3.5 rounded-full flex items-center justify-center transition-all duration-300 ${mensagemDigitada.trim() ? 'bg-primary text-tx-primary shadow-theme hover:bg-primary-hover active:scale-95' : 'bg-bg-input text-tx-muted opacity-50 cursor-not-allowed'}`}
              >
                 <Send size={18} className="shrink-0 relative left-0.5"/>
              </button>
           </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-bg-main text-tx-muted p-6 text-center animate-in zoom-in-95">
           <div className="w-24 h-24 bg-bg-surface rounded-full flex items-center justify-center mb-6 border border-stroke shadow-theme">
              <Clock size={40} className="text-primary opacity-50 animate-pulse"/>
           </div>
           <h3 className="text-xl font-black text-tx-main">WhatsApp Integrado</h3>
           <p className="text-sm font-medium mt-2 max-w-sm">O motor está conectado e ouvindo novas mensagens. Selecione um cliente na lista à esquerda para responder.</p>
        </div>
      )}

    </div>
  );
}