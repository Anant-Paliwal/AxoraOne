import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEO } from '@/components/SEO';
import { 
  CheckCircle2, 
  Lightbulb, 
  User, 
  Brain, 
  FileText, 
  Network, 
  ListTodo, 
  Users, 
  Shield,
  ArrowRight,
  Star,
  Zap,
  Check
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Intelligence',
    description: 'Advanced AI that learns from your work patterns and provides intelligent suggestions.',
  },
  {
    icon: FileText,
    title: 'Smart Pages',
    description: 'Notion-style pages with AI-powered content generation and organization.',
  },
  {
    icon: Network,
    title: 'Knowledge Graph',
    description: 'Visualize connections between your ideas, tasks, and skills automatically.',
  },
  {
    icon: ListTodo,
    title: 'Task Management',
    description: 'Break down tasks intelligently and track progress with AI-powered insights.',
  },
  {
    icon: Users,
    title: 'Collaborative Workspaces',
    description: 'Work together seamlessly with team members in shared intelligent workspaces.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is encrypted and secure. We never train on your private information.',
  },
];

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '50K+', label: 'Tasks Completed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'User Rating' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    content: 'Axora transformed how our team manages projects. The AI suggestions are incredibly accurate.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'Founder',
    company: 'StartupXYZ',
    content: 'The knowledge graph feature helped us connect ideas we never knew were related. Game changer.',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'Developer',
    company: 'DevStudio',
    content: 'Best productivity tool I\'ve used. The AI actually understands context and helps me stay focused.',
    rating: 5,
  },
];

