import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import VehicleForm from '../components/vehicle/VehicleForm';
import { Loader2 } from 'lucide-react';

export default function EditVehiclePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.get(vehicleId),
    enabled: !!vehicleId
  });

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await base44.entities.Vehicle.update(vehicleId, data);
      toast.success("Anúncio atualizado com sucesso!");
      window.location.href = createPageUrl('MyAds');
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Erro ao atualizar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
  if (!vehicle) return <div>Veículo não encontrado</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Editar Anúncio</h1>
        <p className="text-gray-500 mt-2">Atualize as informações do seu veículo.</p>
      </div>
      
      <VehicleForm initialData={vehicle} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}