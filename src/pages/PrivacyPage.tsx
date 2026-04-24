import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Privacy Policy - Axora AI Workspace | Data Protection"
        description="Axora's Privacy Policy. Learn how we collect, use, and protect your data. GDPR compliant. We never train AI models on your private data. Last updated: January 26, 2025."
        keywords="privacy policy, data protection, GDPR, data security, privacy terms, user data"
        canonical="https://axora.work/privacy"
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
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 26, 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                Welcome to Axora. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we collect, use, and safeguard your information when you use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Account Information:</strong> Name, email address, password (encrypted)</li>
                <li><strong>Profile Data:</strong> Profile picture, workspace preferences</li>
                <li><strong>Content Data:</strong> Pages, tasks, notes, and other content you create</li>
                <li><strong>Usage Data:</strong> How you interact with our Service, features used</li>
                <li><strong>Device Information:</strong> Browser type, IP address, device identifiers</li>
                <li><strong>Payment Information:</strong> Processed securely through Razorpay (we don't store card details)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide and maintain our Service</li>
                <li>Process your transactions and subscriptions</li>
                <li>Send you updates, notifications, and support messages</li>
                <li>Improve and personalize your experience</li>
                <li>Analyze usage patterns to enhance features</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. AI and Data Processing</h2>
              <p className="text-gray-600 leading-relaxed">
                Axora uses AI features to enhance your productivity. When you use AI features, your content may be 
                processed by third-party AI providers (Google Gemini, OpenAI). We do not use your private data to 
                train AI models. Your content remains yours, and we only process it to provide the requested AI features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We do not sell your personal data. We may share your information with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Service Providers:</strong> Hosting (Supabase), payments (Razorpay), AI (Google, OpenAI)</li>
                <li><strong>Team Members:</strong> When you share workspaces or collaborate</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-600 leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption in transit 
                and at rest, secure authentication, regular security audits, and access controls. However, no method of 
                transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-600 leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide services. When you 
                delete content, it moves to trash for 30 days before permanent deletion. You can request account 
                deletion at any time, and we will delete your data within 90 days, except where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent for data processing</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                To exercise these rights, contact us at support@axora.work
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Cookies and Tracking</h2>
              <p className="text-gray-600 leading-relaxed">
                We use cookies and similar technologies to maintain your session, remember preferences, and analyze 
                usage. You can control cookies through your browser settings, but disabling them may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Services</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our Service integrates with third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Supabase:</strong> Database and authentication</li>
                <li><strong>Razorpay:</strong> Payment processing</li>
                <li><strong>Google Gemini:</strong> AI features</li>
                <li><strong>OpenAI:</strong> AI features</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                These services have their own privacy policies, which we encourage you to review.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Children's Privacy</h2>
              <p className="text-gray-600 leading-relaxed">
                Our Service is not intended for children under 13. We do not knowingly collect data from children. 
                If you believe we have collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. International Data Transfers</h2>
              <p className="text-gray-600 leading-relaxed">
                Your data may be transferred to and processed in countries other than India. We ensure appropriate 
                safeguards are in place to protect your data in accordance with this privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to This Policy</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this privacy policy from time to time. We will notify you of significant changes via 
                email or through the Service. Your continued use after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have questions about this privacy policy or our data practices, please contact us:
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
