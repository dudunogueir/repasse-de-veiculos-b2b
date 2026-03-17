import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Car, Loader2, MapPin, ChevronRight, 
  Check, ImagePlus, CheckCircle2, DollarSign, Star
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createPageUrl } from '@/utils';

// Marcas mais comuns no repasse B2B para acesso rápido
const POPULAR_MAKES = [
  "Chevrolet", "Volkswagen", "Fiat", "Toyota", "Hyundai", 
  "Jeep", "Renault", "Honda", "Nissan", "Ford", "BMW", "Audi", "Outra"
];

export default function AdvertisePage() {
  const queryClient = useQueryClient();
  const { id: paramId } = useParams();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const vehicleId = paramId || urlParams.get('id');
  const isEditing = !!vehicleId;

  const [photos, setPhotos] = useState(['', '', '']); // 3 slots de fotos para o MVP
  const [isFeatured, setIsFeatured] = useState(false);
  
  const { data: subscription } = useQuery({
    queryKey: ['my-subscription-advertise'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const subs = await base44.entities.Subscription.filter({ user_id: user.email, status: 'active' });
      return subs.length > 0 ? subs[0] : { plan: 'free', vehicles_limit: 3, highlight_slots: 0 };
    }
  });

  const { data: myActiveVehicles } = useQuery({
    queryKey: ['my-active-vehicles-count'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Vehicle.filter({ created_by: user.email, status: 'active' });
    }
  });
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      make: '',
      model: '',
      version: '',
      manufacturing_year: '',
      model_year: '',
      price: '',
      color: '',
      mileage: '',
      state: '',
      city: '',
      status: 'active',
      transmission: '',
      phone: '',
      description: ''
    }
  });

  const selectedMake = watch("make");
  const selectedState = watch("state");
  const currentStatus = watch("status");

  // Busca os dados do veículo se estiver editando
  const { data: vehicleToEdit, isLoading: isLoadingVehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.read(vehicleId),
    enabled: isEditing
  });

  // Preenche o formulário quando os dados chegam
  React.useEffect(() => {
    if (vehicleToEdit && isEditing) {
      reset({
        make: vehicleToEdit.make,
        model: vehicleToEdit.model,
        version: vehicleToEdit.version || '',
        manufacturing_year: vehicleToEdit.manufacturing_year,
        model_year: vehicleToEdit.model_year,
        price: vehicleToEdit.price,
        color: vehicleToEdit.color || '',
        mileage: vehicleToEdit.mileage || vehicleToEdit.km || '',
        state: vehicleToEdit.state,
        city: vehicleToEdit.city || '',
        status: vehicleToEdit.status || 'active',
        transmission: vehicleToEdit.transmission || '',
        phone: vehicleToEdit.phone || '',
        description: vehicleToEdit.description || ''
      });
      
      setIsFeatured(vehicleToEdit.is_featured || false);

      const loadedPhotos = ['', '', ''];
      if (vehicleToEdit.photos) {
        vehicleToEdit.photos.forEach((p, i) => { if (i < 3) loadedPhotos[i] = p; });
      }
      setPhotos(loadedPhotos);
    }
  }, [vehicleToEdit, isEditing, reset]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      
      // Filtra apenas as fotos que foram preenchidas
      const validPhotos = photos.filter(p => p.trim() !== '');
      
      const payload = {
        ...data,
        price: parseFloat(data.price),
        manufacturing_year: parseInt(data.manufacturing_year),
        model_year: parseInt(data.model_year),
        mileage: parseInt(data.mileage),
        km: parseInt(data.mileage), // Garantir que km também é salvo para compatibilidade
        photos: validPhotos,
        is_featured: isFeatured
      };

      if (isEditing) {
        payload.status = data.status || 'active';
        return await base44.entities.Vehicle.update(vehicleId, payload);
      } else {
        payload.status = 'active';
        payload.views = 0;
        payload.created_by = user.email;
        payload.created_date = new Date().toISOString();
        
        const vehicle = await base44.entities.Vehicle.create(payload);
        
        // Trigger alerts
        try {
          await base44.functions.invoke('matchVehicleAlerts', { vehicle });
        } catch (e) {
          console.error("Error triggering alerts", e);
        }
        
        return vehicle;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-vehicles']);
      if (isEditing) {
        queryClient.invalidateQueries(['vehicle', vehicleId]);
      }
      toast.success(isEditing ? "Anúncio atualizado com sucesso!" : "Anúncio criado com sucesso!");
      window.location.href = createPageUrl('MyAds');
    },
    onError: () => {
      toast.error(isEditing ? "Erro ao atualizar o anúncio." : "Erro ao criar o anúncio. Verifique os campos.");
    }
  });

  const onSubmit = (data) => {
    if (!data.make || !data.state) {
      toast.error("Por favor, preencha a Marca e o Estado.");
      return;
    }
    createMutation.mutate(data);
  };

  const isLimitReached = !isEditing && myActiveVehicles && subscription && myActiveVehicles.length >= subscription.vehicles_limit;
  const canFeature = subscription && subscription.highlight_slots > 0;

  if (isEditing && isLoadingVehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar dados do veículo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-32 px-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{isEditing ? 'Editar Anúncio' : 'Cadastrar Veículo'}</h1>
        <p className="text-muted-foreground mt-2">{isEditing ? 'Atualize as informações do seu veículo.' : 'Publique seu veículo no repasse B2B.'}</p>
      </div>

      <Dialog open={isLimitReached}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Limite de Anúncios Atingido</DialogTitle>
            <DialogDescription className="text-center">
              Você atingiu o limite do seu plano ({subscription?.plan}). Faça upgrade para continuar anunciando!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <Car className="h-8 w-8" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Seu plano atual permite até <strong>{subscription?.vehicles_limit}</strong> anúncios simultâneos.
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => window.location.href = createPageUrl('Plans')} className="w-full h-12 text-lg font-bold">
              Ver Planos e Fazer Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${isLimitReached ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {isEditing && (
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="h-5 w-5 text-primary" /> Status da Venda
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
        )}

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
                <Input {...register("make")} placeholder="Digite a marca..." className="mt-2 h-12 rounded-xl" autoFocus />
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Câmbio</label>
              <select {...register("transmission")} className="w-full h-12 rounded-xl bg-background border border-input px-3 text-sm">
                <option value="">Selecionar Câmbio</option>
                <option value="Automático">Automático</option>
                <option value="Manual">Manual</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Ano Fab.</label>
                <Input {...register("manufacturing_year", { required: true })} type="number" placeholder="2022" className="rounded-xl h-12 bg-background border-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Ano Mod.</label>
                <Input {...register("model_year", { required: true })} type="number" placeholder="2023" className="rounded-xl h-12 bg-background border-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Cor</label>
                <Input {...register("color")} placeholder="Branco" className="rounded-xl h-12 bg-background border-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Km</label>
                <Input {...register("mileage")} type="number" placeholder="45000" className="rounded-xl h-12 bg-background border-input" />
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
              <Input {...register("price", { required: true })} type="number" placeholder="Ex: 120000" className="rounded-xl h-12 bg-background border-input text-lg font-bold text-primary" />
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

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Telefone de Contato</label>
              <Input {...register("phone")} placeholder="Ex: 11999999999" className="rounded-xl h-12 bg-background border-input" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Descrição</label>
              <textarea {...register("description")} placeholder="Detalhes adicionais do veículo..." className="w-full rounded-xl bg-background border border-input p-3 min-h-[100px] text-sm" />
            </div>
          </CardContent>
        </Card>

        {/* --- FOTOS (MVP Base44 URL Input) --- */}
        <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30 border-b border-border py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" /> Fotos do Veículo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <p className="text-xs text-muted-foreground mb-2">Para o MVP, cole o link (URL) de até 3 fotos do veículo.</p>
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

        {/* --- DESTAQUE --- */}
        {canFeature && (
          <Card className="border-border shadow-sm bg-card overflow-hidden rounded-2xl border-yellow-400/50 bg-yellow-50/30">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Destacar Anúncio</h3>
                  <p className="text-xs text-muted-foreground">Você tem {subscription.highlight_slots} destaques disponíveis.</p>
                </div>
              </div>
              <Button 
                type="button"
                variant={isFeatured ? "default" : "outline"}
                className={isFeatured ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                onClick={() => setIsFeatured(!isFeatured)}
              >
                {isFeatured ? 'Destacado ⭐' : 'Destacar'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* BOTÃO FIXO NO RODAPÉ (Nativo UX) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-40 safe-pb">
          <div className="max-w-3xl mx-auto flex gap-3">
            <Button type="button" variant="outline" className="h-14 rounded-2xl px-6" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="flex-1 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/20">
              {createMutation.isPending ? (
                <><Loader2 className="h-6 w-6 animate-spin mr-2" /> {isEditing ? 'A guardar...' : 'Publicando...'}</>
              ) : (
                <><CheckCircle2 className="h-6 w-6 mr-2" /> {isEditing ? 'Guardar Alterações' : 'Publicar Anúncio'}</>
              )}
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}