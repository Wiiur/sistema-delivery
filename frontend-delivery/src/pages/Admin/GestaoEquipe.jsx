// src/pages/Admin/GestaoEquipe.jsx
import React, { useState } from 'react';
import { UserPlus, Plus, Key, Trash2 } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';

export default function GestaoEquipe({
  temaEscuro, 
  funcionarios,
  buscarGeral
}) {
  const [novoFuncionario, setNovoFuncionario] = useState({ nome: '', cargo: 'funcionario' });

  const gerarPin = (nome) => `${nome.charAt(0).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

  const cadastrarFuncionario = async (e) => {
    e.preventDefault(); 
    const novoPin = gerarPin(novoFuncionario.nome);
    try {
      await apiFetch(`/funcionarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: novoFuncionario.nome, cargo: novoFuncionario.cargo, pin: novoPin, ativo: true }) });
      setNovoFuncionario({ nome: '', cargo: 'funcionario' }); buscarGeral(); alert(`✅ Funcionário cadastrado!\nPIN de Acesso: ${novoPin}`);
    } catch(e) { alert("❌ Erro ao conectar com o servidor."); }
  };

  const excluirFuncionario = async (id) => {
    if(window.confirm("Deseja realmente remover esta credencial de acesso?")) {
      try { await apiFetch(`/funcionarios/${id}`, { method: 'DELETE' }); buscarGeral(); } catch(e) { alert("❌ Erro ao comunicar com a API."); }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar animate-in fade-in pb-24 font-theme w-full max-w-[1400px] mx-auto">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* =========================================
            FORMULÁRIO DE CONTRATAÇÃO (ESQUERDA)
            ========================================= */}
        <div className="lg:col-span-1 p-6 sm:p-8 rounded-card border border-stroke shadow-theme h-fit bg-bg-surface lg:sticky lg:top-0 animate-in slide-in-from-left-4">
          <h3 className="text-lg sm:text-xl font-black text-primary mb-6 flex items-center gap-2 uppercase tracking-tight border-b border-stroke pb-4">
            <UserPlus size={24}/> Nova Credencial
          </h3>
          
          <form onSubmit={cadastrarFuncionario} className="space-y-6">
            <div className="relative group animate-in slide-in-from-bottom-2">
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nome de Guerra (Display)</span>
              <input 
                required 
                value={novoFuncionario.nome} 
                onChange={e=>setNovoFuncionario({...novoFuncionario, nome: e.target.value})} 
                placeholder="Ex: Willian" 
                className="w-full p-4 sm:p-5 rounded-theme outline-none text-base font-black transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" 
              />
            </div>

            <div className="relative group animate-in slide-in-from-bottom-2" style={{ animationDelay: '100ms' }}>
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Nível de Acesso (Permissões)</span>
              <select 
                value={novoFuncionario.cargo} 
                onChange={e=>setNovoFuncionario({...novoFuncionario, cargo: e.target.value})} 
                className="w-full p-4 sm:p-5 rounded-theme outline-none text-sm font-bold transition-all duration-300 border border-stroke cursor-pointer bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm uppercase tracking-wider"
              >
                <option value="funcionario">Operador Base (Caixa/Cozinha)</option>
                <option value="gerente">Administrador (Acesso Total)</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="w-full py-4 sm:py-5 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all duration-300 flex justify-center items-center gap-2 mt-6 uppercase tracking-widest text-sm animate-in slide-in-from-bottom-2"
              style={{ animationDelay: '200ms' }}
            >
               Gerar PIN de Acesso <Plus size={18}/> 
            </button>
          </form>
        </div>

        {/* =========================================
            LISTA DE FUNCIONÁRIOS CADASTRADOS (DIREITA)
            ========================================= */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 content-start">
          {funcionarios.map((f, index) => (
            
            <div 
              key={f.id} 
              className="group p-5 sm:p-6 rounded-card border border-stroke flex flex-col justify-between shadow-theme relative overflow-hidden transition-all duration-300 bg-bg-surface hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-right-4"
              style={{ animationDelay: `${index * 50}ms` }}
            >
               
               {/* Ícone de Chave Animado no Hover (Como um crachá) */}
               <div className="absolute top-0 right-0 p-4 rounded-bl-card border-b border-l border-stroke bg-bg-input transition-colors duration-300 group-hover:bg-primary/10 group-hover:border-primary/30">
                 <Key size={18} className="text-tx-muted opacity-50 transition-colors duration-300 group-hover:text-primary group-hover:opacity-100 group-hover:scale-110 transform"/>
               </div>
               
               <div>
                 <div className="flex justify-between items-start mb-3">
                   {/* Botão de exclusão amigável para dedos */}
                   <button 
                     onClick={() => excluirFuncionario(f.id)} 
                     className="p-2 sm:p-2.5 rounded-theme transition-colors shadow-sm bg-bg-input border border-stroke text-tx-muted hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
                     title="Revogar Acesso"
                   >
                     <Trash2 size={16}/>
                   </button>
                   
                   {/* Distintivo (Badge) de Cargo com a nova cor Secundária/Accent mapeada no Tailwind v4 */}
                   <div className={`px-2.5 py-1.5 rounded-theme text-[9px] font-black uppercase tracking-widest border shadow-sm ${f.cargo === 'gerente' ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-bg-input text-tx-muted border-stroke'}`}>
                     {f.cargo}
                   </div>
                   
                   <div className="w-8"></div> {/* Espaçador para centralizar a tag acima */}
                 </div>
                 
                 <h4 className="text-2xl sm:text-3xl font-black tracking-tight mb-8 text-tx-main mt-4 truncate pr-2 group-hover:text-primary transition-colors">{f.nome}</h4>
                 
                 {/* Caixa de PIN em destaque */}
                 <div className="p-4 sm:p-5 rounded-theme border border-stroke flex justify-between items-center bg-bg-main shadow-inner transition-colors duration-300 group-hover:border-primary/30">
                   <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-tx-muted">Código PIN</span>
                   <span className="text-2xl sm:text-3xl font-black tracking-widest text-primary drop-shadow-sm">{f.pin}</span>
                 </div>
               </div>
            </div>

          ))}
        </div>

      </div>
    </div>
  );
}