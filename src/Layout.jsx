import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { 
  Search, PlusCircle, Car, BarChart3, FileText, Heart, MessageSquare, 
  Bell, LogOut, User, BellRing, Crown, ShieldCheck, CreditCard, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationsSheet from '@/components/NotificationsSheet';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Buscar', fullName: 'Buscar Veículos', icon: Search, path: 'Home' },
    { name: 'Cadastrar', fullName: 'Cadastrar Veículo', icon: PlusCircle, path: 'Advertise' },
    { name: 'Meus Ads', fullName: 'Meus Anúncios', icon: Car, path: 'MyAds' },
    { name: 'Dashboard', fullName: 'Meu Dashboard', icon: BarChart3, path: 'Dashboard' },
    { name: 'Propostas', fullName: 'Propostas', icon: FileText, path: 'Proposals' },
    { name: 'Favoritos', fullName: 'Favoritos', icon: Heart, path: 'Favorites' },
    { name: 'Mensagens', fullName: 'Mensagens', icon: MessageSquare, path: 'Chat' },
    { name: 'Notificações', fullName: 'Notificações', icon: Bell, path: 'Notifications' },
  ];

  const isActive = (path) => {
    return location.pathname.includes(path) || (location.pathname === '/' && path === 'Home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground transition-colors duration-300">
      
      {/* Header - Safe Area Top */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border safe-pt">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl">
              <Car className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight hidden sm:block">Repasse B2B</span>
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <NotificationsSheet />
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full gap-2 px-2 border border-border">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {user.full_name?.[0]}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-xl">
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Meu Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('AlertPreferences')} className="cursor-pointer">
                      <BellRing className="mr-2 h-4 w-4" /> Preferências de Alerta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Plans')} className="cursor-pointer">
                      <Crown className="mr-2 h-4 w-4" /> Planos e Assinatura
                    </Link>
                  </DropdownMenuItem>

                  {(user.role === 'admin' || user.role === 'Administrador') && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs font-bold text-primary uppercase tracking-wider">Admin</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Admin')} className="cursor-pointer">
                          <ShieldCheck className="mr-2 h-4 w-4" /> Verificar Concessionárias
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Admin')} className="cursor-pointer">
                          <CreditCard className="mr-2 h-4 w-4" /> Gerenciar Assinaturas
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Admin')} className="cursor-pointer">
                          <Database className="mr-2 h-4 w-4" /> Popular Dados de Teste
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" className="rounded-full" asChild>
                <Link to={createPageUrl('Login')}>Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar */}
        {user && (
          <aside className="hidden md:flex flex-col w-64 border-r border-border py-6 pr-6 gap-2 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active 
                      ? 'bg-primary text-primary-foreground font-semibold shadow-md' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.fullName}</span>
                </Link>
              );
            })}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 w-full p-4 pb-24 md:pb-8 md:pl-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Bottom Tab Bar Nativa - Safe Area Bottom */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border safe-pb shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center h-16 overflow-x-auto scrollbar-hide px-2 gap-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className={`flex flex-col items-center justify-center min-w-[72px] h-full space-y-1 transition-all flex-shrink-0 ${
                    active ? 'text-primary' : 'text-muted-foreground opacity-70'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${active ? 'fill-primary/10' : ''}`} strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[10px] font-bold tracking-wide uppercase">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}