import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mvalex Business Suite - About",
    description: "Learn more about Mvalex Business Suite and its features.",
    keywords: [
        "about",
        "mvalex",
        "business suite",
        "features",
    ],
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
