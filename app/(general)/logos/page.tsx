"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  Sparkles,
  Download,
  Trash2,
  Plus,
  Wand2,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const logoStyles = [
  { id: "MODERN", name: "Modern", description: "Clean, contemporary design" },
  { id: "TECH", name: "Tech", description: "Digital, futuristic feel" },
  { id: "LUXURY", name: "Luxury", description: "Elegant, premium look" },
  { id: "MINIMAL", name: "Minimal", description: "Simple, understated" },
  { id: "CORPORATE", name: "Corporate", description: "Professional, trustworthy" },
  { id: "CREATIVE", name: "Creative", description: "Artistic, unique" },
];

const colorPresets = [
  { name: "Blue", colors: ["#2563eb", "#1e40af", "#3b82f6"] },
  { name: "Green", colors: ["#059669", "#047857", "#10b981"] },
  { name: "Purple", colors: ["#7c3aed", "#6d28d9", "#a78bfa"] },
  { name: "Red", colors: ["#dc2626", "#b91c1c", "#ef4444"] },
  { name: "Orange", colors: ["#ea580c", "#c2410c", "#f97316"] },
  { name: "Monochrome", colors: ["#18181b", "#52525b", "#a1a1aa"] },
];

export default function LogosPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("generator");
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "Shanghai Mvalex Technology",
    slogan: "Innovation Beyond Boundaries",
    industry: "Technology",
    style: "MODERN",
    colorPalette: ["#2563eb", "#1e40af"],
    additionalInfo: "",
  });

  const { data: savedLogos, refetch } = useQuery({
    queryKey: ["logos"],
    queryFn: async () => {
      const res = await fetch("/api/logos");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/logos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logos"] });
      toast.success("Logo generation started! Check back in a moment.");
      refetch();
      setActiveTab("gallery");
    },
    onError: () => {
      toast.error("Logo generation failed. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/logos?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logos"] });
      refetch();
      toast.success("Logo deleted!");
    },
    onError: () => {
      toast.error("Logo deletion failed. Please try again.");
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate(formData, {
      onSettled: () => setIsGenerating(false),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case "GENERATING":
        return <Badge variant="default"><Sparkles className="mr-1 h-3 w-3" />Generating</Badge>;
      case "COMPLETED":
        return <Badge variant="default"><Check className="mr-1 h-3 w-3" />Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Logo Generator</h1>
          <p className="text-muted-foreground text-sm">
            Create unique, professional logos powered by AI
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="gallery">My Logos ({savedLogos?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Business Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      placeholder="Enter your business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slogan (Optional)</Label>
                    <Input
                      value={formData.slogan}
                      onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                      placeholder="Your tagline or slogan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g. Technology, Healthcare, Finance"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Style & Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo Style</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {logoStyles.map((style, index) => (
                        <button
                          key={style.id + index}
                          onClick={() => setFormData({ ...formData, style: style.id })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            formData.style === style.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{style.name}</div>
                          <div className="text-xs text-muted-foreground">{style.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Color Palette</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {colorPresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setFormData({ ...formData, colorPalette: preset.colors })}
                          className={`p-2 rounded-lg border transition-all ${
                            formData.colorPalette[0] === preset.colors[0]
                              ? "border-primary ring-1 ring-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex gap-1 mb-1">
                            {preset.colors.map((color) => (
                              <div key={color} className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                          <div className="text-xs">{preset.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Additional Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Additional Instructions (Optional)</Label>
                    <Textarea
                      value={formData.additionalInfo}
                      onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                      placeholder="Any specific design preferences, symbols, or concepts you'd like included..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Cost: 20 credits per generation</span>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!formData.businessName || isGenerating}
                  className="bg-primary text-white px-6 py-2 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-primary/80"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Logo
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="space-y-4">
              <h3 className="font-semibold">Generation Preview</h3>
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/50">
                <CardContent className="p-8 flex flex-col items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Palette className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold">{formData.businessName || "Your Business"}</h4>
                      <p className="text-sm text-muted-foreground">{formData.slogan}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">{formData.style}</Badge>
                      <Badge variant="secondary">{formData.industry || "General"}</Badge>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {formData.colorPalette.map((color) => (
                        <div key={color} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Your AI-generated logo will include multiple variations: full color, monochrome, and icon-only versions.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">What You&apos;ll Get</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Full color logo variation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Monochrome (B&W) version</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Icon-only symbol</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">High-resolution PNG (1024x1024)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Downloadable assets</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedLogos?.map((logo: any) => (
              <Card key={logo.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{logo.businessName}</div>
                        <div className="text-xs text-muted-foreground">{logo.slogan}</div>
                      </div>
                      {getStatusBadge(logo.status)}
                    </div>
                  </div>

                  <div className="p-4">
                    {logo.status === "COMPLETED" && logo.variations?.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {logo.variations.map((variation: any) => (
                          <div key={variation.id} className="relative group">
                            <img
                              src={variation.imageUrl}
                              alt={`${logo.businessName} - ${variation.type}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <Button variant="secondary" size="sm" onClick={() => {
                                const link = document.createElement("a");
                                link.href = variation.imageUrl;
                                link.download = `${logo.businessName.replace(/\s+/g, "-")}-${variation.type.toLowerCase()}.png`;
                                link.click();
                                toast.success("Downloaded!");
                              }}>
                                <Download className="mr-1 h-3 w-3" />
                                PNG
                              </Button>
                            </div>
                            <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                              {variation.type.replace("_", " ")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : logo.status === "GENERATING" ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                        <p className="text-sm text-muted-foreground mt-2">Generating your logo...</p>
                      </div>
                    ) : logo.status === "FAILED" ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                        <p className="text-sm text-muted-foreground mt-2">Generation failed. Please try again.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Queued for generation</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {new Date(logo.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(logo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!savedLogos || savedLogos.length === 0) && (
              <div className="col-span-full text-center py-12">
                <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No logos generated yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("generator")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Your First Logo
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
