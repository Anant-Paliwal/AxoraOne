import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  price_monthly_inr: number;
  price_yearly_inr: number | null;
  workspaces_limit: number | null;
  collaborators_limit: number | null;
  ask_anything_daily_limit: number;
  page_history_days: number;
  can_share_workspace: boolean;
  can_share_page_readonly: boolean;
  can_share_page_edit: boolean;
  can_assign_tasks: boolean;
  can_team_pulse: boolean;
  can_skill_insights_history: boolean;
  skill_insights_history_days: number;
  knowledge_graph_level: string;
  sort_order: number;
}

interface SubscriptionStatus {
  subscription: any;
  plan: Plan;
  usage: {
    workspaces: {
      used: number;
      limit: number | null;
      unlimited: boolean;
    };
    ask_anything: {
      limit: number;
      used: number;
      remaining: number;
    };
  };
  status: string;
  billing_cycle: string | null;
}

export default function SubscriptionPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentStatus, setCurrentStatus] = useState<SubscriptionStatus | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  const activeWorkspaceId = workspaceId || currentWorkspace?.id;

  useEffect(() => {
    loadData();
  }, [activeWorkspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const plansRes = await api.getSubscriptionPlans();
      if (Array.isArray(plansRes)) {
        setPlans(plansRes);
      } else {
        console.error('Invalid plans response:', plansRes);
        setPlans([]);
      }

      const statusRes = await api.getCurrentSubscription();
      if (statusRes) {
        setCurrentStatus(statusRes);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    try {
      setLoading(true);
      
      const result = await api.upgradeSubscription(planCode, billingCycle);
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = () => {
        const options = {
          key: result.razorpay_key,
          subscription_id: result.subscription_id,
          name: 'Axora',
          description: `${planCode} Plan - ${billingCycle}`,
          handler: async (response: any) => {
            try {
              await api.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature
              });
              
              toast.success(`Successfully upgraded to ${planCode}!`);
              loadData();
            } catch (error: any) {
              toast.error(error.message || 'Payment verification failed');
            }
          },
          prefill: {
            email: currentStatus?.subscription?.user_id || ''
          },
          theme: {
            color: '#3399cc'
          },
          modal: {
            ondismiss: () => {
              toast.info('Payment cancelled');
              setLoading(false);
            }
          }
        };
        
        // @ts-ignore
        const razorpay = new window.Razorpay(options);
        razorpay.open();
      };
      
      script.onerror = () => {
        toast.error('Failed to load payment gateway');
        setLoading(false);
      };
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to upgrade subscription');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.cancelSubscription(false);
      toast.success('Subscription cancelled, downgraded to Free plan');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel subscription');
    }
  };

  const getPlanIcon = (planCode: string) => {
    switch (planCode) {
      case 'FREE': return <Zap className="w-6 h-6" />;
      case 'PRO': return <Crown className="w-6 h-6" />;
      case 'PRO_PLUS': return <Sparkles className="w-6 h-6" />;
      default: return <Zap className="w-6 h-6" />;
    }
  };

  const formatPrice = (plan: Plan) => {
    const price = billingCycle === 'yearly' ? plan.price_yearly_inr : plan.price_monthly_inr;
    if (price === 0) return 'Free';
    
    const monthlyPrice = billingCycle === 'yearly' && plan.price_yearly_inr ? 
      (plan.price_yearly_inr / 12).toFixed(0) : price;
    
    return (
      <div>
        <span className="text-3xl font-bold">₹{monthlyPrice}</span>
        <span className="text-muted-foreground">/month</span>
        {billingCycle === 'yearly' && plan.price_yearly_inr && (
          <div className="text-sm text-green-600">Billed ₹{plan.price_yearly_inr}/year</div>
        )}
      </div>
    );
  };

  const getPlanFeatures = (plan: Plan) => {
    const features = [];
    
    features.push({
      label: plan.workspaces_limit === null ? 'Unlimited workspaces' : `${plan.workspaces_limit} workspaces`,
      included: true
    });
    
    features.push({
      label: plan.collaborators_limit === null ? 'Unlimited collaborators' : `${plan.collaborators_limit} collaborators`,
      included: true
    });
    
    features.push({
      label: `${plan.ask_anything_daily_limit} Ask Anything/day`,
      included: true
    });
    
    features.push({
      label: `${plan.page_history_days}-day page history`,
      included: true
    });
    
    features.push({ label: 'Unlimited pages & tasks', included: true });
    features.push({ label: '4 core skills', included: true });
    features.push({ label: 'Knowledge graph', included: true });
    
    if (plan.can_share_page_edit) {
      features.push({ label: 'Edit page sharing', included: true });
    }
    
    if (plan.can_assign_tasks) {
      features.push({ label: 'Task assignment', included: true });
    }
    
    if (plan.can_skill_insights_history) {
      features.push({ 
        label: `Skill insights history (${plan.skill_insights_history_days} days)`, 
        included: true 
      });
    }
    
    if (plan.can_team_pulse) {
      features.push({ label: 'Team pulse insights', included: true });
    }
    
    if (plan.knowledge_graph_level === 'advanced') {
      features.push({ label: 'Advanced knowledge graph', included: true });
    }
    
    return features;
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Choose the plan that works best for you
        </p>
      </div>

      {currentStatus && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Plan: {currentStatus.plan.name}</CardTitle>
            <CardDescription>
              {currentStatus.usage.workspaces.unlimited ? 'Unlimited' : currentStatus.usage.workspaces.used} / {currentStatus.usage.workspaces.unlimited ? '∞' : currentStatus.usage.workspaces.limit} workspaces used
              {' • '}
              {currentStatus.usage.ask_anything.used} / {currentStatus.usage.ask_anything.limit} Ask Anything used today
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border p-1">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">Save 17%</Badge>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans && plans.length > 0 ? plans.map((plan) => {
          if (!plan) return null;
          
          const isCurrentPlan = currentStatus?.plan.code === plan.code;
          const features = getPlanFeatures(plan);
          const isMostPopular = plan.code === 'PRO';
          
          return (
            <Card 
              key={plan.id}
              className={`${isCurrentPlan ? 'border-primary shadow-lg' : ''} ${isMostPopular ? 'border-2 border-primary' : ''} relative`}
            >
              {isMostPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  {getPlanIcon(plan.code)}
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  {formatPrice(plan)}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full mb-4"
                  disabled={isCurrentPlan || plan.code === 'FREE'}
                  onClick={() => handleUpgrade(plan.code)}
                  variant={isMostPopular ? 'default' : 'outline'}
                >
                  {isCurrentPlan ? 'Current Plan' : plan.code === 'FREE' ? 'Free Forever' : `Start ${plan.name}`}
                  {!isCurrentPlan && plan.code !== 'FREE' && <ArrowRight className="ml-2 w-4 h-4" />}
                </Button>

                <div className="space-y-2">
                  {features && features.length > 0 ? features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature.label}</span>
                    </div>
                  )) : null}
                </div>
              </CardContent>
            </Card>
          );
        }) : (
          <div className="col-span-3 text-center py-8 text-muted-foreground">
            No plans available
          </div>
        )}
      </div>

      {currentStatus && currentStatus.plan.code !== 'FREE' && (
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel Subscription
          </Button>
        </div>
      )}
    </div>
  );
}
