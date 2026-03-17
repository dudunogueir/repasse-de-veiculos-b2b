import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, CheckCheck, Circle, Info, Loader2, Trash2, Car, DollarSign, CheckCircle2, XCircle, RefreshCw, MessageCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function NotificationsSheet({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const results = await base44.entities.Notification.filter({ recipient_id: user.id });
      return results.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));
    },
    enabled: !!user?.id
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications?.filter(n => !n.read) || [];
      const promises = unreadNotifs.map(n => 
        base44.entities.Notification.update(n.id, { read: true })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success("Todas as notificações foram marcadas como lidas.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success("Notificação removida.");
    }
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getIcon = (message) => {
    if (message.includes('Novo veículo')) return <Car className="h-5 w-5 text-blue-500" />;
    if (message.includes('Nova proposta')) return <DollarSign className="h-5 w-5 text-green-500" />;
    if (message.includes('aceita')) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (message.includes('recusada')) return <XCircle className="h-5 w-5 text-red-500" />;
    if (message.includes('contra-proposta')) return <RefreshCw className="h-5 w-5 text-blue-500" />;
    if (message.includes('mensagem')) return <MessageCircle className="h-5 w-5 text-indigo-500" />;
    return <Info className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-lg font-bold">Notificações</SheetTitle>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs font-bold text-primary hover:bg-primary/10 rounded-full"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-1.5" />}
              Ler Todas
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : notifications?.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold">Sem notificações</h3>
              <p className="text-muted-foreground text-sm">Não tem nenhum alerta novo no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications?.map((notification) => {
                const isUnread = !notification.read;
                const date = new Date(notification.created_at || notification.created_date);
                
                return (
                  <div 
                    key={notification.id}
                    onClick={() => { 
                      if (isUnread) markAsReadMutation.mutate(notification.id); 
                      if (notification.link) window.location.href = notification.link;
                    }}
                    className={`relative flex gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isUnread 
                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                        : 'bg-card border-border hover:bg-muted/30'
                    }`}
                  >
                    <div className="mt-1 shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isUnread ? 'bg-primary/10' : 'bg-muted'}`}>
                        {getIcon(notification.message)}
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden pr-6">
                      <div className="flex justify-between items-start gap-2 mb-0.5">
                        <h4 className={`font-bold text-sm truncate ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title || 'Alerta B2B'}
                        </h4>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap tabular-nums">
                          {date.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${isUnread ? 'text-foreground/90 font-medium' : 'text-muted-foreground'}`}>
                        {notification.message}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 hover:opacity-100 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 rounded-full transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    {isUnread && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}