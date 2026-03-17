import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import PullToRefresh from '@/components/shared/PullToRefresh';
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

  // 1. Busca de Anúncios com suporte a Refetch
  const { data: vehicles, isLoading, refetch } = useQuery({
    queryKey: ['my-vehicles'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const all = await base44.entities.Vehicle.list(); 
      // Filtra apenas os veículos criados pelo usuário logado [cite: 43]
      return all
        .filter(v => v.created_by === user.email)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  // 2. Função para o gesto Pull-to-Refresh [cite: 254]
  const handleRefresh = async () => {
    await refetch();
    toast.info("Lista atualizada");
  };

  // 3. Mutação para Exclusão [cite: 54, 83]
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Anúncio excluído permanentemente");
    }
  });

  // 4. Mutação Otimizada para Status (Vendido/Ativo) [cite: 53, 204]
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Vehicle.update(id, { status }),
    onMutate: async (updatedVehicle) => {
      // Cancela refetches para não sobrescrever o estado otimista
      await queryClient.cancelQueries(['my-vehicles']);
      const previousVehicles = queryClient.getQueryData(['my-vehicles']);

      // Atualiza o cache local instantaneamente para parecer nativo 
      queryClient.setQueryData(['my-vehicles'], (old) =>
        old.map((v) =>
          v.id === updatedVehicle.id ? { ...v, status: updatedVehicle.status } : v
        )
      );

      return { previousVehicles };
    },
    onError: (err, updatedVehicle, context) => {
      // Reverte em caso de erro no servidor
      queryClient.setQueryData(['my-vehicles'], context.previousVehicles);
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      queryClient.invalidateQueries(['my-vehicles']);
    },
    onSuccess: (data, variables) => {
      const msg = variables.status === 'sold' ? "Veículo marcado como vendido" : "Anúncio reativado";
      toast.success(msg);
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* pb-20 garante que o último card não fique sob a Bottom Tab Bar [cite: 232] */}
      <div className="max-w-6xl mx-auto pb-20 px-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Meus Anúncios</h1>
            <p className="text-gray-500 mt-1">Gerencie seu estoque e acompanhe o desempenho[cite: 43].</p>
          </div>
          <Link to={createPageUrl('Advertise')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-95 transition-transform">
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
              <Button variant="outline">Criar primeiro anúncio</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className={`overflow-hidden transition-all duration-200 ${vehicle.status === 'sold' ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'}`}>
                <div className="flex flex-col md:flex-row">
                  
                  {/* Espaço da Imagem */}
                  <div className="w-full md:w-48 h-40 md:h-auto bg-gray-200 relative overflow-hidden">
                    {vehicle.photos?.[0] ? (
                      <img src={vehicle.photos[0]} alt={vehicle.model} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Sem foto</div>
                    )}
                    
                    {/* Badge de Vendido [cite: 53, 137] */}
                    {vehicle.status === 'sold' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                        <Badge variant="destructive" className="text-xs font-bold px-3 py-1 shadow-lg">VENDIDO</Badge>
                      </div>
                    )}
                  </div>

                  {/* Detalhes do Veículo [cite: 22, 110] */}
                  <div className="flex-1 p-5 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl text-gray-900">{vehicle.make} {vehicle.model}</h3>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                          {vehicle.manufacturing_year}/{vehicle.model_year}
                        </Badge>
                      </div>
                      <p className="text-gray-500 text-sm">{vehicle.version} • {vehicle.color}</p>
                      <p className="font-extrabold text-indigo-700 text-lg mt-2">
                        {formatCurrency(vehicle.price)}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-6 text-[11px] font-medium text-gray-400 uppercase tracking-tight">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {vehicle.views || 0} visualizações [cite: 48]
                        </span>
                        <span>Anunciado em {formatDate(vehicle.created_date)} [cite: 110]</span>
                      </div>
                    </div>

                    {/* Ações Rápidas [cite: 50] */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 min-w-[150px]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100">
                            <MoreVertical className="h-5 w-5 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link to={`${createPageUrl('EditVehicle')}?id=${vehicle.id}`} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4 text-gray-500" /> Editar Dados [cite: 51]
                            </Link>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => toggleStatusMutation.mutate({ 
                              id: vehicle.id, 
                              status: vehicle.status === 'active' ? 'sold' : 'active' 
                            })}
                            className="cursor-pointer"
                          >
                            {vehicle.status === 'active' ? (
                              <><CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Marcar como Vendido [cite: 53]</>
                            ) : (
                              <><XCircle className="mr-2 h-4 w-4 text-indigo-600" /> Reativar Anúncio</>
                            )}
                          </DropdownMenuItem>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir permanentemente [cite: 54]
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deseja excluir este anúncio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação é irreversível. O anúncio do {vehicle.make} {vehicle.model} será removido para sempre[cite: 54].
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => deleteMutation.mutate(vehicle.id)} 
                                  className="bg-red-600 hover:bg-red-700 rounded-xl"
                                >
                                  Sim, excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button variant="outline" size="sm" asChild className="w-full rounded-xl border-gray-300 font-bold text-xs h-9">
                        <Link to={`${createPageUrl('VehicleDetails')}?id=${vehicle.id}`}>
                          Visualizar Detalhes
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
    </PullToRefresh>
  );
}