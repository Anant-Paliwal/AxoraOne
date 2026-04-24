import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Terms of Service - Axora AI Workspace | Legal Terms"
        description="Read Axora's Terms of Service. Understand your rights and responsibilities when using our AI-powered workspace platform. Last updated: January 26, 2025."
        keywords="terms of service, legal terms, user agreement, terms and conditions, axora terms"
        canonical="https://axora.work/terms"
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/95 border-b border-gray-200">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img src="/axora-logo-light.png" alt="Axora" className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">Axora</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
              <Button onClick={() => navigate('/login')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="container px-6 mx-auto max-w-4xl pt-20 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: January 26, 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using Axora ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">
                Axora provides an AI-powered workspace platform that includes task management, knowledge organization, and team collaboration features. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your password</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payment</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Axora offers both free and paid subscription plans:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Free Plan: ₹0/month with limited features</li>
                <li>Starter Plan: ₹299/month</li>
                <li>Pro Plan: ₹999/month</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                All payments are processed securely through Razorpay. Subscriptions automatically renew unless cancelled. Refunds are provided according to our refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. User Content</h2>
              <p className="text-gray-600 leading-relaxed">
                You retain all rights to the content you create and store in Axora. By using our Service, you grant us a license to host, store, and process your content solely for the purpose of providing the Service. We do not use your private data to train AI models.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Acceptable Use</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit malicious code or viruses</li>
                <li>Attempt to gain unauthorized access</li>
                <li>Use the Service for illegal activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Intellectual Property</h2>
              <p className="text-gray-600 leading-relaxed">
                The Service and its original content, features, and functionality are owned by Axora and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
              <p className="text-gray-600 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                Axora shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of any material changes via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about these Terms, please contact us at:
              </p>
              <p className="text-gray-600 mt-2">
                Email: support@axora.work<br />
                Website: https://axora.work/contact
              </p>
            </section>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20">
        <div className="container px-6 mx-auto max-w-7xl py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/axora-logo-light.png" alt="Axora" className="h-8 w-8" />
                <span className="text-xl font-bold text-gray-900">Axora</span>
              </div>
              <p className="text-sm text-gray-600">Your intelligent work assistant powered by AI.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="/pricing" className="text-sm text-gray-600 hover:text-emerald-600">Pricing</a></li>
                <li><a href="/#features" className="text-sm text-gray-600 hover:text-emerald-600">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="/about" className="text-sm text-gray-600 hover:text-emerald-600">About</a></li>
                <li><a href="/contact" className="text-sm text-gray-600 hover:text-emerald-600">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-sm text-gray-600 hover:text-emerald-600">Privacy Policy</a></li>
                <li><a href="/terms" className="text-sm text-gray-600 hover:text-emerald-600">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-600">© 2025 Axora. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
