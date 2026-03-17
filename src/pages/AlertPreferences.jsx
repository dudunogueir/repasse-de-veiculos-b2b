import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BellRing, Check } from 'lucide-react';
import { toast } from "sonner";
import { STATES } from '../components/shared/utils';

const POPULAR_MAKES = [
  "Chevrolet", "Volkswagen", "Fiat", "Toyota", "Hyundai", 
  "Jeep", "Renault", "Honda", "Nissan", "Ford", "BMW", "Audi"
];

export default function AlertPreferencesPage() {
  const { user } = useAuth();
  
  const [makes, setMakes] = useState([]);
  const [maxPrice, setMaxPrice] = useState('');
  const [states, setStates] = useState([]);
  const [transmission, setTransmission] = useState('Todos');

  useEffect(() => {
    if (user) {
      setMakes(user.alert_makes || []);
      setMaxPrice(user.alert_max_price || '');
      setStates(user.alert_states || []);
      setTransmission(user.alert_transmission || 'Todos');
    }
  }, [user]);

  const toggleMake = (m) => {
    setMakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleState = (s) => {
    setStates(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({
        alert_makes: makes,
        alert_max_price: maxPrice ? parseFloat(maxPrice) : null,
        alert_states: states,
        alert_transmission: transmission
      });
    },
    onSuccess: () => {
      toast.success("Preferências salvas com sucesso!");
    }
  });

  return (
    <div className="max-w-3xl mx-auto pb-20 px-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Preferências de Alerta</h1>
        <p className="text-muted-foreground mt-2">Receba notificações quando veículos do seu interesse forem anunciados.</p>
      </div>

      <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" /> Configurar Alertas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Marcas de Interesse</label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_MAKES.map(m => (
                <Button 
                  key={m} 
                  type="button"
                  variant={makes.includes(m) ? "default" : "outline"} 
                  size="sm"
                  onClick={() => toggleMake(m)}
                  className="rounded-full"
                >
                  {m}
                  {makes.includes(m) && <Check className="ml-1 h-3 w-3" />}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Preço Máximo (R$)</label>
            <Input 
              type="number" 
              placeholder="Ex: 150000" 
              value={maxPrice} 
              onChange={e => setMaxPrice(e.target.value)}
              className="rounded-xl h-12 bg-background border-input"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Câmbio</label>
            <div className="grid grid-cols-3 gap-2">
              {['Todos', 'Automático', 'Manual'].map(t => (
                <Button 
                  key={t}
                  type="button"
                  variant={transmission === t ? "default" : "outline"}
                  onClick={() => setTransmission(t)}
                  className="rounded-xl"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Estados (UF)</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border rounded-xl bg-background">
              {STATES.map(uf => (
                <Button 
                  key={uf} 
                  type="button"
                  variant={states.includes(uf) ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => toggleState(uf)}
                  className="rounded-md"
                >
                  {uf}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            className="w-full h-12 rounded-xl font-bold text-lg" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Salvar Preferências
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}