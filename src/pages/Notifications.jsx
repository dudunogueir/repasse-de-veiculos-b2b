import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Bell, ChevronLeft, CheckCheck, Circle, Info, Loader2, Trash2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { toast } from "sonner";

export default function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Busca das notificações do utilizador logado
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const results = await base44.entities.Notification.filter({ recipient_id: user.id });
      // Ordena das mais recentes para as mais antigas
      return results.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));
    },
    enabled: !!user?.id
  });

  // 2. Mutação para marcar uma notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  // 3. Mutação para marcar TODAS como lidas
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

  // 4. Mutação para excluir uma notificação
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success("Notificação removida.");
    }
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar os seus alertas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      
      {/* HEADER NATIVO COM BLUR E AÇÃO RÁPIDA */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-16 bg-background/90 backdrop-blur-xl border-b border-border safe-pt">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full bg-card/50" onClick={() => window.history.back()}>
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Notificações</h1>
        </div>
        
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
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        {notifications?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold">Sem notificações</h3>
            <p className="text-muted-foreground text-sm mb-6 px-10">Não tem nenhum alerta novo no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications?.map((notification) => {
              const isUnread = !notification.read;
              const date = new Date(notification.created_at || notification.created_date);
              
              return (
                <div 
                  key={notification.id}
                  onClick={() => { if (isUnread) markAsReadMutation.mutate(notification.id); }}
                  className={`relative flex gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    isUnread 
                      ? 'bg-primary/5 border-primary/20 shadow-sm' 
                      : 'bg-card border-border hover:bg-muted/30'
                  }`}
                >
                  {/* Ícone Indicador */}
                  <div className="mt-1 shrink-0">
                    {isUnread ? (
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <Circle className="h-4 w-4 fill-primary text-primary" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Info className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo da Notificação */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start gap-2 mb-1">
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

                  {/* Ação de Eliminar (Oculta até interação ou sempre visível subtilmente) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 opacity-40 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 rounded-full transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notification.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}