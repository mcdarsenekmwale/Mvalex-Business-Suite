// app/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  FileText,
  Palette,
  Bot,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import PublicHeader from "@/components/shared/layouts/public-header";
import PublicFooter from "@/components/shared/layouts/public-footer";

const features = [
  {
    icon: CreditCard,
    title: "Business Card Generator",
    description:
      "Create stunning professional business cards with customizable templates, QR codes, and multiple export formats.",
    benefits: ["Multiple templates", "QR code integration", "Print-ready exports"],
  },
  {
    icon: FileText,
    title: "Invoice Generator",
    description:
      "Generate professional invoices with auto-calculations, multiple templates, and support for multiple currencies.",
    benefits: ["Auto-calculations", "Multi-currency", "Tax management"],
  },
  {
    icon: Palette,
    title: "AI Logo Generator",
    description:
      "Design unique logos powered by AI. Get multiple variations including full color, monochrome, and icon-only.",
    benefits: ["AI-powered", "Multiple variations", "Vector exports"],
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Get expert guidance on design choices, business branding, and platform features from our AI consultant.",
    benefits: ["24/7 availability", "Design recommendations", "Instant answers"],
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track your usage, monitor asset generation, and gain insights into your business identity toolkit.",
    benefits: ["Real-time stats", "Usage insights", "Performance metrics"],
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-grade security with JWT authentication, role-based access control, and encrypted data storage.",
    benefits: ["Bank-grade encryption", "Role-based access", "Secure storage"],
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Marketing Director",
    company: "TechStart Inc.",
    content: "Mvalex has transformed how we create business collateral. The AI logo generator alone saved us thousands!",
    rating: 5,
    image: "https://randomuser.me/api/portraits/women/1.jpg",
  },
  {
    name: "Michael Chen",
    role: "Small Business Owner",
    company: "Chen Enterprises",
    content: "Professional invoices in minutes. The templates are beautiful and the export options are exactly what I needed.",
    rating: 5,
    image: "https://randomuser.me/api/portraits/men/2.jpg",
  },
  {
    name: "Emily Rodriguez",
    role: "Freelance Designer",
    company: "Creative Studio",
    content: "The business card generator is a game-changer. My clients love the modern designs and QR code feature.",
    rating: 5,
    image: "https://randomuser.me/api/portraits/women/3.jpg",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out our platform",
    features: [
      "50 credits per month",
      "Basic business card templates",
      "Standard invoice template",
      "Basic logo generation",
      "Email support",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline",
    popular: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "Best for growing businesses",
    features: [
      "500 credits per month",
      "All premium templates",
      "Custom branding",
      "Priority AI generation",
      "Priority support",
      "API access",
      "Team collaboration",
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "default",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organizations",
    features: [
      "Unlimited credits",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "24/7 phone support",
      "On-premise deployment",
      "Custom training",
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline",
    popular: false,
  },
];

function usePublicStats() {
  const [stats, setStats] = useState([
    { value: "—", label: "Business Cards Generated", icon: CreditCard },
    { value: "—", label: "Invoices Created", icon: FileText },
    { value: "—", label: "AI Logos Designed", icon: Palette },
    { value: "99.9%", label: "Uptime", icon: Shield },
  ]);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats([
          { value: String(data.businessCardCount || 0), label: "Business Cards Generated", icon: CreditCard },
          { value: String(data.invoiceCount || 0), label: "Invoices Created", icon: FileText },
          { value: String(data.logoCount || 0), label: "AI Logos Designed", icon: Palette },
          { value: "99.9%", label: "Uptime", icon: Shield },
        ]);
      })
      .catch(() => {});
  }, []);

  return stats;
}

export default function LandingPage() {
  const stats = usePublicStats();
  const { data: session, status } = useSession();

  if (session && status === "authenticated") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-xs mb-8 shadow-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span>Now with AI-Powered Logo Generation</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Professional Business
              <br />
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Tools Powered by AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Generate business cards, invoices, and AI-powered logos. Everything
              your business needs to make a lasting impression.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="group">
                <Link href="/auth/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat: any, index: number) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center mb-3">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete suite of professional tools to build and manage your
              business identity.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature: any, index: number) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative rounded-xl border bg-background p-8 hover:shadow-xl transition-all hover:border-primary/20"
              >
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit: string) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Businesses Worldwide
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our customers are saying about Mvalex Business Suite
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl border bg-background p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground">{testimonial.content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section Preview */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for you. No hidden fees.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-xl border p-8 relative ${
                  plan.popular ? "border-primary shadow-xl" : "border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                      Most Popular
                    </div>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold">{plan.price}</div>
                  <div className="text-sm text-muted-foreground">{plan.period}</div>
                  <p className="text-sm mt-3">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.buttonVariant as any} className="w-full" asChild>
                  <Link href={plan.name === "Enterprise" ? "/contact" : "/auth/register"}>
                    {plan.buttonText}
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-10">
            Join thousands of businesses using Mvalex to create professional
            business identity assets.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}