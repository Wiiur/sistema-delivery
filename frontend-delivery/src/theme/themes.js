// src/theme/themes.js
// ⚡ CORE THEME ENGINE - DROPA DELIVERY OS
// Este motor dita a física, emoção e estrutura visual de todo o White-Label.

// 📐 PARTE 1: A FÍSICA (Estrutura e UX)
export const ESTILOS = {
  bauhaus: { 
    nome: 'Bauhaus (Retro)', 
    fontBase: '"Space Grotesk", system-ui, sans-serif', 
    radiusBase: '0px', radiusCard: '0px', 
    shadow: '6px 6px 0px 0px var(--tx-main)' // Sombra agressiva e sólida
  },
  neumorphism: { 
    nome: 'Neumorfismo', 
    fontBase: '"Nunito", system-ui, sans-serif', 
    radiusBase: '12px', radiusCard: '24px', 
    shadow: '8px 8px 20px rgba(0,0,0,0.08), -8px -8px 20px rgba(255,255,255,0.05)' // Efeito fofo e polido
  },
  cyberpunk: { 
    nome: 'Ciberpunk', 
    fontBase: '"Rajdhani", system-ui, sans-serif', 
    radiusBase: '0px', radiusCard: '8px', 
    shadow: '0 0 15px 2px var(--primary)' // Glow Neon puro
  },
  glass: { 
    nome: 'Glassmorphism', 
    fontBase: '"Outfit", system-ui, sans-serif', 
    radiusBase: '12px', radiusCard: '24px', 
    shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' // Sombra de profundidade máxima (Estilo Apple)
  },
  flat: { 
    nome: 'Flat Pro (SaaS)', 
    fontBase: '"Inter", system-ui, sans-serif', 
    radiusBase: '6px', radiusCard: '8px', 
    shadow: 'none' // Seco, corporativo e focado em dados
  }
};

// 🎨 PARTE 2: AS PALETAS RICAS (4 Cores por nicho)
export const PALETAS = {
  fast_food: {
    nome: 'Fast Food',
    light: { primary: '#E53935', txPrimary: '#FFFFFF', secondary: '#F97316', accent: '#FACC15', bgMain: '#FAFAFA', bgSurface: '#FFFFFF', bgInput: '#F4F4F5', txMain: '#171717', txMuted: '#52525B', stroke: '#E4E4E7' },
    dark: { primary: '#EF4444', txPrimary: '#FFFFFF', secondary: '#EA580C', accent: '#F59E0B', bgMain: '#111111', bgSurface: '#1C1C1C', bgInput: '#2A2A2A', txMain: '#F5F5F5', txMuted: '#A1A1AA', stroke: '#333333' }
  },
  mercado: {
    nome: 'Mercado & Serv.',
    light: { primary: '#2563EB', txPrimary: '#FFFFFF', secondary: '#0D9488', accent: '#10B981', bgMain: '#F3F4F6', bgSurface: '#FFFFFF', bgInput: '#E5E7EB', txMain: '#111827', txMuted: '#4B5563', stroke: '#D1D5DB' },
    dark: { primary: '#3B82F6', txPrimary: '#FFFFFF', secondary: '#14B8A6', accent: '#34D399', bgMain: '#0F172A', bgSurface: '#1E293B', bgInput: '#334155', txMain: '#F8FAFC', txMuted: '#94A3B8', stroke: '#334155' }
  },
  grife: {
    nome: 'Grife & Gourmet',
    light: { primary: '#111111', txPrimary: '#FFFFFF', secondary: '#D4AF37', accent: '#B76E79', bgMain: '#F9FAFB', bgSurface: '#FFFFFF', bgInput: '#F3F4F6', txMain: '#111111', txMuted: '#6B7280', stroke: '#E5E7EB' },
    dark: { primary: '#FFFFFF', txPrimary: '#000000', secondary: '#D4AF37', accent: '#F7E7CE', bgMain: '#000000', bgSurface: '#0A0A0A', bgInput: '#171717', txMain: '#FAFAFA', txMuted: '#A1A1AA', stroke: '#27272A' }
  },
  sorveteria: {
    nome: 'Sorveteria & Doces',
    light: { primary: '#EC4899', txPrimary: '#FFFFFF', secondary: '#06B6D4', accent: '#8B5CF6', bgMain: '#FFF0F5', bgSurface: '#FFFFFF', bgInput: '#FCE4EC', txMain: '#5A0D34', txMuted: '#8E1B57', stroke: '#F8BBD0' },
    dark: { primary: '#F9A8D4', txPrimary: '#3A0A22', secondary: '#67E8F9', accent: '#C4B5FD', bgMain: '#1E0713', bgSurface: '#2E0C1E', bgInput: '#42102A', txMain: '#FCE7F3', txMuted: '#F9C7DD', stroke: '#7A2149' }
  },
  cafeteria: {
    nome: 'Cafeteria & Rústico',
    light: { primary: '#5D4037', txPrimary: '#FFFFFF', secondary: '#D97706', accent: '#FEF3C7', bgMain: '#F5E6D3', bgSurface: '#FFFDFB', bgInput: '#EAE0D5', txMain: '#3E2723', txMuted: '#795548', stroke: '#D7CCC8' },
    dark: { primary: '#D7CCC8', txPrimary: '#2D1E16', secondary: '#8D6E63', accent: '#F59E0B', bgMain: '#2D1E16', bgSurface: '#3E2A1F', bgInput: '#4E342E', txMain: '#EFEBE9', txMuted: '#A1887F', stroke: '#5D4037' }
  }
};

// 🛡️ Ajuste de cor blindado contra erros de digitação de Hexadecimal
export const adjustColor = (color, amount) => {
    if (!color) return '#000000';
    
    // Tira o hashtag
    let hex = color.replace(/^#/, '');
    
    // Se a cor vier com 3 letras (Ex: #FFF), converte pra 6 (Ex: #FFFFFF) para não quebrar a tela
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    // Calcula o clareamento/escurecimento de forma segura
    return '#' + hex.replace(/../g, c => {
        const val = Math.min(255, Math.max(0, parseInt(c, 16) + amount));
        // Garante que sempre terá 2 dígitos (ex: "0A" ao invés de "A")
        return val.toString(16).padStart(2, '0');
    });
};