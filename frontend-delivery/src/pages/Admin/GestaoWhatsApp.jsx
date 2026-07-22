// src/pages/Admin/GestaoWhatsApp.jsx
import React, { useState, useEffect } from 'react';
import { MessageCircle, Bot, QrCode, MessageSquarePlus, RefreshCw, Zap, Save, Check, Plus } from 'lucide-react';

export default function GestaoWhatsApp() {
  const [botAtivo, setBotAtivo] = useState(false);
  const [qrCodePronto, setQrCodePronto] = useState(false); 
  const [mensagemBoasVindas, setMensagemBoasVindas] = useState("Olá! Sou o assistente virtual da D'Varano Sorvetes 🍦\n\nPara ver nosso cardápio ou fazer um pedido, acesse: seu-site.com\n\nSe quiser saber o status do seu pedido, digite o número dele com uma hashtag (Ex: #123).");

  const [scriptsRapidos, setScriptsRapidos] = useState([]);
  const [salvoId, setSalvoId] = useState(null); // Feedback visual de "Salvo!"

  // Carrega os scripts ao abrir a tela
  useEffect(() => {
    const salvos = localStorage.getItem('whatsapp_scripts');
    if (salvos) {
      setScriptsRapidos(JSON.parse(salvos));
    } else {
      setScriptsRapidos([
        { id: 1, titulo: 'CHAVE PIX', texto: 'Nossa chave PIX celular é: (19) 99782-2676. Por favor, envie o comprovante por aqui!' },
        { id: 2, titulo: 'ATRASO NA ROTA', texto: 'Tivemos um pequeno imprevisto com a rota, mas seu pedido já está a caminho e chega em no máximo 10 minutos!' }
      ]);
    }
  }, []);

  const simularConexao = () => {
    alert("No sistema real, isso abrirá a câmera ou exibirá o QR Code gerado pelo seu Backend (Node.js).");
    setQrCodePronto(true);
  };

  const adicionarNovoScript = () => {
    const novoId = Date.now();
    setScriptsRapidos([{ id: novoId, titulo: 'NOVO SCRIPT', texto: 'Digite sua mensagem aqui...' }, ...scriptsRapidos]);
  };

  const atualizarScript = (id, campo, valor) => {
    setScriptsRapidos(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s));
  };

  const salvarScriptsNoNavegador = (id) => {
    localStorage.setItem('whatsapp_scripts', JSON.stringify(scriptsRapidos));
    setSalvoId(id);
    setTimeout(() => setSalvoId(null), 2000); // Tira o certinho verde depois de 2 segundos
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24 font-theme w-full max-w-[1400px] mx-auto">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* CARD 1: STATUS DA CONEXÃO */}
        <div className="p-6 rounded-card border border-stroke bg-bg-surface shadow-theme flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4">
          <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${qrCodePronto ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}></div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-4 flex items-center gap-2">
              <QrCode size={14}/> Aparelho Conectado
            </h3>
            {qrCodePronto ? (
              <div className="flex items-center gap-3 animate-in zoom-in-95">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 border border-green-500/20 shadow-inner">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <p className="text-xl font-black text-tx-main tracking-tight">WhatsApp Web</p>
                  <p className="text-xs font-bold text-green-500 uppercase tracking-widest mt-1">+55 19 99782-2676</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 animate-in fade-in">
                <div className="relative w-fit mx-auto mb-3">
                   <QrCode size={48} className="text-tx-muted opacity-30" />
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-[scan_2s_ease-in-out_infinite] h-full w-full"></div>
                </div>
                <p className="text-sm font-bold text-tx-muted">Aguardando leitura do QR Code...</p>
              </div>
            )}
          </div>
          
          <button onClick={simularConexao} className="w-full mt-6 py-3.5 border-2 border-stroke rounded-theme font-black text-xs uppercase tracking-widest bg-bg-surface text-tx-main hover:border-primary hover:text-primary active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm">
             <RefreshCw size={14} className={!qrCodePronto ? "animate-spin-slow" : ""}/> {qrCodePronto ? 'Sincronizar Novamente' : 'Gerar QR Code'}
          </button>
        </div>

        {/* CARD 2: CONTROLE DO ROBÔ */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4" style={{ animationDelay: '50ms' }}>
          <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ${botAtivo ? 'bg-primary/15 scale-100' : 'bg-transparent scale-50'}`}></div>
          
          <div className="flex justify-between items-start mb-6 border-b border-stroke pb-6 relative z-10">
             <div>
               <h3 className="text-[10px] font-black uppercase tracking-widest text-tx-muted mb-2 flex items-center gap-2">
                 <Bot size={14} className={`transition-colors duration-500 ${botAtivo ? 'text-primary' : 'text-tx-muted'}`}/> Robô de Atendimento
               </h3>
               <p className="text-xl sm:text-2xl font-black text-tx-main tracking-tight">Status: <span className={`transition-colors duration-500 ${botAtivo ? 'text-primary' : 'text-tx-muted'}`}>{botAtivo ? 'ATIVADO' : 'DESLIGADO'}</span></p>
             </div>
             
             {/* TOGGLE SWITCH ESTILO iOS */}
             <button 
                onClick={() => setBotAtivo(!botAtivo)} 
                className={`w-14 h-8 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner outline-none ${botAtivo ? 'bg-primary' : 'bg-stroke border border-transparent'}`}
             >
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${botAtivo ? 'translate-x-6' : 'translate-x-0'}`}>
                  {botAtivo && <Zap size={10} className="text-primary"/>}
                </div>
             </button>
          </div>

          <div className="space-y-4 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest text-tx-muted">Mensagem de Boas-Vindas Automática</label>
            <textarea 
               value={mensagemBoasVindas}
               onChange={(e) => setMensagemBoasVindas(e.target.value)}
               disabled={!botAtivo}
               placeholder="Digite aqui o que o robô deve responder..."
               className="w-full p-5 h-28 resize-none text-sm font-bold rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-input"
            />
            <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest w-fit px-3 py-2 rounded-theme border transition-colors duration-500 ${botAtivo ? 'bg-primary/10 text-primary border-primary/20' : 'bg-bg-input text-tx-muted border-stroke'}`}>
               <Zap size={14}/> O Bot responde status se o cliente mandar # + Número do Pedido
            </div>
          </div>
        </div>
      </div>

      {/* SESSÃO 3: SCRIPTS E RESPOSTAS RÁPIDAS */}
      <div className="p-6 sm:p-8 rounded-card border border-stroke bg-bg-surface shadow-theme transition-all duration-300 animate-in slide-in-from-bottom-8" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stroke pb-6 mb-6 gap-4">
           <h3 className="text-xl sm:text-2xl font-black text-tx-main tracking-tight flex items-center gap-2">
             <MessageSquarePlus size={24} className="text-secondary"/> Atalhos e Scripts Rápidos
           </h3>
           <button 
             onClick={adicionarNovoScript}
             className="text-xs font-black uppercase tracking-widest bg-secondary/10 border border-secondary/20 text-secondary px-4 py-2.5 rounded-theme hover:bg-secondary hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
           >
             <Plus size={14}/> Novo Script
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scriptsRapidos.map((script) => (
             <div key={script.id} className="p-5 border border-stroke rounded-theme bg-bg-input relative group transition-all duration-300 hover:border-secondary hover:shadow-md focus-within:bg-bg-surface focus-within:border-secondary focus-within:shadow-md">
                
                <input 
                  value={script.titulo} 
                  onChange={(e) => atualizarScript(script.id, 'titulo', e.target.value)}
                  placeholder="TÍTULO DO ATALHO"
                  className="bg-transparent font-black text-sm uppercase tracking-wider text-tx-main w-full mb-3 outline-none focus:text-secondary transition-colors" 
                />
                
                <textarea 
                  value={script.texto} 
                  onChange={(e) => atualizarScript(script.id, 'texto', e.target.value)}
                  placeholder="Digite a mensagem rápida aqui..."
                  className="bg-transparent w-full resize-none text-xs font-medium text-tx-muted outline-none h-20 custom-scrollbar focus:text-tx-main transition-colors" 
                />
                
                <button 
                  onClick={() => salvarScriptsNoNavegador(script.id)}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition-all duration-300 shadow-sm ${salvoId === script.id ? 'bg-green-500 text-white translate-y-0 opacity-100' : 'bg-bg-surface border border-stroke text-tx-muted hover:text-secondary hover:border-secondary opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0'}`}
                  title="Salvar Alteração"
                >
                  {salvoId === script.id ? <Check size={16} className="animate-in zoom-in" /> : <Save size={16}/>}
                </button>
                
             </div>
          ))}
        </div>
      </div>

    </div>
  );
}