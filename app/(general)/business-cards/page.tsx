"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  CreditCard,
  Download,
  Save,
  Eye,
  QrCode,
  Palette,
  Type,
  Layout,
  ChevronLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {Spinner} from "@/components/shared/ui/spinner";


const fonts = [
  { id: "inter", name: "Inter" },
  { id: "georgia", name: "Georgia" },
  { id: "monospace", name: "Monospace" },
];

export default function BusinessCardsPage() {
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [cardId, setCardId] = useState("");
  const [currentView, setCurrentView] = useState<"front" | "back">("front");

  const [formData, setFormData] = useState({
    name: "McDarsene M Mwale",
    title: "Managing Director",
    email: "mcdarsenek@outlook.com",
    phone: "+86 138 0000 0000",
    phone2: "",
    address: "Shanghai, China",
    website: "www.mvalex.com",
    companyName: "Shanghai Mvalex Technology Co., Ltd",
    companyNameCn: "上海姆瓦莱息技术有限公司",
    templateId: "modern",
    colorPrimary: "#2563eb",
    colorSecondary: "#1e40af",
    fontFamily: "inter",
    qrCodeType: "vcard",
    qrCodeData:  `BEGIN:VCARD\nVERSION:3.0\nFN:McDarsene M Mwale\nEMAIL:${'mcdarsenek@outlook.com'}\nTEL:${'+86 138 0000 0000'}\nEND:VCARD`,
  });

  const { data: savedCards, refetch } = useQuery({
    queryKey: ["business-cards"],
    queryFn: async () => {
      const res = await fetch("/api/business-cards");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  //get all business card templates
  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ["business-card-templates"],
    queryFn: async () => {
      const res = await fetch("/api/business-cards/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  //creating cards
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/business-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card saved successfully!");
      refetch();
      setCardId("");
    },
  });

  //updating cards
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/business-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cardId,
          ...data,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card updated successfully!");
      refetch();
      setCardId('');
    },
  });

  //deleting cards
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/business-cards?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-cards"] });
      toast.success("Business card deleted!");
      refetch();
    },
  });

  //exporting cards
  const handleExport = useCallback(async (format: string) => {
    if (!previewRef.current) return;
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: null,
      });

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `business-card-${formData.name.replace(/\s+/g, "-").toLowerCase()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("PNG exported successfully!");
      } else if (format === "jpg") {
        const link = document.createElement("a");
        link.download = `business-card-${formData.name.replace(/\s+/g, "-").toLowerCase()}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.9);
        link.click();
        toast.success("JPG exported successfully!");
      } else if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("l", "mm", [85, 55]);
        pdf.addImage(imgData, "PNG", 0, 0, 85, 55);
        pdf.save(`business-card-${formData.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
        toast.success("PDF exported successfully!");
      }
    } catch (error) {
      toast.error("Export failed");
    }
  }, [formData]);

  //saving cards
  const handleSave = () => {
    createMutation.mutate({
      ...formData,
      templateId: formData.templateId === "modern" ? templates[0].templateId : formData.templateId,
      frontConfig: formData,
      backConfig: { qrCodeType: formData.qrCodeType, qrCodeData: formData.qrCodeData },
    });
  };

  //updating fields
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  //Preview Panel
  const PreviewPanel = () => (
    <div className="lg:sticky lg:top-8 space-y-4">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold">Live Preview</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant={currentView === "front" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("front")}
          >
            Front
          </Button>
          <Button 
            variant={currentView === "back" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentView("back")}
          >
            Back
          </Button>
        </div>
      </div>
      
      <div ref={previewRef}
        className="rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "500px",
          aspectRatio: currentView === "front" ? "1.75 / 1" : "1.75 / 1",
          margin: "0 auto",
          }}
        >
          {currentView === "front" ? (
            <div
              className="w-full h-full flex flex-col justify-between p-6"
                style={{
                  background: `linear-gradient(135deg, ${formData.colorPrimary}, ${formData.colorSecondary})`,
                  fontFamily: formData.fontFamily,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white/80 text-xs font-medium tracking-wider uppercase">
                      {formData.companyName}
                    </div>
                    {formData.companyNameCn && (
                      <div className="text-white/60 text-xs mt-0.5">{formData.companyNameCn}</div>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {formData.companyName?.charAt(0) || "M"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-white text-2xl font-bold">{formData.name}</div>
                  <div className="text-white/80 text-sm">{formData.title}</div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/70">
                  {formData.email && <div>{formData.email}</div>}
                  {formData.phone && <div>{formData.phone}</div>}
                  {formData.website && <div>{formData.website}</div>}
                  {formData.address && <div>{formData.address}</div>}
                </div>
              </div>
              ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6"
                style={{
                  background: formData.colorPrimary,
                  fontFamily: formData.fontFamily,
                  }}
              >
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">
                {formData.companyName?.charAt(0) || "M"}
              </span>
            </div>
            <div className="text-white text-lg font-semibold text-center">
              {formData.companyName}
            </div>
            {formData.companyNameCn && (
              <div className="text-white/60 text-sm mt-1 text-center">{formData.companyNameCn}</div>
            )}
            <div className="mt-4 p-3 bg-white rounded-lg">
              <QrCode className="h-16 w-16 text-gray-800" />
            </div>
            <div className="text-white/50 text-xs mt-2">Scan for contact info</div>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Standard size: 85mm x 55mm
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Card Generator</h1>
          <p className="text-muted-foreground text-sm">Create professional business cards with live preview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-white" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="saved">Saved Cards ({savedCards?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="space-y-6">
              {/* Template Selection */}
              <Card className="rounded-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {(templates && templates.length > 0) ? templates.map((template: any, index: number) => (
                      <button
                        key={template.id + index}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            templateId: template.templateId,
                            colorPrimary: template.color,
                            colorSecondary: template.secondaryColor,
                          }));
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          formData.templateId === template.id || formData.templateId === template.templateId
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded mb-2"
                          style={{ background: `linear-gradient(135deg, ${template.color}, ${template.secondaryColor})` }}
                        />
                        {template.name}
                      </button>
                    )): <Spinner></Spinner>}
                  </div>
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card className="rounded-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={formData.name} onChange={(e) => updateField("name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input value={formData.title} onChange={(e) => updateField("title", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone 2 (Optional)</Label>
                      <Input value={formData.phone2} onChange={(e) => updateField("phone2", e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card className="rounded-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name (EN)</Label>
                    <Input value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name (CN)</Label>
                    <Input value={formData.companyNameCn} onChange={(e) => updateField("companyNameCn", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={(e) => updateField("address", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={formData.website} onChange={(e) => updateField("website", e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Styling */}
              <Card className="rounded-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Styling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={formData.colorPrimary}
                          onChange={(e) => updateField("colorPrimary", e.target.value)}
                          className="h-9 w-9 rounded border cursor-pointer"
                        />
                        <Input value={formData.colorPrimary} onChange={(e) => updateField("colorPrimary", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formData.colorSecondary}
                          onChange={(e) => updateField("colorSecondary", e.target.value)}
                          className="h-9 w-9 rounded border cursor-pointer"
                        />
                        <Input value={formData.colorSecondary} onChange={(e) => updateField("colorSecondary", e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={formData.fontFamily}
                      onValueChange={(value) => updateField("fontFamily", value)}
                    >
                      <SelectTrigger className="px-3 py-2 border rounded-md" >
                        <SelectValue  placeholder={formData.fontFamily || "Font Family"}/>
                      </SelectTrigger>
                      <SelectContent>
                        {fonts.map((font: any, index: number) => (
                          <SelectItem key={font.id + index} value={font.id}>{font.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code */}
              <Card className="rounded-md shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code (Back Side)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>QR Code Type</Label>
                    <Select
                      value={formData.qrCodeType}
                      onValueChange={(value) => updateField("qrCodeType", value)}
                    >
                        <SelectTrigger className="px-3 py-2 border rounded-md" >
                          <SelectValue  placeholder={formData.qrCodeType || "QR Code Type"}/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vcard">vCard (Contact)</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>QR Code Data</Label>
                    <Textarea
                      value={formData.qrCodeData}
                      onChange={(e) => updateField("qrCodeData", e.target.value)}
                      placeholder={formData.qrCodeType === "vcard" ? `BEGIN:VCARD\nVERSION:3.0\nFN:${formData.name}\nEMAIL:${formData.email}\nTEL:${formData.phone}\nEND:VCARD` : formData.website}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2">
                {
                  cardId === "" ? (
                  <Button onClick={handleSave} 
                      disabled={createMutation.isPending} 
                      className="flex-1 bg-primary text-white">
                      <Save className="mr-2 h-4 w-4" />
                      {createMutation.isPending ? "Saving..." : "Save Card"}
                    </Button>
                  ):(
                    <Button onClick={handleSave} 
                      disabled={updateMutation.isPending} 
                      className="flex-1 bg-secondary text-white">
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? "Updating..." : "Update Card"}
                    </Button>
                  )
                }
                <Button variant="outline" onClick={() => handleExport("png")}>
                  <Download className="mr-2 h-4 w-4" />
                  PNG
                </Button>
                <Button variant="outline" onClick={() => handleExport("pdf")}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Preview Panel */}
            {showPreview && <PreviewPanel />}
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedCards?.map((card: any) => (
              <Card key={card.id} className="group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{card.name}</div>
                      <div className="text-sm text-muted-foreground">{card.companyName}</div>
                    </div>
                    <Badge variant="outline">{card.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{card.email}</div>
                    <div>{card.phone}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      setFormData({
                        name: card.name,
                        title: card.title || "",
                        email: card.email,
                        phone: card.phone || "",
                        phone2: card.phone2 || "",
                        address: card.address || "",
                        website: card.website || "",
                        companyName: card.companyName || "",
                        companyNameCn: card.companyNameCn || "",
                        templateId: card.templateId || "modern",
                        colorPrimary: card.colorPrimary || "#2563eb",
                        colorSecondary: card.colorSecondary || "#1e40af",
                        fontFamily: card.fontFamily || "inter",
                        qrCodeType: card.qrCodeType || "vcard",
                        qrCodeData: card.qrCodeData || "",
                      });
                      setActiveTab("editor");
                      setCardId(card.id);
                    }}>
                      <ChevronLeft className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(card.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!savedCards || savedCards.length === 0) && (
              <div className="col-span-full text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No saved business cards yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("editor")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Card
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
