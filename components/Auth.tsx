import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { DEFAULT_RANGES } from '../services/pokerLogic';

interface Props {
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const Auth: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Create a real session object
    // In a full stack app, this would validate against a backend
    // Here we create a valid user object to persist in localStorage
    const newUser: User = {
      id: crypto.randomUUID(),
      name: email.split('@')[0] || 'Player',
      email: email,
      subscription: 'free', 
      billingCycle: 'monthly',
      credits: 5,
      nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      settings: {
          rakebackPercentage: 0,
          currencyRates: { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79 },
          appScale: 1,
          uiDensity: 'normal',
          hudOpacity: 1,
          tagTemplates: ['Bad Beat', 'Bluff Catch', 'Misclick', 'Cooler', 'GTO'],
          savedRanges: DEFAULT_RANGES
      }
    };

    // Small delay for UX transition
    setTimeout(() => {
      onSuccess(newUser);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-poker-gold/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to access your player database</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Email Address</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-600" />
                    <input 
                        type="email" 
                        required
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-colors outline-none"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-600" />
                    <input 
                        type="password" 
                        required
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-colors outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>
            </div>

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-poker-gold hover:bg-yellow-500 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
        </form>

        <div className="mt-6 text-center">
            <button onClick={onCancel} className="text-sm text-gray-500 hover:text-white transition-colors">
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};