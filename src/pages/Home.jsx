import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Search, FilterX, SlidersHorizontal, 
  Car, ChevronRight, Check 
} from 'lucide-react';
import VehicleCard from '../components/vehicle/VehicleCard';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { STATES } from '../components/shared/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
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

  const sortOptions = [
    { label: 'Mais Recentes', value: 'recent' },
    { label: 'Mais Antigos', value: 'oldest' },
    { label: 'Menor Preço', value: 'price_asc' },
    { label: 'Maior Preço', value: 'price_desc' },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Buscar Veículos</h1>
          <p className="text-sm text-slate-500">Explore as melhores oportunidades de repasse.</p>
        </div>

        {/* Mobile Action Bar */}
        <div className="flex gap-2 md:hidden overflow-x-auto pb-2 scrollbar-hide">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-slate-200">
                <SlidersHorizontal className="h-4 w-4" /> Filtros
              </Button>
            </DrawerTrigger>
            <DrawerContent className="px-4 pb-8">
              <DrawerHeader>
                <DrawerTitle>Filtros Avançados</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Preço Mín.</label>
                      <Input type="number" placeholder="R$ 0" value={filters.minPrice} onChange={(e) => setFilters({...filters, minPrice: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Preço Máx.</label>
                      <Input type="number" placeholder="R$ 1M" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase">Estado (UF)</label>
                   <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      {STATES.map(uf => (
                        <Button 
                          key={uf} 
                          variant={filters.state === uf ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setFilters({...filters, state: uf})}
                        >
                          {uf}
                        </Button>
                      ))}
                   </div>
                </div>
              </div>
              <DrawerFooter className="flex-row gap-2 px-0">
                <Button className="flex-1" onClick={() => document.querySelector('[data-drawer-close]').click()}>Ver Resultados</Button>
                <Button variant="ghost" onClick={clearFilters}><FilterX className="h-4 w-4" /></Button>
              </DrawerFooter>
              <DrawerClose id="data-drawer-close" />
            </DrawerContent>
          </Drawer>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-slate-200">
                Ordenar: {sortOptions.find(o => o.value === filters.sort)?.label}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-1">
                {sortOptions.map(opt => (
                  <Button 
                    key={opt.value} 
                    variant="ghost" 
                    className="w-full justify-between font-medium" 
                    onClick={() => { setFilters({...filters, sort: opt.value}); document.querySelector('[data-drawer-close-sort]').click(); }}
                  >
                    {opt.label}
                    {filters.sort === opt.value && <Check className="h-4 w-4 text-indigo-600" />}
                  </Button>
                ))}
              </div>
              <DrawerClose id="data-drawer-close-sort" />
            </DrawerContent>
          </Drawer>
        </div>

        {/* Desktop Search Bar */}
        <div className="hidden md:grid grid-cols-12 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Marca ou modelo..." className="pl-9" value={filters.make} onChange={(e) => setFilters({...filters, make: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Input placeholder="Preço Máx." type="number" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})} />
          </div>
          <div className="col-span-2">
            <select 
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.state}
              onChange={(e) => setFilters({...filters, state: e.target.value})}
            >
              <option value="all">Todos Estados</option>
              {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <select 
              className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filters.sort}
              onChange={(e) => setFilters({...filters, sort: e.target.value})}
            >
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button variant="ghost" className="col-span-2 text-slate-500" onClick={clearFilters}>
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500 font-medium">Buscando ofertas...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {vehicles?.length || 0} Resultados encontrados
              </span>
            </div>
            
            {vehicles?.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                <Car className="h-12 w-12 mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-900">Sem resultados</h3>
                <p className="text-slate-500 text-sm mb-6 px-10">Tente ajustar seus filtros para encontrar o que procura.</p>
                <Button variant="outline" onClick={clearFilters} className="rounded-full">Limpar tudo</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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