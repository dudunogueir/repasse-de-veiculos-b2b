// src/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { 
  Car, 
  PlusCircle, 
  Heart, 
  MessageSquare, 
  Bell, 
  LogOut, 
  User,
  LayoutDashboard
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

export default function Layout({ children }) {
  const { user, logout, navigateToLogin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user && user.id) {
        try {
          const notifs = await base44.entities.Notification.filter({ 
            recipient_id: user.id, 
            read: false 
          });
          setNotifications(notifs);
        } catch (e) {
          console.error("Error fetching notifications:", e);
        }
      } else {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { name: 'Buscar', icon: Car, path: 'Home' },
    { name: 'Anunciar', icon: PlusCircle, path: 'Advertise' },
    { name: 'Meus Ads', icon: LayoutDashboard, path: 'MyAds' },
    { name: 'Favoritos', icon: Heart, path: 'Favorites' },
    { name: 'Mensagens', icon: MessageSquare, path: 'Chat' },
  ];

  const isActive = (path) => {
    return location.pathname.includes(path) || (location.pathname === '/' && path === 'Home');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-slate-900 notranslate" translate="no">
      
      {/* --- HEADER (Desktop & Mobile) --- */}
      {/* safe-pt evita que o header fique sob o Notch do iPhone */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm safe-pt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            <div className="flex items-center">
              <Link to={createPageUrl('Home')} className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-indigo-950 text-white p-2 rounded-lg">
                  <Car className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-indigo-950 tracking-tight hidden sm:block">
                  Repasse<span className="text-indigo-600">B2B</span>
                </span>
              </Link>
              
              {/* Desktop Nav */}
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.path)}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
                      isActive(item.path)
                        ? 'border-indigo-600 text-indigo-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-indigo-600">
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">Sem notificações</div>
                    ) : (
                      notifications.map((notif) => (
                        <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3">
                          <span className="font-medium text-sm">{notif.message}</span>
                          <span className="text-xs text-gray-400 mt-1">{new Date(notif.created_date).toLocaleDateString()}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-2 sm:pr-4 rounded-full border border-gray-200">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                        {user.full_name?.[0] || <User className="h-4 w-4" />}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[100px]">
                        {user.company_name || user.full_name || 'Perfil'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuItem className="text-xs text-gray-500">{user.email}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="w-full flex items-center">
                        <User className="mr-2 h-4 w-4" /> Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={navigateToLogin} className="bg-indigo-950 text-white h-9">
                  Entrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      {/* pb-24 no mobile para compensar a Tab Bar fixa */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full pb-24 md:pb-8">
        {children}
      </main>

      {/* --- NATIVE BOTTOM TAB BAR (Mobile Only) --- */}
      {/* safe-pb evita que os ícones fiquem sob a barra de gestos do iPhone */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-pb shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.08)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  active ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <item.icon className={`h-6 w-6 ${active ? 'fill-indigo-50' : ''}`} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}