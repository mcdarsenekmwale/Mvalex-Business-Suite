import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mvalex Business Suite - Pricing",
  description:
    "Compare our pricing plans and find the best fit for your business.",
  keywords: [
    "pricing",
    "business tools",
    "SaaS",
  ],
};


export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
