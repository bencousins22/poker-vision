
import React, { useState } from 'react';
import { User } from '../types';
import { Mail, Lock, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { DEFAULT_RANGES } from '../services/pokerLogic';
import { useGoogleLogin } from '@react-oauth/google';

interface Props {
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const Auth: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createSession = (emailStr: string, nameStr: string, accessToken?: string): User => ({
      id: crypto.randomUUID(),
      name: nameStr,
      email: emailStr,
      subscription: 'free', 
      billingCycle: 'monthly',
      credits: 10,
      nextBillingDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      settings: {
          rakebackPercentage: 0,
          currencyRates: { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79 },
          appScale: 1,
          uiDensity: 'normal',
          hudOpacity: 1,
          tagTemplates: ['Bad Beat', 'Bluff Catch', 'Misclick', 'Cooler', 'GTO'],
          savedRanges: DEFAULT_RANGES,
          ai: {
              provider: accessToken ? 'google-oauth' : 'google',
              model: 'gemini-3-flash-preview',
              googleApiKey: '',
              openRouterApiKey: '',
              accessToken: accessToken
          },
          gcp: accessToken ? {
              projectId: '', // User must still fill this or we fetch it
              bucketName: '',
              datasetId: '',
              tableId: '',
              accessToken: accessToken
          } : undefined
      }
  });

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch User Profile
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        if (!userInfo.email) throw new Error("Could not retrieve email.");

        const user = createSession(userInfo.email, userInfo.name, tokenResponse.access_token);
        onSuccess(user);
      } catch (e: any) {
        setError("Failed to fetch user profile: " + e.message);
        setIsLoading(false);
      }
    },
    onError: (errorResponse) => {
        setError("Google Login Failed: " + (errorResponse.error_description || "Pop-up closed or blocked."));
        setIsLoading(false);
    },
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language.retriever https://www.googleapis.com/auth/youtube.readonly email profile openid',
    flow: 'implicit' 
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onSuccess(createSession(email, email.split('@')[0] || 'Player'));
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-poker-gold/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 mb-4 border border-zinc-700 shadow-inner">
                <Lock className="w-6 h-6 text-poker-gold" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-zinc-400 text-sm">Sign in to sync your hand database</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-2 text-xs text-red-400 animate-in slide-in-from-top-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
            </div>
        )}

        <div className="space-y-4">
            <button 
                onClick={() => login()}
                disabled={isLoading}
                className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
                {isLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <span>Continue with Google Cloud</span>
                    </>
                )}
            </button>

            <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                <span className="relative bg-zinc-900 px-4 text-xs text-zinc-500 font-medium uppercase">Or continue with email</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label htmlFor="auth-email" className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                        <input 
                            id="auth-email"
                            name="email"
                            type="email" 
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-colors outline-none"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="auth-password" className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-600 group-focus-within:text-white transition-colors" />
                        <input 
                            id="auth-password"
                            name="password"
                            type="password" 
                            required
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white focus:border-poker-gold focus:ring-1 focus:ring-poker-gold transition-colors outline-none"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 mt-6 border border-zinc-700"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </button>
            </form>
        </div>

        <div className="mt-6 text-center">
            <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-white transition-colors">
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};
