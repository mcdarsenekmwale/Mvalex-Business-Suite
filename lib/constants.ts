export const APP_NAME = "Mvalex Business Suite";
export const APP_TAGLINE = "Professional Business Tools Powered by AI";

export const CREDIT_COSTS = {
  GENERATE_LOGO: parseInt(process.env.LOGO_GENERATION_COST || "20"),
  GENERATE_BUSINESS_CARD: parseInt(process.env.BUSINESS_CARD_GENERATION_COST || "5"),
  GENERATE_INVOICE: parseInt(process.env.INVOICE_GENERATION_COST || "3"),
  EXPORT_FILE: parseInt(process.env.EXPORT_COST || "2"),
  AI_ASSISTANT: parseInt(process.env.AI_ASSISTANT_COST || "1"),
};

export const DEFAULT_USER_CREDITS = parseInt(process.env.DEFAULT_USER_CREDITS || "50");

export const SUPPORTED_EXPORT_FORMATS = {
  PNG: "png",
  JPG: "jpg",
  PDF: "pdf",
  DOCX: "docx",
  XLSX: "xlsx",
  SVG: "svg",
} as const;

export const BUSINESS_CARD_TEMPLATES = [
  { id: "modern", name: "Modern", category: "MODERN" },
  { id: "minimal", name: "Minimal", category: "MINIMAL" },
  { id: "corporate", name: "Corporate", category: "CORPORATE" },
  { id: "tech", name: "Tech", category: "TECH" },
  { id: "creative", name: "Creative", category: "CREATIVE" },
  { id: "luxury", name: "Luxury", category: "LUXURY" },
] as const;

export const INVOICE_TEMPLATES = [
  { id: "simple", name: "Simple", type: "SIMPLE" },
  { id: "corporate", name: "Corporate", type: "CORPORATE" },
  { id: "service", name: "Service", type: "SERVICE" },
  { id: "detailed", name: "Detailed", type: "DETAILED" },
] as const;

export const LOGO_STYLES = [
  { id: "modern", name: "Modern" },
  { id: "tech", name: "Tech" },
  { id: "luxury", name: "Luxury" },
  { id: "minimal", name: "Minimal" },
  { id: "corporate", name: "Corporate" },
  { id: "creative", name: "Creative" },
] as const;

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
] as const;
