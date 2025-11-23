import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MoreVertical, Pencil, Trash2, Eye, CheckCircle, XCircle, Plus, LayoutDashboard
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatCurrency, formatDate } from '../components/shared/utils';
import { toast } from "sonner";

export default function MyAdsPage() {
  const queryClient = useQueryClient();

  // Fetch My Ads
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // Since built-in list doesn't support filtering by created_by easily in the mock unless we fetch all, 
      // we will fetch all active and sold vehicles and filter by created_by in client.
      // Or we use filter() if available for created_by.
      const all = await base44.entities.Vehicle.list(); 
      // Filter by my email
      return all.filter(v => v.created_by === user.email).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Anúncio excluído");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Vehicle.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Status atualizado");
    }
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Anúncios</h1>
          <p className="text-gray-500 mt-1">Gerencie seu estoque e acompanhe o desempenho.</p>
        </div>
        <Link to={createPageUrl('Advertise')}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Novo Anúncio
          </Button>
        </Link>
      </div>

      {vehicles?.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <LayoutDashboard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Você ainda não tem anúncios</h3>
          <p className="text-gray-500 mb-6">Comece a vender seus veículos agora mesmo.</p>
          <Link to={createPageUrl('Advertise')}>
            <Button>Criar primeiro anúncio</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="w-full md:w-48 h-32 md:h-auto bg-gray-100 relative">
                  {vehicle.photos?.[0] ? (
                    <img src={vehicle.photos[0]} alt={vehicle.model} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Sem foto</div>
                  )}
                  {vehicle.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="destructive" className="text-sm">VENDIDO</Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-900">{vehicle.make} {vehicle.model}</h3>
                      <Badge variant="outline" className="text-xs">{vehicle.manufacturing_year}/{vehicle.model_year}</Badge>
                    </div>
                    <p className="text-gray-500 text-sm mb-2">{vehicle.version}</p>
                    <p className="font-bold text-indigo-700">{formatCurrency(vehicle.price)}</p>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {vehicle.views || 0} visualizações
                      </span>
                      <span>Criado em {formatDate(vehicle.created_date)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 min-w-[140px]">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`${createPageUrl('EditVehicle')}?id=${vehicle.id}`}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ id: vehicle.id, status: vehicle.status === 'active' ? 'sold' : 'active' })}>
                          {vehicle.status === 'active' ? (
                            <><CheckCircle className="mr-2 h-4 w-4" /> Marcar Vendido</>
                          ) : (
                            <><XCircle className="mr-2 h-4 w-4" /> Reativar Anúncio</>
                          )}
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O anúncio será permanentemente removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(vehicle.id)} className="bg-red-600 hover:bg-red-700">
                                Sim, excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link to={`${createPageUrl('VehicleDetails')}?id=${vehicle.id}`}>
                        Ver Anúncio
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}