import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, Loader2, MapPin, ChevronRight, 
  Check, ImagePlus, CheckCircle2, DollarSign,
  ChevronLeft, Trash2, Tag
} from 'lucide-react';
import { STATES } from '../components/shared/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
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
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

const POPULAR_MAKES = [
  "Chevrolet", "Volkswagen", "Fiat", "Toyota", "Hyundai", 
  "Jeep", "Renault", "Honda", "Nissan", "Ford", "BMW", "Audi", "Outra"
];

export default function EditVehiclePage() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');

  const [photos, setPhotos] = useState(['', '', '']);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      make: '', model: '', version: '', manufacturing_year: '',
      model_year: '', price: '', color: '', mileage: '', state: '', city: '', status: 'active'
    }
  });

  const selectedMake = watch("make");
  const selectedState = watch("state");
  const currentStatus = watch("status");

  // 1. Busca os dados do veículo
  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.read(vehicleId),
    enabled: !!vehicleId
  });

  // 2. Preenche o formulário quando os dados chegam
  useEffect(() => {
    if (vehicle) {
      reset({
        make: vehicle.make,
        model: vehicle.model,
        version: vehicle.version || '',
        manufacturing_year: vehicle.manufacturing_year,
        model_year: vehicle.model_year,
        price: vehicle.price,
        color: vehicle.color || '',
        mileage: vehicle.mileage,
        state: vehicle.state,
        city: vehicle.city || '',
        status: vehicle.status || 'active'
      });
      
      const loadedPhotos = ['', '', ''];
      if (vehicle.photos) {
        vehicle.photos.forEach((p, i) => { if (i < 3) loadedPhotos[i] = p; });
      }
      setPhotos(loadedPhotos);
    }
  }, [vehicle, reset]);

  // 3. Mutação para Atualizar
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const validPhotos = photos.filter(p => p.trim() !== '');
      const payload = {
        ...data,
        price: parseFloat(data.price),
        manufacturing_year: parseInt(data.manufacturing_year),
        model_year: parseInt(data.model_year),
        mileage: parseInt(data.mileage),
        photos: validPhotos
      };
      return base44.entities.Vehicle.update(vehicleId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vehicle', vehicleId]);
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Anúncio atualizado com sucesso!");
      window.history.back();
    },
    onError: () => {
      toast.error("Erro ao atualizar o anúncio.");
    }
  });

  // 4. Mutação para Excluir
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Vehicle.delete(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      toast.success("Anúncio removido.");
      window.location.href = createPageUrl('MyAds');
    }
  });

  const onSubmit = (data) => {
    if (!data.make || !data.state) {
      toast.error("Por favor, preencha a Marca e o Estado.");
      return;
    }
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar dados do veículo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* HEADER NATIVO COM BLUR E EXCLUSÃO */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-16 bg-background/90 backdrop-blur-xl border-b border-border safe-pt">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full bg-card/50" onClick={() => window.history.back()}>
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Editar Anúncio</h1>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
              <Trash2 className="h-5 w-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Anúncio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O veículo será removido permanentemente do repasse B2B.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl h-12">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90 rounded-xl h-12">
                {deleteMutation.isPending ? "A excluir..." : "Sim, excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* --- STATUS DO ANÚNCIO (Elegante e Claro) --- */}
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> Status da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant={currentStatus === 'active' ? 'default' : 'outline'}
                  className={`flex-1 h-12 rounded-xl font-bold ${currentStatus === 'active' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground'}`}
                  onClick={() => setValue('status', 'active')}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Disponível
                </Button>
                <Button 
                  type="button"
                  variant={currentStatus === 'sold' ? 'default' : 'outline'}
                  className={`flex-1 h-12 rounded-xl font-bold ${currentStatus === 'sold' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-muted-foreground'}`}
                  onClick={() => setValue('status', 'sold')}
                >
                  <DollarSign className="h-4 w-4 mr-2" /> Vendido
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Marcar como "Vendido" oculta o anúncio das buscas principais, mas mantém-no no teu histórico.
              </p>
            </CardContent>
          </Card>

          {/* --- DADOS DO VEÍCULO --- */}
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" /> Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              
              {/* SELETOR NATIVO: MARCA */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Marca</label>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-background border-input text-foreground font-normal">
                      <span className="flex items-center gap-2">
                        {selectedMake ? <span className="font-bold text-primary">{selectedMake}</span> : "Selecionar Marca"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[85vh]">
                    <DrawerHeader>
                      <DrawerTitle>Qual a marca do veículo?</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto">
                      {POPULAR_MAKES.map(make => (
                        <Button 
                          key={make} type="button"
                          variant={selectedMake === make ? "default" : "outline"} 
                          onClick={() => { setValue("make", make); document.querySelector('[data-drawer-close-make]').click(); }}
                          className="rounded-xl h-12 font-bold text-sm"
                        >
                          {make}
                          {selectedMake === make && <Check className="ml-2 h-4 w-4" />}
                        </Button>
                      ))}
                    </div>
                    <DrawerFooter>
                      <DrawerClose id="data-drawer-close-make" asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                {selectedMake === "Outra" && (
                  <Input {...register("make")} placeholder="Digita a marca..." className="mt-2 h-12 rounded-xl" />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Modelo</label>
                <Input {...register("model", { required: true })} placeholder="Ex: Corolla XEI" className="rounded-xl h-12 bg-background border-input" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Versão / Motor</label>
                <Input {...register("version")} placeholder="Ex: 2.0 Flex 16V Aut." className="rounded-xl h-12 bg-background border-input" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Ano Fab.</label>
                  <Input {...register("manufacturing_year", { required: true })} type="number" className="rounded-xl h-12 bg-background border-input tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Ano Mod.</label>
                  <Input {...register("model_year", { required: true })} type="number" className="rounded-xl h-12 bg-background border-input tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Cor</label>
                  <Input {...register("color")} placeholder="Branco" className="rounded-xl h-12 bg-background border-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Km</label>
                  <Input {...register("mileage")} type="number" className="rounded-xl h-12 bg-background border-input tabular-nums" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- PREÇO E LOCALIZAÇÃO --- */}
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Condições Comerciais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Preço B2B (R$)</label>
                <Input {...register("price", { required: true })} type="number" className="rounded-xl h-12 bg-background border-input text-lg font-bold text-primary tabular-nums" />
              </div>

              {/* SELETOR NATIVO: ESTADO */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Localização</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button variant="outline" className="w-full h-12 justify-between rounded-xl bg-background border-input font-normal">
                        <span className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {selectedState ? <span className="font-bold text-primary">{selectedState}</span> : "Selecionar Estado"}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[80vh]">
                      <DrawerHeader>
                        <DrawerTitle>Onde o veículo está?</DrawerTitle>
                      </DrawerHeader>
                      <div className="p-4 grid grid-cols-4 gap-2 overflow-y-auto">
                        {STATES.map(uf => (
                          <Button 
                            key={uf} type="button"
                            variant={selectedState === uf ? "default" : "outline"} 
                            onClick={() => { setValue("state", uf); document.querySelector('[data-drawer-close-state]').click(); }}
                            className="rounded-xl h-12 font-bold"
                          >
                            {uf}
                            {selectedState === uf && <Check className="ml-2 h-3 w-3" />}
                          </Button>
                        ))}
                      </div>
                      <DrawerFooter>
                        <DrawerClose id="data-drawer-close-state" asChild>
                          <Button variant="ghost">Cancelar</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                  <Input {...register("city")} placeholder="Cidade (Opcional)" className="rounded-xl h-12 bg-background border-input" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* --- FOTOS --- */}
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-primary" /> Fotos do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {photos.map((photo, index) => (
                <Input 
                  key={index}
                  value={photo}
                  onChange={(e) => {
                    const newPhotos = [...photos];
                    newPhotos[index] = e.target.value;
                    setPhotos(newPhotos);
                  }}
                  placeholder={`URL da Foto ${index + 1}`} 
                  className="rounded-xl h-11 bg-background border-input"
                />
              ))}
            </CardContent>
          </Card>

          {/* BOTÃO FIXO NO RODAPÉ (Nativo UX) */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border z-40 safe-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto">
              <Button type="submit" disabled={updateMutation.isPending} className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                {updateMutation.isPending ? (
                  <><Loader2 className="h-6 w-6 animate-spin mr-2" /> A guardar alterações...</>
                ) : (
                  <><CheckCircle2 className="h-6 w-6 mr-2" /> Guardar Alterações</>
                )}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}