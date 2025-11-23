import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { 
  Send, MessageSquare, User, Clock, Search, ChevronLeft 
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeThread, setActiveThread] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  
  const { register, handleSubmit, reset } = useForm();

  // Init
  useEffect(() => {
    base44.auth.me().then(setUser => setCurrentUser(setUser)).catch(() => {});
  }, []);

  // Fetch All Messages to build threads
  // Poll every 5 seconds
  const { data: threads, isLoading } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: async () => {
      if (!currentUser) return [];
      
      // Fetch all messages related to me (sent or received)
      // Mock limitation: fetch all and filter in client. 
      // Assuming volume is low for MVP.
      const allMessages = await base44.entities.ChatMessage.list(null, 500); 
      const myMessages = allMessages.filter(m => 
        m.created_by === currentUser.email || m.recipient_id === currentUser.email || m.recipient_id === currentUser.id
      );

      // Group by vehicle + partner
      const threadsMap = {};
      
      for (const msg of myMessages) {
        const isSender = msg.created_by === currentUser.email;
        const partnerId = isSender ? msg.recipient_id : msg.created_by;
        const threadId = `${msg.vehicle_id}_${partnerId}`;
        
        if (!threadsMap[threadId]) {
          // We need vehicle info and partner info
          // We'll fetch them later or lazy load. For now store IDs.
          threadsMap[threadId] = {
            id: threadId,
            vehicleId: msg.vehicle_id,
            partnerId: partnerId,
            messages: [],
            lastMessage: null,
            unreadCount: 0
          };
        }
        
        threadsMap[threadId].messages.push(msg);
        if (!isSender && !msg.read) {
            threadsMap[threadId].unreadCount++;
        }
      }

      // Process threads
      const result = Object.values(threadsMap).map(t => {
        t.messages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        t.lastMessage = t.messages[t.messages.length - 1];
        return t;
      }).sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));

      return result;
    },
    refetchInterval: 5000,
    enabled: !!currentUser
  });

  // Handle URL params to open specific chat
  useEffect(() => {
    if (threads && urlParams.get('vehicle_id')) {
        const vId = urlParams.get('vehicle_id');
        const rId = urlParams.get('recipient_id');
        const found = threads.find(t => t.vehicleId === vId && t.partnerId === rId);
        if (found) {
            setActiveThread(found);
        } else if (vId && rId) {
            // Create temp thread object if not exists
            setActiveThread({
                id: `${vId}_${rId}`,
                vehicleId: vId,
                partnerId: rId,
                messages: [],
                isNew: true
            });
        }
    }
  }, [threads, urlParams.toString()]);

  // Fetch Active Thread Details (Vehicle Name, Partner Name)
  const { data: threadDetails } = useQuery({
    queryKey: ['thread-details', activeThread?.id],
    queryFn: async () => {
      if (!activeThread) return null;
      const [vehicle, users] = await Promise.all([
        base44.entities.Vehicle.get(activeThread.vehicleId).catch(() => null),
        base44.entities.User.list()
      ]);
      const partner = users.find(u => u.email === activeThread.partnerId || u.id === activeThread.partnerId) || { full_name: activeThread.partnerId, email: activeThread.partnerId };
      return { vehicle, partner };
    },
    enabled: !!activeThread
  });

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages, threads]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ChatMessage.create({
        vehicle_id: activeThread.vehicleId,
        recipient_id: activeThread.partnerId,
        content: data.content,
        read: false
      });
      
      // Create notification
      await base44.entities.Notification.create({
        recipient_id: activeThread.partnerId,
        type: 'chat',
        message: `Nova mensagem sobre ${threadDetails?.vehicle?.model || 'veículo'}`,
        link: `Chat?vehicle_id=${activeThread.vehicleId}&recipient_id=${currentUser.email}` // circular link
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
    <div className="h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex max-w-7xl mx-auto my-4">
      {/* Sidebar List */}
      <div className={cn("w-full md:w-80 border-r border-gray-200 flex flex-col", activeThread ? "hidden md:flex" : "flex")}>
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="font-bold text-lg text-gray-800 mb-4">Mensagens</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar conversas..." className="pl-9 bg-white" />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
          ) : threads?.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
               <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
               Nenhuma conversa iniciada
            </div>
          ) : (
            <div className="flex flex-col">
              {threads?.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={cn(
                    "p-4 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors flex gap-3 items-start",
                    activeThread?.id === thread.id && "bg-indigo-50 border-indigo-100"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700">
                        {thread.partnerId[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="font-medium text-sm text-gray-900 truncate">
                            {thread.partnerId.split('@')[0]}
                        </span>
                        {thread.lastMessage && (
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(thread.lastMessage.created_date), { locale: ptBR, addSuffix: false })}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-indigo-600 font-medium truncate mb-1">
                         Veículo ID: {thread.vehicleId.substring(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                        {thread.lastMessage?.content || "Inicie a conversa..."}
                    </p>
                  </div>
                  {thread.unreadCount > 0 && (
                      <span className="h-2 w-2 bg-red-500 rounded-full mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className={cn("flex-1 flex flex-col bg-white", !activeThread ? "hidden md:flex" : "flex")}>
        {activeThread ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setActiveThread(null)}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700">
                      {threadDetails?.partner?.full_name?.[0] || activeThread.partnerId[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-gray-900">
                      {threadDetails?.partner?.company_name || threadDetails?.partner?.full_name || activeThread.partnerId}
                  </h3>
                  <p className="text-xs text-gray-500">
                      Negociando: {threadDetails?.vehicle ? `${threadDetails.vehicle.make} ${threadDetails.vehicle.model}` : 'Veículo'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = createPageUrl('VehicleDetails') + `?id=${activeThread.vehicleId}`}>
                  Ver Veículo
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50/30">
              <div className="space-y-4">
                {activeThread.messages?.map((msg, idx) => {
                  const isMe = msg.created_by === currentUser.email;
                  return (
                    <div key={idx} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                       <div className={cn(
                         "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                         isMe ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                       )}>
                         <p>{msg.content}</p>
                         <span className={cn(
                             "text-[10px] block mt-1 text-right",
                             isMe ? "text-indigo-200" : "text-gray-400"
                         )}>
                             {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
               <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
                  <Input 
                    placeholder="Digite sua mensagem..." 
                    className="flex-1 bg-gray-50 border-gray-200 focus-visible:ring-indigo-500"
                    autoComplete="off"
                    {...register('content', { required: true })}
                  />
                  <Button type="submit" size="icon" disabled={sendMessageMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                      <Send className="h-4 w-4" />
                  </Button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
            <MessageSquare className="h-16 w-16 mb-4 text-gray-200" />
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}