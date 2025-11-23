import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Calendar, Gauge, DollarSign, MessageSquare, 
  Phone, FileText, User, Share2, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatKM, formatDate } from '../components/shared/utils';
import { createPageUrl } from '@/utils';
import { toast } from "sonner";

export default function VehicleDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleId = urlParams.get('id');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch Vehicle
  const { data: vehicle, isLoading, refetch } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const v = await base44.entities.Vehicle.get(vehicleId);
      
      // Increment views
      try {
         // Only increment if not owner ideally, but for simplicity we just increment
         // We use a separate fire-and-forget update to not block UI
         base44.entities.Vehicle.update(vehicleId, { views: (v.views || 0) + 1 });
      } catch (e) { console.error("View increment failed", e); }
      
      return v;
    },
    enabled: !!vehicleId
  });

  // Fetch Seller Info
  const { data: seller } = useQuery({
    queryKey: ['seller', vehicle?.created_by],
    queryFn: async () => {
      if (!vehicle?.created_by) return null;
      // Since we can't easily filter users by email in this mock without list(), we list and find.
      // In prod, we'd have a better way.
      const users = await base44.entities.User.list();
      return users.find(u => u.email === vehicle.created_by) || { 
        company_name: 'Vendedor', 
        email: vehicle.created_by 
      };
    },
    enabled: !!vehicle
  });

  const startChat = async () => {
    if (!vehicle || !seller) return;
    const currentUser = await base44.auth.me().catch(() => null);
    if (!currentUser) {
        base44.auth.redirectToLogin();
        return;
    }
    
    // Check if chat exists or just navigate
    // We'll just navigate to Chat page with params to open the thread
    window.location.href = `${createPageUrl('Chat')}?vehicle_id=${vehicle.id}&recipient_id=${seller.id || seller.email}`; // fallback to email if id missing in mock
  };

  if (isLoading || !vehicle) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Breadcrumb / Back */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="pl-0 hover:pl-2 transition-all">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Gallery & Description */}
        <div className="lg:col-span-2 space-y-8">
          {/* Gallery */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <div className="relative aspect-video bg-gray-100">
               {vehicle.photos && vehicle.photos.length > 0 ? (
                 <img 
                   src={vehicle.photos[activeImageIndex]} 
                   alt={`${vehicle.make} ${vehicle.model}`}
                   className="w-full h-full object-contain bg-black/5"
                 />
               ) : (
                 <div className="flex items-center justify-center h-full text-gray-400">Sem fotos</div>
               )}
               
               {/* Nav Arrows */}
               {vehicle.photos?.length > 1 && (
                 <>
                   <button 
                     onClick={() => setActiveImageIndex(prev => prev === 0 ? vehicle.photos.length - 1 : prev - 1)}
                     className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                   >
                     <ChevronLeft className="h-6 w-6" />
                   </button>
                   <button 
                     onClick={() => setActiveImageIndex(prev => prev === vehicle.photos.length - 1 ? 0 : prev + 1)}
                     className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                   >
                     <ChevronRight className="h-6 w-6" />
                   </button>
                 </>
               )}
            </div>
            
            {/* Thumbnails */}
            {vehicle.photos?.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto bg-white border-t border-gray-100">
                {vehicle.photos.map((photo, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImageIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição e Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 mb-1">Câmbio</span>
                  <span className="font-medium text-gray-900">{vehicle.transmission}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 mb-1">Cor</span>
                  <span className="font-medium text-gray-900">{vehicle.color}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 mb-1">Ano Modelo</span>
                  <span className="font-medium text-gray-900">{vehicle.model_year}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="block text-gray-500 mb-1">Final Placa</span>
                  <span className="font-medium text-gray-900">---</span> 
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Sobre o veículo</h4>
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {vehicle.description || "Nenhuma descrição fornecida."}
                </p>
              </div>

              {/* Documents */}
              {vehicle.documents?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Documentos e Laudos</h4>
                  <div className="flex flex-col gap-2">
                    {vehicle.documents.map((doc, idx) => (
                      <a 
                        key={idx} 
                        href={doc} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <FileText className="h-5 w-5 text-indigo-500" />
                        <span className="text-sm text-gray-700 font-medium flex-1">Documento Anexo {idx + 1}</span>
                        <span className="text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Baixar</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Info & Actions */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <Card className="border-indigo-100 shadow-md">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex justify-between items-start mb-2">
                   <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                      {vehicle.make}
                   </Badge>
                   {vehicle.status === 'sold' && <Badge variant="destructive">Vendido</Badge>}
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">{vehicle.model}</h1>
                <p className="text-lg text-gray-600 font-medium">{vehicle.version}</p>
              </div>

              <div className="flex items-end gap-2">
                <h2 className="text-4xl font-bold text-indigo-900 tracking-tight">
                  {formatCurrency(vehicle.price)}
                </h2>
              </div>

              <Separator />

              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-gray-600">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{vehicle.manufacturing_year}/{vehicle.model_year}</span>
                 </div>
                 <div className="flex items-center gap-3 text-gray-600">
                    <Gauge className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{formatKM(vehicle.km)}</span>
                 </div>
                 <div className="flex items-center gap-3 text-gray-600">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{vehicle.city} - {vehicle.state}</span>
                 </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button onClick={startChat} className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg py-6 shadow-lg shadow-indigo-200">
                  <MessageSquare className="h-5 w-5 mr-2" /> 
                  Negociar
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seller Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-gray-500 uppercase tracking-wider">Anunciante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{seller?.company_name || "Concessionária"}</p>
                  <p className="text-sm text-gray-500">{vehicle.city} - {vehicle.state}</p>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                 <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{vehicle.phone || seller?.phone}</span>
                 </div>
                 {seller?.contact_name && (
                   <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Contato: {seller.contact_name}</span>
                   </div>
                 )}
              </div>
              
              <Button variant="link" className="p-0 h-auto text-indigo-600 text-sm" onClick={() => window.location.href = createPageUrl('Home') + `?seller=${vehicle.created_by}`}>
                 Ver outros anúncios deste vendedor
              </Button>
            </CardContent>
          </Card>
          
          <div className="text-center text-xs text-gray-400">
             Anúncio criado em {formatDate(vehicle.created_date)} • {vehicle.views || 0} visualizações
          </div>
        </div>
      </div>
    </div>
  );
}