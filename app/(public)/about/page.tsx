// app/about/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Users, Award, Globe, Target, Lightbulb, Rocket, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicHeader from "@/components/shared/layouts/public-header";
import PublicFooter from "@/components/shared/layouts/public-footer";

const values = [
  {
    icon: Target,
    title: "Our Mission",
    description: "To empower businesses of all sizes with professional-grade design tools that are accessible, intuitive, and powered by cutting-edge AI technology.",
  },
  {
    icon: Lightbulb,
    title: "Our Vision",
    description: "To become the world's leading platform for business identity creation, making professional design accessible to everyone.",
  },
  {
    icon: Heart,
    title: "Our Values",
    description: "Innovation, customer-centricity, transparency, and continuous improvement drive everything we do.",
  },
];

const team = [
  {
    name: "McDarsene M Mwale",
    role: "Founder & CEO",
    bio: "Visionary leader with over 10 years of experience in tech and business innovation.",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
  },
  {
    name: "Sarah Chen",
    role: "CTO",
    bio: "AI expert and full-stack architect leading our technology strategy.",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
  },
  {
    name: "David Kim",
    role: "Head of Design",
    bio: "Award-winning designer passionate about creating beautiful user experiences.",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
  },
  {
    name: "Emma Watson",
    role: "Customer Success",
    bio: "Dedicated to ensuring our customers get the most out of our platform.",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
  },
];

const milestones = [
  { year: "2020", title: "Company Founded", description: "Started with a vision to democratize design" },
  { year: "2021", title: "Launch of Business Card Generator", description: "First product released to market" },
  { year: "2022", title: "Invoice Generator Launch", description: "Expanded our product offering" },
  { year: "2023", title: "AI Logo Generator", description: "Integrated AI-powered design tools" },
  { year: "2024", title: "Global Expansion", description: "Serving customers worldwide" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
        <PublicHeader />
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About <span className="text-primary">Mvalex</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              We're on a mission to revolutionize how businesses create their professional identity
              through innovative AI-powered tools.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground mb-4">
                Founded in 2020, Mvalex Business Suite was born from a simple observation: 
                small and medium businesses struggle to create professional-quality business 
                assets without expensive designers or complex software.
              </p>
              <p className="text-muted-foreground mb-4">
                We set out to change that. By combining cutting-edge AI technology with 
                intuitive design tools, we've created a platform that enables anyone to 
                create stunning business cards, professional invoices, and unique logos 
                in minutes.
              </p>
              <p className="text-muted-foreground">
                Today, thousands of businesses worldwide trust Mvalex to power their 
                professional identity. But we're just getting started.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-background rounded-xl">
                    <div className="text-3xl font-bold text-primary">5+</div>
                    <div className="text-sm text-muted-foreground">Years of Innovation</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-xl">
                    <div className="text-3xl font-bold text-primary">10K+</div>
                    <div className="text-sm text-muted-foreground">Businesses Served</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-xl">
                    <div className="text-3xl font-bold text-primary">50K+</div>
                    <div className="text-sm text-muted-foreground">Assets Created</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-xl">
                    <div className="text-3xl font-bold text-primary">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 rounded-xl bg-background border"
              >
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
                  <value.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Key milestones in our company's history
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-primary/20"></div>
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex flex-col md:flex-row items-center gap-8 ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className="flex-1">
                    <div className="bg-background border rounded-lg p-6 shadow-sm">
                      <div className="text-primary font-bold mb-2">{milestone.year}</div>
                      <h3 className="text-lg font-semibold mb-2">{milestone.title}</h3>
                      <p className="text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <div className="w-8 h-8 rounded-full bg-primary border-4 border-background"></div>
                  </div>
                  <div className="flex-1"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet the Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind Mvalex
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-primary/20"
                />
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-primary text-sm mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Join Our Journey
          </h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Be part of something amazing. Start creating with Mvalex today.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}