// src/components/BuscadorEndereco.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, Check, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// 👉 A CORREÇÃO DA PRECISÃO DO CLIQUE ACONTECE AQUI
// Se não definirmos o tamanho e a âncora, o React centraliza a imagem e tira a ponta do pino do lugar exato!
let DefaultIcon = L.icon({ 
  iconUrl: icon, 
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41], // O pixel exato da "ponta" da agulha
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function BuscadorEndereco({ temaEscuro, onEnderecoConfirmado, enderecoInicial, latLoja, lonLoja }) {
  const defaultLat = Number(latLoja) || -22.778842;
  const defaultLon = Number(lonLoja) || -47.294411;

  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  
  const [localSelecionado, setLocalSelecionado] = useState({
    lat: enderecoInicial?.lat || defaultLat,
    lon: enderecoInicial?.lon || defaultLon,
    rua: enderecoInicial?.rua || '',
    bairro: enderecoInicial?.bairro || '',
    cidade: enderecoInicial?.cidade || '',
    cep: enderecoInicial?.cep || ''
  });
  
  const [numeroRef, setNumeroRef] = useState(enderecoInicial?.numero || '');
  const [complementoRef, setComplementoRef] = useState(enderecoInicial?.complemento || '');

  const timerBusca = useRef(null);
  const LOCATIONIQ_KEY = "pk.1a96e13ee8575ca445f29fdfa4f4e1ee";

  useEffect(() => {
    if (enderecoInicial && enderecoInicial.rua) {
      setNumeroRef(enderecoInicial.numero || '');
      setComplementoRef(enderecoInicial.complemento || '');
      setBusca(`${enderecoInicial.rua}, ${enderecoInicial.numero || ''}`);
      if (enderecoInicial.lat && enderecoInicial.lon) {
        setLocalSelecionado({
          lat: Number(enderecoInicial.lat), lon: Number(enderecoInicial.lon),
          rua: enderecoInicial.rua, bairro: enderecoInicial.bairro,
          cidade: enderecoInicial.cidade, cep: enderecoInicial.cep
        });
      }
    }
  }, [enderecoInicial]);

  function MudaCentroMapa({ coords }) {
    const map = useMap();
    useEffect(() => { if (coords) map.flyTo([coords.lat, coords.lon], 17); }, [coords, map]);
    return null;
  }

  const handleDigitacao = (texto) => {
    setBusca(texto);
    if (texto.length < 4) { setSugestoes([]); return; }
    setBuscando(true);
    if (timerBusca.current) clearTimeout(timerBusca.current);
    timerBusca.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://us1.locationiq.com/v1/autocomplete.php?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(texto)}&countrycodes=br&limit=5&format=json`);
        if (res.ok) setSugestoes(await res.json());
      } catch (e) {} finally { setBuscando(false); }
    }, 600); 
  };

  const selecionarEndereco = (local) => {
    setLocalSelecionado({
      lat: Number(local.lat), lon: Number(local.lon),
      rua: local.address.road || local.display_name.split(',')[0],
      bairro: local.address.suburb || local.address.neighbourhood || '',
      cidade: local.address.city || local.address.town || '', cep: local.address.postcode || '', display: local.display_name
    });
    setBusca(local.address.road || local.display_name.split(',')[0]);
    setSugestoes([]);
  };

  function InteratividadeMapa() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        try {
          const res = await fetch(`https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const ruaMapeada = data.address?.road || data.address?.pedestrian || data.display_name.split(',')[0];
            setLocalSelecionado({
              lat: lat, lon: lng, rua: ruaMapeada,
              bairro: data.address?.suburb || data.address?.neighbourhood || '',
              cidade: data.address?.city || data.address?.town || '', cep: data.address?.postcode || '', display: data.display_name
            });
            setBusca(ruaMapeada);
          } else { setLocalSelecionado(prev => ({...prev, lat: lat, lon: lng})); }
        } catch (error) { setLocalSelecionado(prev => ({...prev, lat: lat, lon: lng})); }
      }
    });
    return null;
  }

  const confirmarTudo = () => {
    if (!numeroRef) return alert("Por favor, digite o número da residência.");
    onEnderecoConfirmado({ ...localSelecionado, numero: numeroRef, complemento: complementoRef });
  };

  return (
    <div className="p-5 sm:p-6 rounded-card border border-stroke shadow-theme bg-bg-surface font-theme animate-in fade-in transition-all duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest mb-4 border-b border-stroke pb-3 flex items-center gap-2 text-tx-main">
        <MapPin size={18} className="text-primary"/> Endereço de Entrega
      </h3>
      
      <div className="relative mb-5 group">
        <div className="flex items-center gap-3 p-4 rounded-theme border-2 border-stroke focus-within:border-primary focus-within:bg-bg-surface transition-all duration-300 bg-bg-input shadow-sm">
          <Search size={20} className="text-tx-muted group-focus-within:text-primary transition-colors" />
          <input 
            value={busca} 
            onChange={(e) => handleDigitacao(e.target.value)} 
            placeholder="Digite sua rua..." 
            className="w-full bg-transparent outline-none font-bold text-sm text-tx-main placeholder:text-tx-muted/60" 
          />
          {buscando && <Loader2 size={16} className="text-primary animate-spin" />}
        </div>
        
        {sugestoes.length > 0 && (
          <ul className="absolute z-[1000] w-full mt-2 rounded-card border border-stroke shadow-2xl overflow-hidden bg-bg-surface/95 backdrop-blur-md animate-in slide-in-from-top-2">
            {sugestoes.map((s, i) => (
              <li 
                key={i} 
                onClick={() => selecionarEndereco(s)} 
                className="p-4 cursor-pointer border-b border-stroke flex gap-3 transition-colors duration-300 hover:bg-bg-input group/item"
              >
                <MapPin size={18} className="text-tx-muted group-hover/item:text-primary shrink-0 mt-0.5 transition-colors" />
                <span className="text-sm font-bold text-tx-main leading-tight group-hover/item:text-primary transition-colors">{s.display_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-5">
        <div className="h-64 w-full rounded-card overflow-hidden border border-stroke shadow-inner relative z-[1]">
          <MapContainer center={[localSelecionado.lat, localSelecionado.lon]} zoom={16} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MudaCentroMapa coords={localSelecionado} />
            <InteratividadeMapa /> 
            <Marker position={[localSelecionado.lat, localSelecionado.lon]} />
          </MapContainer>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-bg-surface/90 backdrop-blur-md text-tx-main border border-stroke text-[10px] px-4 py-2 rounded-full text-center z-[400] font-black uppercase tracking-widest pointer-events-none whitespace-nowrap shadow-theme flex items-center gap-1.5">
            <MapPin size={12} className="text-primary"/> Clique para ajustar
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative w-1/3 mt-2 group">
            <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Número</span>
            <input 
               required 
               value={numeroRef} 
               onChange={e => setNumeroRef(e.target.value)} 
               placeholder="Ex: 134" 
               className="w-full p-4 rounded-theme outline-none font-black text-sm text-center border-2 border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm transition-all duration-300" 
            />
          </div>
          <div className="relative flex-1 mt-2 group">
            <span className="absolute -top-2.5 left-3 px-1.5 text-[9px] font-black uppercase tracking-widest bg-bg-surface text-tx-muted group-focus-within:text-primary transition-colors">Complemento</span>
            <input 
               value={complementoRef} 
               onChange={e => setComplementoRef(e.target.value)} 
               placeholder="Apto, Bloco..." 
               className="w-full p-4 rounded-theme outline-none font-bold text-sm border-2 border-stroke bg-bg-input text-tx-main focus:border-primary focus:bg-bg-surface shadow-sm transition-all duration-300" 
            />
          </div>
        </div>

        {/* Botão blindado com contraste Inteligente */}
        <button 
           type="button" 
           onClick={confirmarTudo} 
           className="w-full mt-4 py-4 bg-primary text-tx-primary font-black rounded-theme shadow-theme hover:bg-primary-hover active:scale-95 transition-all duration-300 flex justify-center items-center gap-2 uppercase tracking-widest text-sm"
        >
          <Check size={18}/> Confirmar no Mapa
        </button>
      </div>
    </div>
  );
}