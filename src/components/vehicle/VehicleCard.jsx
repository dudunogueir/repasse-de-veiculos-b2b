import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Calendar, Gauge, ArrowRight } from 'lucide-react';
import { formatCurrency, formatKM, formatDate } from '../shared/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function VehicleCard({ vehicle, isFavorite, onToggleFavorite }) {
  const handleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(vehicle);
    }
  };

  return (
    <Link to={`${createPageUrl('VehicleDetails')}?id=${vehicle.id}`}>
      <Card className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white rounded-xl h-full flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          {vehicle.photos && vehicle.photos.length > 0 ? (
            <img 
              src={vehicle.photos[0]} 
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
              Sem foto
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {vehicle.status === 'sold' && (
              <Badge className="bg-red-500/90 text-white hover:bg-red-600 uppercase tracking-wider text-xs font-bold">
                Vendido
              </Badge>
            )}
            {vehicle.manufacturing_year >= new Date().getFullYear() && (
              <Badge className="bg-green-500/90 text-white hover:bg-green-600 uppercase tracking-wider text-xs font-bold">
                Novo
              </Badge>
            )}
          </div>

          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavorite}
            className={`absolute top-3 right-3 rounded-full h-8 w-8 backdrop-blur-md transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white hover:bg-red-600 hover:text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </Button>
          
          {/* Price Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
            <p className="text-white font-bold text-xl tracking-tight">
              {formatCurrency(vehicle.price)}
            </p>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 flex-grow">
          <div className="mb-2">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-1">{vehicle.version}</p>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 mt-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span>{vehicle.manufacturing_year}/{vehicle.model_year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-indigo-500" />
              <span>{formatKM(vehicle.km)}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-500" />
              <span className="truncate">{vehicle.city} - {vehicle.state}</span>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs text-gray-400 border-t border-gray-50 mt-auto">
          <span>Criado em: {formatDate(vehicle.created_date)}</span>
          <div className="flex items-center text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}