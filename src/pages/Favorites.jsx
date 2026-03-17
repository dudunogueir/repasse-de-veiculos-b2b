// src/pages/Favorites.jsx
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Car, Loader2 } from 'lucide-react';
import VehicleCard from '../components/vehicle/VehicleCard';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { toast } from "sonner";

export default function FavoritesPage() {
  const queryClient = useQueryClient();

  // 1. Buscar a lista de favoritos do usuário logado [cite: 127]
  const { data: favorites, isLoading, refetch } = useQuery({
    queryKey: ['favorites-page'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Filtramos os favoritos criados pelo e-mail do usuário [cite: 123, 132]
      const allFavs = await base44.entities.Favorite.list();
      return allFavs.filter(f => f.created_by === user.email);
    }
  });

  // 2. Buscar os dados reais dos veículos para garantir que ainda estão ativos 
  const { data: favoriteVehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['favorite-vehicles-data', favorites],
    enabled: !!favorites && favorites.length > 0,
    queryFn: async () => {
      // Para cada favorito, buscamos o veículo correspondente na coleção 'Veículos' [cite: 124]
      const vehiclePromises = favorites.map(fav => 
        base44.entities.Vehicle.get(fav.vehicle_id).catch(() => null)
      );
      const results = await Promise.all(vehiclePromises);
      // Removemos veículos que foram excluídos ou vendidos [cite: 24, 59]
      return results.filter(v => v !== null && v.status === 'active');
    }
  });

  const handleRefresh = async () => {
    await refetch();
    toast.info("Favoritos atualizados");
  };

  const handleRemoveFavorite = async (vehicle) => {
    try {
      const targetFav = favorites.find(f => f.vehicle_id === vehicle.id);
      if (targetFav) {
        await base44.entities.Favorite.delete(targetFav.id);
        queryClient.invalidateQueries(['favorites-page']);
        toast.success("Removido dos favoritos");
      }
    } catch (error) {
      toast.error("Erro ao remover favorito");
    }
  };

  if (isLoading || (favorites?.length > 0 && isLoadingVehicles)) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-7xl mx-auto pb-24 px-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Meus Favoritos</h1>
          <p className="text-gray-500 mt-1">Veículos que você demonstrou interesse[cite: 57].</p>
        </div>

        {!favoriteVehicles || favoriteVehicles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Heart className="h-12 w-12 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum favorito ainda</h3>
            <p className="text-gray-500">Toque no coração nos anúncios para salvar veículos aqui[cite: 25].</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favoriteVehicles.map((vehicle) => (
              <VehicleCard 
                key={vehicle.id} 
                vehicle={vehicle} 
                isFavorite={true}
                onToggleFavorite={handleRemoveFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}