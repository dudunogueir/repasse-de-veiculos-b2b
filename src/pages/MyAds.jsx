import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Car, Plus, Edit, Trash2, Tag, BarChart3, Loader2, Image as ImageIcon 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function MyAdsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Busca os veículos anunciados pelo utilizador logado
  const { data: myVehicles, isLoading } = useQuery({
    queryKey: ['my-vehicles', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.Vehicle.filter({ created_by: user.email });
      // Ordena por data de criação (mais recentes primeiro)
      return results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email
  });

  // 2. Mutação rápida para Excluir
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Anúncio removido do seu estoque.");
    }
  });

  // Cálculos do Mini-Dashboard Financeiro
  const activeAds = myVehicles?.filter(v => v.status === 'active') || [];
  const soldAds = myVehicles?.filter(v => v.status === 'sold') || [];
  
  const totalStockValue = activeAds.reduce((acc, vehicle) => acc + (vehicle.price || 0), 0);

  const formattedStockValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(totalStockValue);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar o seu painel de gestão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      
      {/* HEADER NATIVO COM BLUR E CALL-TO-ACTION */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-16 bg-background/90 backdrop-blur-xl border-b border-border safe-pt">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground">O Meu Estoque</h1>
        </div>
        <Button 
          size="sm" 
          className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
          onClick={() => window.location.href = createPageUrl('Advertise')}
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Anúncio
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        
        {/* MINI-DASHBOARD FINANCEIRO B2B */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardContent className="p-4 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Ativo (R$)</p>
              </div>
              <p className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">
                {formattedStockValue}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-rows-2 gap-4">
            <Card className="rounded-2xl border-border bg-primary/5 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <p className="text-xs font-bold text-primary uppercase">Ativos</p>
                <p className="text-xl font-bold text-primary tabular-nums">{activeAds.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border bg-muted/50 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between h-full">
                <p className="text-xs font-bold text-muted-foreground uppercase">Vendidos</p>
                <p className="text-xl font-bold text-muted-foreground tabular-nums">{soldAds.length}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LISTA DE ANÚNCIOS */}
        {myVehicles?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border shadow-sm mt-8">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold">Sem veículos anunciados</h3>
            <p className="text-muted-foreground text-sm mb-6 px-10">
              Comece a rentabilizar o seu estoque. Publique o seu primeiro veículo no repasse B2B.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('Advertise')} 
              className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            >
              <Plus className="h-4 w-4 mr-2" /> Criar Anúncio
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myVehicles?.map((vehicle) => {
              const isActive = vehicle.status === 'active';
              const mainPhoto = vehicle.photos?.[0];
              const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vehicle.price || 0);

              return (
                <Card key={vehicle.id} className={`overflow-hidden rounded-2xl border ${isActive ? 'border-border bg-card' : 'border-border/50 bg-muted/30'} shadow-sm transition-all`}>
                  <div className="flex flex-col sm:flex-row">
                    
                    {/* Thumbnail da Imagem */}
                    <div className="relative w-full sm:w-32 aspect-video sm:aspect-square bg-muted shrink-0">
                      {mainPhoto ? (
                        <img src={mainPhoto} alt={vehicle.model} className={`w-full h-full object-cover ${!isActive && 'grayscale opacity-70'}`} />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground/30">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      {/* Badge de Status */}
                      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-white shadow-sm ${isActive ? 'bg-green-600' : 'bg-orange-600'}`}>
                        {isActive ? 'Ativo' : 'Vendido'}
                      </div>
                    </div>

                    {/* Informações de Gestão */}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className={`font-bold text-base leading-tight line-clamp-1 ${!isActive && 'text-muted-foreground'}`}>
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-xs font-medium text-muted-foreground tabular-nums mt-0.5">
                            {vehicle.manufacturing_year}/{vehicle.model_year} • {vehicle.mileage?.toLocaleString('pt-BR')} km
                          </p>
                        </div>
                      </div>

                      <p className={`text-lg font-extrabold tabular-nums tracking-tight mt-2 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {priceFormatted}
                      </p>

                      {/* Botões de Ação */}
                      <div className="mt-4 flex gap-2 pt-3 border-t border-border/50">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-9 rounded-lg font-bold bg-background"
                          onClick={() => window.location.href = `${createPageUrl('Advertise')}?id=${vehicle.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação removerá o anúncio permanentemente. Se já o vendeu, considere apenas editar o status para "Vendido".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(vehicle.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                                Sim, excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}