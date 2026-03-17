import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MessageCircle, CheckCircle, XCircle, RefreshCw, Car } from 'lucide-react';
import { toast } from "sonner";
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProposalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);

  const { data: proposalsReceived, isLoading: loadingReceived } = useQuery({
    queryKey: ['proposals-received'],
    queryFn: () => base44.entities.Proposal.filter({ seller_id: user.email }),
    enabled: !!user
  });

  const { data: proposalsSent, isLoading: loadingSent } = useQuery({
    queryKey: ['proposals-sent'],
    queryFn: () => base44.entities.Proposal.filter({ buyer_id: user.email }),
    enabled: !!user
  });

  // Fetch vehicles for the proposals
  const vehicleIds = [...new Set([...(proposalsReceived || []), ...(proposalsSent || [])].map(p => p.vehicle_id))];
  
  const { data: vehicles } = useQuery({
    queryKey: ['proposals-vehicles', vehicleIds],
    queryFn: async () => {
      const v = await Promise.all(vehicleIds.map(id => base44.entities.Vehicle.read(id).catch(() => null)));
      return v.filter(Boolean).reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
    },
    enabled: vehicleIds.length > 0
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, counter_price, counter_message, buyer_id }) => {
      await base44.entities.Proposal.update(id, { status, counter_price, counter_message });
      
      // Create notification for the buyer
      let msg = '';
      if (status === 'accepted') msg = `Sua proposta foi aceita! ✅`;
      if (status === 'rejected') msg = `Sua proposta foi recusada. ❌`;
      if (status === 'countered') msg = `Você recebeu uma contra-proposta. 🔄`;

      const users = await base44.entities.User.filter({ email: buyer_id });
      if (users.length > 0) {
        await base44.entities.Notification.create({
          recipient_id: users[0].id,
          type: 'system',
          message: msg,
          link: `/Proposals`,
          read: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['proposals-received']);
      queryClient.invalidateQueries(['proposals-sent']);
      toast.success("Proposta atualizada!");
      setSelectedProposal(null);
    }
  });

  const handleCounter = (e) => {
    e.preventDefault();
    if (!counterPrice) return;
    updateStatusMutation.mutate({
      id: selectedProposal.id,
      status: 'countered',
      counter_price: parseFloat(counterPrice),
      counter_message: counterMessage,
      buyer_id: selectedProposal.buyer_id
    });
  };

  const formatPrice = (p) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p || 0);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold">Pendente 🟡</span>;
      case 'accepted': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold">Aceita 🟢</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Recusada 🔴</span>;
      case 'countered': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">Contra-proposta 🔵</span>;
      default: return null;
    }
  };

  if (loadingReceived || loadingSent) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 px-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Minhas Propostas</h1>
        <p className="text-muted-foreground mt-2">Gerencie suas negociações em andamento.</p>
      </div>

      <Tabs defaultValue="received" className="space-y-6">
        <TabsList className="bg-white border p-1 rounded-xl w-full grid grid-cols-2">
          <TabsTrigger value="received" className="rounded-lg">Recebidas ({proposalsReceived?.length || 0})</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-lg">Enviadas ({proposalsSent?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {proposalsReceived?.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-dashed">
              <p className="text-muted-foreground">Nenhuma proposta recebida.</p>
            </div>
          ) : (
            proposalsReceived?.map(p => {
              const v = vehicles?.[p.vehicle_id];
              return (
                <Card key={p.id} className="rounded-2xl shadow-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{v ? `${v.make} ${v.model}` : 'Veículo Indisponível'}</h3>
                        <p className="text-xs text-muted-foreground">Comprador: {p.buyer_id}</p>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-xl mb-4">
                      <p className="text-sm font-bold text-primary">Proposta: {formatPrice(p.proposed_price)}</p>
                      {p.message && <p className="text-xs text-muted-foreground mt-1">"{p.message}"</p>}
                      {p.status === 'countered' && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-sm font-bold text-blue-600">Sua Contra-proposta: {formatPrice(p.counter_price)}</p>
                          {p.counter_message && <p className="text-xs text-muted-foreground mt-1">"{p.counter_message}"</p>}
                        </div>
                      )}
                    </div>

                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'accepted', buyer_id: p.buyer_id })}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Aceitar
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'rejected', buyer_id: p.buyer_id })}>
                          <XCircle className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedProposal(p)}>
                              <RefreshCw className="h-4 w-4 mr-1" /> Contra
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Fazer Contra-proposta</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCounter} className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase">Novo Valor (R$)</label>
                                <Input type="number" required value={counterPrice} onChange={e => setCounterPrice(e.target.value)} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase">Mensagem (Opcional)</label>
                                <Input value={counterMessage} onChange={e => setCounterMessage(e.target.value)} />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button type="button" variant="ghost">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={updateStatusMutation.isPending}>Enviar</Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    
                    {p.status === 'accepted' && (
                      <Button className="w-full mt-2" onClick={() => window.location.href = `${createPageUrl('Chat')}?seller=${p.buyer_id}&vehicle=${p.vehicle_id}`}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Iniciar conversa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {proposalsSent?.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-dashed">
              <p className="text-muted-foreground">Nenhuma proposta enviada.</p>
            </div>
          ) : (
            proposalsSent?.map(p => {
              const v = vehicles?.[p.vehicle_id];
              return (
                <Card key={p.id} className="rounded-2xl shadow-sm border-border">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{v ? `${v.make} ${v.model}` : 'Veículo Indisponível'}</h3>
                        <p className="text-xs text-muted-foreground">Vendedor: {p.seller_id}</p>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-xl mb-4">
                      <p className="text-sm font-bold text-primary">Sua Proposta: {formatPrice(p.proposed_price)}</p>
                      {p.message && <p className="text-xs text-muted-foreground mt-1">"{p.message}"</p>}
                      
                      {p.status === 'countered' && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-sm font-bold text-blue-600">Contra-proposta do Vendedor: {formatPrice(p.counter_price)}</p>
                          {p.counter_message && <p className="text-xs text-muted-foreground mt-1">"{p.counter_message}"</p>}
                        </div>
                      )}
                    </div>

                    {p.status === 'countered' && (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'accepted', buyer_id: p.buyer_id })}>
                          Aceitar
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1" onClick={() => updateStatusMutation.mutate({ id: p.id, status: 'rejected', buyer_id: p.buyer_id })}>
                          Recusar
                        </Button>
                      </div>
                    )}

                    {p.status === 'accepted' && (
                      <Button className="w-full mt-2" onClick={() => window.location.href = `${createPageUrl('Chat')}?seller=${p.seller_id}&vehicle=${p.vehicle_id}`}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Iniciar conversa
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}