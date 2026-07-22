// src/components/MenuMobile.jsx
import React, { useState } from 'react';
import { ShoppingBag, ShoppingCart, Settings, Menu, X, Box, Package, Bike, Users, UserPlus, TrendingUp, Calculator, LogOut, Shield, LayoutDashboard, MessageCircle } from 'lucide-react';

export default function MenuMobile({ 
  usuarioLogado, 
  abaAtiva, 
  setAbaAtiva, 
  setUsuarioLogado, 
  setTelaAtual 
}) {
  const [menuAberto, setMenuAberto] = useState(false);

  const navegarPara = (aba) => {
    setAbaAtiva(aba);
    setMenuAberto(false);
  };

  const estiloBotaoBottom = (id) => `
    flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-300
    ${abaAtiva === id ? 'text-primary' : 'text-tx-muted hover:text-tx-main'}
  `;

  const estiloItemLista = (id) => `
    flex items-center gap-3 p-4 rounded-theme font-bold transition-all duration-300 border
    ${abaAtiva === id 
      ? 'bg-primary/10 text-primary border-primary shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] scale-[0.98]' 
      : 'bg-bg-input text-tx-main border-stroke hover:border-primary/50 hover:bg-bg-surface'}
  `;

  return (
    <>
      {/* BARRA INFERIOR (FIXA) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-bg-surface border-t border-stroke shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100] flex justify-between items-center px-2 pb-safe font-theme">
        
        <button onClick={() => navegarPara('pedidos')} className={estiloBotaoBottom('pedidos')}>
          <ShoppingBag size={20} className={abaAtiva === 'pedidos' ? 'animate-bounce' : ''} />
          <span className="text-[9px] font-black uppercase tracking-widest">Cozinha</span>
        </button>

        <button onClick={() => navegarPara('caixa')} className={estiloBotaoBottom('caixa')}>
          <ShoppingCart size={20} className={abaAtiva === 'caixa' ? 'animate-bounce' : ''} />
          <span className="text-[9px] font-black uppercase tracking-widest">PDV</span>
        </button>

        <button onClick={() => navegarPara('configuracoes')} className={estiloBotaoBottom('configuracoes')}>
          <Settings size={20} className={abaAtiva === 'configuracoes' ? 'animate-spin-slow' : ''} />
          <span className="text-[9px] font-black uppercase tracking-widest">Ajustes</span>
        </button>

        <button onClick={() => setMenuAberto(true)} className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors duration-300 ${menuAberto ? 'text-primary' : 'text-tx-muted hover:text-tx-main'}`}>
          <Menu size={24} className={menuAberto ? 'scale-110 transition-transform' : ''}/>
          <span className="text-[9px] font-black uppercase tracking-widest">Menu</span>
        </button>
      </nav>

      {/* MENU EXPANDIDO (BOTTOM SHEET) */}
      {menuAberto && (
        <div className="md:hidden fixed inset-0 z-[200] flex items-end justify-center font-theme">
          
          {/* Fundo Desfocado (Backdrop) */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMenuAberto(false)}></div>
          
          {/* Corpo do Menu (BottomSheet) */}
          <div className="relative w-full max-h-[85vh] bg-bg-surface rounded-t-card flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-2xl border-t border-stroke">
            
            {/* Linha indicadora de arraste (Visual apenas) */}
            <div className="w-full flex justify-center pt-3 pb-1 absolute top-0 left-0">
               <div className="w-12 h-1.5 bg-stroke rounded-full"></div>
            </div>

            {/* Cabeçalho do Menu */}
            <div className="flex items-center justify-between p-5 pt-8 border-b border-stroke bg-bg-surface rounded-t-card shrink-0 shadow-sm relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-theme flex items-center justify-center shadow-sm">
                  <LayoutDashboard size={18} />
                </div>
                <div>
                  <span className="text-lg font-black tracking-tight block text-tx-main leading-none">
                    D'Varano<span className="text-primary ml-1">OS</span>
                  </span>
                  <span className="text-[9px] font-black flex items-center gap-1 text-tx-muted uppercase tracking-widest mt-1">
                    <Shield size={10}/> {usuarioLogado?.nome || 'Operador Local'}
                  </span>
                </div>
              </div>
              <button onClick={() => setMenuAberto(false)} className="p-2 rounded-full bg-bg-input border border-stroke text-tx-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shadow-sm">
                <X size={20}/>
              </button>
            </div>

            {/* Lista de Opções */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3 pb-8 bg-bg-main relative z-0">
              
              <button onClick={() => navegarPara('atendimento')} className={estiloItemLista('atendimento')}>
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${abaAtiva === 'atendimento' ? 'bg-primary/20' : 'bg-[#25D366]/10 border border-[#25D366]/20'}`}>
                   <MessageCircle size={16} className={abaAtiva === 'atendimento' ? 'text-primary' : 'text-[#25D366]'} /> 
                </div>
                Central WhatsApp
              </button>

              {(!usuarioLogado || usuarioLogado?.cargo === 'gerente') && (
                <>
                  <button onClick={() => navegarPara('estoque')} className={estiloItemLista('estoque')}><Box size={18} className="text-tx-muted" /> Estoque e Inventário</button>
                  <button onClick={() => navegarPara('cardapio')} className={estiloItemLista('cardapio')}><Package size={18} className="text-tx-muted" /> Cardápio Web</button>
                  <button onClick={() => navegarPara('motoboys')} className={estiloItemLista('motoboys')}><Bike size={18} className="text-tx-muted" /> Logística de Entregas</button>
                  <button onClick={() => navegarPara('fornecedores')} className={estiloItemLista('fornecedores')}><Users size={18} className="text-tx-muted" /> Compras e Fornecedores</button>
                  <button onClick={() => navegarPara('equipe')} className={estiloItemLista('equipe')}><UserPlus size={18} className="text-tx-muted" /> Gestão de Equipe</button>
                  <button onClick={() => navegarPara('analises')} className={estiloItemLista('analises')}><TrendingUp size={18} className="text-tx-muted" /> Relatórios Financeiros</button>
                  <button onClick={() => navegarPara('fechamento')} className={estiloItemLista('fechamento')}><Calculator size={18} className="text-tx-muted" /> Homologação de Caixa</button>
                </>
              )}
              
              <div className="pt-4 mt-4 border-t border-stroke">
                <button 
                  onClick={() => { setUsuarioLogado(null); setTelaAtual('login'); }}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-theme font-black text-red-500 bg-red-500/5 border border-red-500/20 uppercase tracking-widest active:scale-95 transition-all duration-300 hover:bg-red-500 hover:text-white"
                >
                  <LogOut size={18} /> Encerrar Turno
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}