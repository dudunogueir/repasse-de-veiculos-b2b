import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useForm, Controller } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Loader2, CheckCircle, Building2, Trash2, MapPin, ChevronRight, Check, ShieldCheck } from 'lucide-react';
import { STATES } from '../components/shared/utils';
import { toast } from "sonner";
import { useAuth } from '@/lib/AuthContext';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { logout } = useAuth();
  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm();

  const selectedState = watch("state");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        reset({
            company_name: user.company_name || '',
            contact_name: user.contact_name || user.full_name || '',
            cnpj: user.cnpj || '',
            phone: user.phone || '',
            state: user.state || '',
            city: user.city || '',
            email: user.email,
            cnpj_verified: user.cnpj_verified,
            verified_at: user.verified_at
        });
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [reset]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const { email, ...updateData } = data;
      await base44.auth.updateMe(updateData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await base44.auth.deleteAccount();
      toast.success("Conta excluída.");
      logout();
    } catch (error) {
      toast.error("Erro ao excluir conta.");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-24 px-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Perfil</h1>
        <p className="text-slate-500 mt-2">Dados da sua concessionária para negociações B2B.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Dados Cadastrais</CardTitle>
                <CardDescription>Informações visíveis nos seus anúncios</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="px-6 pt-4">
            {watch("cnpj_verified") ? (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 p-3 rounded-xl border border-green-100">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="text-sm font-bold">Concessionária Verificada</p>
                  <p className="text-xs opacity-80">Verificada em {watch("verified_at") ? new Date(watch("verified_at")).toLocaleDateString('pt-BR') : 'data não disponível'}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 text-slate-600 p-3 rounded-xl border border-slate-200">
                <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin opacity-50" />
                <div>
                  <p className="text-sm font-bold">Verificação Pendente</p>
                  <p className="text-xs opacity-80">Seu CNPJ está em análise pela nossa equipe.</p>
                </div>
              </div>
            )}
          </div>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nome da Empresa</label>
                <Input {...register("company_name", { required: "Obrigatório" })} className="rounded-xl h-11 bg-slate-50 border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">CNPJ</label>
                <Input {...register("cnpj", { required: "Obrigatório" })} className="rounded-xl h-11 bg-slate-50 border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Responsável</label>
                <Input {...register("contact_name")} className="rounded-xl h-11 bg-slate-50 border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">WhatsApp</label>
                <Input {...register("phone")} className="rounded-xl h-11 bg-slate-50 border-none" />
              </div>
            </div>

            {/* SELETOR DE ESTADO ESTILO NATIVO (Drawer no Mobile) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Localização</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-between rounded-xl bg-slate-50 border-none text-slate-700 font-normal">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {selectedState ? `Estado: ${selectedState}` : "Selecionar Estado"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Selecione seu Estado</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 grid grid-cols-4 gap-2 overflow-y-auto">
                      {STATES.map(uf => (
                        <Button 
                          key={uf} 
                          variant={selectedState === uf ? "default" : "outline"} 
                          onClick={() => { setValue("state", uf); document.querySelector('[data-drawer-close-state]').click(); }}
                          className="rounded-xl h-12 font-bold"
                        >
                          {uf}
                          {selectedState === uf && <Check className="ml-2 h-3 w-3" />}
                        </Button>
                      ))}
                    </div>
                    <DrawerFooter>
                      <DrawerClose id="data-drawer-close-state" />
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <Input {...register("city")} placeholder="Cidade" className="rounded-xl h-11 bg-slate-50 border-none" />
              </div>
            </div>

            <div className="space-y-1.5 opacity-60">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">E-mail de Acesso</label>
              <Input {...register("email")} disabled className="rounded-xl h-11 bg-slate-100 border-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Button type="submit" disabled={isSaving} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md shadow-indigo-100 font-bold">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Salvar Alterações
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-slate-400 hover:text-red-500 text-xs">
                Encerrar conta e excluir dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é irreversível e todos os seus anúncios serão removidos permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 rounded-xl">
                  {isDeleting ? "Excluindo..." : "Sim, excluir conta"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </form>
    </div>
  );
}