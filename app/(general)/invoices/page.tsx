"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Save,
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
import { SkeletonLoading } from "@/components/shared/ui/skeleton-loading";

const currencies = [
  { code: "USD", symbol: "$" },
  { code: "CNY", symbol: "¥" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
];

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("editor");

  const [formData, setFormData] = useState({
    templateId: "simple",
    companyName: "Shanghai Mvalex Technology Co., Ltd",
    companyNameCn: "上海姆瓦莱息技术有限公司",
    companyAddress: "123 Business District, Shanghai, China",
    companyPhone: "+86 21 8888 8888",
    companyEmail: "info@mvalex.com",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    clientPhone: "",
    invoiceNumber: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "USD",
    taxRate: 13,
    discountType: "percentage",
    discountValue: 0,
    paymentTerms: "Net 30",
    notes: "",
    terms: "",
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "Professional Services", quantity: 1, unitPrice: 1000 },
  ]);

  // Fetch saved invoices
  const { data: savedInvoices , refetch} = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  //Fetch invoice templates
  const { data: invoiceTemplates = [] } = useQuery({
    queryKey: ["invoiceTemplates"],
    queryFn: async () => {
      const res = await fetch("/api/invoices/templates");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      refetch();
      toast.success("Invoice created successfully!");
    },
    onError: () => {
      toast.error("Invoice creation failed. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted!");
    },
    onError: () => {
      toast.error("Invoice deletion failed. Please try again.");
    },
  });

  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const discountAmount = formData.discountType === "percentage"
      ? subtotal * (formData.discountValue / 100)
      : formData.discountValue;
    const grandTotal = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, discountAmount, grandTotal };
  }, [items, formData.taxRate, formData.discountType, formData.discountValue]);

  const { subtotal, taxAmount, discountAmount, grandTotal } = calculateTotals();
  const currencySymbol = currencies.find((c) => c.code === formData.currency)?.symbol || "$";

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map((item: InvoiceItem) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSave = () => {
    createMutation.mutate({
      ...formData,
      items: items.map((item: InvoiceItem) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        templateId: formData.templateId === "simple" ? invoiceTemplates[0].templateId : formData.templateId,
      })),
    });
  };

  const handleExport = useCallback(async (format: string) => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2 });
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `invoice-${formData.invoiceNumber || "new"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`invoice-${formData.invoiceNumber || "new"}.pdf`);
      }
      toast.success(`${format.toUpperCase()} exported!`);
    } catch (error) {
      toast.error("Export failed");
    }
  }, [formData]);

  const selectedTemplate = invoiceTemplates?.find((t: any) => (t.id === formData.templateId || t.templateId === formData.templateId)) || invoiceTemplates[0];

  console.log(selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Generator</h1>
          <p className="text-muted-foreground text-sm">Create professional invoices with auto-calculations</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="saved">Saved Invoices ({savedInvoices?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="space-y-6">
              {/* Template */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm">Template & Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {(invoiceTemplates && invoiceTemplates.length > 0) ? invoiceTemplates.map((template: any, index: number) => (
                      <button
                        key={template.id + index}
                        onClick={() => setFormData({ ...formData, templateId: template.templateId })}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          formData.templateId === template.templateId || formData.templateId === template.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="w-full h-4 rounded mb-2" style={{ backgroundColor: template.color }} />
                        {template.name}
                      </button>
                    )):(<SkeletonLoading></SkeletonLoading>)}
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm">Your Company</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name (EN)</Label>
                    <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Name (CN)</Label>
                    <Input value={formData.companyNameCn} onChange={(e) => setFormData({ ...formData, companyNameCn: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea value={formData.companyAddress} onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.companyPhone} onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={formData.companyEmail} onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Info */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={formData.clientEmail} onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={formData.clientPhone} onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea value={formData.clientAddress} onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })} rows={2} />
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Details */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder="Auto-generated if empty" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                        <SelectTrigger className="px-3 py-2 border rounded-md" >
                          <SelectValue  placeholder={formData.currency || "Currency"}/>
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Line Items</span>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add Item
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item: InvoiceItem, index: number) => (
                    <div key={item.id + index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium">
                        {currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Tax & Discount */}
              <Card className="rounded-md shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm">Tax & Discount</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" value={formData.taxRate} onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount Type</Label>
                      <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                        <SelectTrigger className="px-3 py-2 border rounded-md" >
                          <SelectValue  placeholder={formData.discountType || "All discount types"}/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Value</Label>
                    <Input type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })} />
                  </div>
                </CardContent>
              </Card>

              {/* Totals & Actions */}
              <Card className="rounded-md shadow-md">
                <CardContent className="p-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ({formData.taxRate}%)</span>
                      <span className="font-medium">{currencySymbol}{taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-destructive">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold">Grand Total</span>
                      <span className="font-bold text-lg">{currencySymbol}{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSave} disabled={createMutation.isPending} className="flex-1 text-white">
                      <Save className="mr-2 h-4 w-4" />
                      {createMutation.isPending ? "Saving..." : "Save Invoice"}
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("png")}>
                      <Download className="mr-2 h-4 w-4" />
                      PNG
                    </Button>
                    <Button variant="outline" onClick={() => handleExport("pdf")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:sticky lg:top-8">
              <h3 className="font-semibold mb-4">Live Preview</h3>
              <div
                ref={previewRef}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
                style={{ maxWidth: "600px", margin: "0 auto" }}
              >
                <div className="p-8" style={{ borderTop: `4px solid ${ selectedTemplate?.color || "inherit"}` }}>
                  {/* Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-xl font-bold">{formData.companyName}</h2>
                      <p className="text-xs text-gray-500">{formData.companyNameCn}</p>
                      <p className="text-sm text-gray-600 mt-1">{formData.companyAddress}</p>
                      <p className="text-sm text-gray-600">{formData.companyPhone}</p>
                      <p className="text-sm text-gray-600">{formData.companyEmail}</p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-2xl font-bold" style={{ color: selectedTemplate?.color || "inherit" }}>{selectedTemplate?.name || "Invoice"}</h1>
                      <p className="text-sm text-gray-600 mt-1">
                        #{formData.invoiceNumber || "INV-XXXX"}
                      </p>
                    </div>
                  </div>

                  {/* Client & Dates */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h3>
                      <p className="font-medium">{formData.clientName || "Client Name"}</p>
                      <p className="text-sm text-gray-600">{formData.clientAddress}</p>
                      <p className="text-sm text-gray-600">{formData.clientEmail}</p>
                      <p className="text-sm text-gray-600">{formData.clientPhone}</p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Issue Date: </span>
                        <span className="text-sm">{formData.issueDate}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-sm text-gray-500">Due Date: </span>
                        <span className="text-sm">{formData.dueDate || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Payment Terms: </span>
                        <span className="text-sm">{formData.paymentTerms}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full mb-8">
                    <thead>
                      <tr className="border-b-2" style={{ borderColor: selectedTemplate?.color || "inherit" }}>
                        <th className="text-left py-2 text-sm font-semibold">Description</th>
                        <th className="text-right py-2 text-sm font-semibold">Qty</th>
                        <th className="text-right py-2 text-sm font-semibold">Price</th>
                        <th className="text-right py-2 text-sm font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: InvoiceItem, index: number) => (
                        <tr key={item.id + index} className="border-b border-gray-100">
                          <td className="py-3 text-sm">{item.description || "-"}</td>
                          <td className="py-3 text-sm text-right">{item.quantity}</td>
                          <td className="py-3 text-sm text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                          <td className="py-3 text-sm text-right">{currencySymbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax ({formData.taxRate}%)</span>
                        <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount</span>
                          <span className="text-red-500">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total</span>
                        <span style={{ color: selectedTemplate?.color || "inherit" }}>{currencySymbol}{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {formData.notes && (
                    <div className="mt-8 pt-4 border-t">
                      <h3 className="text-sm font-semibold text-gray-500 mb-2">Notes</h3>
                      <p className="text-sm text-gray-600">{formData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedInvoices?.map((invoice: any, index: number) => (
              <Card key={invoice.id + index} className="rounded-md shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">{invoice.clientName}</div>
                    </div>
                    <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>{invoice.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Date: {new Date(invoice.issueDate).toLocaleDateString()}</div>
                    <div>Items: {invoice.items?.length || 0}</div>
                    <div className="font-medium">Total: {invoice.currency} {invoice.grandTotal}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      // Load invoice data
                      setFormData({
                        ...formData,
                        invoiceNumber: invoice.invoiceNumber,
                        clientName: invoice.clientName,
                        clientEmail: invoice.clientEmail,
                        clientAddress: invoice.clientAddress,
                        clientPhone: invoice.clientPhone,
                        currency: invoice.currency,
                        taxRate: invoice.taxRate,
                        discountType: invoice.discountType,
                        discountValue: invoice.discountValue,
                        notes: invoice.notes || "",
                        paymentTerms: invoice.paymentTerms || "",
                      });
                      setItems(invoice.items.map((item: any) => ({
                        id: item.id,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                      })));
                      setActiveTab("editor");
                    }}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteMutation.mutate(invoice.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!savedInvoices || savedInvoices.length === 0) && (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No invoices yet</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("editor")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
