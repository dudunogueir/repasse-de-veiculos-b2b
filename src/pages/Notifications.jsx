import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Heart, CheckCircle2, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PullToRefresh from '@/components/shared/PullToRefresh';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  // 1. Buscar Notificações
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const results = await base44.entities.Notification.filter({ recipient_id: user.id });
      return results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  });

  // 2. Marcar como Lida
  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications-page']);
      // Também invalida o layout para atualizar o sino
      queryClient.invalidateQueries(['notifications']); 
    }
  });

  // 3. Excluir Notificação
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications-page']);
      toast.success("Notificação removida");
    }
  });

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markAsReadMutation.mutateAsync(notif.id);
    }
    
    // Redirecionamento baseado no tipo 
    if (notif.type === 'CHAT') {
      window.location.href = `${createPageUrl('Chat')}?id=${notif.related_id}`;
    } else if (notif.type === 'FAVORITE') {
      window.location.href = `${createPageUrl('MyAds')}`;
    }
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-3xl mx-auto pb-24 px-1">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Notificações</h1>
            <p className="text-gray-500 mt-1">Fique por dentro das atividades do seu repasse.</p>
          </div>
          {notifications?.some(n => !n.read) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 text-xs font-bold"
              onClick={() => notifications.filter(n => !n.read).forEach(n => markAsReadMutation.mutate(n.id))}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Bell className="h-12 w-12 mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Tudo limpo por aqui</h3>
            <p className="text-gray-500">Avisaremos quando houver novidades nos seus anúncios.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card 
                key={notif.id} 
                className={`p-4 transition-all border-l-4 ${notif.read ? 'border-l-transparent bg-white/50' : 'border-l-indigo-600 bg-white shadow-sm'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${notif.type === 'CHAT' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                    {notif.type === 'CHAT' ? <MessageSquare className="h-5 w-5" /> : <Heart className="h-5 w-5" />}
                  </div>
                  
                  <div className="flex-1 cursor-pointer" onClick={() => handleNotificationClick(notif)}>
                    <p className={`text-sm ${notif.read ? 'text-gray-600' : 'font-bold text-gray-900'}`}>
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 uppercase font-bold mt-1 block">
                      {new Date(notif.created_date).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    {!notif.read && (
                      <Button variant="ghost" size="icon" onClick={() => markAsReadMutation.mutate(notif.id)} title="Lida">
                        <CheckCircle2 className="h-4 w-4 text-gray-400 hover:text-green-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(notif.id)}>
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}