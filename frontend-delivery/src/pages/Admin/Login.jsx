// src/pages/Admin/Login.jsx
import React, { useState } from 'react';
import { Key, Shield, LayoutDashboard, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, tokenStore } from '../../services/api';

export default function Login({
  setUsuarioLogado,
  setTelaAtual,
  setAbaAtiva
}) {
  const [modoLogin, setModoLogin] = useState('pin');
  const [pinDigitado, setPinDigitado] = useState('');
  const [emailGerente, setEmailGerente] = useState('');
  const [senhaGerente, setSenhaGerente] = useState('');
  const [carregando, setCarregando] = useState(false);

  const loginPin = async (e) => {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    try {
      const res = await apiFetch(`/login-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinDigitado })
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        tokenStore.set(data.access_token, null);
        setUsuarioLogado(data.user);
        setTelaAtual('dashboard');
        setAbaAtiva('pedidos');
        toast.success(`Bem-vindo(a), ${data.user.nome}!`);
      } else {
        toast.error(data.erro || 'PIN inválido ou funcionário inativo.');
      }
    } catch {
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const loginGerente = async (e) => {
    e.preventDefault();
    if (carregando) return;
    setCarregando(true);
    try {
      const res = await apiFetch(`/login-gerente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailGerente, senha: senhaGerente })
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        tokenStore.set(data.access_token, data.refresh_token);
        setUsuarioLogado(data.user);
        setTelaAtual('dashboard');
        setAbaAtiva('analises');
        toast.success(`Bem-vindo(a), ${data.user.nome}!`);
      } else {
        toast.error(data.erro || `Erro ${res.status}: falha desconhecida`);
      }
    } catch {
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      data-testid="login-page"
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-500 font-theme bg-bg-main animate-in fade-in"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, var(--bg-surface) 0%, transparent 70%)' }}
    >
      <div className="w-full max-w-sm p-8 sm:p-10 rounded-card shadow-2xl border border-stroke relative overflow-hidden bg-bg-surface">
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-700 ${modoLogin === 'pin' ? 'bg-primary' : 'bg-secondary'}`}></div>
        <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-10 pointer-events-none transition-colors duration-700 ${modoLogin === 'pin' ? 'bg-primary' : 'bg-secondary'}`}></div>

        {modoLogin === 'pin' ? (
          <div className="animate-in slide-in-from-left-8 fade-in duration-300">
            <div className="text-center mb-8 relative z-10">
              <div className="w-16 h-16 bg-primary/10 rounded-theme flex items-center justify-center mx-auto mb-5 text-primary shadow-sm border border-primary/20 transition-transform hover:scale-105">
                <Key size={32} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-tx-main">Entrar no PDV</h1>
              <p className="text-xs sm:text-sm mt-2 font-bold uppercase tracking-widest text-tx-muted">Acesso Operacional</p>
            </div>

            <form onSubmit={loginPin} className="space-y-6 relative z-10">
              <input
                data-testid="login-pin-input"
                type="password"
                required
                value={pinDigitado}
                onChange={e => setPinDigitado(e.target.value)}
                maxLength={8}
                autoComplete="off"
                className="w-full px-4 py-5 text-center text-4xl font-black tracking-[0.4em] uppercase rounded-theme outline-none transition-all duration-300 border-2 border-stroke bg-bg-input text-primary focus:border-primary focus:bg-bg-surface shadow-inner"
                placeholder="PIN"
              />
              <button
                data-testid="login-pin-submit"
                type="submit"
                disabled={carregando}
                className="w-full bg-primary text-tx-primary font-black py-4 sm:py-5 rounded-theme transition-all duration-300 shadow-theme hover:bg-primary-hover active:scale-95 uppercase tracking-widest text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {carregando ? <Loader2 size={16} className="animate-spin" /> : <>Desbloquear <Key size={16} /></>}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4 relative z-10 pt-6 border-t border-stroke">
              <button
                data-testid="login-mode-gerente"
                onClick={() => setModoLogin('gerente')}
                className="w-full py-2 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 text-tx-muted hover:text-secondary uppercase tracking-wider rounded-md hover:bg-bg-input"
              >
                <LayoutDashboard size={16} /> Acesso Gerencial
              </button>
              <button
                data-testid="login-back-to-store"
                onClick={() => setTelaAtual('cliente')}
                className="w-full py-2 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 text-tx-muted hover:text-primary uppercase tracking-wider rounded-md hover:bg-bg-input"
              >
                <ArrowLeft size={16} /> Voltar à Loja Pública
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="text-center mb-8 relative z-10">
              <div className="w-16 h-16 bg-secondary/10 rounded-theme flex items-center justify-center mx-auto mb-5 text-secondary shadow-sm border border-secondary/20 transition-transform hover:scale-105">
                <Shield size={32} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-tx-main">Área do Gestor</h1>
              <p className="text-xs sm:text-sm mt-2 font-bold uppercase tracking-widest text-tx-muted">Administração Total</p>
            </div>

            <form onSubmit={loginGerente} className="space-y-5 relative z-10">
              <div className="relative group">
                <span className="absolute -top-2 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted group-focus-within:text-secondary transition-colors">E-mail Corporativo</span>
                <input
                  data-testid="login-gerente-email"
                  type="email"
                  required
                  value={emailGerente}
                  onChange={e => setEmailGerente(e.target.value)}
                  className="w-full p-4 sm:p-5 text-sm sm:text-base font-bold rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-secondary focus:bg-bg-surface shadow-sm"
                  placeholder="gerente@loja.com"
                />
              </div>
              <div className="relative group">
                <span className="absolute -top-2 left-3 px-1.5 text-[10px] font-black uppercase tracking-wider bg-bg-surface text-tx-muted group-focus-within:text-secondary transition-colors">Senha Mestra</span>
                <input
                  data-testid="login-gerente-senha"
                  type="password"
                  required
                  value={senhaGerente}
                  onChange={e => setSenhaGerente(e.target.value)}
                  className="w-full p-4 sm:p-5 text-sm sm:text-base font-bold rounded-theme outline-none transition-all duration-300 border border-stroke bg-bg-input text-tx-main focus:border-secondary focus:bg-bg-surface shadow-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                data-testid="login-gerente-submit"
                type="submit"
                disabled={carregando}
                className="w-full bg-tx-main text-bg-main font-black py-4 sm:py-5 rounded-theme transition-all duration-300 shadow-theme hover:opacity-90 active:scale-95 mt-2 uppercase tracking-widest text-sm flex justify-center items-center gap-2 disabled:opacity-60"
              >
                {carregando ? <Loader2 size={16} className="animate-spin" /> : <>Acessar Painel <LayoutDashboard size={16} /></>}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-4 relative z-10 pt-6 border-t border-stroke">
              <button
                data-testid="login-mode-pin"
                onClick={() => setModoLogin('pin')}
                className="w-full py-2 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 text-tx-muted hover:text-primary uppercase tracking-wider rounded-md hover:bg-bg-input"
              >
                <Key size={16} /> Voltar para o PDV
              </button>
              <button
                data-testid="login-back-to-store-2"
                onClick={() => setTelaAtual('cliente')}
                className="w-full py-2 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 text-tx-muted hover:text-primary uppercase tracking-wider rounded-md hover:bg-bg-input"
              >
                <ArrowLeft size={16} /> Voltar à Loja Pública
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
