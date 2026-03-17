import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Search, FilterX, SlidersHorizontal, 
  Car, Check, MapPin, ArrowUpDown
} from 'lucide-react';
import VehicleCard from '../components/vehicle/VehicleCard';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { STATES } from '../components/shared/utils';
import { useNavigationStore } from '@/store/useNavigationStore';
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
  // 1. Estado Global Persistente (Resolve Stack Preservation)
  const { homeFilters, setHomeFilters, resetHomeFilters } = useNavigationStore();
  
  // 2. Estado local para o Debounce da busca
  const [debouncedFilters, setDebouncedFilters] = useState(homeFilters);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(homeFilters), 400);
    return () => clearTimeout(timer);
  }, [homeFilters]);

  // 3. Busca de veículos ativos
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
        return true;
      }).sort((a, b) => {
        if (debouncedFilters.sort === 'recent') return new Date(b.created_date) - new Date(a.created_date);
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

  const sortOptions = [
    { label: 'Mais Recentes', value: 'recent' },
    { label: 'Menor Preço', value: 'price_asc' },
    { label: 'Maior Preço', value: 'price_desc' },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Buscar Veículos</h1>
          <p className="text-sm text-muted-foreground">Explore as melhores oportunidades de repasse.</p>
        </div>

        {/* Mobile Filters via Drawer (Bottom Sheets) */}
        <div className="flex gap-2 md:hidden overflow-x-auto pb-2 scrollbar-hide">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-border bg-card">
                <SlidersHorizontal className="h-4 w-4" /> Filtros
                {(homeFilters.state !== 'all' || homeFilters.maxPrice) && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="px-4 pb-8">
              <DrawerHeader>
                <DrawerTitle>Filtros Avançados</DrawerTitle>
              </DrawerHeader>
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Mínimo</label>
                      <Input type="number" placeholder="R$ 0" value={homeFilters.minPrice} onChange={(e) => setHomeFilters({ minPrice: e.target.value })} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Máximo</label>
                      <Input type="number" placeholder="R$ 1M" value={homeFilters.maxPrice} onChange={(e) => setHomeFilters({ maxPrice: e.target.value })} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-muted-foreground uppercase">Estado (UF)</label>
                   <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      {STATES.map(uf => (
                        <Button 
                          key={uf} 
                          variant={homeFilters.state === uf ? "default" : "outline"} 
                          size="sm"
                          onClick={() => setHomeFilters({ state: uf })}
                        >
                          {uf}
                        </Button>
                      ))}
                   </div>
                </div>
              </div>
              <DrawerFooter className="flex-row gap-2 px-0">
                <DrawerClose asChild>
                  <Button className="flex-1 h-12 rounded-xl font-bold">Ver Resultados</Button>
                </DrawerClose>
                <Button variant="ghost" onClick={resetHomeFilters}><FilterX className="h-5 w-5" /></Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-border bg-card">
                <ArrowUpDown className="h-4 w-4" /> 
                {sortOptions.find(o => o.value === homeFilters.sort)?.label}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4 space-y-2">
                {sortOptions.map(opt => (
                  <Button 
                    key={opt.value} 
                    variant="ghost" 
                    className="w-full justify-between h-12 rounded-xl" 
                    onClick={() => { setHomeFilters({ sort: opt.value }); }}
                  >
                    {opt.label}
                    {homeFilters.sort === opt.value && <Check className="h-4 w-4 text-primary" />}
                  </Button>
                ))}
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="secondary" className="w-full h-11">Fechar</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Desktop Search/Filters */}
        <div className="hidden md:grid grid-cols-12 gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Marca ou modelo..." 
              className="pl-9 h-10" 
              value={homeFilters.make} 
              onChange={(e) => setHomeFilters({ make: e.target.value })} 
            />
          </div>
          <div className="col-span-3">
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
              value={homeFilters.state}
              onChange={(e) => setHomeFilters({ state: e.target.value })}
            >
              <option value="all">Todos Estados</option>
              {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div className="col-span-3">
            <select 
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
              value={homeFilters.sort}
              onChange={(e) => setHomeFilters({ sort: e.target.value })}
            >
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button variant="ghost" className="col-span-2 h-10" onClick={resetHomeFilters}>
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

        {/* List Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Buscando ofertas...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {vehicles?.length || 0} Resultados encontrados
              </span>
            </div>
            
            {vehicles?.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                <Car className="h-12 w-12 mx-auto text-muted/30 mb-4" />
                <h3 className="text-lg font-bold">Nenhum veículo encontrado</h3>
                <p className="text-muted-foreground text-sm mb-6 px-10">Tente ajustar seus filtros para encontrar o que procura.</p>
                <Button variant="outline" onClick={resetHomeFilters} className="rounded-full">Limpar tudo</Button>
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