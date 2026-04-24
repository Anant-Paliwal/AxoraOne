import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { Brain, Users, Target, Zap } from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="About Axora - AI-Powered Workspace Platform | Our Mission"
        description="Learn about Axora, the intelligent AI workspace platform built for professionals. Our mission is to empower teams with smart task management, knowledge graphs, and AI-powered collaboration tools."
        keywords="about axora, AI workspace company, productivity platform, team collaboration tool, knowledge management system, India startup"
        canonical="https://axora.work/about"
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

      {/* Hero */}
      <section className="container px-6 mx-auto max-w-4xl pt-20 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">About Axora</h1>
          <p className="text-xl text-gray-600">
            We're building the future of intelligent work management
          </p>
        </motion.div>

        {/* Mission */}
        <div className="prose prose-lg max-w-none mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            Axora is on a mission to help individuals and teams work smarter, not harder. We believe that AI should augment human intelligence, not replace it. Our platform combines the best of human creativity with AI-powered insights to help you achieve more.
          </p>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gray-50 rounded-xl p-8">
            <Brain className="h-12 w-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI-First</h3>
            <p className="text-gray-600">
              We leverage cutting-edge AI to provide intelligent suggestions and automate repetitive tasks.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-8">
            <Users className="h-12 w-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">User-Centric</h3>
            <p className="text-gray-600">
              Every feature is designed with our users in mind, ensuring a seamless and intuitive experience.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-8">
            <Target className="h-12 w-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Focus on Results</h3>
            <p className="text-gray-600">
              We help you stay focused on what matters most and achieve your goals faster.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-8">
            <Zap className="h-12 w-12 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Continuous Innovation</h3>
            <p className="text-gray-600">
              We're constantly improving and adding new features based on user feedback.
            </p>
          </div>
        </div>

        {/* Story */}
        <div className="prose prose-lg max-w-none mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Axora was born out of frustration with existing productivity tools that promised to help but ended up creating more work. We saw teams drowning in tasks, losing track of important information, and struggling to collaborate effectively.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We set out to build something different - a platform that truly understands your work, learns from your patterns, and provides intelligent assistance when you need it most. Today, Axora helps thousands of individuals and teams work more efficiently and achieve their goals.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-emerald-50 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
          <p className="text-lg text-gray-600 mb-6">
            Join thousands of users who are already working smarter with Axora.
          </p>
          <Button onClick={() => navigate('/login')} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Start Free Trial
          </Button>
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
