// src/pages/Admin.jsx
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, History, Search, Trash2, Pencil, 
  Users, Car, Filter, Loader2, AlertTriangle 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Verificação de Permissão (Segurança Nível de Usuário)
  const isAdmin = user?.role === 'admin' || user?.role === 'Administrador';

  // 2. Busca de todos os anúncios para moderação
  const { data: allVehicles, isLoading: loadingVehicles } = useQuery({
    queryKey: ['admin-vehicles'],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: isAdmin
  });

  // 3. Busca de Logs de Auditoria
  const { data: auditLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => base44.entities.LogOfAuditory.list(), // Nome da coleção conforme escopo
    enabled: isAdmin
  });

  // 5. Busca de Usuários para Verificação
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: () => base44.entities.Subscription.list(),
    enabled: isAdmin
  });

  const updateSubMutation = useMutation({
    mutationFn: async ({ id, plan, status }) => {
      let updates = {};
      if (plan) {
        let limits = { vehicles_limit: 3, highlight_slots: 0 };
        if (plan === 'starter') limits = { vehicles_limit: 10, highlight_slots: 2 };
        if (plan === 'pro') limits = { vehicles_limit: 30, highlight_slots: 10 };
        if (plan === 'enterprise') limits = { vehicles_limit: 9999, highlight_slots: 9999 };
        updates = { plan, ...limits };
      }
      if (status) {
        updates.status = status;
      }
      await base44.entities.Subscription.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-subscriptions']);
      toast.success("Assinatura atualizada!");
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.User.update(id, { cnpj_verified: true, verified_at: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success("Concessionária verificada com sucesso!");
    }
  });

  const unverifyMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.User.update(id, { cnpj_verified: false, verified_at: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      toast.success("Verificação removida!");
    }
  });

  // 4. Mutação para Exclusão Administrativa
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-vehicles']);
      toast.success("Anúncio removido pelo administrador");
    }
  });

  const populateMutation = useMutation({
    mutationFn: async () => {
      const testData = [
        { make: "Toyota", model: "Corolla", version: "XEi", manufacturing_year: 2021, model_year: 2022, km: 35000, transmission: "Automático", color: "Branco", state: "RS", city: "Porto Alegre", price: 128000, status: "active", views: 42, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Toyota+Corolla"] },
        { make: "Honda", model: "Civic", version: "EXL", manufacturing_year: 2020, model_year: 2021, km: 48000, transmission: "Automático", color: "Prata", state: "SP", city: "São Paulo", price: 119000, status: "active", views: 31, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Honda+Civic"] },
        { make: "Jeep", model: "Compass", version: "Limited", manufacturing_year: 2022, model_year: 2022, km: 22000, transmission: "Automático", color: "Preto", state: "PR", city: "Curitiba", price: 175000, status: "active", views: 67, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Jeep+Compass"] },
        { make: "Volkswagen", model: "T-Cross", version: "Highline", manufacturing_year: 2021, model_year: 2022, km: 30000, transmission: "Automático", color: "Vermelho", state: "MG", city: "Belo Horizonte", price: 118000, status: "active", views: 28, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Volkswagen+T-Cross"] },
        { make: "Hyundai", model: "HB20", version: "Comfort Plus", manufacturing_year: 2022, model_year: 2023, km: 15000, transmission: "Manual", color: "Azul", state: "SC", city: "Florianópolis", price: 72000, status: "active", views: 19, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Hyundai+HB20"] },
        { make: "Ford", model: "Ranger", version: "XLS", manufacturing_year: 2021, model_year: 2022, km: 55000, transmission: "Automático", color: "Branco", state: "GO", city: "Goiânia", price: 198000, status: "active", views: 54, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Ford+Ranger"] },
        { make: "Chevrolet", model: "Onix Plus", version: "Premier", manufacturing_year: 2022, model_year: 2023, km: 18000, transmission: "Automático", color: "Cinza", state: "BA", city: "Salvador", price: 89000, status: "active", views: 23, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Chevrolet+Onix+Plus"] },
        { make: "Nissan", model: "Kicks", version: "SV", manufacturing_year: 2021, model_year: 2021, km: 42000, transmission: "Automático", color: "Prata", state: "RJ", city: "Rio de Janeiro", price: 102000, status: "active", views: 38, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Nissan+Kicks"] },
        { make: "Toyota", model: "Hilux", version: "SR", manufacturing_year: 2020, model_year: 2021, km: 68000, transmission: "Automático", color: "Branco", state: "MT", city: "Cuiabá", price: 219000, status: "active", views: 71, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Toyota+Hilux"] },
        { make: "Renault", model: "Kwid", version: "Intense", manufacturing_year: 2022, model_year: 2023, km: 12000, transmission: "Manual", color: "Laranja", state: "CE", city: "Fortaleza", price: 58000, status: "active", views: 14, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Renault+Kwid"] },
        { make: "BMW", model: "320i", version: "Sport", manufacturing_year: 2021, model_year: 2022, km: 28000, transmission: "Automático", color: "Preto", state: "SP", city: "São Paulo", price: 289000, status: "active", views: 88, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+BMW+320i"] },
        { make: "Mercedes-Benz", model: "GLA 200", version: "", manufacturing_year: 2022, model_year: 2022, km: 19000, transmission: "Automático", color: "Branco", state: "SP", city: "Campinas", price: 265000, status: "active", views: 76, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Mercedes-Benz+GLA+200"] },
        { make: "Volkswagen", model: "Virtus", version: "GTS", manufacturing_year: 2022, model_year: 2023, km: 11000, transmission: "Automático", color: "Cinza", state: "RS", city: "Porto Alegre", price: 108000, status: "active", views: 22, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Volkswagen+Virtus"] },
        { make: "Fiat", model: "Pulse", version: "Impetus", manufacturing_year: 2022, model_year: 2023, km: 20000, transmission: "Automático", color: "Azul", state: "PR", city: "Londrina", price: 115000, status: "active", views: 35, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Fiat+Pulse"] },
        { make: "Hyundai", model: "Creta", version: "Ultimate", manufacturing_year: 2021, model_year: 2022, km: 33000, transmission: "Automático", color: "Prata", state: "PE", city: "Recife", price: 138000, status: "active", views: 47, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Hyundai+Creta"] },
        { make: "Chevrolet", model: "Tracker", version: "Premier", manufacturing_year: 2022, model_year: 2022, km: 16000, transmission: "Automático", color: "Vermelho", state: "MG", city: "Uberlândia", price: 132000, status: "active", views: 29, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Chevrolet+Tracker"] },
        { make: "Honda", model: "HR-V", version: "EXL", manufacturing_year: 2020, model_year: 2021, km: 51000, transmission: "Automático", color: "Branco", state: "RJ", city: "Niterói", price: 121000, status: "active", views: 41, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Honda+HR-V"] },
        { make: "Jeep", model: "Renegade", version: "Longitude", manufacturing_year: 2021, model_year: 2022, km: 38000, transmission: "Automático", color: "Verde", state: "SC", city: "Joinville", price: 109000, status: "active", views: 18, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Jeep+Renegade"] },
        { make: "Toyota", model: "Yaris", version: "XLS", manufacturing_year: 2022, model_year: 2023, km: 14000, transmission: "Automático", color: "Prata", state: "DF", city: "Brasília", price: 88000, status: "sold", views: 93, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Toyota+Yaris"] },
        { make: "Fiat", model: "Toro", version: "Freedom", manufacturing_year: 2021, model_year: 2022, km: 44000, transmission: "Automático", color: "Branco", state: "SP", city: "Ribeirão Preto", price: 148000, status: "active", views: 56, phone: "51981337696", photos: ["https://placehold.co/800x600?text=Foto+Fiat+Toro"] }
      ];
      await base44.entities.Vehicle.bulkCreate(testData);
    },
    onSuccess: () => {
      toast.success("20 veículos de teste inseridos com sucesso!");
      queryClient.invalidateQueries(['admin-vehicles']);
      window.location.href = createPageUrl('Home');
    }
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-gray-500">Apenas administradores podem acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-1">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-600 rounded-xl text-white">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Painel de Administração</h1>
          <p className="text-gray-500 mt-1">Gestão de anúncios e auditoria do sistema.</p>
        </div>
      </div>

      <Tabs defaultValue="vehicles" className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl">
          <TabsTrigger value="vehicles" className="rounded-lg gap-2">
            <Car className="h-4 w-4" /> Anúncios
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg gap-2">
            <History className="h-4 w-4" /> Log de Auditoria
          </TabsTrigger>
          <TabsTrigger value="verify" className="rounded-lg gap-2">
            <ShieldCheck className="h-4 w-4" /> Verificar CNPJ
          </TabsTrigger>
          <TabsTrigger value="subs" className="rounded-lg gap-2">
            <Users className="h-4 w-4" /> Assinaturas
          </TabsTrigger>
        </TabsList>

        {/* --- ABA DE ANÚNCIOS --- */}
        <TabsContent value="vehicles">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  Todos os Veículos <span className="text-sm font-normal text-gray-400">({allVehicles?.length})</span>
                </CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Filtrar por ID ou Marca..." 
                      className="pl-9 h-9 text-xs"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => populateMutation.mutate()} 
                    disabled={populateMutation.isPending}
                  >
                    {populateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Popular Dados de Teste
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Anunciante</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allVehicles?.filter(v => v.make.toLowerCase().includes(searchTerm.toLowerCase())).map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell className="font-medium">
                        <div>{vehicle.make} {vehicle.model}</div>
                        <div className="text-[10px] text-gray-400">ID: {vehicle.id.substring(0,8)}</div>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{vehicle.created_by}</TableCell>
                      <TableCell className="text-sm">R$ {vehicle.price?.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${vehicle.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {vehicle.status === 'active' ? 'Ativo' : 'Vendido'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => window.location.href = `${createPageUrl('EditVehicle')}?id=${vehicle.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteMutation.mutate(vehicle.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA DE VERIFICAÇÃO --- */}
        <TabsContent value="verify">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg">Verificar Concessionárias</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concessionária</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.company_name || u.full_name}</TableCell>
                      <TableCell className="text-sm">{u.cnpj || 'Não informado'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                      <TableCell>
                        {u.cnpj_verified ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Verificada</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-bold">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {u.cnpj_verified ? (
                          <Button variant="outline" size="sm" onClick={() => unverifyMutation.mutate(u.id)}>Remover</Button>
                        ) : (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => verifyMutation.mutate(u.id)}>Verificar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA DE ASSINATURAS --- */}
        <TabsContent value="subs">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg">Gerenciar Assinaturas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Plano Atual</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions?.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium text-sm">{sub.user_id}</TableCell>
                      <TableCell className="text-sm uppercase font-bold">{sub.plan}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {sub.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('pt-BR') : 'Indeterminado'}
                      </TableCell>
                      <TableCell className="space-x-2 flex items-center">
                        <select 
                          className="h-8 rounded border px-2 text-xs"
                          value={sub.plan}
                          onChange={(e) => updateSubMutation.mutate({ id: sub.id, plan: e.target.value })}
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        <select 
                          className="h-8 rounded border px-2 text-xs"
                          value={sub.status}
                          onChange={(e) => updateSubMutation.mutate({ id: sub.id, status: e.target.value })}
                        >
                          <option value="active">Ativo</option>
                          <option value="expired">Expirado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA DE LOGS --- */}
        <TabsContent value="logs">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg">Registro de Atividades</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ação</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Documento Afetado</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.action === 'INCLUSAO' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{log.user_id}</TableCell>
                      <TableCell className="text-xs text-indigo-600">ID: {log.affected_id}</TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(!auditLogs || auditLogs.length === 0) && (
                <div className="p-10 text-center text-gray-400 text-sm">Nenhuma atividade registrada no log.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}