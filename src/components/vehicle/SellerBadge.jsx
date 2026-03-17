import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ShieldCheck } from 'lucide-react';

export default function SellerBadge({ email, showName = false }) {
  const { data: seller } = useQuery({
    queryKey: ['seller-profile', email],
    queryFn: async () => {
      const res = await base44.functions.invoke('getUserProfile', { email });
      return res.data;
    },
    enabled: !!email,
    staleTime: 1000 * 60 * 60 // 1 hour
  });

  if (!seller) return null;

  return (
    <div className="flex items-center gap-1">
      {showName && <span className="text-xs font-medium text-muted-foreground">{seller.company_name || email}</span>}
      {seller.cnpj_verified ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
          <ShieldCheck className="h-3 w-3" /> Verificada
        </span>
      ) : (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">
          Pendente
        </span>
      )}
      {seller.plan === 'pro' && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
          ⭐ Pro
        </span>
      )}
      {seller.plan === 'enterprise' && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full">
          🏆 Enterprise
        </span>
      )}
    </div>
  );
}