const howItWorks = [
  {
    step: '1',
    title: 'Create Your Workspace',
    description: 'Set up your intelligent workspace in seconds. Add pages, tasks, and team members.',
  },
  {
    step: '2',
    title: 'Let AI Learn',
    description: 'As you work, Axora learns your patterns and starts making intelligent suggestions.',
  },
  {
    step: '3',
    title: 'Work Smarter',
    description: 'Get AI-powered insights, automated task breakdowns, and intelligent connections.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const { setTheme } = useTheme();

  // Force light theme on landing page
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  const handleGetStarted = () => {
    if (email) {
      navigate('/login', { state: { email } });
    } else {
      navigate('/login');
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Axora - AI-Powered Workspace for Professionals | Task Management & Knowledge Graph"
        description="Axora is an intelligent AI workspace platform for professionals. Smart task management, knowledge graph, AI-powered pages, team collaboration, and skill tracking. Free plan available. Made in India."
        keywords="AI workspace, task management software, knowledge management, productivity tool, AI assistant, notion alternative, project management, team collaboration, knowledge graph, skill tracking, professional productivity, India"
        canonical="https://axora.work/"
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/95 border-b border-gray-200">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img 
                src="/axora-logo-light.png" 
                alt="Axora" 
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">Axora</span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={handleSignIn}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleGetStarted}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-6 mx-auto max-w-7xl pt-16 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Your <span className="text-emerald-600">Intelligent</span>
              <br />
              Work Assistant
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              An AI-powered workspace that learns what matters and keeps you focused on moving forward.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 px-4 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <Button 
                onClick={handleGetStarted}
                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium whitespace-nowrap"
              >
                Get Started for Free
              </Button>
            </div>
            
            <p className="text-sm text-gray-500">
              No credit card required.
            </p>

            {/* Company Logos */}
            <div className="pt-8">
              <p className="text-sm text-gray-500 mb-4">Loved by startups and teams at</p>
              <div className="flex flex-wrap items-center gap-8 opacity-60">
                <svg className="h-6" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                </svg>
                <svg className="h-6" viewBox="0 0 24 24" fill="#FF9900">
                  <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.13.226-.088.39-.046.525.13.12.174.09.336-.12.48-.256.19-.6.41-1.006.654-1.244.743-2.64 1.316-4.185 1.726-1.53.406-3.045.61-4.516.61-2.265 0-4.463-.276-6.59-.825-2.13-.545-4.184-1.524-6.16-2.933-.165-.12-.21-.24-.135-.36zm1.006-3.192c-.09-.148-.044-.283.135-.405 2.05-1.39 4.317-2.39 6.8-3.01 2.48-.62 4.94-.93 7.378-.93 1.87 0 3.683.186 5.44.558 1.762.37 3.43.99 5.007 1.86.18.098.27.235.27.41 0 .15-.06.27-.18.36-.165.12-.345.09-.54-.09-1.62-1.17-3.39-1.98-5.31-2.43-1.92-.45-3.87-.675-5.85-.675-2.385 0-4.73.3-7.035.9-2.3.6-4.446 1.528-6.435 2.79-.165.12-.315.135-.45.045-.135-.09-.21-.21-.225-.375zm1.26-3.433c-.09-.15-.045-.285.135-.405 2.23-1.515 4.677-2.595 7.343-3.24 2.666-.645 5.34-.968 8.02-.968 2.01 0 3.97.21 5.88.63 1.91.42 3.73 1.11 5.46 2.07.18.105.27.24.27.405 0 .15-.06.27-.18.36-.165.12-.345.09-.54-.09-1.77-1.29-3.72-2.175-5.85-2.655-2.13-.48-4.29-.72-6.48-.72-2.595 0-5.13.315-7.605.945-2.475.63-4.8 1.62-6.975 2.97-.165.12-.315.135-.45.045-.135-.09-.21-.21-.225-.375z"/>
                </svg>
                <span className="text-xl font-bold text-gray-800">amazon</span>
                <svg className="h-6" viewBox="0 0 24 24" fill="#0530AD">
                  <path d="M15.57 0h-7.14C3.78 0 0 3.78 0 8.43v7.14C0 20.22 3.78 24 8.43 24h7.14c4.65 0 8.43-3.78 8.43-8.43V8.43C24 3.78 20.22 0 15.57 0zM8.43 18.86h-2.7V8.43h2.7v10.43zm10.43 0h-2.7v-5.22c0-1.39-.5-2.34-1.74-2.34-.95 0-1.51.64-1.76 1.26-.09.22-.11.53-.11.84v5.46h-2.7s.04-8.86 0-9.78h2.7v1.39c.36-.56 1-1.35 2.43-1.35 1.77 0 3.1 1.16 3.1 3.65v6.09z"/>
                </svg>
                <svg className="h-6" viewBox="0 0 24 24" fill="#0668E1">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-xl font-bold text-orange-500">Zapier</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Product Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Mock Dashboard UI */}
              <div className="bg-gray-50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Axora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  </div>
                </div>

                {/* Today's Focus Card */}
                <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-900">Today's Focus</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Review next experiment task to advance project</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-emerald-600 text-white text-xs h-7">
                      Project Status
                    </Button>
                    <span className="text-xs text-gray-500">28 AM</span>
                  </div>
                </div>

                {/* Workspace Overview */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">Workspace Overview</span>
                    <button className="text-gray-400 hover:text-gray-600">⋯</button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Task execution is lagging behind plans</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span>🔴 5 Tasks Delayed</span>
                    <span>🟢 12 Pages Active</span>
                    <span>🟢 3 Skills Need Review</span>
                  </div>
                  
                  {/* Chart placeholder */}
                  <div className="h-20 bg-gradient-to-r from-emerald-50 to-teal-50 rounded flex items-end justify-around p-2">
                    <div className="w-8 bg-emerald-400 rounded-t" style={{height: '40%'}}></div>
                    <div className="w-8 bg-emerald-400 rounded-t" style={{height: '60%'}}></div>
                    <div className="w-8 bg-emerald-400 rounded-t" style={{height: '45%'}}></div>
                    <div className="w-8 bg-emerald-400 rounded-t" style={{height: '80%'}}></div>
                    <div className="w-8 bg-emerald-500 rounded-t" style={{height: '95%'}}></div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-700 mb-2 block">Quick Actions</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Review Tasks</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Lightbulb className="h-3 w-3 text-emerald-500" />
                        <span>Plan Next Milestone</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Axora Section */}
      <section className="container px-6 mx-auto max-w-7xl py-20 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Why Axora? Work smarter, not harder
          </h2>
          <p className="text-gray-600">(No code, no chaos)</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Smart Task Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Smart Task Management</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Break down tasks intelligently and track progress with AI-powered insights.
              </p>
              <a href="#" className="text-emerald-600 text-sm font-medium hover:underline">
                Learn more →
              </a>
            </div>

            {/* Mini cards */}
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-3">
                <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Research competitors</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>🔍 By tomorrow</span>
                    <span>⏰ 2pm</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-3">
                <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Spread goals weekly</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>📊 By Fri</span>
                    <div className="flex -space-x-1">
                      <div className="h-4 w-4 bg-purple-400 rounded-full border border-white"></div>
                      <div className="h-4 w-4 bg-green-400 rounded-full border border-white"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Skills That Help You Think */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Skills That Help You Think</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Level up with Axora's AI Skills that improve your planning, decisions, and learning.
              </p>
              <a href="#" className="text-emerald-600 text-sm font-medium hover:underline">
                Learn more →
              </a>
            </div>

            {/* Skill cards */}
            <div className="space-y-2">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center">
                    <Brain className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Sora Python</div>
                    <div className="text-xs text-gray-500">Deepen your favorite programming skills</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-yellow-400 text-xs">★★★★★</div>
                  <span className="text-xs text-gray-500">👤 Helpers</span>
                  <span className="text-xs text-gray-500">🎯 Goals</span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 bg-purple-100 rounded flex items-center justify-center">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Focus Protector</div>
                    <div className="text-xs text-gray-500">Monitoring your today's results to assist</div>
                  </div>
                </div>
                <Button size="sm" className="w-full bg-emerald-600 text-white text-xs h-7">
                  + Add Skill
                </Button>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center">
                    <Zap className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">Task Optimizer</div>
                    <div className="text-xs text-gray-500">🎯 Daily</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Personalized Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Personalized Insights</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Get tailored suggestions based on your unique work patterns.
              </p>
              <a href="#" className="text-emerald-600 text-sm font-medium hover:underline">
                Learn more →
              </a>
            </div>

            {/* Insight cards */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">✓ Completed</span>
                  <span className="text-xs text-gray-400 ml-auto">+8%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">📊 In Progress</span>
                  <span className="text-xs text-gray-400 ml-auto">12</span>
                </div>
                <div className="h-16 bg-gradient-to-r from-emerald-50 to-teal-50 rounded flex items-end justify-around p-1">
                  <div className="w-4 bg-emerald-400 rounded-t" style={{height: '50%'}}></div>
                  <div className="w-4 bg-emerald-400 rounded-t" style={{height: '70%'}}></div>
                  <div className="w-4 bg-emerald-400 rounded-t" style={{height: '40%'}}></div>
                  <div className="w-4 bg-emerald-500 rounded-t" style={{height: '90%'}}></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section className="container px-6 mx-auto max-w-7xl py-20 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need in one place
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From smart pages to team collaboration, Axora brings all your work together.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Smart Pages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
          >
            <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
              <FileText className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Pages</h3>
            <p className="text-gray-600 mb-6">
              Create beautiful, organized pages with AI-powered content generation. Notion-style blocks with intelligent suggestions.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Rich text editor with AI assistance</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Drag-and-drop blocks</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Templates and databases</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Real-time collaboration</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              Learn More
            </Button>
          </motion.div>

          {/* Team Collaboration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
          >
            <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
              <Users className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Team Collaboration</h3>
            <p className="text-gray-600 mb-6">
              Work together seamlessly with your team. Share workspaces, assign tasks, and track progress in real-time.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Shared workspaces</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Role-based permissions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Activity tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Comments and mentions</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              Learn More
            </Button>
          </motion.div>

          {/* Smart Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
          >
            <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
              <ListTodo className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Tasks</h3>
            <p className="text-gray-600 mb-6">
              AI-powered task management that learns from your work patterns and helps you stay focused on what matters.
            </p>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">AI task breakdown</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Priority suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Progress tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Deadline reminders</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Adding Intelligence Section */}
      <section className="container px-6 mx-auto max-w-7xl py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-4xl font-bold text-gray-900">
              Adding Intelligence,<br />Not Just AI
            </h2>
            <p className="text-gray-600">(No code, no chaos)</p>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              Build your custom toolkit of <span className="font-semibold text-emerald-600">AI Skills</span>
            </p>
            
            <p className="text-gray-600">
              Add Skills that level up your planning, focusing, and decision-making.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Choose from 20+ Skills</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Skills learn from your work</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">No coding or setup needed</span>
              </div>
            </div>

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Explore Skills
            </Button>
          </motion.div>

          {/* Right Column - Skills Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Axora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  </div>
                </div>

                {/* Workspace Info */}
                <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-900">Windmind, Poylance</span>
                  </div>
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 bg-orange-100 rounded flex items-center justify-center">
                        <Lightbulb className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">Idea Validator</div>
                        <div className="text-xs text-gray-500">🎯 Pro Skills</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Bounce off new work problems</p>
                    <Button size="sm" className="w-full bg-orange-500 text-white text-xs h-6">
                      + Add Skill
                    </Button>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 bg-emerald-100 rounded flex items-center justify-center">
                        <Shield className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">Focus Protector</div>
                        <div className="text-xs text-gray-500">⚡ Core Skills</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Monitoring your today's results</p>
                    <Button size="sm" className="w-full bg-emerald-600 text-white text-xs h-6">
                      + Add Skill
                    </Button>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 bg-green-100 rounded flex items-center justify-center">
                        <Zap className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">Task Optimizer</div>
                        <div className="text-xs text-gray-500">⚡ Core Skills</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Prioritize tasks and optimize</p>
                    <Button size="sm" className="w-full bg-green-600 text-white text-xs h-6">
                      + Add Skill
                    </Button>
                  </div>
                </div>

                {/* What's Helping Section */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900">What's helping</span>
                    <button className="text-gray-400 hover:text-gray-600">⋯</button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-emerald-100 rounded flex items-center justify-center">
                          <Brain className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">MVP Clarity</div>
                          <div className="text-xs text-gray-500">🎯 Skill: Skills</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                        Add Skill
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-purple-100 rounded flex items-center justify-center">
                          <ListTodo className="h-3 w-3 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">Milestone Maker</div>
                          <div className="text-xs text-gray-500">⚡ Execution Planner</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                        Add Skill
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-orange-100 rounded flex items-center justify-center">
                          <FileText className="h-3 w-3 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">Python Silem</div>
                          <div className="text-xs text-gray-500">🎯 Skill: Skills</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                        Add Skill
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-emerald-100 rounded flex items-center justify-center">
                          <Brain className="h-3 w-3 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-900">Decision Analyzer</div>
                          <div className="text-xs text-gray-500">⚡ Skill: Skills</div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                        Add Skill
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-6 mx-auto max-w-7xl py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-12 text-center text-white"
        >
          <h2 className="text-4xl font-bold mb-4">
            Ready to work smarter?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of teams already using Axora to boost their productivity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-12 px-4 bg-white text-gray-900 border-0"
            />
            <Button 
              onClick={handleGetStarted}
              className="h-12 px-8 bg-white text-emerald-600 hover:bg-gray-100 font-medium whitespace-nowrap"
            >
              Start Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm mt-4 opacity-75">
            No credit card required • Free forever for personal use
          </p>
        </motion.div>
      </section>

      {/* Stats & Social Proof */}
      <section className="container px-6 mx-auto max-w-7xl py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-gray-900 mb-2">10K+</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-gray-900 mb-2">50K+</div>
            <div className="text-sm text-gray-600">Tasks Completed</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
            <div className="text-sm text-gray-600">Uptime</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-gray-900 mb-2">4.9/5</div>
            <div className="text-sm text-gray-600">User Rating</div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/axora-logo-light.png" 
                  alt="Axora" 
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold text-gray-900">Axora</span>
              </div>
              <p className="text-sm text-gray-600">
                Your intelligent work assistant powered by AI.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/#features" className="hover:text-emerald-600">Features</a></li>
                <li><a href="/pricing" className="hover:text-emerald-600">Pricing</a></li>
                <li><a href="/login" className="hover:text-emerald-600">Sign In</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/about" className="hover:text-emerald-600">About</a></li>
                <li><a href="/contact" className="hover:text-emerald-600">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="/privacy" className="hover:text-emerald-600">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-emerald-600">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>© 2025 Axora. All rights reserved. | All prices in Indian Rupees (INR)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
