import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingDown, TrendingUp, Minus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FipeComparison({ vehicle }) {
  const [fipeData, setFipeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);

  const [selMarca, setSelMarca] = useState('');
  const [selModelo, setSelModelo] = useState('');
  const [selAno, setSelAno] = useState('');

  useEffect(() => {
    if (!manualMode) {
      autoFetchFipe();
    } else {
      fetchMarcas();
    }
  }, [manualMode]);

  const autoFetchFipe = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await base44.functions.invoke('getFipePrice', {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.model_year
      });
      if (res.data.fipe_price) {
        setFipeData(res.data);
      } else {
        setError(true);
      }
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarcas = async () => {
    try {
      const res = await fetch('https://parallelum.com.br/fipe/api/v1/carros/marcas');
      setMarcas(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModelos = async (marcaId) => {
    setSelMarca(marcaId);
    setSelModelo('');
    setSelAno('');
    setModelos([]);
    setAnos([]);
    if (!marcaId) return;
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${marcaId}/modelos`);
      const data = await res.json();
      setModelos(data.modelos);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnos = async (modeloId) => {
    setSelModelo(modeloId);
    setSelAno('');
    setAnos([]);
    if (!modeloId) return;
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selMarca}/modelos/${modeloId}/anos`);
      setAnos(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchManualPrice = async () => {
    if (!selMarca || !selModelo || !selAno) return;
    setLoading(true);
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/carros/marcas/${selMarca}/modelos/${selModelo}/anos/${selAno}`);
      const data = await res.json();
      const numericPrice = parseFloat(data.Valor.replace('R$ ', '').replaceAll('.', '').replace(',', '.'));
      
      const newFipeData = {
        fipe_price: numericPrice,
        fipe_string: data.Valor,
        fipe_code: data.CodigoFipe,
        fipe_month: data.MesReferencia,
        matched_model: data.Modelo
      };
      
      setFipeData(newFipeData);
      setManualMode(false);
      
      await base44.entities.Vehicle.update(vehicle.id, { fipe_code: data.CodigoFipe });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !manualMode) {
    return (
      <Card className="rounded-3xl border-border shadow-sm bg-card">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Consultando Tabela FIPE...</span>
        </CardContent>
      </Card>
    );
  }

  if (manualMode) {
    return (
      <Card className="rounded-3xl border-border shadow-sm bg-card">
        <CardContent className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Busca Manual FIPE</h3>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selMarca} onChange={e => fetchModelos(e.target.value)}>
            <option value="">Selecione a Marca</option>
            {marcas.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
          </select>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selModelo} onChange={e => fetchAnos(e.target.value)} disabled={!selMarca}>
            <option value="">Selecione o Modelo</option>
            {modelos.map(m => <option key={m.codigo} value={m.codigo}>{m.nome}</option>)}
          </select>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selAno} onChange={e => setSelAno(e.target.value)} disabled={!selModelo}>
            <option value="">Selecione o Ano</option>
            {anos.map(a => <option key={a.codigo} value={a.codigo}>{a.nome}</option>)}
          </select>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setManualMode(false)}>Cancelar</Button>
            <Button onClick={fetchManualPrice} disabled={!selAno || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar Preço'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !fipeData) {
    return (
      <Card className="rounded-3xl border-border shadow-sm bg-card">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Não foi possível encontrar este veículo na FIPE automaticamente.</p>
          <Button variant="outline" size="sm" onClick={() => setManualMode(true)}>
            <Search className="h-4 w-4 mr-2" /> Busca Manual
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!fipeData) return null;

  const diff = vehicle.price - fipeData.fipe_price;
  const diffPercent = (diff / fipeData.fipe_price) * 100;
  
  let badgeConfig = { color: 'bg-yellow-100 text-yellow-700', icon: <Minus className="h-3 w-3 mr-1" />, text: 'Na FIPE 🟡' };
  if (diffPercent < -2) {
    badgeConfig = { color: 'bg-green-100 text-green-700', icon: <TrendingDown className="h-3 w-3 mr-1" />, text: 'Abaixo da FIPE 🟢' };
  } else if (diffPercent > 2) {
    badgeConfig = { color: 'bg-red-100 text-red-700', icon: <TrendingUp className="h-3 w-3 mr-1" />, text: 'Acima da FIPE 🔴' };
  }

  return (
    <Card className="rounded-3xl border-border shadow-sm bg-card">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Comparativo FIPE</h3>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${badgeConfig.color}`}>
            {badgeConfig.text}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Preço FIPE</p>
            <p className="font-semibold text-foreground tabular-nums">{fipeData.fipe_string}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Diferença</p>
            <p className={`font-semibold tabular-nums ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-yellow-600'}`}>
              {diff > 0 ? '+' : ''}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diff)} ({diff > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
            </p>
          </div>
        </div>
        
        <div className="text-[10px] text-muted-foreground flex justify-between items-center border-t pt-3">
          <span className="truncate pr-2">Ref: {fipeData.matched_model}</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setManualMode(true)}>Ajustar</Button>
        </div>
      </CardContent>
    </Card>
  );
}