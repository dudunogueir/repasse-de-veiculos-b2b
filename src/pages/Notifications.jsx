import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bell className="h-16 w-16 text-muted-foreground mb-4" />
      <h1 className="text-2xl font-bold">Notificações</h1>
      <p className="text-muted-foreground mt-2">Em breve: Central completa de notificações.</p>
      <p className="text-sm text-muted-foreground mt-4">Por enquanto, use o ícone de sino no topo da tela.</p>
    </div>
  );
}