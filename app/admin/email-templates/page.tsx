// app/(admin)/email-templates/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Send,
  Save,
  X,
  Check,
  AlertCircle,
  FileText,
  Users,
  Bell,
  Calendar,
  CreditCard,
  UserPlus,
  Shield,
  Settings,
  RefreshCw,
  FileCode,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { StatsCard } from "@/components/admin/shared/StatsCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  category: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

const TEMPLATE_CATEGORIES = [
  { value: "welcome", label: "Welcome", icon: UserPlus, color: "bg-green-500" },
  { value: "notification", label: "Notification", icon: Bell, color: "bg-blue-500" },
  { value: "invoice", label: "Invoice", icon: CreditCard, color: "bg-purple-500" },
  { value: "reminder", label: "Reminder", icon: Calendar, color: "bg-amber-500" },
  { value: "alert", label: "Alert", icon: AlertCircle, color: "bg-red-500" },
  { value: "security", label: "Security", icon: Shield, color: "bg-indigo-500" },
  { value: "marketing", label: "Marketing", icon: Users, color: "bg-pink-500" },
  { value: "system", label: "System", icon: Settings, color: "bg-gray-500" },
];

const AVAILABLE_VARIABLES: TemplateVariable[] = [
  { name: "{{user_name}}", description: "User's full name", example: "John Doe", required: true },
  { name: "{{user_email}}", description: "User's email address", example: "john@example.com", required: true },
  { name: "{{company_name}}", description: "Company name", example: "Mvalex Business Suite", required: false },
  { name: "{{company_logo}}", description: "Company logo URL", example: "https://example.com/logo.png", required: false },
  { name: "{{reset_link}}", description: "Password reset link", example: "https://example.com/reset?token=123", required: false },
  { name: "{{verification_link}}", description: "Email verification link", example: "https://example.com/verify?token=123", required: false },
  { name: "{{invoice_number}}", description: "Invoice number", example: "INV-2024-001", required: false },
  { name: "{{invoice_amount}}", description: "Invoice amount", example: "$1,000.00", required: false },
  { name: "{{due_date}}", description: "Payment due date", example: "2024-12-31", required: false },
  { name: "{{credits_added}}", description: "Number of credits added", example: "100", required: false },
  { name: "{{credits_balance}}", description: "Current credit balance", example: "250", required: false },
  { name: "{{login_link}}", description: "Login link", example: "https://example.com/login", required: false },
  { name: "{{support_email}}", description: "Support email", example: "support@mvalex.com", required: false },
  { name: "{{current_year}}", description: "Current year", example: "2024", required: false },
];

const DEFAULT_TEMPLATES = [
  {
    name: "Welcome Email",
    type: "welcome",
    category: "welcome",
    subject: "Welcome to {{company_name}}!",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; padding: 20px;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
  </div>
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
    <h1>Welcome aboard, {{user_name}}! 🎉</h1>
  </div>
  <div style="padding: 30px;">
    <p>We're thrilled to have you join {{company_name}}! Your account has been successfully created.</p>
    <p>Here's what you can do next:</p>
    <ul>
      <li>Create your first business card</li>
      <li>Generate AI-powered logos</li>
      <li>Send professional invoices</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_link}}" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Get Started</a>
    </div>
    <p>If you have any questions, feel free to reach out to our support team at {{support_email}}.</p>
    <p>Best regards,<br>The {{company_name}} Team</p>
  </div>
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #666;">
    &copy; {{current_year}} {{company_name}}. All rights reserved.
  </div>
</div>`,
  },
  {
    name: "Password Reset",
    type: "security",
    category: "security",
    subject: "Reset Your Password - {{company_name}}",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; padding: 20px;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
  </div>
  <div style="background: #f44336; padding: 40px; text-align: center; color: white;">
    <h1>Password Reset Request</h1>
  </div>
  <div style="padding: 30px;">
    <p>Hello {{user_name}},</p>
    <p>We received a request to reset your password for your {{company_name}} account. Click the button below to create a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{reset_link}}" style="background-color: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    </div>
    <p>If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
    <p>This link will expire in 24 hours.</p>
    <hr style="margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">For security reasons, never share this email with anyone.</p>
  </div>
</div>`,
  },
  {
    name: "Invoice Notification",
    type: "invoice",
    category: "invoice",
    subject: "New Invoice #{{invoice_number}} from {{company_name}}",
    content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="text-align: center; padding: 20px;">
    <img src="{{company_logo}}" alt="{{company_name}}" style="max-height: 60px;">
  </div>
  <div style="background: #4CAF50; padding: 40px; text-align: center; color: white;">
    <h1>New Invoice Generated</h1>
  </div>
  <div style="padding: 30px;">
    <p>Dear {{user_name}},</p>
    <p>A new invoice has been generated for your account:</p>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
      <p><strong>Amount Due:</strong> {{invoice_amount}}</p>
      <p><strong>Due Date:</strong> {{due_date}}</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_link}}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Invoice</a>
    </div>
    <p>Thank you for your business!</p>
  </div>
