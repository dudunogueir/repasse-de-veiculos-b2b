import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Search, FilterX, SlidersHorizontal } from 'lucide-react';
import VehicleCard from '../components/vehicle/VehicleCard';
import { STATES, formatCurrency } from '../components/shared/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export default function HomePage() {
  // Filters State
  const [filters, setFilters] = useState({
    make: '',
    model: '',
    state: 'all',
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    sort: 'recent'
  });

  // Debounce search
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch Vehicles
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['vehicles', debouncedFilters],
    queryFn: async () => {
      // In a real app, we would pass filters to the backend. 
      // Since Base44 list/filter is basic, we might fetch active ones and filter client side for advanced queries if needed, 
      // but let's try to use filter object as much as possible.
      
      const query = { status: 'active' };
      if (debouncedFilters.state !== 'all') query.state = debouncedFilters.state;
      // Note: Base44 filter doesn't support range queries easily in this mock interface without specialized mongo syntax usually.
      // So we will fetch all active and filter client-side for ranges and text search.
      
      let results = await base44.entities.Vehicle.filter({ status: 'active' }, { created_date: -1 }, 100);
      
      // Client-side filtering for MVP
      return results.filter(v => {
        if (debouncedFilters.make && !v.make.toLowerCase().includes(debouncedFilters.make.toLowerCase())) return false;
        if (debouncedFilters.model && !v.model.toLowerCase().includes(debouncedFilters.model.toLowerCase())) return false;
        if (debouncedFilters.minPrice && v.price < parseInt(debouncedFilters.minPrice)) return false;
        if (debouncedFilters.maxPrice && v.price > parseInt(debouncedFilters.maxPrice)) return false;
        if (debouncedFilters.minYear && v.manufacturing_year < parseInt(debouncedFilters.minYear)) return false;
        if (debouncedFilters.maxYear && v.manufacturing_year > parseInt(debouncedFilters.maxYear)) return false;
        return true;
      }).sort((a, b) => {
        if (debouncedFilters.sort === 'recent') return new Date(b.created_date) - new Date(a.created_date);
        if (debouncedFilters.sort === 'oldest') return new Date(a.created_date) - new Date(b.created_date);
        if (debouncedFilters.sort === 'price_asc') return a.price - b.price;
        if (debouncedFilters.sort === 'price_desc') return b.price - a.price;
        if (debouncedFilters.sort === 'year_asc') return a.manufacturing_year - b.manufacturing_year;
        if (debouncedFilters.sort === 'year_desc') return b.manufacturing_year - a.manufacturing_year;
        return 0;
      });
    }
  });

  // Fetch Favorites
  const { data: favorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        // Filter favorites created by me (built-in logic usually returns all, so filter by created_by if needed or rely on backend perms)
        // Actually Base44.list() returns everything accessible. Assuming row level security or user filtering.
        // For MVP we assume user sees only their favorites or we filter manually.
        // Let's assume we can query by user_id or created_by.
        // But wait, `Favorite` entity I defined has `vehicle_id`.
        // Since I can't query `created_by` easily in this mock, I'll assume listing returns what I need.
        const allFavs = await base44.entities.Favorite.list(); 
        return allFavs.filter(f => f.created_by === user.email); // basic client filter
      } catch {
        return [];
      }
    }
  });

  const handleToggleFavorite = async (vehicle) => {
    try {
      const user = await base44.auth.me();
    } catch {
      base44.auth.redirectToLogin();
      return;
    }

    const existingFav = favorites?.find(f => f.vehicle_id === vehicle.id);
    if (existingFav) {
      await base44.entities.Favorite.delete(existingFav.id);
      toast.success("Removido dos favoritos");
    } else {
      await base44.entities.Favorite.create({
        vehicle_id: vehicle.id,
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

  const clearFilters = () => {
    setFilters({
      make: '',
      model: '',
      state: 'all',
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      sort: 'recent'
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero / Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Encontre o veículo ideal</h1>
            <p className="text-gray-500">Milhares de oportunidades de repasse para sua concessionária</p>
          </div>
          
          {/* Mobile Filter Toggle could go here */}
          <div className="flex gap-2 w-full md:w-auto">
            <Select value={filters.sort} onValueChange={(val) => setFilters({...filters, sort: val})}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="oldest">Mais Antigos</SelectItem>
                <SelectItem value="price_asc">Menor Preço</SelectItem>
                <SelectItem value="price_desc">Maior Preço</SelectItem>
                <SelectItem value="year_desc">Ano: Mais Novo</SelectItem>
                <SelectItem value="year_asc">Ano: Mais Antigo</SelectItem>
              </SelectContent>
            </Select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* Mobile Filters Content - Reusing logic */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Select value={filters.state} onValueChange={(val) => setFilters({...filters, state: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os estados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os estados</SelectItem>
                        {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                   {/* ... other mobile filters */}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por Marca..." 
                className="pl-9" 
                value={filters.make}
                onChange={(e) => setFilters({...filters, make: e.target.value})}
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
             <Input 
                placeholder="Modelo..." 
                value={filters.model}
                onChange={(e) => setFilters({...filters, model: e.target.value})}
              />
          </div>
          
          <div className="hidden md:block">
             <Select value={filters.state} onValueChange={(val) => setFilters({...filters, state: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
             <Button variant="outline" onClick={clearFilters} className="w-full text-gray-500 hover:text-gray-900">
                <FilterX className="h-4 w-4 mr-2" />
                Limpar
             </Button>
          </div>

          {/* Price Range */}
          <div className="col-span-1 md:col-span-2">
             <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  placeholder="Preço Mín." 
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                />
                <span className="text-gray-300">-</span>
                <Input 
                  type="number" 
                  placeholder="Preço Máx." 
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
             </div>
          </div>

          {/* Year Range */}
          <div className="col-span-1 md:col-span-2">
             <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  placeholder="Ano Mín." 
                  value={filters.minYear}
                  onChange={(e) => setFilters({...filters, minYear: e.target.value})}
                />
                <span className="text-gray-300">-</span>
                <Input 
                  type="number" 
                  placeholder="Ano Máx." 
                  value={filters.maxYear}
                  onChange={(e) => setFilters({...filters, maxYear: e.target.value})}
                />
             </div>
          </div>
        </div>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">{vehicles?.length || 0} veículos encontrados</p>
          {vehicles?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum veículo encontrado</h3>
              <p className="text-gray-500">Tente ajustar seus filtros de busca</p>
              <Button variant="link" onClick={clearFilters} className="mt-2 text-indigo-600">
                Limpar todos os filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vehicles?.map((vehicle) => (
                <VehicleCard 
                  key={vehicle.id} 
                  vehicle={vehicle} 
                  isFavorite={favorites?.some(f => f.vehicle_id === vehicle.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}