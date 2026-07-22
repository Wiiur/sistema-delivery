// src/pages/Admin/GestaoCupons.jsx
import React, { useState, useEffect } from 'react';
import { Ticket, Plus, Trash2, Power, PowerOff, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import { API_URL, apiFetch } from '../../services/api';
import { toast } from 'sonner';

export default function GestaoCupons({ temaEscuro }) {
  const [cupons, setCupons] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [novoCupom, setNovoCupom] = useState({
    codigo: '',
    tipo_desconto: 'FIXO',
    valor_desconto: '',
    valor_min_pedido: '',
    limite_uso_total: '',
    data_expiracao: '',
    desconto_maximo: ''
  });

  const buscarCupons = async () => {
    try {
      const res = await apiFetch(`/cupons`);
      if (res.ok) setCupons(await res.json());
    } catch (e) {
      toast.error("Erro ao buscar cupons.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarCupons();
  }, []);

  const salvarCupom = async (e) => {
    e.preventDefault();
    if (!novoCupom.codigo || !novoCupom.valor_desconto) return toast.error("Preencha o código e o valor!");

    try {
      const res = await apiFetch(`/cupons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoCupom)
      });

      if (res.ok) {
        toast.success("Cupom criado com sucesso!");
        setNovoCupom({ codigo: '', tipo_desconto: 'FIXO', valor_desconto: '', valor_min_pedido: '', limite_uso_total: '', data_expiracao: '' });
        buscarCupons();
      } else {
        const erro = await res.json();
        toast.error(erro.erro || "Erro ao criar cupom.");
      }
    } catch (e) {
      toast.error("Erro de conexão com o servidor.");
    }
  };

  const alternarStatus = async (id) => {
    try {
      await apiFetch(`/cupons/${id}/status`, { method: 'PUT' });
      buscarCupons();
    } catch (e) {
      toast.error("Erro ao alterar status.");
    }
  };

  const excluirCupom = async (id) => {
    if (!window.confirm("Deseja realmente excluir este cupom?")) return;
    try {
      await apiFetch(`/cupons/${id}`, { method: 'DELETE' });
      toast.success("Cupom excluído.");
      buscarCupons();
    } catch (e) {
      toast.error("Erro ao excluir. Talvez ele já tenha sido usado em pedidos.");
    }
  };

  return (
    <div className="space-y-8 flex-1 overflow-y-auto pr-2 animate-in fade-in custom-scrollbar pb-24 font-theme w-full max-w-[1400px] mx-auto relative">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-stroke pb-6">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 text-tx-main tracking-tight">
            <Ticket className="text-primary" size={28} /> Motor de Cupons
          </h2>
          <p className="text-sm font-bold text-tx-muted mt-1 uppercase tracking-widest">Crie campanhas e atraia mais clientes</p>
        </div>
      </div>

      {/* FORMULÁRIO DE CRIAÇÃO */}
      <div className="p-5 sm:p-8 rounded-card border border-stroke shadow-theme bg-bg-surface animate-in slide-in-from-left-4">
        <h3 className="text-lg font-black mb-6 text-tx-main flex items-center gap-2 uppercase tracking-wide border-b border-stroke pb-4">
          <Plus size={20} className="text-secondary"/> Novo Cupom
        </h3>
        
        <form onSubmit={salvarCupom} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Código (Ex: BEMVINDO10)</span>
              <input required value={novoCupom.codigo} onChange={e => setNovoCupom({...novoCupom, codigo: e.target.value.toUpperCase().replace(/\s/g, '')})} placeholder="CÓDIGO" className="w-full p-4 font-black uppercase tracking-widest rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Tipo</span>
                <select value={novoCupom.tipo_desconto} onChange={e => setNovoCupom({...novoCupom, tipo_desconto: e.target.value})} className="w-full p-4 font-bold text-sm uppercase rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm cursor-pointer">
                  <option value="FIXO">R$ Fixo</option>
                  <option value="PORCENTAGEM">% Porcentagem</option>
                </select>
              </div>
              <div className="relative flex-[1.5] group">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Valor</span>
                <input required type="number" step="0.01" min="0" value={novoCupom.valor_desconto} onChange={e => setNovoCupom({...novoCupom, valor_desconto: e.target.value})} placeholder={novoCupom.tipo_desconto === 'FIXO' ? "15.00" : "10"} className="w-full p-4 font-black text-lg rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
              </div>
            </div>

            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Pedido Mínimo (R$)</span>
              <input type="number" step="0.01" value={novoCupom.valor_min_pedido} onChange={e => setNovoCupom({...novoCupom, valor_min_pedido: e.target.value})} placeholder="Opcional. Ex: 50.00" className="w-full p-4 font-bold text-sm rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
            </div>

            {/* 👉 CAMPO INTELIGENTE: Só aparece se for Porcentagem */}
            {novoCupom.tipo_desconto === 'PORCENTAGEM' && (
              <div className="relative group animate-in zoom-in-95">
                <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Teto Máximo (R$)</span>
                <input 
                  type="number" step="0.01" min="0" 
                  value={novoCupom.desconto_maximo} 
                  onChange={e => setNovoCupom({...novoCupom, desconto_maximo: e.target.value})} 
                  placeholder="Ex: 15.00 (Máx de desconto)" 
                  className="w-full p-4 font-bold text-sm rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm ring-1 ring-primary/20" 
                />
              </div>
            )}

            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Válido Até</span>
              <input type="date" value={novoCupom.data_expiracao} onChange={e => setNovoCupom({...novoCupom, data_expiracao: e.target.value})} className="w-full p-4 font-bold text-sm uppercase rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
            </div>

            <div className="relative group">
              <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Limite Máx. de Usos</span>
              <input type="number" min="1" value={novoCupom.limite_uso_total} onChange={e => setNovoCupom({...novoCupom, limite_uso_total: e.target.value})} placeholder="Opcional. Ex: 100" className="w-full p-4 font-bold text-sm rounded-theme outline-none transition-all border border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm" />
            </div>

            <button type="submit" className="w-full p-4 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Plus size={18}/> Gerar Cupom
            </button>
          </div>
        </form>
      </div>
      

      {/* LISTAGEM DE CUPONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {carregando ? (
           <p className="text-tx-muted font-bold animate-pulse">Carregando cupons...</p>
        ) : cupons.length === 0 ? (
           <div className="col-span-full py-12 text-center border border-dashed border-stroke rounded-card bg-bg-surface text-tx-muted">
             <Ticket size={40} className="mx-auto mb-3 opacity-20"/>
             <p className="font-bold text-sm uppercase tracking-widest">Nenhum cupom cadastrado</p>
           </div>
        ) : (
          cupons.map(cupom => {
            const expirado = cupom.data_expiracao && new Date(cupom.data_expiracao) < new Date();
            const esgotado = cupom.limite_uso_total && cupom.usos_atuais >= cupom.limite_uso_total;
            const inutilizavel = !cupom.ativo || expirado || esgotado;

            return (
              <div key={cupom.id} className={`p-5 rounded-card border shadow-sm transition-all relative overflow-hidden bg-bg-surface ${inutilizavel ? 'border-stroke opacity-70 grayscale-[30%]' : 'border-primary/30 hover:border-primary hover:shadow-md'}`}>
                
                {/* Linha Lateral Decorativa */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${inutilizavel ? 'bg-stroke' : 'bg-primary'}`}></div>
                
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-black uppercase tracking-widest text-tx-main">{cupom.codigo}</h4>
                      <p className="text-xs font-bold text-primary bg-primary/10 w-fit px-2 py-0.5 rounded-sm mt-1 uppercase tracking-wider">
                        {cupom.tipo_desconto === 'FIXO' ? `R$ ${Number(cupom.valor_desconto).toFixed(2)} OFF` : `${Number(cupom.valor_desconto)}% OFF`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => alternarStatus(cupom.id)} title={cupom.ativo ? "Pausar Cupom" : "Ativar Cupom"} className={`p-2 rounded-md transition-colors border ${cupom.ativo ? 'text-green-500 bg-green-500/10 border-green-500/20 hover:bg-green-500/20' : 'text-tx-muted bg-bg-input border-stroke hover:text-tx-main'}`}>
                        {cupom.ativo ? <Power size={16}/> : <PowerOff size={16}/>}
                      </button>
                      <button onClick={() => excluirCupom(cupom.id)} title="Excluir Definitivamente" className="p-2 rounded-md text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-stroke text-[11px] font-bold text-tx-muted uppercase tracking-wider">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><TrendingUp size={14}/> Usos Totais</span>
                      <span className="text-tx-main">{cupom.usos_atuais} {cupom.limite_uso_total && `/ ${cupom.limite_uso_total}`}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><Ticket size={14}/> Pedido Mín.</span>
                      <span className="text-tx-main">{cupom.valor_min_pedido ? `R$ ${Number(cupom.valor_min_pedido).toFixed(2)}` : 'Sem limite'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><Calendar size={14}/> Validade</span>
                      <span className={expirado ? 'text-red-500' : 'text-tx-main'}>{cupom.data_expiracao ? new Date(cupom.data_expiracao).toLocaleDateString('pt-BR') : 'Sem validade'}</span>
                    </div>
                  </div>

                  {inutilizavel && (
                    <div className="mt-4 pt-3 flex items-center gap-2 text-xs font-black text-red-500 bg-red-500/10 px-3 py-2 rounded-md uppercase tracking-widest border border-red-500/20">
                      <AlertCircle size={16}/> 
                      {expirado ? 'Expirado' : esgotado ? 'Esgotado' : 'Pausado'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}