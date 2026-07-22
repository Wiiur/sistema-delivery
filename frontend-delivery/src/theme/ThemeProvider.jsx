// src/theme/ThemeProvider.jsx
// ⚡ CORE THEME PROVIDER - DROPA DELIVERY OS
// Gerencia a injeção das variáveis CSS na raiz do documento de forma ultra-rápida.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ESTILOS, PALETAS } from './themes';
import { API_URL, publicFetch } from '../services/api';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [estiloName, setEstiloName] = useState('flat');
  const [paletaName, setPaletaName] = useState('fast_food');
  const [mode, setMode] = useState(localStorage.getItem('app_mode') || 'dark'); 

  // 1. Busca a configuração salva no Banco de Dados
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await publicFetch(`/config`);
        if (res.ok) {
          const data = await res.json();
          if (data.tema_base && data.tema_base.includes(':')) {
            const [est, pal] = data.tema_base.split(':');
            setEstiloName(est); 
            setPaletaName(pal);
          } else if (data.tema_base) {
            setPaletaName(data.tema_base); 
          }
        }
      } catch (e) {
        console.warn("⚠️ Dropa Delivery: Operando com o tema padrão visual (Aguardando servidor).");
      }
    };
    fetchConfig();
  }, []);

  // 2. Aplica as variáveis na tela e ouve o celular do cliente
  useEffect(() => {
    const applyTheme = () => {
      let activeMode = mode;
      
      // Se tiver no "system", espelha o tema atual do iOS/Android do cliente
      if (mode === 'system') {
        activeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      const estilo = ESTILOS[estiloName] || ESTILOS['flat'];
      const paleta = PALETAS[paletaName] || PALETAS['fast_food'];
      const tokens = paleta[activeMode];

      const root = document.documentElement;
      
      // Cores Ricas (4 tons)
      root.style.setProperty('--primary', tokens.primary);
      root.style.setProperty('--tx-primary', tokens.txPrimary);
      root.style.setProperty('--secondary', tokens.secondary);
      root.style.setProperty('--accent', tokens.accent);
      
      // Fundo e Textos
      root.style.setProperty('--bg-main', tokens.bgMain);
      root.style.setProperty('--bg-surface', tokens.bgSurface);
      root.style.setProperty('--bg-input', tokens.bgInput);
      root.style.setProperty('--tx-main', tokens.txMain);
      root.style.setProperty('--tx-muted', tokens.txMuted);
      root.style.setProperty('--stroke', tokens.stroke);
      
      // Física, Estrutura e Sombra (Responsivo e com animação nativa do CSS)
      root.style.setProperty('--font-theme', estilo.fontBase);
      root.style.setProperty('--shadow-theme', estilo.shadow);

      // 🛡️ REABILITADO COM SEGURANÇA:
      // Como o arquivo themes.js foi blindado, podemos puxar a curvatura dinâmica do banco!
      root.style.setProperty('--radius-theme', estilo.radiusBase); 
      root.style.setProperty('--radius-card', estilo.radiusCard); 
    };
    
    applyTheme();

    // 👉 MÁGICA DA RESPONSIVIDADE: Muda o tema automático se o cliente mudar as config do próprio celular
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (mode === 'system') applyTheme();
    };
    
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    
  }, [estiloName, paletaName, mode]);

  const toggleMode = () => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
    localStorage.setItem('app_mode', newMode); 
  };

  return (
    <ThemeContext.Provider value={{ estiloName, paletaName, mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);