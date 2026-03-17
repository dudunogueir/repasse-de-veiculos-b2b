// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, FilterX, SlidersHorizontal, Car } from 'lucide-react';
import VehicleCard from '../components/vehicle/VehicleCard';
import PullToRefresh from '@/components/shared/PullToRefresh'; // <-- IMPORTAÇÃO
import { STATES } from '../components/shared/utils';
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

  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(filters), 500);
    return () => clearTimeout(timer);
  }, [filters]);

  // Fetch Vehicles - Extraímos o refetch para o Pull-to-Refresh
  const { data: vehicles, isLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles', debouncedFilters],
    queryFn: async () => {
      let results = await base44.entities.Vehicle.filter({ status: 'active' }, { created_date: -1 }, 100);
      
      return results.filter(v => {
        if (debouncedFilters.make && !v.make.toLowerCase().includes(debouncedFilters.make.toLowerCase())) return false;
        if (debouncedFilters.model && !v.model.toLowerCase().includes(debouncedFilters.model.toLowerCase())) return false;
        if (debouncedFilters.state !== 'all' && v.state !== debouncedFilters.state) return false;
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

  // Função para o Pull-to-Refresh
  const handleRefresh = async () => {
    await Promise.all([refetchVehicles(), refetchFavorites()]);
    toast.info("Ofertas atualizadas!");
  };

  const handleToggleFavorite = async (vehicle) => {
    try { await base44.auth.me(); } catch {
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
        vehicle_data: { make: vehicle.make, model: vehicle.model, price: vehicle.price, photo: vehicle.photos?.[0] }
      });
      toast.success("Adicionado aos favoritos");
    }
    refetchFavorites();
  };

  const clearFilters = () => {
    setFilters({ make: '', model: '', state: 'all', minPrice: '', maxPrice: '', minYear: '', maxYear: '', sort: 'recent' });
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Encontre o veículo ideal</h1>
              <p className="text-gray-500">Milhares de oportunidades para sua concessionária</p>
            </div>
            
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
                </SelectContent>
              </Select>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="md:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle>Filtros de Busca</SheetTitle>
                  </SheetHeader>
                  <div className="py-6 space-y-6 overflow-y-auto h-full pb-20">
                    <div className="space-y-4">
                      <Input placeholder="Marca" value={filters.make} onChange={(e) => setFilters({...filters, make: e.target.value})} />
                      <Input placeholder="Modelo" value={filters.model} onChange={(e) => setFilters({...filters, model: e.target.value})} />
                      <Select value={filters.state} onValueChange={(val) => setFilters({...filters, state: val})}>
                        <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os estados</SelectItem>
                          {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" placeholder="Preço Mín." value={filters.minPrice} onChange={(e) => setFilters({...filters, minPrice: e.target.value})} />
                        <Input type="number" placeholder="Preço Máx." value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} />
                      </div>
                      <Button className="w-full" onClick={() => document.querySelector('[data-radix-collection-item]').click()}>Aplicar Filtros</Button>
                      <Button variant="ghost" className="w-full text-red-500" onClick={clearFilters}>Limpar Filtros</Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Desktop Filters Grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="col-span-1 md:col-span-2 lg:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por Marca..." className="pl-9" value={filters.make} onChange={(e) => setFilters({...filters, make: e.target.value})} />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
               <Input placeholder="Modelo..." value={filters.model} onChange={(e) => setFilters({...filters, model: e.target.value})} />
            </div>
            <div>
               <Select value={filters.state} onValueChange={(val) => setFilters({...filters, state: val})}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
               <Button variant="outline" onClick={clearFilters} className="w-full text-gray-500 hover:text-gray-900">
                  <FilterX className="h-4 w-4 mr-2" /> Limpar
               </Button>
            </div>
          </div>
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">{vehicles?.length || 0} veículos encontrados</p>
            {vehicles?.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <Car className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Nenhum veículo encontrado</h3>
                <Button variant="link" onClick={clearFilters} className="mt-2 text-indigo-600">Limpar filtros</Button>
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
    </PullToRefresh>
  );
}