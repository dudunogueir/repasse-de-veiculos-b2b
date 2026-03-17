import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, MessageSquare, Heart, Car, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['my-vehicles-dashboard'],
    queryFn: async () => {
      const allVehicles = await base44.entities.Vehicle.filter({ created_by: user.email });
      return allVehicles.sort((a, b) => (b.views || 0) - (a.views || 0));
    },
    enabled: !!user
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['my-messages-dashboard'],
    queryFn: () => base44.entities.ChatMessage.filter({ recipient_id: user.id }),
    enabled: !!user
  });

  const { data: favorites, isLoading: loadingFavorites } = useQuery({
    queryKey: ['my-favorites-dashboard'],
    queryFn: async () => {
      const allFavs = await base44.entities.Favorite.list();
      if (!vehicles) return [];
      const myVehicleIds = vehicles.map(v => v.id);
      return allFavs.filter(f => myVehicleIds.includes(f.vehicle_id));
    },
    enabled: !!vehicles
  });

  const markAsSoldMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.update(id, { status: 'sold' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles-dashboard']);
      toast.success("Veículo marcado como vendido!");
    }
  });

  if (loadingVehicles || loadingMessages || loadingFavorites) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeVehicles = vehicles?.filter(v => v.status === 'active') || [];
  const totalViews = vehicles?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;
  const topVehicles = vehicles?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Car className="h-8 w-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Anúncios Ativos</p>
            <p className="text-2xl font-bold">{activeVehicles.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Eye className="h-8 w-8 text-blue-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Visualizações</p>
            <p className="text-2xl font-bold">{totalViews}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Heart className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Favoritos</p>
            <p className="text-2xl font-bold">{favorites?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <MessageSquare className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground font-medium">Mensagens</p>
            <p className="text-2xl font-bold">{messages?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Meus Veículos (Top 5 Visualizações)</h2>
      <div className="space-y-4">
        {topVehicles.map(vehicle => {
          const daysSinceCreation = (new Date() - new Date(vehicle.created_date)) / (1000 * 60 * 60 * 24);
          const needsAttention = vehicle.status === 'active' && (vehicle.views || 0) < 5 && daysSinceCreation > 3;

          return (
            <Card key={vehicle.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="w-full sm:w-48 h-32 bg-muted relative">
                  {vehicle.photos?.[0] ? (
                    <img src={vehicle.photos[0]} alt={vehicle.model} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Car className="text-muted-foreground/50" /></div>
                  )}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-[10px] font-bold uppercase ${vehicle.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                    {vehicle.status === 'active' ? 'Ativo' : 'Vendido'}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">{vehicle.make} {vehicle.model} {vehicle.model_year}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        <Eye className="h-4 w-4" /> {vehicle.views || 0}
                      </div>
                    </div>
                    <p className="text-primary font-bold text-lg mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vehicle.price || 0)}
                    </p>
                  </div>
                  
                  {needsAttention && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-md">
                      <AlertTriangle className="h-4 w-4" />
                      Considere revisar o preço ou adicionar mais fotos para atrair mais visualizações.
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `${createPageUrl('VehicleDetails')}?id=${vehicle.id}`}>
                      Ver Anúncio
                    </Button>
                    {vehicle.status === 'active' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => markAsSoldMutation.mutate(vehicle.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Marcar como Vendido
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {topVehicles.length === 0 && (
          <p className="text-muted-foreground text-center py-8">Você ainda não tem veículos cadastrados.</p>
        )}
      </div>
    </div>
  );
}