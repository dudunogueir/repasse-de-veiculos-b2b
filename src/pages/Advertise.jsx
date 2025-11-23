import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import VehicleForm from '../components/vehicle/VehicleForm';

export default function AdvertisePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Create Vehicle
      await base44.entities.Vehicle.create(data);
      
      toast.success("Veículo anunciado com sucesso!");
      window.location.href = createPageUrl('MyAds');
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error("Erro ao criar anúncio. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Anunciar Veículo</h1>
        <p className="text-gray-500 mt-2">Preencha os dados abaixo para disponibilizar seu veículo para milhares de concessionárias.</p>
      </div>
      
      <VehicleForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}