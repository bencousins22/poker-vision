import React, { useState } from 'react';
import { usePoker } from '../App';
import { Check, Zap, Shield, Crown, CreditCard, Loader2 } from 'lucide-react';
import { SubscriptionTier } from '../types';

export const Pricing: React.FC = () => {
  const { setUser, user } = usePoker();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [processing, setProcessing] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = (tier: SubscriptionTier) => {
    setProcessing(tier);
    // Simulate Payment API
    setTimeout(() => {
      if (user) {
        setUser({ ...user, subscription: tier, billingCycle, nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000 });
      }
      setProcessing(null);
    }, 2000);
  };

  const PlanCard: React.FC<{ tier: SubscriptionTier, price: number, features: string[], icon: any, popular?: boolean }> = ({ tier, price, features, icon: Icon, popular }) => {
    const isCurrent = user?.subscription === tier;
    
    return (
      <div className={`relative flex flex-col p-8 bg-surface border ${popular ? 'border-poker-gold shadow-[0_0_30px_rgba(251,191,36,0.1)]' : 'border-border'} rounded-2xl transition-all hover:border-zinc-600`}>
        {popular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-poker-gold text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                Most Popular
            </div>
        )}
        
        <div className="mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${popular ? 'bg-poker-gold/20 text-poker-gold' : 'bg-zinc-800 text-zinc-400'}`}>
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white capitalize">{tier}</h3>
            <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold text-white">${billingCycle === 'annual' ? (price * 0.8).toFixed(0) : price}</span>
                <span className="text-zinc-500 text-sm ml-1">/mo</span>
            </div>
            {billingCycle === 'annual' && price > 0 && (
                <span className="text-[10px] text-green-400 font-mono mt-1 block">Billed annually (Save 20%)</span>
            )}
        </div>

        <ul className="flex-1 space-y-4 mb-8">
            {features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-poker-emerald shrink-0 mt-0.5" />
                    <span>{feat}</span>
                </li>
            ))}
        </ul>

        <button 
            onClick={() => handleUpgrade(tier)}
            disabled={isCurrent || processing !== null}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isCurrent 
                ? 'bg-zinc-800 text-zinc-500 cursor-default' 
                : popular 
                    ? 'bg-poker-gold text-black hover:bg-yellow-500 shadow-lg' 
                    : 'bg-white text-black hover:bg-zinc-200'
            }`}
        >
            {processing === tier ? (
                <Loader2 className="animate-spin w-4 h-4" />
            ) : isCurrent ? (
                "Current Plan"
            ) : (
                <>
                   {price === 0 ? "Get Started" : "Upgrade Now"} 
                </>
            )}
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-background">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white">Upgrade your Game</h1>
            <p className="text-zinc-400 max-w-2xl mx-auto">Unlock GTO analysis, unlimited cloud storage, and advanced player profiling with our Pro tiers.</p>
            
            <div className="inline-flex items-center p-1 bg-zinc-900 rounded-xl border border-border mt-6">
                <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                >
                    Monthly
                </button>
                <button 
                    onClick={() => setBillingCycle('annual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'annual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                >
                    Annual
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <PlanCard 
                tier="free"
                price={0}
                icon={Shield}
                features={[
                    "5 Video Analyses / mo",
                    "Basic Stats (VPIP, PFR)",
                    "Local Storage Only",
                    "Community Support"
                ]}
            />
            <PlanCard 
                tier="pro"
                price={29}
                icon={Zap}
                popular={true}
                features={[
                    "50 Video Analyses / mo",
                    "Advanced HUD & Filtering",
                    "Cloud Backup",
                    "GTO Strategy Coach (Basic)",
                    "Export to HM3/PT4"
                ]}
            />
            <PlanCard 
                tier="elite"
                price={99}
                icon={Crown}
                features={[
                    "Unlimited Analysis",
                    "Live Real-time Assistant",
                    "Deep Solver Integration",
                    "Priority Support",
                    "Team Sharing Features"
                ]}
            />
        </div>

        <div className="bg-zinc-900/50 border border-border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-800 rounded-full text-white">
                    <CreditCard className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white">Secure Payment Processing</h3>
                    <p className="text-sm text-zinc-500">We use Stripe and PayPal for 256-bit encrypted transactions.</p>
                </div>
            </div>
            <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                {/* Mock Logos */}
                <div className="font-bold italic text-white text-xl">stripe</div>
                <div className="font-bold italic text-blue-500 text-xl">PayPal</div>
            </div>
        </div>
      </div>
    </div>
  );
};
