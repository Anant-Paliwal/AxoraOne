import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { SEO } from '@/components/SEO';

const plans = [
  {
    name: 'Free',
    price: 'Free',
    period: 'Forever',
    description: 'Perfect for individuals getting started',
    features: [
      '5 workspaces',
      '3 collaborators',
      '10 Ask Anything/day',
      '7-day page history',
      'Unlimited pages & tasks',
      '4 core skills',
      'Knowledge graph',
    ],
    notIncluded: [],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: '/month',
    description: 'For professionals who need more power',
    features: [
      '20 workspaces',
      '10 collaborators',
      '100 Ask Anything/day',
      '30-day page history',
      'Unlimited pages & tasks',
      '4 core skills',
      'Knowledge graph',
      'Edit page sharing',
      'Task assignment',
      'Skill insights history (30 days)',
      'Advanced knowledge graph',
    ],
    notIncluded: [],
    cta: 'Start Pro',
    popular: true,
  },
  {
    name: 'Pro Plus',
    price: '₹999',
    period: '/month',
    description: 'For teams and power users',
    features: [
      'Unlimited workspaces',
      'Unlimited collaborators',
      '300 Ask Anything/day',
      '90-day page history',
      'Unlimited pages & tasks',
      '4 core skills',
      'Knowledge graph',
      'Edit page sharing',
      'Task assignment',
      'Skill insights history (90 days)',
      'Team pulse insights',
      'Advanced knowledge graph',
    ],
    notIncluded: [],
    cta: 'Start Pro Plus',
    popular: false,
  },
];

export function PricingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Pricing - Axora AI Workspace | Free, ₹499, ₹999 Plans"
        description="Transparent pricing for Axora AI workspace. Free plan available. Pro at ₹499/month, Pro Plus at ₹999/month. Smart task management, knowledge graph, team collaboration. Made in India."
        keywords="axora pricing, AI workspace pricing, task management pricing, productivity tool cost, notion alternative pricing, team collaboration pricing, India pricing INR"
        canonical="https://axora.work/pricing"
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
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/login')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-6 mx-auto max-w-7xl pt-20 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that's right for you. All prices in Indian Rupees (INR).
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl border-2 p-8 ${
                plan.popular ? 'border-emerald-600 shadow-xl' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className={`w-full mb-6 ${
                  plan.popular
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                {plan.cta}
              </Button>

              <div className="space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-50">
                    <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-500">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans later?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
              <p className="text-gray-600">Yes! Starter and Pro plans come with a 14-day free trial. No credit card required.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">Yes, you can cancel your subscription at any time. No questions asked.</p>
            </div>
          </div>
        </div>
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
              <p className="text-sm text-gray-600">
                Your intelligent work assistant powered by AI.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="/pricing" className="text-sm text-gray-600 hover:text-emerald-600">Pricing</a></li>
                <li><a href="/#features" className="text-sm text-gray-600 hover:text-emerald-600">Features</a></li>
                <li><a href="/login" className="text-sm text-gray-600 hover:text-emerald-600">Sign In</a></li>
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
            <p className="text-sm text-gray-600">
              © 2025 Axora. All rights reserved. | All prices in Indian Rupees (INR)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
