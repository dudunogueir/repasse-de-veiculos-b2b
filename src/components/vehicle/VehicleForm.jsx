// src/components/vehicle/VehicleForm.jsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // <-- AQUI ESTÁ A CORREÇÃO! Adicionamos a importação do Badge
import { Loader2, Upload, X, FileText, CheckCircle } from 'lucide-react';
import { STATES, CAMBIO_OPTIONS } from '../shared/utils';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function VehicleForm({ initialData, onSubmit, isSubmitting }) {
  const [photos, setPhotos] = useState(initialData?.photos || []);
  const [documents, setDocuments] = useState(initialData?.documents || []);
  const [uploading, setUploading] = useState(false);
  
  // Default values for edit mode or new
  const defaultValues = {
    make: initialData?.make || '',
    model: initialData?.model || '',
    version: initialData?.version || '',
    manufacturing_year: initialData?.manufacturing_year || '',
    model_year: initialData?.model_year || '',
    km: initialData?.km || '',
    price: initialData?.price || '',
    transmission: initialData?.transmission || 'Automático',
    color: initialData?.color || '',
    state: initialData?.state || '',
    city: initialData?.city || '',
    phone: initialData?.phone || '',
    description: initialData?.description || '',
  };

  const { register, handleSubmit, control, formState: { errors }, setValue } = useForm({
    defaultValues
  });

  // File Upload Handler
  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.file_url);

      if (type === 'photos') {
        setPhotos(prev => [...prev, ...urls]);
      } else {
        setDocuments(prev => [...prev, ...urls]);
      }
      toast.success(`${files.length} arquivo(s) enviado(s)`);
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Erro ao enviar arquivos");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index, type) => {
    if (type === 'photos') {
      setPhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setDocuments(prev => prev.filter((_, i) => i !== index));
    }
  };

  const onFormSubmit = (data) => {
    if (photos.length < 3) {
      toast.error("Mínimo de 3 fotos obrigatório");
      return;
    }

    const formattedData = {
      ...data,
      km: parseInt(data.km),
      price: parseFloat(data.price),
      manufacturing_year: parseInt(data.manufacturing_year),
      model_year: parseInt(data.model_year),
      photos,
      documents
    };
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Veículo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="make">Marca</Label>
            <Input id="make" placeholder="Ex: Toyota" {...register("make", { required: "Marca obrigatória" })} />
            {errors.make && <span className="text-xs text-red-500">{errors.make.message}</span>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Input id="model" placeholder="Ex: Corolla" {...register("model", { required: "Modelo obrigatório" })} />
            {errors.model && <span className="text-xs text-red-500">{errors.model.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Versão</Label>
            <Input id="version" placeholder="Ex: XEi 2.0" {...register("version", { required: "Versão obrigatória" })} />
            {errors.version && <span className="text-xs text-red-500">{errors.version.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturing_year">Ano Fabricação</Label>
            <Input type="number" id="manufacturing_year" placeholder="Ex: 2022" {...register("manufacturing_year", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_year">Ano Modelo</Label>
            <Input type="number" id="model_year" placeholder="Ex: 2023" {...register("model_year", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="km">Quilometragem (KM)</Label>
            <Input type="number" id="km" placeholder="Ex: 45000" {...register("km", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Preço de Repasse (R$)</Label>
            <Input type="number" step="0.01" id="price" placeholder="Ex: 120000.00" {...register("price", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>Câmbio</Label>
            <Controller
              name="transmission"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMBIO_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <Input id="color" placeholder="Ex: Preto" {...register("color")} />
          </div>
        </CardContent>
      </Card>

      {/* Location & Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Localização e Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Estado (UF)</Label>
            <Controller
              name="state"
              control={control}
              rules={{ required: "Estado obrigatório" }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.state && <span className="text-xs text-red-500">{errors.state.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" placeholder="Cidade" {...register("city", { required: "Cidade obrigatória" })} />
            {errors.city && <span className="text-xs text-red-500">{errors.city.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone Contato</Label>
            <Input id="phone" placeholder="(00) 00000-0000" {...register("phone", { required: "Telefone obrigatório" })} />
            {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes e Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição Detalhada</Label>
            <Textarea 
              id="description" 
              placeholder="Descreva o estado do veículo, observações mecânicas, avarias, etc." 
              className="h-32"
              {...register("description")} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Photos & Docs */}
      <Card>
        <CardHeader>
          <CardTitle>Fotos e Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photos */}
          <div>
            <Label className="mb-2 block">Fotos do Veículo (Mínimo 3) <span className="text-red-500">*</span></Label>
            <div className="flex flex-wrap gap-4 mb-4">
              {photos.map((url, idx) => (
                <div key={idx} className="relative w-32 h-32 group">
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  {idx === 0 && <Badge className="absolute bottom-1 left-1 bg-black/50 text-xs">Principal</Badge>}
                  <button 
                    type="button"
                    onClick={() => removeFile(idx, 'photos')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="h-6 w-6 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500">Adicionar Fotos</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photos')} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Documents */}
          <div>
            <Label className="mb-2 block">Documentos / Laudos (Opcional)</Label>
            <div className="space-y-2">
              {documents.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm text-gray-600 truncate max-w-[200px]">Documento {idx + 1}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(idx, 'documents')}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="h-4 w-4" />
                Anexar PDF/Doc
                <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleFileUpload(e, 'documents')} disabled={uploading} />
              </label>
            </div>
          </div>
          
          {uploading && <p className="text-sm text-blue-500 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Enviando arquivos...</p>}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || uploading} className="bg-indigo-600 hover:bg-indigo-700 w-full md:w-auto">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Publicar Anúncio
        </Button>
      </div>
    </form>
  );
}