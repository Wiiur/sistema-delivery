// src/components/MenuLateral.jsx
import React from 'react';
import { LayoutDashboard, Shield, ShoppingBag, ShoppingCart, Box, Package, Bike, Users, UserPlus, TrendingUp, Calculator, LogOut, Settings, MessageCircle, Plus, List } from 'lucide-react';

export default function MenuLateral({ 
  temaEscuro, 
  usuarioLogado, 
  abaAtiva, 
  setAbaAtiva, 
  setUsuarioLogado, 
  setTelaAtual, 
  setModoLogin 
}) {

  // Função de estilo inteligente que aceita uma cor customizada (Ex: WhatsApp)
  const estiloAba = (id, corEspecial = null) => {
    const isAtivo = abaAtiva === id;
    
    if (corEspecial === 'whatsapp') {
      return `flex items-center gap-3 px-4 py-3 rounded-theme transition-all duration-300 whitespace-nowrap text-sm font-bold border-l-4 ${
        isAtivo 
        ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366] shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] scale-[0.98]' 
        : 'border-transparent text-tx-muted hover:bg-bg-input hover:text-[#25D366] hover:border-[#25D366]/30'
      }`;
    }

    return `flex items-center gap-3 px-4 py-3 rounded-theme transition-all duration-300 whitespace-nowrap text-sm font-bold border-l-4 ${
      isAtivo 
      ? 'bg-primary/10 text-primary border-primary shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] scale-[0.98]' 
      : 'border-transparent text-tx-muted hover:bg-bg-input hover:text-tx-main hover:border-stroke'
    }`;
  };

  return (
    <aside className="w-full md:w-64 p-4 md:p-6 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start border-b md:border-b-0 md:border-r shrink-0 z-40 shadow-theme bg-bg-surface border-stroke font-theme animate-in slide-in-from-left-8 duration-500">
      
      {/* LOGO DO SISTEMA */}
      <div className="flex items-center gap-3 md:mb-10 w-full group cursor-pointer">
        <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-theme flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105">
          <LayoutDashboard size={18} />
        </div>
        <div className="hidden md:block overflow-hidden">
          <span className="text-xl font-black tracking-tight block truncate text-tx-main leading-none">
            D'Varano<span className="text-primary ml-1">OS</span>
          </span>
          <span className="text-[9px] font-black block truncate flex items-center gap-1 text-tx-muted uppercase tracking-widest mt-1">
            <Shield size={10}/> {usuarioLogado?.nome || 'Operador Local'}
          </span>
        </div>
      </div>
      
      {/* NAVEGAÇÃO PRINCIPAL */}
      <nav className="flex flex-row md:flex-col gap-1.5 flex-1 md:flex-none overflow-x-auto custom-scrollbar md:w-full items-center md:items-stretch pb-2 md:pb-0">
        
        {/* OPÇÕES DE CAIXA E ATENDIMENTO */}
        <button onClick={() => setAbaAtiva('pedidos')} className={estiloAba('pedidos')}>
          <ShoppingBag size={18} /> <span className="hidden md:inline">Cozinha</span>
        </button>
        <button onClick={() => setAbaAtiva('caixa')} className={estiloAba('caixa')}>
          <ShoppingCart size={18} /> <span className="hidden md:inline">PDV Local</span>
        </button>
        <button onClick={() => setAbaAtiva('atendimento')} className={estiloAba('atendimento', 'whatsapp')}>
          <MessageCircle size={18} /> <span className="hidden md:inline">Central WhatsApp</span>
        </button>
        
        {/* OPÇÕES GERENCIAIS */}
        {(!usuarioLogado || usuarioLogado?.cargo === 'gerente') && (
          <div className="flex flex-row md:flex-col gap-1.5 md:mt-4 md:pt-4 md:border-t border-stroke">
            <div className="hidden md:block text-[9px] font-black uppercase tracking-widest text-tx-muted mb-1 px-4">Gestão</div>
            <button onClick={() => setAbaAtiva('estoque')} className={estiloAba('estoque')}><Box size={18} /> <span className="hidden md:inline">Estoque</span></button>
            <button onClick={() => setAbaAtiva('cardapio')} className={estiloAba('cardapio')}><Package size={18} /> <span className="hidden md:inline">Cardápio Web</span></button>
            <button onClick={() => setAbaAtiva('motoboys')} className={estiloAba('motoboys')}><Bike size={18} /> <span className="hidden md:inline">Logística</span></button>
            <button onClick={() => setAbaAtiva('fornecedores')} className={estiloAba('fornecedores')}><Users size={18} /> <span className="hidden md:inline">Fornecedores</span></button>
            <button onClick={() => setAbaAtiva('equipe')} className={estiloAba('equipe')}><UserPlus size={18} /> <span className="hidden md:inline">Equipe</span></button>
            <button onClick={() => setAbaAtiva('analises')} className={estiloAba('analises')}><TrendingUp size={18} /> <span className="hidden md:inline">Relatórios</span></button>
            <button onClick={() => setAbaAtiva('fechamento')} className={estiloAba('fechamento')}><Calculator size={18} /> <span className="hidden md:inline">Caixa Dia</span></button>
          </div>
        )}
      </nav>
      
      {/* RODAPÉ DO MENU */}
      <div className="mt-auto pt-6 border-t border-stroke w-full hidden md:block space-y-2">
        <button 
          onClick={() => setAbaAtiva('configuracoes')} 
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-theme font-bold transition-all duration-300 border-l-4 ${
            abaAtiva === 'configuracoes' 
            ? 'bg-primary/10 text-primary border-primary shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] scale-[0.98]' 
            : 'border-transparent text-tx-muted hover:bg-bg-input hover:text-tx-main hover:border-stroke'
          }`}
        >
          <Settings size={18} /> <span className="hidden md:block">Ajustes do Sistema</span>
        </button>

        <button 
          onClick={() => { setUsuarioLogado(null); setTelaAtual('login'); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-theme font-bold transition-all duration-300 border-l-4 border-transparent text-red-500 hover:bg-red-500/10 hover:border-red-500/50"
        >
          <LogOut size={18} /> <span className="hidden md:block">Encerrar Turno</span>
        </button>
      </div>
    </aside>
  );
}