import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useForm, Controller } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle, User, Building2 } from 'lucide-react';
import { STATES } from '../components/shared/utils';
import { toast } from "sonner";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        // If user has custom fields in User entity, updateMe merges them into the user object returned by me()
        reset({
            company_name: user.company_name || '',
            contact_name: user.contact_name || user.full_name || '',
            cnpj: user.cnpj || '',
            phone: user.phone || '',
            state: user.state || '',
            city: user.city || '',
            email: user.email // read only
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
      // Remove email from update payload as it's read-only for updateMe usually or handled separately
      const { email, ...updateData } = data;
      await base44.auth.updateMe(updateData);
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Profile update failed", error);
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-20">
       <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Perfil da Concessionária</h1>
        <p className="text-gray-500 mt-2">Mantenha seus dados atualizados para transmitir confiança aos compradores.</p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                    <Building2 className="h-6 w-6" />
                </div>
                <div>
                    <CardTitle>Dados Cadastrais</CardTitle>
                    <CardDescription>Informações visíveis nos seus anúncios</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nome da Concessionária</label>
                        <Input {...register("company_name", { required: "Nome obrigatório" })} placeholder="Ex: Auto Motors" />
                        {errors.company_name && <span className="text-xs text-red-500">{errors.company_name.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">CNPJ</label>
                        <Input {...register("cnpj", { required: "CNPJ obrigatório" })} placeholder="00.000.000/0000-00" />
                        {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nome do Contato</label>
                        <Input {...register("contact_name", { required: "Nome de contato obrigatório" })} placeholder="Ex: João Silva" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Telefone / WhatsApp</label>
                        <Input {...register("phone", { required: "Telefone obrigatório" })} placeholder="(00) 00000-0000" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estado</label>
                         <Controller
                          name="state"
                          control={control}
                          rules={{ required: "Estado obrigatório" }}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          )}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cidade</label>
                        <Input {...register("city", { required: "Cidade obrigatória" })} placeholder="Cidade" />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">E-mail (Login)</label>
                        <Input {...register("email")} disabled className="bg-gray-50 text-gray-500" />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 min-w-[150px]">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </CardContent>
      </Card>
    </div>
  );
}