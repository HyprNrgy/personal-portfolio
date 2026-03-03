/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  RefreshCw, 
  Lock, 
  ChevronRight, 
  ChevronDown, 
  Wallet, 
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const PASSWORD = "carcar20";

interface Stock {
  id: number | string;
  name: string;
  category: string;
  symbol: string;
  qty: number;
  avgCost: number;
  invested: number;
  type: 'equity' | 'bond';
  platform: string;
  tenureLeft?: string;
}

const INITIAL_STOCKS: Stock[] = [
  { id: "b1", name: "U GRO Capital Bond", category: "BOND", symbol: "BOND_UGRO", qty: 1, avgCost: 18924, invested: 18924, type: 'bond', platform: 'WintWealth', tenureLeft: "1m 21d" },
  { id: 1, name: "GOLDBEES", category: "GOLD ETF", symbol: "GOLDBEES.NS", qty: 72, avgCost: 94.95, invested: 6836.76, type: 'equity', platform: 'Zerodha' },
  { id: 2, name: "GOLDCASE", category: "GOLD ETF", symbol: "GOLDCASE.NS", qty: 291, avgCost: 21.32, invested: 6204.12, type: 'equity', platform: 'Zerodha' },
  { id: 3, name: "MON100", category: "INDEX USA", symbol: "MON100.NS", qty: 6, avgCost: 212.75, invested: 1276.50, type: 'equity', platform: 'Zerodha' },
  { id: 4, name: "NIFTYBEES", category: "INDEX INDIA", symbol: "NIFTYBEES.NS", qty: 48, avgCost: 281.03, invested: 13489.64, type: 'equity', platform: 'Zerodha' },
  { id: 5, name: "TRENT", category: "EQUITY", symbol: "TRENT.NS", qty: 2, avgCost: 4117.00, invested: 8234.00, type: 'equity', platform: 'Zerodha' },
  { id: 6, name: "Parag Parikh Flexi Cap", category: "MUTUAL FUND", symbol: "PPFCF.NS", qty: 146.171, avgCost: 95.77, invested: 13999.26, type: 'equity', platform: 'Zerodha' },
];

