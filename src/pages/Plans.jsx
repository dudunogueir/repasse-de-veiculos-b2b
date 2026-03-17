import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Trophy, Car, Loader2 } from 'lucide-react';
import { toast } from "sonner";

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'Grátis',
    features: ['Até 3 anúncios simultâneos', 'Sem destaques', 'Suporte padrão'],
    icon: <Car className="h-6 w-6 text-gray-500" />,
    color: 'bg-gray-100 text-gray-700'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 99/mês',
    features: ['Até 10 anúncios simultâneos', '2 anúncios em destaque', 'Suporte padrão'],
    icon: <Star className="h-6 w-6 text-blue-500" />,
    color: 'bg-blue-100 text-blue-700'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 249/mês',
    features: ['Até 30 anúncios simultâneos', '10 anúncios em destaque', 'Badge "Pro" no perfil', 'Suporte prioritário'],
    icon: <Star className="h-6 w-6 text-purple-500 fill-purple-500" />,
    color: 'bg-purple-100 text-purple-700'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 599/mês',
    features: ['Anúncios ilimitados', 'Destaques ilimitados', 'Badge "Enterprise" no perfil', 'Gerente de conta dedicado'],
    icon: <Trophy className="h-6 w-6 text-yellow-500 fill-yellow-500" />,
    color: 'bg-yellow-100 text-yellow-700'
  }
];

export default function PlansPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => {
      const subs = await base44.entities.Subscription.filter({ user_id: user.email, status: 'active' });
      return subs.length > 0 ? subs[0] : { plan: 'free' };
    },
    enabled: !!user
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId) => {
      // For now, just update directly (simulating payment success)
      let limits = { vehicles_limit: 3, highlight_slots: 0 };
      if (planId === 'starter') limits = { vehicles_limit: 10, highlight_slots: 2 };
      if (planId === 'pro') limits = { vehicles_limit: 30, highlight_slots: 10 };
      if (planId === 'enterprise') limits = { vehicles_limit: 9999, highlight_slots: 9999 };

      // Cancel old
      const oldSubs = await base44.entities.Subscription.filter({ user_id: user.email, status: 'active' });
      for (const sub of oldSubs) {
        await base44.entities.Subscription.update(sub.id, { status: 'cancelled' });
      }

      await base44.entities.Subscription.create({
        user_id: user.email,
        plan: planId,
        status: 'active',
        vehicles_limit: limits.vehicles_limit,
        highlight_slots: limits.highlight_slots
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-subscription']);
      toast.success("Plano atualizado com sucesso!");
    }
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <div className="max-w-5xl mx-auto pb-20 px-4">
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl font-bold text-foreground tracking-tight mb-4">Planos e Assinaturas</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para acelerar as vendas da sua concessionária no maior portal B2B.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card key={plan.id} className={`relative flex flex-col ${isCurrent ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border'}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  SEU PLANO ATUAL
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${plan.color}`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1 mt-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={isCurrent ? "outline" : "default"}
                  className="w-full h-12 rounded-xl font-bold"
                  disabled={isCurrent || subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate(plan.id)}
                >
                  {isCurrent ? 'Plano Atual' : 'Assinar ' + plan.name}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}