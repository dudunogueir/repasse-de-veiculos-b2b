import React from 'react';
import { Heart, MapPin, Calendar, Gauge, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

export default function VehicleCard({ vehicle, isFavorite, onToggleFavorite }) {
  // Formatação Profissional de Moeda (Remove centavos vazios para leitura mais limpa)
  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(vehicle.price || 0);

  // Validação da Foto Principal
  const mainPhoto = vehicle.photos && vehicle.photos.length > 0 ? vehicle.photos[0] : null;

  // Navegação para a página de Detalhes
  const handleCardClick = (e) => {
    // Evita abrir os detalhes se o utilizador clicou no coração (favorito)
    if (e.target.closest('button')) return;
    window.location.href = `${createPageUrl('VehicleDetails')}?id=${vehicle.id}`;
  };

  return (
    <Card 
      onClick={handleCardClick}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col"
    >
      {/* 1. ÁREA DA FOTO E FAVORITO */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden flex items-center justify-center">
        {mainPhoto ? (
          <img 
            src={mainPhoto} 
            alt={`${vehicle.make} ${vehicle.model}`} 
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center text-muted-foreground/40">
            <ImageIcon className="h-10 w-10 mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Sem Foto</span>
          </div>
        )}
        
        {/* Tag Institucional (Reforça B2B) */}
        <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
          Repasse
        </div>

        {/* Botão de Favorito (Glassmorphism para não poluir a foto) */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-9 w-9 bg-background/50 backdrop-blur-md rounded-full hover:bg-background/80 border border-border/50"
          onClick={(e) => {
            e.stopPropagation(); // Impede o clique de abrir a página de detalhes
            if(onToggleFavorite) onToggleFavorite(vehicle);
          }}
        >
          <Heart className={`h-[18px] w-[18px] ${isFavorite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
        </Button>
      </div>

      {/* 2. ÁREA DE DADOS B2B */}
      <CardContent className="p-4 flex flex-col flex-1">
        
        {/* Marca/Modelo/Versão */}
        <div className="mb-3">
          <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-medium">
            {vehicle.version || 'Versão não informada'}
          </p>
        </div>

        {/* O Grande Destaque: Preço B2B com tabular-nums */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 opacity-80">
            Preço Concessionária
          </p>
          {/* A classe tabular-nums garante que os números fiquem sempre perfeitamente alinhados */}
          <p className="text-2xl font-extrabold text-primary tabular-nums tracking-tight">
            {formattedPrice}
          </p>
        </div>

        {/* Grid de Atributos Secundários (Ano, Km, Local) */}
        <div className="mt-auto grid grid-cols-2 gap-y-2.5 gap-x-2 border-t border-border/40 pt-3.5">
          <div className="flex items-center text-xs text-muted-foreground font-semibold">
            <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-60" />
            <span className="tabular-nums">{vehicle.manufacturing_year}/{vehicle.model_year}</span>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground font-semibold">
            <Gauge className="h-3.5 w-3.5 mr-1.5 opacity-60" />
            <span className="tabular-nums">{vehicle.mileage?.toLocaleString('pt-BR')} km</span>
          </div>
          
          <div className="flex items-center text-xs text-muted-foreground font-semibold col-span-2">
            <MapPin className="h-3.5 w-3.5 mr-1.5 opacity-60" />
            <span className="truncate">
              {vehicle.city ? `${vehicle.city}, ${vehicle.state}` : vehicle.state}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}