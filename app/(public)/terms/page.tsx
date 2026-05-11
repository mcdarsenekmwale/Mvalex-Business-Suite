import PublicFooter from "@/components/shared/layouts/public-footer";
import PublicHeader from "@/components/shared/layouts/public-header";

// app/terms/page.tsx
export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
     <PublicHeader />
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Mvalex Business Suite, you agree to be bound by these Terms of Service...</p>
          
          <h2>2. Description of Service</h2>
          <p>Mvalex Business Suite provides business card generation, invoice creation, and AI-powered logo design tools...</p>
          
          <h2>3. User Accounts</h2>
          <p>You are responsible for maintaining the security of your account and password...</p>
          
          <h2>4. Credits and Payments</h2>
          <p>Credits are non-refundable and expire after 12 months of inactivity...</p>
          
          <h2>5. Intellectual Property</h2>
          <p>You retain ownership of the assets you create using our platform...</p>
          
          <h2>6. Prohibited Uses</h2>
          <p>You may not use the service for illegal activities or to infringe on others' rights...</p>
          
          <h2>7. Termination</h2>
          <p>We may terminate or suspend your account immediately for violation of these terms...</p>
          
          <h2>8. Limitation of Liability</h2>
          <p>Mvalex shall not be liable for any indirect, incidental, or consequential damages...</p>
          
          <h2>9. Governing Law</h2>
          <p>These terms shall be governed by the laws of China...</p>
          
          <h2>10. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time...</p>
          
          <h2>Contact Us</h2>
          <p>If you have questions about these Terms, please contact us at legal@mvalex.com.</p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}