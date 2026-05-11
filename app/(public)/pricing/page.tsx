// app/pricing/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Star, Zap, CreditCard, FileText, Palette, Bot, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import PublicHeader from "@/components/shared/layouts/public-header";
import PublicFooter from "@/components/shared/layouts/public-footer";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    description: "Perfect for trying out our platform",
    features: [
      "50 credits per month",
      "Basic business card templates",
      "Standard invoice template",
      "Basic logo generation",
      "Email support",
      "1 team member",
    ],
    limitations: [
      "No custom branding",
      "Watermarked exports",
      "Limited AI features",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline",
    popular: false,
    credits: 50,
  },
  {
    name: "Pro",
    price: { monthly: 19, yearly: 15.83 },
    description: "Best for growing businesses",
    features: [
      "500 credits per month",
      "All premium templates",
      "Custom branding",
      "Priority AI generation",
      "Priority support",
      "API access",
      "Up to 5 team members",
      "No watermarks",
      "Advanced analytics",
    ],
    limitations: [],
    buttonText: "Start Free Trial",
    buttonVariant: "default",
    popular: true,
    credits: 500,
    savings: 20,
  },
  {
    name: "Business",
    price: { monthly: 49, yearly: 40.83 },
    description: "For established businesses",
    features: [
      "2,000 credits per month",
      "Everything in Pro",
      "Advanced AI features",
      "Dedicated support",
      "Custom integrations",
      "Unlimited team members",
      "SLA guarantee",
      "Training sessions",
    ],
    limitations: [],
    buttonText: "Contact Sales",
    buttonVariant: "outline",
    popular: false,
    credits: 2000,
    savings: 25,
  },
  {
    name: "Enterprise",
    price: { monthly: "Custom", yearly: "Custom" },
    description: "For large organizations",
    features: [
      "Unlimited credits",
      "Everything in Business",
      "Dedicated account manager",
      "Custom development",
      "On-premise deployment",
      "24/7 phone support",
      "Custom contracts",
      "White-label options",
    ],
    limitations: [],
    buttonText: "Contact Sales",
    buttonVariant: "outline",
    popular: false,
    credits: "Unlimited",
  },
];

const addons = [
  { name: "Additional Credits (100-pack)", price: 9.99, popular: true },
  { name: "Custom Domain", price: 4.99, popular: false },
  { name: "White-label Export", price: 19.99, popular: false },
  { name: "API Calls (10k/month)", price: 29.99, popular: false },
];

const comparisonFeatures = [
  { name: "Business Card Templates", free: "5", pro: "All", business: "All", enterprise: "All" },
  { name: "Invoice Templates", free: "3", pro: "All", business: "All", enterprise: "All" },
  { name: "AI Logo Generation", free: "Basic", pro: "Advanced", business: "Premium", enterprise: "Unlimited" },
  { name: "Export Formats", free: "3", pro: "5", business: "All", enterprise: "All" },
  { name: "Credit Rollover", free: "No", pro: "Yes", business: "Yes", enterprise: "Yes" },
  { name: "API Access", free: "No", pro: "Limited", business: "Full", enterprise: "Full" },
  { name: "Support Response", free: "72h", pro: "24h", business: "12h", enterprise: "1h" },
  { name: "Team Members", free: "1", pro: "5", business: "Unlimited", enterprise: "Unlimited" },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const getPrice = (plan: typeof plans[0]) => {
    if (typeof plan.price.monthly === "string") return plan.price.monthly;
    return billingCycle === "monthly" 
      ? `$${plan.price.monthly}` 
      : `$${plan.price.yearly}/mo`;
  };

  const getAnnualSavings = (plan: typeof plans[0]) => {
    if (typeof plan.price.monthly === "number" && plan.savings) {
      return `Save ${plan.savings}% annually`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
     <PublicHeader />
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Simple, Transparent
              <br />
              <span className="text-primary">Pricing</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that works best for you. No hidden fees, cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={billingCycle === "monthly" ? "font-semibold" : ""}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={billingCycle === "yearly"}
              onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
            />
            <Label htmlFor="billing-toggle" className={billingCycle === "yearly" ? "font-semibold" : ""}>
              Yearly
              <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </Label>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular 
                    ? "border-primary shadow-xl scale-105 bg-gradient-to-b from-primary/5 to-background" 
                    : "border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold">
                    {getPrice(plan)}
                    {typeof plan.price.monthly === "number" && billingCycle === "yearly" && (
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    )}
                  </div>
                  {billingCycle === "yearly" && typeof plan.price.monthly === "number" && (
                    <div className="text-sm text-primary mt-1">
                      Billed annually (${plan.price.monthly * 12}/year)
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-3">{plan.description}</p>
                </div>
                <div className="space-y-3 mb-8">
                  <div className="text-sm font-semibold text-center mb-2">
                    {typeof plan.credits === "number" 
                      ? `${plan.credits.toLocaleString()} credits / month`
                      : `${plan.credits} credits`}
                  </div>
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <div key={limitation} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4" />
                      <span>{limitation}</span>
                    </div>
                  ))}
                </div>
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

      {/* Add-ons Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Optional Add-ons</h2>
            <p className="text-muted-foreground">Enhance your plan with additional features</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {addons.map((addon, index) => (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border bg-background text-center ${
                  addon.popular ? "border-primary" : ""
                }`}
              >
                <h3 className="font-semibold mb-1">{addon.name}</h3>
                <div className="text-xl font-bold">${addon.price}</div>
                <div className="text-xs text-muted-foreground mb-3">per month</div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/auth/register">Add to Plan</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
            <p className="text-muted-foreground">See what's included in each plan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold">Free</th>
                  <th className="text-center p-4 font-semibold bg-primary/5">Pro</th>
                  <th className="text-center p-4 font-semibold">Business</th>
                  <th className="text-center p-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, index) => (
                  <tr key={feature.name} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="p-4 font-medium">{feature.name}</td>
                    <td className="text-center p-4">{feature.free}</td>
                    <td className="text-center p-4 bg-primary/5 font-semibold">{feature.pro}</td>
                    <td className="text-center p-4">{feature.business}</td>
                    <td className="text-center p-4">{feature.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Got questions? We've got answers</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-sm text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do credits roll over?</h3>
              <p className="text-sm text-muted-foreground">Pro and Business plans include credit rollover up to 3 months.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-sm text-muted-foreground">Yes, Pro plan includes a 14-day free trial with full features.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">We accept all major credit cards, PayPal, and bank transfers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Join thousands of satisfied customers using Mvalex to grow their business.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">
              Start Your Free Trial
              <Zap className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}