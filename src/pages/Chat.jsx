import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Send, MessageSquare, Search, ChevronLeft, Loader2, Car
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [activeThread, setActiveThread] = useState(null);
  const messagesEndRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  
  const { register, handleSubmit, reset } = useForm();

  // 1. Busca de Mensagens e Agrupamento em Conversas (Threads)
  const { data: threads, isLoading } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const allMessages = await base44.entities.ChatMessage.list(null, 500); 
      // Filtra mensagens onde o usuário é remetente ou destinatário
      const myMessages = allMessages.filter(m => 
        m.created_by === currentUser.email || m.recipient_id === currentUser.email
      );

      const threadsMap = {};
      
      for (const msg of myMessages) {
        const isSender = msg.created_by === currentUser.email;
        const partnerId = isSender ? msg.recipient_id : msg.created_by;
        const threadId = `${msg.vehicle_id}_${partnerId}`;
        
        if (!threadsMap[threadId]) {
          threadsMap[threadId] = {
            id: threadId,
            vehicleId: msg.vehicle_id,
            partnerId: partnerId,
            messages: [],
            unreadCount: 0
          };
        }
        threadsMap[threadId].messages.push(msg);
        if (!isSender && !msg.read) threadsMap[threadId].unreadCount++;
      }

      return Object.values(threadsMap).map(t => {
        t.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        t.lastMessage = t.messages[t.messages.length - 1];
        return t;
      }).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
    },
    refetchInterval: 5000,
    enabled: !!currentUser
  });

  // 2. Detalhes do Veículo e Parceiro da Conversa Ativa
  const { data: threadDetails } = useQuery({
    queryKey: ['thread-details', activeThread?.id],
    queryFn: async () => {
      if (!activeThread) return null;
      const [vehicle, users] = await Promise.all([
        base44.entities.Vehicle.get(activeThread.vehicleId).catch(() => null),
        base44.entities.User.list()
      ]);
      const partner = users.find(u => u.email === activeThread.partnerId) || { full_name: activeThread.partnerId };
      return { vehicle, partner };
    },
    enabled: !!activeThread
  });

  // 3. Efeito para abrir chat via URL (vindo de Notificações ou Detalhes)
  useEffect(() => {
    if (threads && urlParams.get('vehicle_id')) {
      const vId = urlParams.get('vehicle_id');
      const rId = urlParams.get('recipient_id');
      const found = threads.find(t => t.vehicleId === vId && t.partnerId === rId);
      if (found) setActiveThread(found);
    }
  }, [threads]);

  // 4. Auto-scroll para o fundo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages, threads]);

  // 5. Mutação para Enviar Mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ChatMessage.create({
        vehicle_id: activeThread.vehicleId,
        recipient_id: activeThread.partnerId,
        content: data.content,
        read: false
      });
      
      // Notificação para o parceiro [cite: 133, 134]
      await base44.entities.Notification.create({
        recipient_id: activeThread.partnerId,
        type: 'CHAT',
        message: `Nova mensagem sobre o ${threadDetails?.vehicle?.model || 'veículo'}`,
        related_id: activeThread.vehicleId
      });
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries(['chat-threads']);
    }
  });

  const onSubmit = (data) => {
    if (!data.content.trim()) return;
    sendMessageMutation.mutate(data);
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex max-w-7xl mx-auto my-2 md:my-4">
      
      {/* Sidebar de Conversas */}
      <div className={cn("w-full md:w-80 border-r border-gray-200 flex flex-col", activeThread ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="font-bold text-lg text-indigo-950 mb-3">Negociações</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar concessionária..." className="pl-9 bg-white rounded-full h-9" />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" /></div>
          ) : threads?.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma conversa ativa</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {threads?.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={cn(
                    "p-4 border-b border-gray-50 text-left hover:bg-gray-50 transition-all flex gap-3 items-center",
                    activeThread?.id === thread.id && "bg-indigo-50/50"
                  )}
                >
                  <Avatar className="h-12 w-12 border border-gray-100 shadow-sm">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                      {thread.partnerId[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-sm text-gray-900 truncate">
                        {thread.partnerId.split('@')[0]}
                      </span>
                      {thread.lastMessage && (
                        <span className="text-[10px] text-gray-400">
                          {formatDistanceToNow(new Date(thread.lastMessage.created_date), { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-600 font-semibold truncate">Anúncio #{thread.vehicleId.substring(0, 6)}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{thread.lastMessage?.content || "Inicie o chat..."}</p>
                  </div>
                  {thread.unreadCount > 0 && <span className="h-2.5 w-2.5 bg-red-500 rounded-full" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Janela de Mensagens */}
      <div className={cn("flex-1 flex flex-col bg-white", !activeThread ? "hidden md:flex" : "flex")}>
        {activeThread ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 safe-pt">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveThread(null)}>
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-indigo-600 text-white font-bold">
                    {activeThread.partnerId[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">
                    {threadDetails?.partner?.company_name || threadDetails?.partner?.full_name || activeThread.partnerId}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                    <Car className="h-3 w-3" />
                    {threadDetails?.vehicle ? `${threadDetails.vehicle.make} ${threadDetails.vehicle.model}` : 'Carregando veículo...'}
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 bg-slate-50/50">
              <div className="space-y-4">
                {activeThread.messages?.map((msg, idx) => {
                  const isMe = msg.created_by === currentUser.email;
                  return (
                    <div key={idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                        isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                      )}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <span className={cn("text-[9px] block mt-1 text-right opacity-70", isMe ? "text-white" : "text-gray-400")}>
                          {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t border-gray-100 safe-pb">
              <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2 items-center">
                <Input 
                  placeholder="Escreva uma proposta..." 
                  className="flex-1 bg-gray-50 border-none rounded-full focus-visible:ring-indigo-600 h-11 px-5"
                  autoComplete="off"
                  {...register('content', { required: true })}
                />
                <Button type="submit" size="icon" disabled={sendMessageMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 rounded-full h-11 w-11 shrink-0">
                  {sendMessageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
               <MessageSquare className="h-10 w-10 text-indigo-100" />
            </div>
            <p className="text-sm font-medium">Selecione uma negociação para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}