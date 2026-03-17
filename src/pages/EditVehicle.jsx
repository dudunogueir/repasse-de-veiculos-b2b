import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import VehicleForm from '../components/vehicle/VehicleForm';
import { toast } from "sonner";

export default function EditVehiclePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 1. Extrair o ID do veículo dos parâmetros da URL
  const searchParams = new URLSearchParams(location.search);
  const vehicleId = searchParams.get('id');

  // 2. Buscar os dados atuais do veículo
  const { data: vehicle, isLoading, error } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.get(vehicleId),
    enabled: !!vehicleId, // Só executa se houver um ID
  });

  // 3. Mutação para atualizar os dados
  const updateMutation = useMutation({
    mutationFn: (updatedData) => base44.entities.Vehicle.update(vehicleId, updatedData),
    onSuccess: () => {
      // Invalida o cache para que a lista e os detalhes mostrem os novos dados
      queryClient.invalidateQueries(['my-vehicles']);
      queryClient.invalidateQueries(['vehicle', vehicleId]);
      
      toast.success("Anúncio atualizado com sucesso!");
      // Redireciona para Meus Anúncios após o sucesso
      window.location.href = createPageUrl('MyAds');
    },
    onError: (err) => {
      console.error("Erro ao atualizar:", err);
      toast.error("Falha ao salvar alterações. Tente novamente.");
    }
  });

  const handleSubmit = (formData) => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-gray-500 animate-pulse">Carregando dados do veículo...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900">Veículo não encontrado</h2>
        <p className="text-gray-500 mb-6">Não conseguimos localizar o anúncio para edição.</p>
        <Button onClick={() => window.history.back()}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20 px-1">
      {/* Cabeçalho com botão de voltar estilo iOS */}
      <div className="mb-8 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.history.back()}
          className="rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Editar Anúncio</h1>
          <p className="text-gray-500">Altere as informações necessárias do seu {vehicle.make}.</p>
        </div>
      </div>

      {/* Reutilização do formulário com os dados iniciais */}
      <VehicleForm 
        initialData={vehicle} 
        onSubmit={handleSubmit} 
        isSubmitting={updateMutation.isLoading} 
      />
    </div>
  );
}