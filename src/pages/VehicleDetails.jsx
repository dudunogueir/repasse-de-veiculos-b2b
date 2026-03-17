import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronLeft, ChevronRight, Heart, MapPin, Calendar, Gauge, 
  ShieldCheck, MessageCircle, Share2, Info, Loader2, Image as ImageIcon, Store,
  X, Maximize2, Link as LinkIcon
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPageUrl } from '@/utils';
import { toast } from "sonner";
import useEmblaCarousel from 'embla-carousel-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import SellerBadge from '../components/vehicle/SellerBadge';
import FipeComparison from '../components/vehicle/FipeComparison';

export default function VehicleDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  const [activePhoto, setActivePhoto] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const { user } = useAuth();
  const [proposalPrice, setProposalPrice] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');

  useEffect(() => {
    if (!isFullscreen) setScale(1);
  }, [isFullscreen]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [emblaFullscreenRef, emblaFullscreenApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback((e) => { e?.stopPropagation(); if (emblaApi) emblaApi.scrollPrev(); }, [emblaApi]);
  const scrollNext = useCallback((e) => { e?.stopPropagation(); if (emblaApi) emblaApi.scrollNext(); }, [emblaApi]);

  const scrollFullscreenPrev = useCallback((e) => { e?.stopPropagation(); if (emblaFullscreenApi) emblaFullscreenApi.scrollPrev(); }, [emblaFullscreenApi]);
  const scrollFullscreenNext = useCallback((e) => { e?.stopPropagation(); if (emblaFullscreenApi) emblaFullscreenApi.scrollNext(); }, [emblaFullscreenApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActivePhoto(emblaApi.selectedScrollSnap());
  }, [emblaApi, setActivePhoto]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (isFullscreen && emblaFullscreenApi) {
      emblaFullscreenApi.scrollTo(activePhoto, true);
    }
  }, [isFullscreen, emblaFullscreenApi, activePhoto]);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => base44.entities.Vehicle.read(vehicleId),
    enabled: !!vehicleId
  });

  useEffect(() => {
    if (vehicle && !proposalPrice) {
      setProposalPrice(vehicle.price.toString());
    }
  }, [vehicle]);

  const proposalMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("auth_required");
      
      await base44.entities.Proposal.create({
        vehicle_id: vehicle.id,
        buyer_id: user.email,
        seller_id: vehicle.created_by,
        proposed_price: parseFloat(proposalPrice),
        message: proposalMessage,
        status: 'pending'
      });

      // Notificar vendedor
      const sellers = await base44.entities.User.filter({ email: vehicle.created_by });
      if (sellers.length > 0) {
        await base44.entities.Notification.create({
          recipient_id: sellers[0].id,
          type: 'system',
          message: `💰 Nova proposta recebida para ${vehicle.make} ${vehicle.model}: R$ ${parseFloat(proposalPrice).toLocaleString('pt-BR')}`,
          link: `/Proposals`,
          read: false
        });
      }
    },
    onSuccess: () => {
      toast.success("Proposta enviada com sucesso!");
      document.getElementById('close-proposal-dialog')?.click();
    },
    onError: (e) => {
      if (e.message === "auth_required") base44.auth.redirectToLogin();
      else toast.error("Erro ao enviar proposta.");
    }
  });

  const { data: favorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        const allFavs = await base44.entities.Favorite.list(); 
        return allFavs.filter(f => f.created_by === user.email);
      } catch { return []; }
    }
  });

  const isFavorite = favorites?.some(f => f.vehicle_id === vehicleId);

  const handleToggleFavorite = async () => {
    try { await base44.auth.me(); } catch {
      base44.auth.redirectToLogin();
      return;
    }
    
    const existingFav = favorites?.find(f => f.vehicle_id === vehicleId);
    if (existingFav) {
      await base44.entities.Favorite.delete(existingFav.id);
      toast.success("Removido dos favoritos");
    } else {
      await base44.entities.Favorite.create({
        vehicle_id: vehicleId,
        vehicle_data: { 
          make: vehicle.make, 
          model: vehicle.model, 
          price: vehicle.price, 
          photo: vehicle.photos?.[0] 
        }
      });
      toast.success("Adicionado aos favoritos");
    }
    refetchFavorites();
  };

  const handleContactSeller = () => {
    window.location.href = `${createPageUrl('Chat')}?seller=${vehicle.created_by}&vehicle=${vehicle.id}`;
  };

  const shareUrl = window.location.href;
  const shareText = vehicle ? `🚗 ${vehicle.make} ${vehicle.model} ${vehicle.version || ''} ${vehicle.model_year} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(vehicle.price || 0)} | KM: ${vehicle.km ? new Intl.NumberFormat('pt-BR').format(vehicle.km) + ' km' : '0 km'} | Confira este veículo no Repasse B2B: ${shareUrl}` : '';

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicle.make} ${vehicle.model}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Erro ao partilhar", err);
      }
    } else {
      handleCopyLink();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar detalhes da oferta...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Info className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Veículo Indisponível</h2>
        <p className="text-muted-foreground mb-8">Este anúncio pode ter sido vendido ou removido pelo vendedor.</p>
        <Button onClick={() => window.location.href = createPageUrl('Home')} className="rounded-xl h-12 px-8">
          Voltar para a Busca
        </Button>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0
  }).format(vehicle.price || 0);

  const hasPhotos = vehicle.photos && vehicle.photos.length > 0;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-xl border-b border-border safe-pt">
        <Button variant="ghost" size="icon" className="rounded-full bg-card/50" onClick={() => window.history.back()}>
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Button>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-card/50">
                <Share2 className="h-5 w-5 text-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer py-2">
                <MessageCircle className="mr-2 h-4 w-4 text-green-600" /> WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer py-2">
                <LinkIcon className="mr-2 h-4 w-4 text-blue-600" /> Copiar Link
              </DropdownMenuItem>
              {navigator.share && (
                <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer py-2">
                  <Share2 className="mr-2 h-4 w-4 text-gray-600" /> Mais opções...
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="rounded-full bg-card/50" onClick={handleToggleFavorite}>
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
          </Button>
        </div>
      </div>

      <div className="relative w-full aspect-square md:aspect-video bg-muted pt-16 md:pt-0 group">
        {hasPhotos ? (
          <>
            <div className="overflow-hidden w-full h-full" ref={emblaRef}>
              <div className="flex h-full touch-pan-y">
                {vehicle.photos.map((photo, idx) => (
                  <div key={idx} className="flex-[0_0_100%] min-w-0 relative h-full cursor-pointer" onClick={() => setIsFullscreen(true)}>
                    <img 
                      src={photo} 
                      alt={`${vehicle.make} ${vehicle.model} - Foto ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Contador de Fotos */}
            <div className="absolute top-20 right-4 bg-black/50 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-md z-10">
              {activePhoto + 1} / {vehicle.photos.length}
            </div>

            {/* Botão Maximizar */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute bottom-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md z-10"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Setas de Navegação (Desktop) */}
            {vehicle.photos.length > 1 && (
              <>
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 hover:bg-white text-black rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex z-10"
                  onClick={scrollPrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-white/80 hover:bg-white text-black rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex z-10"
                  onClick={scrollNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                {/* Dots */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                  {vehicle.photos.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); if(emblaApi) emblaApi.scrollTo(idx); }}
                      className={`h-2 rounded-full transition-all ${activePhoto === idx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground/50">
            <ImageIcon className="h-16 w-16 mb-4" />
            <p className="font-medium">Sem fotos disponíveis</p>
          </div>
        )}
      </div>

      {/* Miniaturas */}
      {hasPhotos && vehicle.photos.length > 1 && (
        <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide bg-background">
          {vehicle.photos.map((photo, idx) => (
            <button 
              key={idx}
              onClick={() => { if(emblaApi) emblaApi.scrollTo(idx); }}
              className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                activePhoto === idx ? 'border-primary ring-2 ring-primary/20' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Modal Fullscreen */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex justify-between items-center p-4 text-white z-10 safe-pt">
            <div className="font-bold">{activePhoto + 1} / {vehicle.photos.length}</div>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="text-white hover:bg-white/20 rounded-full">
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="flex-1 relative overflow-hidden" ref={emblaFullscreenRef}>
            <div className="flex h-full touch-pan-y">
              {vehicle.photos.map((photo, idx) => (
                <div key={idx} className="flex-[0_0_100%] min-w-0 relative h-full flex items-center justify-center p-2">
                  <img 
                    src={photo} 
                    alt={`Fullscreen ${idx + 1}`} 
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${scale})`, touchAction: 'pinch-zoom' }}
                    onWheel={(e) => {
                      if (e.deltaY < 0) setScale(prev => Math.min(prev + 0.2, 4));
                      else setScale(prev => Math.max(prev - 0.2, 1));
                    }}
                  />
                </div>
              ))}
            </div>
            
            {vehicle.photos.length > 1 && (
              <>
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 hover:bg-black/80 text-white rounded-full hidden md:flex"
                  onClick={scrollFullscreenPrev}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button 
                  variant="ghost" size="icon" 
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 bg-black/50 hover:bg-black/80 text-white rounded-full hidden md:flex"
                  onClick={scrollFullscreenNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-10 space-y-4">
        <Card className="rounded-3xl border-border shadow-sm bg-card overflow-hidden">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1 mb-6">
              {vehicle.version || 'Versão não informada'}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Preço Exclusivo B2B
            </p>
            <p className="text-4xl font-extrabold text-primary tabular-nums tracking-tighter">
              {formattedPrice}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border shadow-sm bg-card">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Ficha Técnica</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Ano</p>
                  <p className="font-semibold text-foreground tabular-nums">{vehicle.manufacturing_year}/{vehicle.model_year}</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Quilometragem</p>
                  <p className="font-semibold text-foreground tabular-nums">{vehicle.km?.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Localização</p>
                  <p className="font-semibold text-foreground truncate">{vehicle.city ? `${vehicle.city}, ${vehicle.state}` : vehicle.state}</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Cor</p>
                  <p className="font-semibold text-foreground">{vehicle.color || 'Não informada'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <FipeComparison vehicle={vehicle} />

        {/* CARTÃO DO VENDEDOR COM BOTÃO DE VER ESTOQUE */}
        <Card className="rounded-3xl border-border shadow-sm bg-primary/5 border-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-foreground text-base">Vendedor</h3>
                  <SellerBadge email={vehicle.created_by} />
                </div>
                <p className="text-xs text-muted-foreground font-medium">Anunciado por: <span className="text-foreground">{vehicle.created_by}</span></p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Negociação direta e segura</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full h-11 rounded-xl font-bold border-primary/20 text-primary bg-background hover:bg-primary/10"
              onClick={() => window.location.href = `${createPageUrl('Home')}?seller=${vehicle.created_by}`}
            >
              <Store className="h-4 w-4 mr-2" /> Ver estoque deste vendedor
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-border z-40 safe-pb shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button 
            onClick={handleContactSeller}
            className="flex-1 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-bold text-lg shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
          >
            <MessageCircle className="h-6 w-6 mr-2" />
            Chat
          </Button>
          
          {user?.email !== vehicle.created_by && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex-1 h-14 rounded-2xl font-bold text-lg shadow-lg transition-all active:scale-[0.98]">
                  Fazer Proposta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Fazer Proposta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">Valor Proposto (R$)</label>
                    <Input 
                      type="number" 
                      value={proposalPrice} 
                      onChange={e => setProposalPrice(e.target.value)} 
                      className="h-12 text-lg font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase">Mensagem (Opcional)</label>
                    <Input 
                      value={proposalMessage} 
                      onChange={e => setProposalMessage(e.target.value)} 
                      placeholder="Ex: Pagamento à vista"
                      className="h-12"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose id="close-proposal-dialog" asChild>
                    <Button variant="ghost">Cancelar</Button>
                  </DialogClose>
                  <Button 
                    onClick={() => proposalMutation.mutate()} 
                    disabled={proposalMutation.isPending}
                  >
                    {proposalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Enviar Proposta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}