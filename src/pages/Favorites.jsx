import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Heart, ChevronLeft, Loader2, Search, Car } from 'lucide-react';
import { Button } from "@/components/ui/button";
import VehicleCard from '../components/vehicle/VehicleCard';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function FavoritesPage() {
  const { user } = useAuth();

  // 1. Busca os IDs dos favoritos do utilizador logado
  const { data: favorites, isLoading: loadingFavs, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allFavs = await base44.entities.Favorite.list();
      return allFavs.filter(f => f.created_by === user.email);
    },
    enabled: !!user?.email
  });

  // 2. Busca todos os veículos ativos para cruzar os dados (Live Sync)
  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['active-vehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ status: 'active' })
  });

  // 3. Filtra apenas os veículos que estão na lista de favoritos
  const favoriteVehicles = vehicles?.filter(v => 
    favorites?.some(f => f.vehicle_id === v.id)
  ) || [];

  const handleToggleFavorite = async (vehicle) => {
    const existingFav = favorites?.find(f => f.vehicle_id === vehicle.id);
    if (existingFav) {
      await base44.entities.Favorite.delete(existingFav.id);
      toast.success("Veículo removido da sua lista.");
      refetchFavorites();
    }
  };

  const isLoading = loadingFavs || loadingVehicles;

  return (
    <div className="min-h-screen bg-background pb-32">
      
      {/* HEADER NATIVO COM BLUR */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 h-16 bg-background/90 backdrop-blur-xl border-b border-border safe-pt">
        <Button variant="ghost" size="icon" className="rounded-full bg-card/50" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">Veículos Guardados</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* CABEÇALHO DA PÁGININA */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Os seus Favoritos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Compare oportunidades e feche negócio rapidamente.
          </p>
        </div>

        {/* ESTADOS DE CARREGAMENTO E LISTA */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">A sincronizar o seu stock guardado...</p>
          </div>
        ) : favoriteVehicles.length === 0 ? (
          
          /* EMPTY STATE (ESTADO VAZIO) PREMIUM */
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border shadow-sm">
            <div className="h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nenhum veículo guardado</h3>
            <p className="text-muted-foreground text-sm mb-8 px-10 max-w-md mx-auto">
              Quando encontrar uma boa oportunidade de repasse, toque no coração para a guardar aqui.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('Home')} 
              className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md shadow-primary/20"
            >
              <Search className="h-4 w-4 mr-2" /> Explorar Estoque
            </Button>
          </div>
          
        ) : (
          
          /* GRID DE CARTÕES (Usando o nosso VehicleCard atualizado) */
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {favoriteVehicles.length} Veículo(s) guardado(s)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {favoriteVehicles.map((vehicle) => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  isFavorite={true} // Se está nesta lista, é sempre favorito
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}