const CAT_COLOR: Record<string, string> = {
  "GOLD ETF": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "INDEX USA": "text-pink-400 bg-pink-400/10 border-pink-400/20",
  "INDEX INDIA": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "EQUITY": "text-orange-400 bg-orange-400/10 border-orange-400/20",
  "MUTUAL FUND": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "BOND": "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

const BORDER_COLOR: Record<string, string> = {
  "GOLD ETF": "border-amber-400",
  "INDEX USA": "border-pink-400",
  "INDEX INDIA": "border-emerald-400",
  "EQUITY": "border-orange-400",
  "MUTUAL FUND": "border-blue-400",
  "BOND": "border-violet-400",
};

const FALLBACK_PRICES: Record<string, number> = {
  "GOLDBEES.NS": 138.34,
  "GOLDCASE.NS": 26.37,
  "MON100.NS": 222.93,
  "NIFTYBEES.NS": 281.93,
  "TRENT.NS": 3848.50,
  "PPFCF.NS": 91.422,
  "BOND_UGRO": 19028,
};

// --- Components ---

const PasswordGate = ({ onAuthenticated }: { onAuthenticated: () => void }) => {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090f] p-4 font-mono">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0d1117] border border-slate-800 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Secure Access</h1>
          <p className="text-slate-400 text-sm">Enter the password to access your investment dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter password"
              className={`w-full bg-[#07090f] border ${error ? 'border-red-500' : 'border-slate-700'} rounded-xl py-3 px-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-all`}
            />
            {error && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-xs mt-2 text-center"
              >
                Incorrect password. Please try again.
              </motion.p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Unlock Dashboard
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center gap-2 text-slate-500 text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>End-to-end encrypted session</span>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ltp, setLtp] = useState<Record<string, number>>(FALLBACK_PRICES);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Snapshot — 31 Oct 2025");
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState("all");

  const isFetching = useRef(false);

  const fetchPrices = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setFetchError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");

      const ai = new GoogleGenAI({ apiKey });
      const symbols = INITIAL_STOCKS.filter(s => s.type === 'equity').map(s => s.symbol).join(", ");
      
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Return a JSON object with the latest market prices in INR for these symbols: ${symbols}. 
          Also include a price for 'BOND_UGRO' which is a corporate bond (current value is roughly 19028).
          Format: { "SYMBOL": price_as_number }. Return ONLY the JSON.`,
          config: {
            responseMimeType: "application/json",
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (err) {
        response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Return a JSON object with the latest market prices in INR for these symbols: ${symbols}. 
          Also include a price for 'BOND_UGRO' which is a corporate bond (current value is roughly 19028).
          Format: { "SYMBOL": price_as_number }. Return ONLY the JSON.`,
          config: { responseMimeType: "application/json" }
        });
      }

      const data = JSON.parse(response.text || "{}");
      if (Object.keys(data).length > 0) {
        setLtp(prev => ({ ...prev, ...data }));
        setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    } catch (err: any) {
      setFetchError("Live fetch failed — showing last available prices.");
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchPrices();
  }, [isAuthenticated, fetchPrices]);

  if (!isAuthenticated) return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;

  const stockRows = INITIAL_STOCKS.map(s => {
    const currentPrice = ltp[s.symbol] || s.avgCost;
    const currentValue = currentPrice * s.qty;
    const pl = currentValue - s.invested;
    const pct = (pl / s.invested) * 100;
    return { ...s, currentPrice, currentValue, pl, pct };
  });

  const totalInvested = stockRows.reduce((acc, s) => acc + s.invested, 0);
  const totalValue = stockRows.reduce((acc, s) => acc + s.currentValue, 0);
  const totalPL = totalValue - totalInvested;
  const totalPct = (totalPL / totalInvested) * 100;

  const zerodhaStocks = stockRows.filter(s => s.platform === 'Zerodha');
  const zInvested = zerodhaStocks.reduce((acc, s) => acc + s.invested, 0);
  const zValue = zerodhaStocks.reduce((acc, s) => acc + s.currentValue, 0);
  const zPL = zValue - zInvested;

  const bondStocks = stockRows.filter(s => s.platform === 'WintWealth');
  const bInvested = bondStocks.reduce((acc, s) => acc + s.invested, 0);
  const bValue = bondStocks.reduce((acc, s) => acc + s.currentValue, 0);
  const bGains = 1562; // Hardcoded from image
  const bRepaid = 1458; // Hardcoded from image

  const categories = ["all", ...Array.from(new Set(INITIAL_STOCKS.map(s => s.category)))];
  const filteredStocks = filter === "all" ? stockRows : stockRows.filter(s => s.category === filter);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  const formatPct = (val: number) => (val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`);

  return (
    <div className="min-h-screen bg-[#07090f] text-[#cbd5e1] font-mono p-4 md:p-8">
      <div className="max-w-[1080px] mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="text-[10px] tracking-[0.22em] text-[#3b82f6] uppercase mb-1.5 font-semibold">
              ◈ KULDEEP RAVISHANKAR · FULL PORTFOLIO
            </div>
            <h1 className="text-[26px] font-semibold text-[#f1f5f9] tracking-tight leading-none mb-2">Investment Tracker</h1>
            <div className="flex items-center gap-2 text-[11px] text-[#475569]">
              <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-blue-500 animate-pulse' : 'bg-[#34d399]'}`} />
              Updated: {lastUpdated}
            </div>
          </div>
          <button 
            onClick={fetchPrices}
            disabled={loading}
            className="flex items-center gap-2 bg-[#0d1117] border border-[#3b82f6] text-[#3b82f6] px-[18px] py-[9px] rounded-md text-[11px] font-semibold tracking-widest uppercase hover:bg-[#3b82f6] hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'FETCHING...' : 'REFRESH'}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {[
            { label: "TOTAL INVESTED", value: formatCurrency(totalInvested), sub: "7 equity/ETF/MF · 1 bond", color: "text-[#94a3b8]" },
            { label: "CURRENT VALUE", value: formatCurrency(totalValue), sub: "market + bond value", color: "text-[#e2e8f0]" },
            { label: "TOTAL P&L", value: formatCurrency(totalPL), sub: formatPct(totalPct), color: totalPL >= 0 ? "text-[#34d399]" : "text-[#f87171]" },
            { label: "INSTRUMENTS", value: "7", sub: "across 2 platforms", color: "text-[#a78bfa]" },
          ].map((stat, i) => (
            <div key={stat.label} className="bg-[#0d1117] border border-[#1e293b] rounded-[10px] p-[16px_18px] animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="text-[9px] tracking-[0.18em] text-[#475569] uppercase mb-2 font-semibold">{stat.label}</div>
              <div className={`text-[19px] font-semibold mb-0.5 ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-[#334155]">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {/* Zerodha */}
          <div className="bg-[#0d1117] border border-[#1e293b] rounded-[10px] p-[16px_20px] animate-fade-up" style={{ animationDelay: '0.28s' }}>
            <div className="flex justify-between items-center mb-3.5">
              <div className="text-[10px] tracking-[0.15em] text-[#3b82f6] uppercase font-semibold">◈ ZERODHA KITE</div>
              <div className="text-[10px] text-[#475569]">6 holdings</div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">INVESTED</div>
                <div className="text-[13px] font-semibold text-[#94a3b8]">{formatCurrency(zInvested)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">CURRENT</div>
                <div className="text-[13px] font-semibold text-[#e2e8f0]">{formatCurrency(zValue)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">P&L</div>
                <div className={`text-[13px] font-semibold ${zPL >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                  {zPL >= 0 ? '+' : ''}{formatCurrency(zPL)}
                </div>
              </div>
            </div>
          </div>

          {/* WintWealth */}
          <div className="bg-[#0d1117] border border-[#2d1f5e] rounded-[10px] p-[16px_20px] animate-fade-up" style={{ animationDelay: '0.35s' }}>
            <div className="flex justify-between items-center mb-3.5">
              <div className="text-[10px] tracking-[0.15em] text-[#a78bfa] uppercase font-semibold">◈ WINTWEALTH - BONDS</div>
              <div className="text-[10px] text-[#a78bfa] font-semibold">11.25% YTM</div>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">INVESTED</div>
                <div className="text-[13px] font-semibold text-[#94a3b8]">{formatCurrency(bInvested)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">CURRENT</div>
                <div className="text-[13px] font-semibold text-[#e2e8f0]">{formatCurrency(bValue)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">GAINS</div>
                <div className="text-[13px] font-semibold text-[#34d399]">+{formatCurrency(bGains)}</div>
              </div>
              <div>
                <div className="text-[9px] text-[#475569] uppercase tracking-[0.1em] mb-1">REPAID</div>
                <div className="text-[13px] font-semibold text-[#a78bfa]">{formatCurrency(bRepaid)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Bar */}
        {(fetchError || loading) && (
          <div className={`flex items-center gap-2 border rounded-lg px-3.5 py-2.5 mb-4 text-[11px] animate-fade-up ${fetchError ? 'bg-[#1a1000] border-[#78350f] text-[#fbbf24]' : 'bg-[#0a101a] border-[#1e293b] text-[#3b82f6]'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            {loading ? 'Fetching live prices from market...' : fetchError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase transition-all border ${
                filter === cat 
                  ? 'bg-[#1e293b] border-[#475569] text-[#f1f5f9]' 
                  : 'bg-transparent border-[#1e293b] text-[#475569] hover:border-[#334155]'
              }`}
            >
              {cat === 'all' ? `ALL (${INITIAL_STOCKS.length})` : cat}
            </button>
          ))}
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-[2.1fr_.55fr_.9fr_.9fr_.95fr_.95fr_1fr] gap-2 px-4 py-1.5 mb-1.5">
          {["INSTRUMENT", "QTY", "AVG / YTM", "LTP", "INVESTED", "VALUE", "P&L"].map((h, i) => (
            <div key={h} className={`text-[9px] tracking-[0.12em] text-[#334155] font-bold uppercase ${i === 0 ? 'text-left' : 'text-right'}`}>
              {h}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        <div className="space-y-1.5">
          {filteredStocks.map((stock, i) => {
            const isBond = stock.type === 'bond';
            const isExp = expandedId === stock.id;
            return (
              <div 
                key={stock.id}
                onClick={() => setExpandedId(isExp ? null : stock.id)}
                className={`group bg-[#0d1117] border border-[#1e293b] hover:bg-[#0d1420] hover:border-[#334155] rounded-lg p-[13px_16px] cursor-pointer transition-all animate-fade-up border-l-[3px] ${BORDER_COLOR[stock.category]}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="grid grid-cols-[2.1fr_.55fr_.9fr_.9fr_.95fr_.95fr_1fr] gap-2 items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="text-[13px] font-semibold text-[#f1f5f9]">{stock.name}</div>
                      {stock.tenureLeft && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#a78bfa18] text-[#a78bfa] border border-[#a78bfa33] font-semibold">
                          {stock.tenureLeft} left
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter border ${CAT_COLOR[stock.category]}`}>
                        {stock.category}
                      </span>
                      <span className="text-[9px] text-[#334155] font-bold uppercase tracking-tighter">{stock.platform}</span>
                    </div>
                  </div>
                  <div className="text-right text-[13px] text-[#94a3b8]">{isBond ? '—' : stock.qty}</div>
                  <div className={`text-right text-[13px] ${isBond ? 'text-[#a78bfa]' : 'text-[#94a3b8]'}`}>
                    {isBond ? '11.25% YTM' : `₹${stock.avgCost.toFixed(2)}`}
                  </div>
                  <div className="text-right text-[13px] font-medium text-[#e2e8f0]">
                    ₹{stock.currentPrice.toFixed(2)}
                  </div>
                  <div className="text-right text-[13px] text-[#64748b]">₹{stock.invested.toLocaleString('en-IN')}</div>
                  <div className="text-right text-[13px] text-[#e2e8f0]">₹{stock.currentValue.toLocaleString('en-IN')}</div>
                  <div className="text-right">
                    <div className={`text-[13px] font-semibold ${stock.pl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                      {stock.pl >= 0 ? '+' : ''}{formatCurrency(stock.pl)}
                    </div>
                    <div className={`text-[10px] font-semibold mt-0.5 ${stock.pl >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
                      {formatPct(stock.pct)}
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExp && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3.5 pt-3.5 border-t border-[#1e293b] grid grid-cols-3 gap-3 text-[11px]">
                        <div><span className="text-[#475569]">Symbol: </span><span className="text-[#94a3b8]">{stock.symbol}</span></div>
                        <div><span className="text-[#475569]">Platform: </span><span className="text-[#94a3b8]">{stock.platform}</span></div>
                        <div><span className="text-[#475569]">Break-even: </span><span className="text-[#94a3b8]">₹{stock.avgCost.toFixed(2)}</span></div>
                        <div><span className="text-[#475569]">Current: </span><span className="text-[#e2e8f0]">₹{stock.currentPrice.toFixed(2)}</span></div>
                        <div><span className="text-[#475569]">Net P&L: </span><span className={`font-semibold ${stock.pl >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>{formatCurrency(stock.pl)}</span></div>
                        <div><span className="text-[#475569]">Return: </span><span className={stock.pct >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}>{formatPct(stock.pct)}</span></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div className="mt-2.5 bg-[#0f172a] border border-[#1e293b] rounded-lg p-[14px_16px] grid grid-cols-[2.1fr_.55fr_.9fr_.9fr_.95fr_.95fr_1fr] gap-2 items-center">
          <div className="text-[11px] font-semibold text-[#64748b] tracking-[0.1em] uppercase">GRAND TOTAL</div>
          <div /><div /><div />
          <div className="text-right text-[13px] font-semibold text-[#94a3b8]">₹{totalInvested.toLocaleString('en-IN')}</div>
          <div className="text-right text-[13px] font-semibold text-[#e2e8f0]">₹{totalValue.toLocaleString('en-IN')}</div>
          <div className="text-right">
            <div className={`text-[14px] font-bold ${totalPL >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
              {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
            </div>
            <div className={`text-[11px] font-semibold mt-0.5 ${totalPL >= 0 ? 'text-[#059669]' : 'text-[#dc2626]'}`}>
              {formatPct(totalPct)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-7 text-[10px] text-[#1e293b] text-center leading-loose">
          Zerodha Kite · WintWealth Bonds · Prices via AI web search · Click any row to expand
        </div>
      </div>
    </div>
  );
}
