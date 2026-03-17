import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Search, FilterX, SlidersHorizontal, 
  Car, Check, ArrowUpDown, Store
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
import { createPageUrl } from '@/utils';

export default function HomePage() {
  const { homeFilters, setHomeFilters, resetHomeFilters } = useNavigationStore();
  const [debouncedFilters, setDebouncedFilters] = useState(homeFilters);
  
  // Deteta se o utilizador chegou aqui vindo do botão "Ver estoque do vendedor"
  const urlParams = new URLSearchParams(window.location.search);
  const sellerQuery = urlParams.get('seller');
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilters(homeFilters), 400);
    return () => clearTimeout(timer);
  }, [homeFilters]);

  const { data: vehicles, isLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles', debouncedFilters, sellerQuery],
    queryFn: async () => {
      let results = await base44.entities.Vehicle.filter({ status: 'active' }, { created_date: -1 }, 100);
      
      return results.filter(v => {
        // Regra Especial: Filtra pelo vendedor se o parâmetro existir na URL
        if (sellerQuery && v.created_by !== sellerQuery) return false;
        
        // Filtros Normais
        if (debouncedFilters.search) {
          const searchLower = debouncedFilters.search.toLowerCase();
          const matchMake = v.make?.toLowerCase().includes(searchLower);
          const matchModel = v.model?.toLowerCase().includes(searchLower);
          const matchVersion = v.version?.toLowerCase().includes(searchLower);
          if (!matchMake && !matchModel && !matchVersion) return false;
        }
        if (debouncedFilters.make !== 'all' && debouncedFilters.make && v.make !== debouncedFilters.make) return false;
        if (debouncedFilters.state !== 'all' && v.state !== debouncedFilters.state) return false;
        if (debouncedFilters.transmission !== 'all' && debouncedFilters.transmission && v.transmission !== debouncedFilters.transmission) return false;
        if (debouncedFilters.minPrice && v.price < parseInt(debouncedFilters.minPrice)) return false;
        if (debouncedFilters.maxPrice && v.price > parseInt(debouncedFilters.maxPrice)) return false;
        if (debouncedFilters.minYear && v.manufacturing_year < parseInt(debouncedFilters.minYear)) return false;
        if (debouncedFilters.maxYear && v.manufacturing_year > parseInt(debouncedFilters.maxYear)) return false;
        if (debouncedFilters.maxKm && v.mileage > parseInt(debouncedFilters.maxKm)) return false;
        return true;
      }).sort((a, b) => {
        if (debouncedFilters.sort === 'recent') return new Date(b.created_date) - new Date(a.created_date);
        if (debouncedFilters.sort === 'price_asc') return a.price - b.price;
        if (debouncedFilters.sort === 'price_desc') return b.price - a.price;
        if (debouncedFilters.sort === 'km_asc') return (a.mileage || 0) - (b.mileage || 0);
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
    { label: 'Menor KM', value: 'km_asc' },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        
        {/* Aviso de Filtro de Vendedor (Aparece apenas quando clicam no botão da página de detalhes) */}
        {sellerQuery ? (
          <div className="flex items-center justify-between bg-primary text-primary-foreground p-4 rounded-2xl shadow-md">
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Estoque Exclusivo</p>
                <p className="font-semibold text-sm">{sellerQuery}</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-full font-bold"
              onClick={() => window.location.href = createPageUrl('Home')}
            >
              Ver Todos
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Buscar Veículos</h1>
            <p className="text-sm text-muted-foreground">Explore as melhores oportunidades de repasse.</p>
          </div>
        )}

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
              <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-muted-foreground uppercase">Marca</label>
                   <select 
                     className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary"
                     value={homeFilters.make}
                     onChange={(e) => setHomeFilters({ make: e.target.value })}
                   >
                     <option value="all">Todas as Marcas</option>
                     {["Chevrolet", "Volkswagen", "Fiat", "Toyota", "Hyundai", "Jeep", "Renault", "Honda", "Nissan", "Ford", "BMW", "Audi"].map(m => (
                       <option key={m} value={m}>{m}</option>
                     ))}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Preço Mín</label>
                      <Input type="number" placeholder="R$ 0" value={homeFilters.minPrice} onChange={(e) => setHomeFilters({ minPrice: e.target.value })} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Preço Máx</label>
                      <Input type="number" placeholder="R$ 1M" value={homeFilters.maxPrice} onChange={(e) => setHomeFilters({ maxPrice: e.target.value })} />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Ano Mín</label>
                      <Input type="number" placeholder="Ex: 2015" value={homeFilters.minYear} onChange={(e) => setHomeFilters({ minYear: e.target.value })} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground uppercase">KM Máx</label>
                      <Input type="number" placeholder="Ex: 100000" value={homeFilters.maxKm} onChange={(e) => setHomeFilters({ maxKm: e.target.value })} />
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-muted-foreground uppercase">Câmbio</label>
                   <div className="grid grid-cols-3 gap-2">
                      <Button variant={homeFilters.transmission === 'all' ? "default" : "outline"} size="sm" onClick={() => setHomeFilters({ transmission: 'all' })}>Todos</Button>
                      <Button variant={homeFilters.transmission === 'Automático' ? "default" : "outline"} size="sm" onClick={() => setHomeFilters({ transmission: 'Automático' })}>Auto</Button>
                      <Button variant={homeFilters.transmission === 'Manual' ? "default" : "outline"} size="sm" onClick={() => setHomeFilters({ transmission: 'Manual' })}>Manual</Button>
                   </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-muted-foreground uppercase">Estado (UF)</label>
                   <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                      <Button variant={homeFilters.state === 'all' ? "default" : "outline"} size="sm" onClick={() => setHomeFilters({ state: 'all' })}>Todos</Button>
                      {STATES.map(uf => (
                        <Button key={uf} variant={homeFilters.state === uf ? "default" : "outline"} size="sm" onClick={() => setHomeFilters({ state: uf })}>
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
                  <Button key={opt.value} variant="ghost" className="w-full justify-between h-12 rounded-xl" onClick={() => { setHomeFilters({ sort: opt.value }); }}>
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

        <div className="hidden md:grid grid-cols-12 gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Marca, modelo ou versão..." className="pl-9 h-10" value={homeFilters.search} onChange={(e) => setHomeFilters({ search: e.target.value })} />
          </div>
          <div className="col-span-2">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary" value={homeFilters.make} onChange={(e) => setHomeFilters({ make: e.target.value })}>
              <option value="all">Todas Marcas</option>
              {["Chevrolet", "Volkswagen", "Fiat", "Toyota", "Hyundai", "Jeep", "Renault", "Honda", "Nissan", "Ford", "BMW", "Audi"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary" value={homeFilters.state} onChange={(e) => setHomeFilters({ state: e.target.value })}>
              <option value="all">Todos Estados</option>
              {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary" value={homeFilters.sort} onChange={(e) => setHomeFilters({ sort: e.target.value })}>
              {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Button variant="ghost" className="col-span-2 h-10" onClick={resetHomeFilters}>
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        </div>

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
                <p className="text-muted-foreground text-sm mb-6 px-10">
                  {sellerQuery ? "Este vendedor não possui outros veículos ativos no momento." : "Tente ajustar seus filtros para encontrar o que procura."}
                </p>
                {!sellerQuery && <Button variant="outline" onClick={resetHomeFilters} className="rounded-full">Limpar tudo</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {vehicles?.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} isFavorite={favorites?.some(f => f.vehicle_id === vehicle.id)} onToggleFavorite={handleToggleFavorite} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}