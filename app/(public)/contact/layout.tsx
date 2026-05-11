
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mvalex Business Suite - Contact",
    description: "Get in touch with us for any questions or support.",
    keywords: [
        "contact",
        "mvalex",
        "business suite",
        "support",
    ],
};


export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
