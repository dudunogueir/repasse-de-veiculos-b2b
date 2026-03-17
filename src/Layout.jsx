import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { 
  Car, PlusCircle, Heart, MessageSquare, 
  Bell, LogOut, User, LayoutDashboard 
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
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id) {
        try {
          const notifs = await base44.entities.Notification.filter({ 
            recipient_id: user.id, 
            read: false 
          });
          setNotifications(notifs);
        } catch (e) {
          console.error("Error fetching notifications:", e);
        }
      }
    };
    fetchNotifications();
  }, [user, location.pathname]);

  const navItems = [
    { name: 'Buscar', icon: Car, path: 'Home' },
    { name: 'Anunciar', icon: PlusCircle, path: 'Advertise' },
    { name: 'Meus Ads', icon: LayoutDashboard, path: 'MyAds' },
    { name: 'Favoritos', icon: Heart, path: 'Favorites' },
    { name: 'Chat', icon: MessageSquare, path: 'Chat' },
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
              <Button variant="ghost" size="icon" className="relative text-muted-foreground" asChild>
                <Link to={createPageUrl('Notifications')}>
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
                  )}
                </Link>
              </Button>
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
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" /> Perfil
                    </Link>
                  </DropdownMenuItem>
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

      {/* Conteúdo Principal com Padding para a Tab Bar */}
      <main className="flex-1 max-w-7xl mx-auto px-4 w-full pt-4 pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom Tab Bar Nativa - Safe Area Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-t border-border safe-pb shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.path)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
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
    </div>
  );
}