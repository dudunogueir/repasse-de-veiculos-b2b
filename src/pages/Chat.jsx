import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Send, ChevronLeft, ShieldCheck, Loader2, MessageSquare, Building2 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const initialSeller = urlParams.get('seller');
  
  // Estado para controlar se estamos a ver a lista de conversas ou um chat específico
  const [activeContact, setActiveContact] = useState(initialSeller || null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // 1. Busca todas as mensagens do utilizador logado (Polling a cada 5 segundos para tempo real)
  const { data: messages, isLoading } = useQuery({
    queryKey: ['chat-messages'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allMsgs = await base44.entities.ChatMessage.list();
      return allMsgs
        .filter(m => m.sender_id === user.email || m.recipient_id === user.email)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    enabled: !!user?.email,
    refetchInterval: 5000 
  });

  // 2. Mutação para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      return base44.entities.ChatMessage.create({
        sender_id: user.email,
        recipient_id: activeContact,
        content,
        created_at: new Date().toISOString(),
        read: false
      });
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries(['chat-messages']);
      scrollToBottom();
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeContact) {
      scrollToBottom();
    }
  }, [messages, activeContact]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  // 3. Extrai a lista de contactos únicos das mensagens
  const contacts = React.useMemo(() => {
    if (!messages) return [];
    const uniqueContacts = new Set();
    messages.forEach(m => {
      if (m.sender_id !== user?.email) uniqueContacts.add(m.sender_id);
      if (m.recipient_id !== user?.email) uniqueContacts.add(m.recipient_id);
    });
    if (initialSeller) uniqueContacts.add(initialSeller);
    return Array.from(uniqueContacts);
  }, [messages, user, initialSeller]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">A carregar mensagens seguras...</p>
      </div>
    );
  }

  // --- VISTA 1: LISTA DE CONVERSAS ---
  if (!activeContact) {
    return (
      <div className="max-w-3xl mx-auto pb-24 px-4 pt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Negociações</h1>
          <p className="text-muted-foreground mt-2">As suas conversas B2B ativas.</p>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold">Nenhuma conversa</h3>
            <p className="text-muted-foreground text-sm mb-6 px-10">Procure veículos no estoque e inicie uma negociação.</p>
            <Button onClick={() => window.location.href = createPageUrl('Home')} className="rounded-xl">
              Explorar Estoque
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map(contact => {
              // Encontra a última mensagem com este contacto
              const lastMsg = messages.slice().reverse().find(m => m.sender_id === contact || m.recipient_id === contact);
              
              return (
                <button 
                  key={contact}
                  onClick={() => setActiveContact(contact)}
                  className="w-full flex items-center gap-4 p-4 bg-card hover:bg-muted/50 border border-border rounded-2xl transition-colors text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-foreground truncate">{contact}</h3>
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground tabular-nums ml-2 shrink-0">
                          {new Date(lastMsg.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMsg ? lastMsg.content : 'Iniciar negociação...'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- VISTA 2: CHAT ATIVO COM UM CONTACTO ---
  const activeMessages = messages?.filter(m => 
    (m.sender_id === user?.email && m.recipient_id === activeContact) ||
    (m.recipient_id === user?.email && m.sender_id === activeContact)
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      
      {/* HEADER DO CHAT (Fixo no topo com Safe Area) */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 h-16 bg-background/90 backdrop-blur-xl border-b border-border safe-pt">
        <Button variant="ghost" size="icon" className="rounded-full -ml-2" onClick={() => setActiveContact(null)}>
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </Button>
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-bold text-sm text-foreground truncate">{activeContact}</span>
            <span className="text-[10px] text-primary flex items-center font-medium">
              <ShieldCheck className="h-3 w-3 mr-1" /> Concessionária Verificada
            </span>
          </div>
        </div>
      </div>

      {/* ÁREA DE MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {activeMessages?.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 space-y-3">
            <ShieldCheck className="h-12 w-12" />
            <p className="text-sm font-medium text-center">
              Ambiente seguro B2B.<br/>Inicie a negociação com clareza.
            </p>
          </div>
        ) : (
          activeMessages?.map((msg) => {
            const isMe = msg.sender_id === user?.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
                    isMe 
                      ? 'bg-primary text-primary-foreground rounded-l-2xl rounded-tr-2xl rounded-br-sm' 
                      : 'bg-card text-foreground border border-border rounded-r-2xl rounded-tl-2xl rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT DO CHAT (Fixo no rodapé com Safe Area inferior para Teclado) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border p-3 safe-pb z-50">
        <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto">
          <Input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreva a sua proposta..." 
            className="flex-1 rounded-full h-12 bg-card border-input px-5 shadow-sm"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="h-12 w-12 rounded-full shrink-0 bg-primary hover:bg-primary/90 shadow-md"
          >
            {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </div>

    </div>
  );
}