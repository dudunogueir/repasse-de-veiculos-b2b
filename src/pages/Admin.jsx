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

  // 4. Mutação para Exclusão Administrativa
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-vehicles']);
      toast.success("Anúncio removido pelo administrador");
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
        </TabsList>

        {/* --- ABA DE ANÚNCIOS --- */}
        <TabsContent value="vehicles">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  Todos os Veículos <span className="text-sm font-normal text-gray-400">({allVehicles?.length})</span>
                </CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Filtrar por ID ou Marca..." 
                    className="pl-9 h-9 text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
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