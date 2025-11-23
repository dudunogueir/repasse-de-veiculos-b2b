import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { 
  Car, 
  PlusCircle, 
  Heart, 
  MessageSquare, 
  Bell, 
  Menu, 
  X, 
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
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Fetch unread notifications
        const notifs = await base44.entities.Notification.filter({ 
          recipient_id: currentUser.id, 
          read: false 
        });
        setNotifications(notifs);
      } catch (e) {
        // Not logged in
      }
    };
    fetchUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const navItems = [
    { name: 'Buscar Veículos', icon: Car, path: 'Home' },
    { name: 'Anunciar', icon: PlusCircle, path: 'Advertise' },
    { name: 'Meus Anúncios', icon: LayoutDashboard, path: 'MyAds' },
    { name: 'Favoritos', icon: Heart, path: 'Favorites' },
    { name: 'Mensagens', icon: MessageSquare, path: 'Chat' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            {/* Logo & Desktop Nav */}
            <div className="flex items-center">
              <Link to={createPageUrl('Home')} className="flex-shrink-0 flex items-center gap-2">
                <div className="bg-indigo-950 text-white p-2 rounded-lg">
                  <Car className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold text-indigo-950 tracking-tight">Repasse<span className="text-indigo-600">B2B</span></span>
              </Link>
              
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={createPageUrl(item.path)}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors ${
                      location.pathname.includes(item.path) || (location.pathname === '/' && item.path === 'Home')
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

            {/* Right Side Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
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
                    <div className="p-4 text-center text-sm text-gray-500">Nenhuma nova notificação</div>
                  ) : (
                    notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3 cursor-pointer">
                        <span className="font-medium text-sm">{notif.message}</span>
                        <span className="text-xs text-gray-400 mt-1">{new Date(notif.created_date).toLocaleDateString()}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-4 rounded-full border border-gray-200 hover:bg-gray-50">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                        {user.full_name?.[0] || <User className="h-4 w-4" />}
                      </div>
                      <span className="hidden sm:block text-sm font-medium text-gray-700 truncate max-w-[100px]">
                        {user.company_name || user.full_name || 'Concessionária'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuItem className="text-xs text-gray-500">{user.email}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={createPageUrl('Profile')} className="cursor-pointer w-full flex items-center">
                        <User className="mr-2 h-4 w-4" /> Perfil
                      </Link>
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to={createPageUrl('Admin')} className="cursor-pointer w-full flex items-center">
                          <LayoutDashboard className="mr-2 h-4 w-4" /> Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => base44.auth.redirectToLogin()} className="bg-indigo-950 hover:bg-indigo-900 text-white">
                  Entrar
                </Button>
              )}

              {/* Mobile Menu */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="flex flex-col gap-4 mt-8">
                      {navItems.map((item) => (
                        <Link
                          key={item.name}
                          to={createPageUrl(item.path)}
                          className="flex items-center px-4 py-2 text-lg font-medium text-gray-900 hover:bg-gray-100 rounded-md"
                        >
                          <item.icon className="h-5 w-5 mr-3 text-indigo-600" />
                          {item.name}
                        </Link>
                      ))}
                      {user && (
                        <Button onClick={handleLogout} variant="ghost" className="justify-start px-4 text-red-600 hover:bg-red-50 hover:text-red-700">
                          <LogOut className="h-5 w-5 mr-3" />
                          Sair
                        </Button>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}