"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  CreditCard,
  Mail,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Eye,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import TemplateSection from "@/components/admin/templates/template-section";
import { Textarea } from "@/components/ui/textarea";

interface Template {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
  category?: string;
  createdAt: string;
}

export default function TemplatesManagementPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    type: "businessCard" as "businessCard" | "invoice" | "email",
    name: "",
    description: "",
    category: "",
    isDefault: false,
    isActive: true,
  });

  // Fetch templates data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      toast.success("Template created!");
      setDialogOpen(false);
      setFormData({ type: "businessCard", name: "", description: "", category: "", isDefault: false, isActive: true });
    },
    onError: () => {
      toast.error("Failed to create template. Please try again.");
    },
  });

  const cardTemplates: Template[] = data?.cardTemplates || [];
  const invoiceTemplates: Template[] = data?.invoiceTemplates || [];
  const emailTemplates: Template[] = data?.emailTemplates || [];

  if (isLoading) {
    // show skeleton while loading templates
    return (
      <Skeleton />
      );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Template Management"
        subtitle="Manage business card, invoice, and email templates"
        action={
          <Button onClick={() => setDialogOpen(true)} 
            className="gap-1.5 text-white">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        }
      />

      <TemplateSection 
        title="Business Card Templates" 
        icon={CreditCard} 
        templates={cardTemplates} 
        type="businessCard" 
        color="bg-blue-500" 
        isLoading={isLoading}
        onShowPreview={(template) => { setPreviewTemplate(template); setPreviewOpen(true); }}
      />
      <TemplateSection 
        title="Invoice Templates" 
        icon={FileText} 
        templates={invoiceTemplates} 
        type="invoice" 
        color="bg-emerald-500" 
        isLoading={isLoading}
        onShowPreview={(template) => { setPreviewTemplate(template); setPreviewOpen(true); }}
      />
      <TemplateSection 
        title="Email Templates" 
        icon={Mail} 
        templates={emailTemplates} 
        type="email" 
        color="bg-purple-500" 
        isLoading={isLoading}
        onShowPreview={(template) => { setPreviewTemplate(template); setPreviewOpen(true); }}
      />


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })} >
                <SelectTrigger className="px-3 py-2 border rounded-md w-full" >
                  <SelectValue  placeholder={formData.type || "Template Type"}/>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="businessCard">Business Card</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Template name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                rows={4}
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Optional description" />
            </div>
            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.isDefault} onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })} /> Set as default</Label>
              <Label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} /> Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Preview: {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 h-96 flex items-center justify-center">
            <div className="text-center">
              <LayoutTemplate className="h-16 w-16 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Template preview will appear here</p>
              <p className="text-xs text-slate-400 mt-1">Type: {previewTemplate ? "Business Card" : ""}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
