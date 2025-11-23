import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../components/shared/utils';
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  // Check Admin Access
  React.useEffect(() => {
      base44.auth.me().then(u => {
          if (u.role !== 'admin') {
              window.location.href = createPageUrl('Home');
          }
          setCurrentUser(u);
      }).catch(() => window.location.href = createPageUrl('Home'));
  }, []);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['admin-all-vehicles'],
    queryFn: () => base44.entities.Vehicle.list(), // List all
    enabled: !!currentUser
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vehicle.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-all-vehicles']);
      toast.success("Veículo excluído (Admin)");
    }
  });

  if (isLoading || !currentUser) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-500 mt-2">Gerenciamento total de anúncios da plataforma.</p>
        </div>
        <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-medium text-sm">
            {vehicles?.length || 0} Veículos Cadastrados
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Anunciante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {vehicles?.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                {vehicle.photos?.[0] && (
                                    <img src={vehicle.photos[0]} className="w-10 h-10 rounded object-cover bg-gray-100" alt="" />
                                )}
                                <div>
                                    <div className="font-medium text-gray-900">{vehicle.make} {vehicle.model}</div>
                                    <div className="text-xs text-gray-500">{vehicle.version}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{formatCurrency(vehicle.price)}</TableCell>
                        <TableCell className="text-xs text-gray-500 max-w-[150px] truncate" title={vehicle.created_by}>
                            {vehicle.created_by}
                        </TableCell>
                        <TableCell>
                            <Badge variant={vehicle.status === 'active' ? 'outline' : 'secondary'} className={vehicle.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                {vehicle.status === 'active' ? 'Ativo' : 'Vendido'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                            {formatDate(vehicle.created_date)}
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" asChild>
                                    <Link to={`${createPageUrl('EditVehicle')}?id=${vehicle.id}`}>
                                        <Pencil className="h-4 w-4 text-gray-500" />
                                    </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                                            <AlertDialogDescription>Ação de administrador: Esta exclusão é permanente.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate(vehicle.id)} className="bg-red-600">
                                                Excluir
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}