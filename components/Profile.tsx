
import React, { useState, useRef } from 'react';
import { usePoker } from '../App';
import { User as UserIcon, CreditCard, Clock, Settings, LogOut, CheckCircle, Trash2, Database, Sliders, DollarSign, Layout, Monitor, Save, Upload } from 'lucide-react';
import { importDatabase } from '../services/storage';

export const Profile: React.FC = () => {
  const { user, setUser, clearAllData, addToast, loadHands } = usePoker();
  
  // Local state for settings form
  const [rakeback, setRakeback] = useState(user?.settings?.rakebackPercentage || 0);
  const [scale, setScale] = useState(user?.settings?.appScale || 1);
  const [density, setDensity] = useState(user?.settings?.uiDensity || 'normal');
  const [hudOpacity, setHudOpacity] = useState(user?.settings?.hudOpacity ?? 1);
  const [currencies, setCurrencies] = useState(JSON.stringify(user?.settings?.currencyRates || { 'USD': 1, 'EUR': 0.92 }, null, 2));
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSaveSettings = () => {
      try {
          const parsedCurrencies = JSON.parse(currencies);
          setUser({
              ...user,
              settings: {
                  ...user.settings,
                  rakebackPercentage: rakeback,
                  appScale: scale,
                  uiDensity: density,
                  hudOpacity: hudOpacity,
                  currencyRates: parsedCurrencies
              }
          });
          addToast({ title: "Settings Saved", type: 'success' });
      } catch (e) {
          addToast({ title: "Invalid JSON", description: "Check currency format", type: 'error' });
      }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              const success = importDatabase(event.target.result as string);
              if (success) {
                  addToast({ title: "Database Imported", description: "Hand history restored successfully.", type: 'success' });
                  loadHands(); // Reload context
              } else {
                  addToast({ title: "Import Failed", description: "Invalid JSON format.", type: 'error' });
              }
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-zinc-500" /> Account & Settings
            </h1>
            <button 
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-6 py-2.5 bg-poker-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition-all shadow-lg shadow-poker-gold/10"
            >
                <Save className="w-4 h-4" /> Save Changes
            </button>
        </div>

        {/* Profile Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-full border-4 border-zinc-800 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                {user.name.charAt(0)}
            </div>
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                <p className="text-zinc-400 mb-4">{user.email}</p>
                <div className="flex gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        user.subscription === 'elite' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        user.subscription === 'pro' ? 'bg-poker-gold/10 text-poker-gold border-poker-gold/20' :
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                        {user.subscription} Plan
                    </span>
                    <button className="text-xs text-zinc-400 hover:text-white underline">Change Password</button>
                </div>
            </div>
            <button 
                onClick={() => setUser(null)}
                className="px-4 py-2 border border-red-900/50 text-red-400 bg-red-900/10 hover:bg-red-900/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
                <LogOut className="w-4 h-4" /> Sign Out
            </button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Display & Layout */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Monitor className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white">Display & Interface</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-zinc-300">App Scaling</span>
                            <span className="text-xs font-mono text-zinc-500">{(scale * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" min="0.75" max="1.25" step="0.05"
                            value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                        <span className="block text-sm text-zinc-300 mb-2">UI Density (Padding)</span>
                        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                            {(['compact', 'normal', 'spacious'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDensity(d)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${
                                        density === d ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm text-zinc-300">Default HUD Opacity</span>
                            <span className="text-xs font-mono text-zinc-500">{(hudOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="1" step="0.1"
                            value={hudOpacity} onChange={(e) => setHudOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Financials & Logic */}
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2 border-b border-zinc-800 pb-4">
                    <div className="p-2 bg-poker-emerald/10 text-poker-emerald rounded-lg">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-white">Financial Logic</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-zinc-300 mb-2">Rakeback Deal (%)</label>
                        <div className="relative">
                            <input 
                                type="number" min="0" max="100"
                                value={rakeback} onChange={(e) => setRakeback(parseFloat(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-poker-emerald"
                            />
                            <span className="absolute right-3 top-2.5 text-zinc-500 text-xs font-bold">%</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">Applied to Net Won calculations (Simulated).</p>
                    </div>

                    <div>
                        <label className="block text-sm text-zinc-300 mb-2">Currency Rates (JSON)</label>
                        <textarea 
                            value={currencies} onChange={(e) => setCurrencies(e.target.value)}
                            className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-3 text-xs font-mono text-zinc-400 focus:outline-none focus:border-poker-emerald resize-none"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Data Management */}
        <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg">
                    <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white">Data Management</h3>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-zinc-300">Local Database Actions</p>
                    <p className="text-xs text-zinc-500">Import backups or wipe data for a fresh start.</p>
                </div>
                
                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Upload className="w-4 h-4" /> Import JSON
                    </button>
                    <button 
                        onClick={() => {
                            if(confirm("Are you sure? This cannot be undone.")) {
                                clearAllData();
                            }
                        }}
                        className="px-4 py-2 border border-red-900/30 hover:bg-red-900/20 text-red-400 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Clear
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