</div>`,
  },
];

export default function EmailTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    user_name: "John Doe",
    user_email: "john@example.com",
    company_name: "Mvalex Business Suite",
    company_logo: "https://via.placeholder.com/150x60?text=Logo",
    invoice_number: "INV-2024-001",
    invoice_amount: "$1,000.00",
    due_date: "2024-12-31",
    reset_link: "https://example.com/reset-password",
    verification_link: "https://example.com/verify",
    login_link: "https://example.com/login",
    support_email: "support@mvalex.com",
    current_year: new Date().getFullYear().toString(),
    credits_added: "100",
    credits_balance: "250",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    type: "notification",
    category: "notification",
    variables: [] as string[],
    isActive: true,
    isDefault: false,
  });

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  // Fetch template stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["email-templates-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email-templates/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template created successfully!");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create template");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template updated successfully!");
      resetForm();
      setIsEditing(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template deleted successfully!");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete template");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/email-templates/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate template");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Template duplicated successfully!");
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to duplicate template");
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async ({ id, testEmail }: { id: string; testEmail: string }) => {
      const res = await fetch(`/api/admin/email-templates/${id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail, previewData }),
      });
      if (!res.ok) throw new Error("Failed to send test email");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Test email sent successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send test email");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      body: "",
      type: "notification",
      category: "notification",
      variables: [],
      isActive: true,
      isDefault: false,
    });
    setIsEditing(false);
    setSelectedTemplate(null);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      category: template.category,
      variables: template.variables,
      isActive: template.isActive,
      isDefault: template.isDefault,
    });
    setIsEditing(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Extract variables from content
    const variableRegex = /{{(.*?)}}/g;
    const matches = formData.body.match(variableRegex) || [];
    const variables = [...new Set(matches.map(m => m.replace(/[{}]/g, "").trim()))];
    formData.variables = variables;

    if (isEditing && selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCreateDefault = async () => {
    for (const template of DEFAULT_TEMPLATES) {
      await createMutation.mutateAsync(template);
    }
    toast.success("Default templates created successfully!");
  };

  const getPreviewContent = () => {
    if (!formData.body) return "";
    let content = formData.body;
    Object.entries(previewData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return content;
  };

  const templates = templatesData?.templates || [];
  const stats = statsData?.stats || { total: 0, active: 0, usageCount: 0, categories: {} };
  
  const filteredTemplates = templates.filter((template: EmailTemplate) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return ( 
    <div className="space-y-8">
      <PageHeader
        title="Email Templates"
        subtitle="Manage email templates for notifications, invoices, and system emails"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCreateDefault}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Create Defaults
            </Button>
            <Dialog open={isEditing || (!isEditing && activeTab === "create")} onOpenChange={(open) => {
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{isEditing ? "Edit Template" : "Create New Template"}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="compose" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="compose">Compose</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="compose" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Template Name *</Label>
                        <Input
                          placeholder="e.g., Welcome Email"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <div className="flex items-center gap-2">
                                  <cat.icon className="h-4 w-4" />
                                  {cat.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject Line *</Label>
                      <Input
                        placeholder="Email subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Content (HTML) *</Label>
                      <Textarea
                        placeholder="<div>Your HTML content here...</div>"
                        rows={15}
                        value={formData.body}
                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="isActive">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={formData.isDefault}
                          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="isDefault">Set as Default</Label>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="variables" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Available Variables</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {AVAILABLE_VARIABLES.map((variable) => (
                          <Card key={variable.name} className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                body: formData.body + ` ${variable.name} `,
                              });
                              toast.success(`Added ${variable.name} to template`);
                            }}>
                            <CardContent className="p-3">
                              <code className="text-sm font-mono text-primary">{variable.name}</code>
                              <p className="text-xs text-muted-foreground mt-1">{variable.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">Example: {variable.example}</p>
                              {variable.required && (
                                <Badge variant="outline" className="mt-1 text-xs">Required</Badge>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Detected Variables in Template</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="font-mono">
                            {variable}
                          </Badge>
                        ))}
                        {formData.variables.length === 0 && (
                          <p className="text-sm text-muted-foreground">No variables detected. Add variables using {'{{variable_name}}'} syntax.</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Preview Data</Label>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {Object.entries(previewData).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs">{key}</Label>
                            <Input
                              className="w-full"
                              value={value}
                              onChange={(e) => setPreviewData({ ...previewData, [key]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                      <Label>Email Preview</Label>
                      <div className="border rounded-lg p-4 bg-white dark:bg-slate-950 overflow-auto max-h-[500px]">
                        <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    {isEditing ? "Update" : "Create"} Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Templates"
          value={stats.total || 0}
          icon={Mail}
          color="blue"
          delay={0}
        />
        <StatsCard
          title="Active Templates"
          value={stats.active || 0}
          icon={Check}
          color="green"
          delay={0.1}
        />
        <StatsCard
          title="Total Uses"
          value={stats.usageCount || 0}
          icon={Send}
          color="purple"
          delay={0.2}
        />
        <StatsCard
          title="Categories"
          value={Object.keys(stats.categories || {}).length}
          icon={FileCode}
          color="amber"
          delay={0.3}
        />
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="templates">
            <Mail className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Palette className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {templatesLoading ? (
            <div className="text-center py-12">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search" : "Create your first email template"}
              </p>
              {!searchQuery && (
                <Button onClick={() => handleCreateDefault()} variant="outline">
                  Create Default Templates
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {filteredTemplates.map((template: EmailTemplate, index: number) => {
                const CategoryIcon = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.icon || Mail;
                const categoryColor = TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.color || "bg-gray-500";
                
                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="relative group hover:shadow-lg transition-all duration-200">
                      {template.isDefault && (
                        <Badge className="absolute top-2 right-2 gap-1" variant="secondary">
                          <Star className="h-3 w-3" />
                          Default
                        </Badge>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", categoryColor)}>
                              <CategoryIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base line-clamp-1 capitalize">{`${template.name}`.replace("_", " ")}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Updated {format(new Date(template.updatedAt), "MMM d, yyyy")}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant={template.isActive ? "default" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-medium mb-2">Subject: {template.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.body.replace(/<[^>]*>/g, "").substring(0, 100)}...
                        </p>
                        {template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {template.variables.slice(0, 3).map((variable) => (
                              <Badge key={variable} variant="outline" className="text-xs font-mono">
                                {variable}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">
                            Used {template.usageCount || 0} times
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setPreviewData({
                                  ...previewData,
                                  user_name: "Test User",
                                  user_email: "test@example.com",
                                });
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateMutation.mutate(template.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setTemplateToDelete(template.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            {TEMPLATE_CATEGORIES.map((category) => {
              const count = templates.filter((t: EmailTemplate) => t.category === category.value).length;
              const Icon = category.icon;
              
              return (
                <Card
                  key={category.value}
                  className="cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setActiveTab("templates");
                  }}
                >
                  <CardContent className="p-6 text-center">
                    <div className={cn("p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3", category.color)}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-1">{category.label}</h3>
                    <p className="text-2xl font-bold mb-1">{count}</p>
                    <p className="text-xs text-muted-foreground">Templates</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  placeholder="Enter email to send test"
                  className="flex-1"
                />
                <Button
                  onClick={() => {
                    const testEmail = (document.getElementById("testEmail") as HTMLInputElement).value;
                    if (!testEmail) {
                      toast.error("Please enter a test email address");
                      return;
                    }
                    if (selectedTemplate) {
                      testSendMutation.mutate({ id: selectedTemplate.id, testEmail });
                    }
                  }}
                  disabled={testSendMutation.isPending}
                >
                  {testSendMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  Send Test
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-white dark:bg-slate-950">
              <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the email template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Star icon component (if not imported)
const Star = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);