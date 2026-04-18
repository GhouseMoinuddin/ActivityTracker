import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import Feedback from '@/components/Feedback';
import { fetchTrackerData } from '@/lib/api';
import { useTheme } from '@/pages/_app';

const NAVIGATION_CARDS = [
  {
    href: '/flow',
    icon: 'fa-calendar-check',
    title: 'Flow Sync',
    description: 'Habits, tasks, and journal in a single flow.',
    color: '#10b981',
    category: 'Flow',
    layoutSpan: 'md:col-span-2 md:row-span-2',
  },
  {
    href: '/insights',
    icon: 'fa-chart-pie',
    title: 'Insights',
    description: 'Visual performance metrics.',
    color: '#3b82f6',
    category: 'Data',
    layoutSpan: 'md:col-span-1 md:row-span-1',
  },
  {
    href: '/focus',
    icon: 'fa-stopwatch',
    title: 'Focus Mode',
    description: 'Focus & Deep Work.',
    color: '#3b82f6',
    category: 'Deep',
    layoutSpan: 'md:col-span-1 md:row-span-1',
  },
  {
    href: '/targets',
    icon: 'fa-bullseye',
    title: 'Targets',
    description: 'Strategic long-term goals.',
    color: '#3b82f6',
    category: 'Aim',
    layoutSpan: 'md:col-span-2 md:row-span-1',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const isDark = theme === 'dark';

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [checked, setChecked] = useState({}); // Added new state for 'checked'

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/portal');
  }, [status, router]);

  // INSTANT HYDRATION: Load from localStorage before cloud resolves
  useEffect(() => {
    try {
      const h = localStorage.getItem('at-habits'); if (h) setHabits(JSON.parse(h));
      const c = localStorage.getItem('at-checked'); if (c) setChecked(JSON.parse(c));
      const t = localStorage.getItem('at-tasks');   if (t) setTasks(JSON.parse(t));
      const g = localStorage.getItem('at-goals');   if (g) setGoals(JSON.parse(g));
      const j = localStorage.getItem('at-journal'); if (j) setEntries(JSON.parse(j));
    } catch (e) { console.error('Local Hydration Failure:', e); }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const loadServerData = async () => {
        const data = await fetchTrackerData(session.user.email);
        if (data) {
          if (data.habits) {
            setHabits(data.habits);
            localStorage.setItem('at-habits', JSON.stringify(data.habits));
          }
          if (data.checked) {
            setChecked(data.checked);
            localStorage.setItem('at-checked', JSON.stringify(data.checked));
          }
          if (data.tasks) {
            setTasks(data.tasks);
            localStorage.setItem('at-tasks', JSON.stringify(data.tasks));
          }
          if (data.goals) {
            setGoals(data.goals);
            localStorage.setItem('at-goals', JSON.stringify(data.goals));
          }
          if (data.journal) {
            setEntries(data.journal);
            localStorage.setItem('at-journal', JSON.stringify(data.journal));
          }
        }
      };
      loadServerData();
    }
  }, [session, status]);

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const completedHabits = habits.filter(h => h.completedToday).length;
  const habitProgress = habits.length > 0 ? (completedHabits / habits.length) * 100 : 0;

  const systemEfficiency = Math.round((taskProgress + habitProgress) / 2);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const isAuthLoading = status === 'loading';

  return (
    <div suppressHydrationWarning className="min-h-screen relative overflow-x-hidden selection:bg-[#3b82f620]" style={{ background: 'var(--background-main)' }}>
      <Head>
        <title>Home — Activity Tracker</title>
      </Head>
      <NavBar session={session} active="/home" />

      {/* ─── BACKGROUND GLOWS ─── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
        />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* ─── PREMIUM HEADER SECTION ─── */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-center pb-8 mb-12 border-b border-[var(--border-color)] gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-layer)] border border-[var(--border-color)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Core Sync Active</span>
            </div>
            <div className="h-4 w-[1px] bg-[var(--border-color)]" />
            <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">
              v1 BETA — Elite Edition
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Date</div>
              <div className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tighter">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── HERO SECTION ─── */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[#3b82f6] text-[10px] font-black uppercase tracking-[0.2em] mb-4"
                style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.08)', borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.3)' }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3b82f6] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]"></span>
                </span>
                Live System Overview
              </motion.div>
              <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter leading-[0.9]" style={{ color: 'var(--text-primary)' }}>
                {isAuthLoading ? (
                  <span className="opacity-20">Standby...</span>
                ) : (
                  <>
                    {greeting},<br />
                    <span className="gradient-text">{session?.user?.name || 'Partner'}</span>
                  </>
                )}
              </h1>
              <p className="text-lg font-medium text-[var(--text-muted)] max-w-lg mt-2">
                {isAuthLoading ? 'Syncing system metrics...' : 'Your performance home is ready. Track habits, manage tasks, and optimize focus.'}
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/flow" className="group relative px-6 py-3 rounded-xl font-black text-sm bg-[#3b82f6] text-white overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <span className="relative z-10 flex items-center gap-2">
                  Enter Flow <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ─── BENTO GRID ─── */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12"
        >
          {NAVIGATION_CARDS.map((card, i) => (
            <motion.div
              key={card.href}
              variants={itemVariants}
              className={`group relative rounded-3xl overflow-hidden glass card-lift ${card.layoutSpan}`}
            >
              <Link href={card.href} className="block p-8 h-full">
                <div className="absolute top-0 right-0 p-8">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: card.color }}>
                    <i className={`fas ${card.icon}`} />
                  </div>
                </div>

                <div className="h-full flex flex-col justify-end">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mb-2 inline-block w-fit" style={{ background: `${card.color}15`, color: card.color }}>
                    {card.category}
                  </span>
                  <h3 className="text-2xl font-black mb-2 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-primary)' }}>
                    {card.title}
                  </h3>
                  <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#3b82f650] rounded-3xl transition-all pointer-events-none" />
              </Link>
            </motion.div>
          ))}

          {/* ─── QUICK STATS CARD (Manual Bento Item) ─── */}
          <motion.div
            variants={itemVariants}
            className="md:col-span-2 md:row-span-1 rounded-3xl glass p-8 flex flex-col justify-between overflow-hidden relative group"
          >
            <div className="relative z-10 w-full">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter" style={{ color: 'var(--text-primary)' }}>System Efficiency</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Live Performance Pulse</p>
                </div>
                <div className="text-4xl font-black text-[#3b82f6]">{systemEfficiency}%</div>
              </div>

              <div className="h-4 w-full bg-[var(--surface-layer)] rounded-full overflow-hidden border border-[var(--border-color)] relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemEfficiency}%` }}
                   className="h-full bg-gradient-to-r from-[#3b82f6] via-[#60a5fa] to-[#3b82f6] relative"
                >
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 w-full h-full"
                      style={{ background: isDark ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
                    />
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="glass p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="text-xl font-black text-[#10b981] mb-1">{completedTasks}/{tasks.length}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tasks Engage</div>
                </div>
                <div className="glass p-4 rounded-2xl border border-[var(--border-color)]">
                  <div className="text-xl font-black text-[#3b82f6] mb-1">{completedHabits}/{habits.length}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Habits Active</div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-150 rotate-12">
              <i className="fas fa-bolt text-9xl" />
            </div>
          </motion.div>
        </motion.section>

        {/* ─── CHART SECTION ─── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-3xl glass p-8 border border-[var(--border-color)] overflow-hidden relative"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-primary)' }}>Weekly Performance Flow</h2>
              <p className="text-xs font-bold text-[var(--text-muted)]">Calculated based on habit completion percentages</p>
            </div>
            <Link href="/insights" className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-layer)] hover:bg-[var(--background-main)] transition-all" style={{ color: 'var(--text-primary)' }}>
              Detailed Insights <i className="fas fa-chevron-right ml-1 text-[8px]" />
            </Link>
          </div>

          <div className="h-48 flex items-end gap-3 mt-4">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              const heights = [40, 65, 55, 90, 75, 60, 85]; // Mock data
              const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heights[i]}%` }}
                    transition={{ delay: 0.8 + (i * 0.1), duration: 1, ease: 'circOut' }}
                    className="w-full rounded-2xl relative overflow-hidden"
                    style={{ background: isToday ? '#3b82f6' : 'var(--surface-layer)' }}
                  >
                    <AnimatePresence>
                      {isToday && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0"
                          style={{ background: isDark ? 'linear-gradient(to top, rgba(255,255,255,0.1), transparent)' : 'linear-gradient(to top, rgba(255,255,255,0.3), transparent)' }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className="text-[10px] font-black" style={{ color: isToday ? '#3b82f6' : 'var(--text-muted)' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ─── ROADMAP / FUTURE PROTOCOLS ─── */}
        <section className="mt-32 mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Protocol <span className="text-[#3b82f6]">Roadmap</span></h2>
              <p className="text-xs font-black text-[var(--text-muted)] mt-2 uppercase tracking-[0.3em]">Expansion sequence currently in development</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-[#3b82f610] border border-[#3b82f630] text-[#3b82f6] text-[10px] font-black uppercase tracking-widest">
              Version 1.5 Roadmap
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { title: 'Neural Insights', icon: 'fa-brain', desc: 'AI-driven behavioral analysis engine.' },
              { title: 'Protocol Sync', icon: 'fa-cloud', desc: 'Secondary device data persistence.' },
              { title: 'Squad Hub', icon: 'fa-users', desc: 'Secure team accountability clusters.' },
              { title: 'Edu Vault', icon: 'fa-book-open', desc: 'Store study notes linked to strategic targets.' },
              { title: 'Native Core', icon: 'fa-mobile-alt', desc: 'Dedicated iOS/Android optimization.' }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="glass p-6 rounded-[2rem] border border-[var(--border-color)] opacity-60 hover:opacity-100 transition-all group"
              >
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-layer)] flex items-center justify-center mb-6 border border-[var(--border-color)] group-hover:border-[#3b82f650] transition-all">
                  <i className={`fas ${f.icon} text-[var(--text-muted)] group-hover:text-[#3b82f6]`} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest mb-2 transition-colors group-hover:text-[var(--text-primary)]" style={{ color: 'var(--text-muted)' }}>{f.title}</h4>
                <p className="text-[10px] font-medium leading-relaxed text-[var(--text-muted)] group-hover:text-[var(--text-muted)]">{f.desc}</p>
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]/30 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status: Pending</span>
                  <i className="fas fa-lock text-[8px] text-[var(--text-muted)] opacity-30" />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-20 border-t border-[var(--border-color)] relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
          style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: isDark ? 0.02 : 0.05 }} />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br from-[#3b82f6] to-[#60a5fa]">
                  <span className="text-black font-black text-[10px]">AT</span>
                </div>
                <span className="text-xl font-black tracking-tighter text-[var(--text-primary)]">Activity Tracker <span className="text-[10px] opacity-40 ml-1">BETA</span></span>
              </div>
              <p className="text-xs font-semibold text-[var(--text-muted)] max-w-sm leading-relaxed mb-8">
                The definitive high-performance productivity matrix. Engineered for elite operatives who demand precision in behavioral tracking and focus management.
              </p>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Tactical Dispatch</h4>
                <div className="flex gap-2">
                  <input type="email" placeholder="Enter operative email..." className="flex-1 bg-[var(--surface-layer)] glass border border-[var(--border-color)] rounded-xl px-4 py-2 text-[10px] outline-none focus:border-[#3b82f630] transition-all" style={{ color: 'var(--text-primary)' }} />
                  <button className="px-4 py-2 rounded-xl bg-[#3b82f6] text-white text-[10px] font-black hover:scale-105 active:scale-95 transition-all">JOIN</button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-6">System Links</h4>
              <ul className="space-y-4">
                <li><Link href="/flow" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors">Daily Flow</Link></li>
                <li><Link href="/insights" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors">Insights</Link></li>
                <li><Link href="/focus" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors">Focus Mode</Link></li>
                <li><Link href="/targets" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors">Strategic Targets</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-6">Social Core</h4>
              <div className="flex flex-wrap gap-3">
                {['twitter', 'github', 'linkedin', 'discord'].map(social => (
                  <a key={social} href="#" className="w-9 h-9 rounded-xl border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#3b82f6] hover:border-[#3b82f640] transition-all bg-[var(--surface-layer)] glass">
                    <i className={`fab fa-${social} text-xs`} />
                  </a>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] mb-6">Core Services</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Auth Engine</span>
                  <span className="text-[8px] font-black text-[#10b981]">NOMINAL</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data Forge</span>
                  <span className="text-[8px] font-black text-[#10b981]">SYNCED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Neural Core</span>
                  <span className="text-[8px] font-black text-[#3b82f6]">BETA</span>
                </div>
                <div className="h-[1px] bg-[var(--border-color)]/30 w-full my-2" />
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#10b981]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]"></span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-4 text-[var(--text-muted)]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} AR Systems. Engineered for Excellence.
            </p>
            <div className="flex gap-6">
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Privacy Protocol</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
