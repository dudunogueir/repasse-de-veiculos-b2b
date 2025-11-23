import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import VehicleCard from '../components/vehicle/VehicleCard';
import { Loader2, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function FavoritesPage() {
  const { data: vehicles, isLoading, refetch } = useQuery({
    queryKey: ['favorites-list'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Fetch favorites created by me
      // Assuming list returns all and we filter or if we can filter by created_by
      const allFavs = await base44.entities.Favorite.list();
      const myFavs = allFavs.filter(f => f.created_by === user.email);

      if (myFavs.length === 0) return [];

      // Fetch vehicles
      // Parallel fetch
      const vehiclePromises = myFavs.map(f => 
        base44.entities.Vehicle.get(f.vehicle_id).catch(() => null)
      );
      
      const results = await Promise.all(vehiclePromises);
      return results.filter(v => v !== null); // filter out deleted vehicles
    }
  });

  const handleToggleFavorite = async (vehicle) => {
      // Logic to remove from favorites
      // We need to find the favorite ID
      const allFavs = await base44.entities.Favorite.list();
      const user = await base44.auth.me();
      const fav = allFavs.find(f => f.vehicle_id === vehicle.id && f.created_by === user.email);
      if (fav) {
          await base44.entities.Favorite.delete(fav.id);
          toast.success("Removido dos favoritos");
          refetch();
      }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meus Favoritos</h1>
        <p className="text-gray-500 mt-1">Veículos que você marcou como interessantes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>
      ) : vehicles?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Heart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Nenhum favorito ainda</h3>
          <p className="text-gray-500 mb-6">Explore o catálogo e salve as melhores ofertas.</p>
          <Link to={createPageUrl('Home')}>
            <Button>Explorar Veículos</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard 
              key={vehicle.id} 
              vehicle={vehicle} 
              isFavorite={true}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}