import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { useTheme } from '@/pages/_app';
import { fetchTrackerData, syncTrackerData } from '@/lib/api';

export default function TargetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const isDark = theme === 'dark';
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState('');
  const [target, setTarget] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/portal');
  }, [status, router]);

  useEffect(() => {
    try {
      const g = localStorage.getItem('at-goals'); if (g) setGoals(JSON.parse(g));
    } catch {}
  }, []);

  const saveGoals = (g) => { 
    setGoals(g); 
    localStorage.setItem('at-goals', JSON.stringify(g)); 
    syncToCloud({ goals: g });
  };

  const syncToCloud = async (payload) => {
    if (session?.user?.email) {
      await syncTrackerData(session.user.email, payload);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const loadServerData = async () => {
        const data = await fetchTrackerData(session.user.email);
        if (data && data.goals) {
          setGoals(data.goals);
          localStorage.setItem('at-goals', JSON.stringify(data.goals));
        }
      };
      loadServerData();
    }
  }, [status, session]);

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const g = { id: Date.now(), title: newGoal, current: 0, target: parseInt(target) || 100, unit: 'units' };
    saveGoals([...goals, g]);
    setNewGoal(''); setTarget('');
  };

  const updateProgress = (id, delta) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, current: Math.max(0, g.current + delta) } : g));
  };

  const deleteGoal = (id) => saveGoals(goals.filter(g => g.id !== id));

  const isAuthLoading = status === 'loading';

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg)' }}>
      <Head><title>Strategic Objectives — Activity Tracker</title></Head>
      <NavBar session={session} active="/targets" />

      {/* Decorative Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10">
         <div className="absolute top-1/4 right-[20%] w-[300px] h-[300px] bg-[#10b981] rounded-full blur-[100px]" style={{ opacity: isDark ? 0.05 : 0.08 }} />
         <div className="absolute bottom-1/4 left-[20%] w-[300px] h-[300px] bg-[#8b5cf6] rounded-full blur-[100px]" style={{ opacity: isDark ? 0.05 : 0.08 }} />
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-4">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
           <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>Strategic <span className="text-[#10b981]">Targets</span></h1>
           <p className="text-sm font-bold text-[var(--muted)] mt-2 uppercase tracking-widest">Long-range behavioral objectives</p>
        </motion.header>

        {/* Create Goal Form */}
        <motion.section initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[32px] p-8 border border-[var(--border)] mb-12">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] ml-1">Objective Title</label>
                 <input className="w-full bg-[var(--surface)] glass rounded-2xl px-6 py-4 text-sm font-bold outline-none border border-[var(--border)] focus:border-[#10b981] transition-all" 
                   placeholder="e.g., Master Advanced Algorithms" value={newGoal} onChange={e => setNewGoal(e.target.value)} />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] ml-1">Threshold Value</label>
                 <input className="w-full bg-[var(--surface)] glass rounded-2xl px-6 py-4 text-sm font-bold outline-none border border-[var(--border)] focus:border-[#10b981] transition-all" 
                   placeholder="e.g., 100 (Units)" type="number" value={target} onChange={e => setTarget(e.target.value)} />
              </div>
           </div>
           <button onClick={addGoal} className="w-full mt-6 py-4 rounded-2xl bg-[#10b981] text-black text-sm font-black shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95 transition-all">INITIALIZE OBJECTIVE</button>
        </motion.section>

        {/* Goal List */}
        <div className="space-y-6">
           <AnimatePresence>
              {goals.map((g, idx) => {
                const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
                return (
                  <motion.div 
                    key={g.id} 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass rounded-[32px] p-8 border border-[var(--border)] group relative overflow-hidden"
                  >
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{g.title}</h3>
                              {pct >= 100 && <span className="text-[10px] font-black uppercase tracking-widest bg-[#10b98115] text-[#10b981] px-2 py-1 rounded-md">Achieved</span>}
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="flex-1 h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: 'circOut' }} className="h-full bg-[#10b981]" />
                              </div>
                              <span className="text-xs font-black" style={{ color: pct >= 100 ? '#10b981' : 'var(--muted)' }}>{pct}%</span>
                           </div>
                           <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Target: {g.target} Internal Units · Progress: {g.current}</div>
                        </div>

                        <div className="flex items-center gap-3">
                           <button onClick={() => updateProgress(g.id, -1)} className="w-10 h-10 rounded-xl glass border border-[var(--border)] flex items-center justify-center hover:border-[#10b981] transition-all text-[var(--muted)] hover:text-[#10b981]"><i className="fas fa-minus text-xs" /></button>
                           <button onClick={() => updateProgress(g.id, 1)} className="w-10 h-10 rounded-xl glass border border-[var(--border)] flex items-center justify-center hover:border-[#10b981] transition-all text-[var(--muted)] hover:text-[#10b981]"><i className="fas fa-plus text-xs" /></button>
                           <div className="w-px h-6 bg-[var(--border)] mx-1" />
                           <button onClick={() => deleteGoal(g.id)} className="w-10 h-10 rounded-xl glass border border-[var(--border)] flex items-center justify-center hover:border-[#ef4444] transition-all text-[var(--muted)] hover:text-[#ef4444]"><i className="fas fa-trash text-xs" /></button>
                        </div>
                     </div>
                     <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                        <i className="fas fa-bullseye text-9xl translate-x-1/2 -translate-y-1/2" />
                     </div>
                  </motion.div>
                );
              })}
           </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
