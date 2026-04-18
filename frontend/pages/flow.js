import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { useTheme } from '@/pages/_app';
import { fetchTrackerData, syncTrackerData } from '@/lib/api';
import { generateStrategicRoadmap } from '@/lib/ai/strategist';

// ─── HABITS DATA ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const DEFAULT_HABITS = [
  { id: 1, name: 'Exercise',        emoji: '🏋️', color: '#10b981' },
  { id: 2, name: 'Reading',         emoji: '📖', color: '#3b82f6' },
];

const RECOMMENDED_EMOJIS = ['🏋️', '📖', '💻', '🧘', '🚀', '🗣️', '💧', '🥗', '⚡', '🎯'];

const PRIORITY_COLORS_MAP = { High: '#3b82f6', Medium: '#60a5fa', Low: '#2563eb' };

const MOODS = [
  { emoji: '😄', label: 'Great',   color: '#10b981' },
  { emoji: '🙂', label: 'Good',    color: '#3b82f6' },
  { emoji: '😐', label: 'Okay',    color: '#78716c' },
  { emoji: '😔', label: 'Low',     color: '#3b82f6' },
  { emoji: '😤', label: 'Stressed',color: '#ef4444' },
];

const JOURNAL_TEMPLATES = [
  { label: 'Gratitude', icon: '🙏', text: 'Today I am grateful for... \n\n' },
  { label: 'Technical Win', icon: '💻', text: 'Challenge: \nSolution: \n\nKey learning: ' },
  { label: 'Mental Block', icon: '🧠', text: 'I am currently stuck on... \n\nPotential next steps: ' },
];

const WORKFLOW_TABS = ['Habits', 'Tasks', 'Journal', 'Edu Vault'];

export default function FlowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const isDark = theme === 'dark';
  const isAuthLoading = status === 'loading';
  const [tab, setTab] = useState('Habits');

  // ── Habits state ──────────────────────────────────────────────────────────
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [checked, setChecked] = useState({});
  const [newHabit, setNewHabit] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⭐');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const currentDay = new Date().getDate();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const [habitMonth, setHabitMonth] = useState(currentMonth);
  const daysInMonth = getDaysInMonth(habitMonth, currentYear);
  const monthKey = `${currentYear}-${habitMonth}`;

  // ── Tasks state ───────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [filter, setFilter] = useState('All');

  // ── Journal state ─────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [journalText, setJournalText] = useState('');
  const [wins, setWins] = useState('');
  const [mood, setMood] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  // ── Edu Vault state ──────────────────────────────────────────────────────────
  const [eduNotes, setEduNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteGoal, setNoteGoal] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const tableContainerRef = useRef(null);
  const todayRef = useRef(null);

  const getStreak = (habitId) => {
    let streak = 0;
    const habitChecked = checked[habitId] || {};
    const today = new Date();
    
    // Check backwards from today
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      const day = d.getDate();
      
      if (habitChecked[mKey]?.[day]) {
        streak++;
      } else if (i > 0 || (d.getDate() === today.getDate() && d.getMonth() === today.getMonth())) {
        // If not today (or if today is not checked), break streak
        if (i > 0) break;
      }
    }
    return streak;
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/portal');
  }, [status, router]);

  useEffect(() => {
    if (habits.length > 0 || tasks.length > 0) {
      setRoadmap(generateStrategicRoadmap({ habits, tasks, checked, entries }));
    }
  }, [habits, tasks, checked, entries]);

  // INSTANT HYDRATION: Pull from Local Disk before Cloud resolves
  useEffect(() => {
    try {
      const h = localStorage.getItem('at-habits'); if (h) setHabits(JSON.parse(h));
      const c = localStorage.getItem('at-checked'); if (c) setChecked(JSON.parse(c));
      const t = localStorage.getItem('at-tasks');   if (t) setTasks(JSON.parse(t));
      const j = localStorage.getItem('at-journal'); if (j) setEntries(JSON.parse(j));
      const en = localStorage.getItem('at-edu-notes'); if (en) setEduNotes(JSON.parse(en));
    } catch (e) { console.error('Local Hydration Failure:', e); }
  }, []);

  // AUTO-SCROLL TO TODAY
  useEffect(() => {
    if (tab === 'Habits' && todayRef.current && tableContainerRef.current) {
      setTimeout(() => {
        todayRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }, 500);
    }
  }, [tab, habitMonth]);

  const syncToCloud = async (payload) => {
    if (session?.user?.email) {
      await syncTrackerData(session.user.email, payload);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const loadServerData = async () => {
        const data = await fetchTrackerData(session.user.email);
        if (data) {
          const cloudH = data.habits || [];
          const cloudC = data.checked || {};
          const cloudT = data.tasks || [];
          const cloudJ = data.journal || [];
          const cloudE = data.eduNotes || [];

          setHabits(cloudH);
          setChecked(cloudC);
          setTasks(cloudT);
          setEntries(cloudJ);
          setEduNotes(cloudE);

          localStorage.setItem('at-habits', JSON.stringify(cloudH));
          localStorage.setItem('at-checked', JSON.stringify(cloudC));
          localStorage.setItem('at-tasks', JSON.stringify(cloudT));
          localStorage.setItem('at-journal', JSON.stringify(cloudJ));
          localStorage.setItem('at-edu-notes', JSON.stringify(cloudE));
        } else {
          try {
            const lh = JSON.parse(localStorage.getItem('at-habits') || '[]');
            const lc = JSON.parse(localStorage.getItem('at-checked') || '{}');
            const lt = JSON.parse(localStorage.getItem('at-tasks') || '[]');
            const lj = JSON.parse(localStorage.getItem('at-journal') || '[]');
            const le = JSON.parse(localStorage.getItem('at-edu-notes') || '[]');
            if (lh.length > 0 || lt.length > 0) {
              syncToCloud({ habits: lh, checked: lc, tasks: lt, journal: lj, eduNotes: le });
            }
          } catch(e) {}
        }
      };
      loadServerData();
    }
  }, [session, status]);

  const saveHabits = (h, c) => {
    setHabits(h); setChecked(c);
    localStorage.setItem('at-habits', JSON.stringify(h));
    localStorage.setItem('at-checked', JSON.stringify(c));
    syncToCloud({ habits: h, checked: c });
  };
  const saveTasks = (d) => { 
    setTasks(d); //UI Update
    localStorage.setItem('at-tasks', JSON.stringify(d));//Local Storage Update  
    syncToCloud({ tasks: d }); //Cloud Update
  };
  const saveEntries = (d) => { 
    setEntries(d); 
    localStorage.setItem('at-journal', JSON.stringify(d));
    syncToCloud({ journal: d }); 
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    const h = { id: Date.now(), name: newHabit, emoji: selectedEmoji, color: '#3b82f6', priority: 'Medium', logs: {} };
    const updated = [...habits, h];
    setHabits(updated);
    localStorage.setItem('at-habits', JSON.stringify(updated));
    syncToCloud({ habits: updated });
    setNewHabit('');
    setShowAddHabit(false);
  };

  const deleteHabit = (id) => {
    if (confirm('Are you sure you want to delete this habit objective?')) {
      const updatedHabits = habits.filter(h => h.id !== id);
      const updatedChecked = { ...checked };
      delete updatedChecked[id];
      saveHabits(updatedHabits, updatedChecked);
    }
  };

  const editHabit = (id) => {
    const habit = habits.find(h => h.id === id);
    const newName = prompt('Enter new habit name:', habit.name);
    if (newName && newName.trim()) {
      const updated = habits.map(h => h.id === id ? { ...h, name: newName.trim() } : h);
      saveHabits(updated, checked);
    }
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    const t = { id: Date.now(), title: newTask, status: 'Pending', priority,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) };
    saveTasks([t, ...tasks]);
    setNewTask('');
  };
  const toggleTask = (id) => saveTasks(tasks.map(t => t.id === id ? { ...t, status: t.status === 'Completed' ? 'Pending' : 'Completed' } : t));
  const deleteTask = (id) => saveTasks(tasks.filter(t => t.id !== id));

  const addEntry = () => {
    if (!journalText.trim()) return;
    const e = { id: Date.now(), text: journalText, wins, mood,
      date: new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) };
    saveEntries([e, ...entries]);
    setJournalText(''); setWins(''); setMood(null);
  };

  const addEduNote = () => {
    if (!newNote.trim()) return;
    const n = { id: Date.now(), text: newNote, goalLink: noteGoal, date: todayStr };//
    const updated = [n, ...eduNotes];
    setEduNotes(updated);
    localStorage.setItem('at-edu-notes', JSON.stringify(updated));
    syncToCloud({ eduNotes: updated });
    setNewNote(''); setNoteGoal('');
  };
  const deleteEduNote = (id) => {
    const updated = eduNotes.filter(n => n.id !== id);
    setEduNotes(updated);
    localStorage.setItem('at-edu-notes', JSON.stringify(updated));
    syncToCloud({ eduNotes: updated });
  };

  const completedToday = habits.filter(h => checked[h.id]?.[`${currentYear}-${currentMonth}`]?.[currentDay]).length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskPct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const filteredTasks = tasks.filter(t => filter === 'All' ? true : t.status === filter);

  const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <Head><title>Daily Workflow — Activity Tracker</title></Head>
      <div suppressHydrationWarning className="min-h-screen selection:bg-[#3b82f620]" style={{ background: 'var(--background-main)', fontFamily: 'Montserrat, sans-serif' }}>
        <NavBar session={session} active="/flow" />

        {/* Header — Centered */}

      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Flow Sync</h1>
            <p className="text-sm font-bold mt-1 text-[var(--text-muted)]">{todayStr}</p>
          </div>
          
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl glass border transition-colors"
               style={{ background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }}>
              <div className="px-4 py-2 text-center">
                <div className="text-lg font-black text-[#3b82f6] leading-tight">
                  {isAuthLoading ? <span className="animate-pulse">--</span> : completedToday} 
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Habits</div>
              </div>
              <div className="w-px h-8 self-center" style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} />
              <div className="px-4 py-2 text-center">
                <div className="text-lg font-black text-[#10b981] leading-tight">
                  {isAuthLoading ? <span className="animate-pulse">--</span> : completedTasks}
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tasks</div>
              </div>
          </div>
        </motion.div>

        {/* AI STRATEGIC ROADMAP */}
        {roadmap && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-6 rounded-[2.5rem] glass border border-[#3b82f630] relative overflow-hidden group"
          >
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] -rotate-12 translate-x-4">
                <i className="fas fa-brain text-9xl" />
             </div>
             
             <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-[#3b82f620] flex items-center justify-center border border-[#3b82f630]">
                         <i className="fas fa-sparkles text-[#3b82f6] text-[10px]" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#3b82f6]">AI Strategic Roadmap</span>
                   </div>
                   
                   <p className="text-sm font-black text-[var(--text-primary)] leading-tight mb-2">
                     {roadmap.reasoning || "Checking your focus rhythm... operational status stable."}
                   </p>
                   <div className="flex flex-wrap gap-2 mt-4">
                      <div className="px-3 py-1 rounded-full bg-[var(--surface-layer)] border border-[var(--border-color)] text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                         {roadmap.energySuggestion}
                      </div>
                      <div className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${roadmap.burnoutRisk.includes('Safe') ? 'text-[#10b981] border-[#10b98130] bg-[#10b98110]' : roadmap.burnoutRisk.includes('Warning') ? 'text-[#f59e0b] border-[#f59e0b30] bg-[#f59e0b10]' : 'text-[#ef4444] border-[#ef444430] bg-[#ef444410]'}`}>
                         {roadmap.burnoutRisk}
                      </div>
                   </div>
                </div>

                <div className="w-px h-16 self-center hidden md:block" style={{ background: 'var(--border-color)', opacity: 0.3 }} />

                <div className="flex flex-col justify-center min-w-[240px]">
                   <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">AI Selected Objective</span>
                   {roadmap.topAction ? (
                      <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#3b82f610] border border-[#3b82f630]">
                         <div className="w-10 h-10 rounded-xl bg-[#3b82f6] flex items-center justify-center text-white shadow-[0_5px_15px_rgba(59,130,246,0.3)]">
                            <i className="fas fa-arrow-right-long" />
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{roadmap.topAction.title || roadmap.topAction.name}</p>
                            <span className="text-[9px] font-black text-[#3b82f6] uppercase tracking-widest">Execute First</span>
                         </div>
                      </div>
                   ) : (
                      <p className="text-xs font-black text-[var(--text-muted)]">No critical objectives detected.</p>
                   )}
                </div>
             </div>
          </motion.div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-1 mt-10 p-1 rounded-2xl glass border border-[var(--border-color)] relative z-10 overflow-hidden">
          {WORKFLOW_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-3 rounded-xl text-xs font-black transition-all relative z-10"
              style={{ color: tab === t ? (isDark ? '#000' : '#fff') : 'var(--text-muted)' }}
            >
              {tab === t && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#3b82f6] -z-10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  style={{ borderRadius: '12px' }}
                />
              )}
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <AnimatePresence mode="wait">
        {tab === 'Habits' && (
          <motion.div 
            key="habits"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="px-6 pb-20 max-w-7xl mx-auto"
          >
            {/* Month + Progress */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 mb-6">
               <div className="flex flex-wrap gap-1 p-1 rounded-xl glass">
                  {MONTHS.map((m, i) => (
                    <button key={m} onClick={() => setHabitMonth(i)}
                      className="px-3 py-1.5 text-[10px] font-black rounded-lg transition-all"
                      style={{ 
                        background: habitMonth === i ? '#3b82f6' : 'transparent',
                        color: habitMonth === i ? (isDark ? '#000' : '#fff') : 'var(--text-muted)'
                      }}
                    >
                      {m}
                    </button>
                  ))}
               </div>
               
               {/* Global Month Progress */}
               {(() => {
                  const total = habits.reduce((s, h) => s + (h.goal || getDaysInMonth(habitMonth, currentYear)), 0);
                  const done  = habits.reduce((s, h) => {
                    const monthData = checked[h.id]?.[`${currentYear}-${habitMonth}`] || {};
                    const checkedCount = Object.values(monthData).filter(Boolean).length;
                    return s + Math.min(checkedCount, h.goal || getDaysInMonth(habitMonth, currentYear));
                  }, 0);
                  const pct   = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div className="flex-1 glass rounded-xl px-5 py-2 flex items-center justify-between border border-[var(--glass-border-color)]">
                       <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{MONTHS[habitMonth]} Completion Flow</span>
                       <div className="flex items-center gap-3">
                          <div className="w-32 h-1.5 rounded-full bg-[var(--surface-layer)] overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }} 
                               animate={{ width: `${pct}%` }} 
                               className="h-full bg-[#3b82f6]" 
                             />
                          </div>
                          <span className="text-xs font-black text-[#3b82f6]">{pct}%</span>
                       </div>
                    </div>
                  );
               })()}
            </div>

            {/* Grid */}
            <div ref={tableContainerRef} className="max-w-full overflow-x-auto rounded-3xl border border-[var(--border-color)] glass shadow-2xl no-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="px-6 py-4 sticky left-0 z-20 glass backdrop-blur-xl border-r border-[var(--border-color)]">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Identity</span>
                      </th>
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const isToday = i+1 === currentDay && habitMonth === currentMonth;
                        return (
                          <th key={i} ref={isToday ? todayRef : null} className="px-1 text-center min-w-[42px]">
                             <span className={`text-[10px] font-black ${isToday ? 'text-[#3b82f6]' : 'text-[var(--text-muted)]'}`}>
                                {(i+1).toString().padStart(2, '0')}
                             </span>
                          </th>
                        );
                      })}
                      <th className="px-4 text-center border-l border-[var(--border-color)]">
                         <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((h, idx) => {
                      const monthData = checked[h.id]?.[`${currentYear}-${habitMonth}`] || {};
                      const done = Object.values(monthData).filter(Boolean).length;
                      const goal = h.goal || daysInMonth;
                      const pct  = Math.min(Math.round((done / goal) * 100), 100);
                      return (
                        <tr key={h.id} className="border-b border-[var(--border-color)]/50 group">
                           <td className="px-6 py-4 sticky left-0 z-20 glass border-r border-[var(--border-color)]">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full" style={{ background: h.color }} />
                                  <span className="text-sm font-bold whitespace-nowrap">{h.emoji} {h.name}</span>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                    <button onClick={() => editHabit(h.id)} className="p-1 px-2 text-[var(--text-muted)] hover:text-[#3b82f6] transition-colors"><i className="fas fa-pencil-alt text-[10px]" /></button>
                                    <button onClick={() => deleteHabit(h.id)} className="p-1 px-2 text-[var(--text-muted)] hover:text-[#ef4444] transition-colors"><i className="fas fa-trash text-[10px]" /></button>
                                  </div>

                                   {getStreak(h.id) >= 3 && (
                                     <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[#3b82f6]" style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)' }}>
                                        <i className="fas fa-fire text-[9px]" />
                                        <span className="text-[9px] font-black">{getStreak(h.id)}</span>
                                     </span>
                                   )}
                               </div>
                           </td>
                           {Array.from({ length: daysInMonth }).map((_, i) => {
                              const day = i + 1;
                              const isToday = day === currentDay && habitMonth === currentMonth;
                              const isFuture = habitMonth > currentMonth || (habitMonth === currentMonth && day > currentDay);
                              const isChecked = checked[h.id]?.[monthKey]?.[day];
                              return (
                                <td key={i} className="p-1">
                                   <button 
                                      onClick={() => {
                                        if (isFuture) return; // Cannot track habits in the future
                                        const habitMonthData = checked[h.id] || {};
                                        const currentMonthData = habitMonthData[monthKey] || {};
                                        const updated = { 
                                          ...checked, 
                                          [h.id]: { 
                                            ...habitMonthData, 
                                            [monthKey]: { ...currentMonthData, [day]: !isChecked } 
                                          } 
                                        };
                                        setChecked(updated);
                                        localStorage.setItem('at-checked', JSON.stringify(updated));
                                        syncToCloud({ checked: updated });
                                      }}
                                      className={`w-6 h-6 rounded-[7px] transition-all relative flex items-center justify-center group/btn ${isFuture ? 'cursor-not-allowed opacity-20' : ''}`}
                                      style={{ 
                                        backgroundColor: isChecked ? h.color : 'transparent',
                                        border: isChecked ? `1px solid ${h.color}` : (isToday ? `1px solid ${h.color}40` : (isFuture ? `1px solid var(--border-color)` : '1px solid var(--border-color)'))
                                      }}
                                      title={isFuture ? "Cannot track future habits" : ""}
                                   >
                                      {isChecked ? <i className={`fas fa-check text-[9px] ${isDark ? 'text-black' : 'text-white'}`} /> : <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted-faint)] opacity-0 group-hover/btn:opacity-100" />}
                                   </button>
                                </td>
                              );
                           })}
                           <td className="px-4 py-4 border-l border-[var(--border-color)]">
                              <div className="flex items-center gap-2">
                                 <div className="flex-1 min-w-[60px] h-1 rounded-full bg-[var(--surface-layer)] overflow-hidden">
                                    <div className="h-full" style={{ width: `${pct}%`, background: h.color }} />
                                 </div>
                                 <span className="text-[10px] font-black" style={{ color: h.color }}>{done}/{goal}</span>
                              </div>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </div>
            
            <div className="max-w-7xl mx-auto mt-6">
                {showAddHabit ? (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 glass p-8 rounded-[2rem] border border-[var(--border-color)] max-w-lg">
                    <div className="flex gap-2">
                       <div className="w-10 h-10 rounded-xl glass border border-[var(--border-color)] flex items-center justify-center text-lg">{selectedEmoji}</div>
                       <input className="flex-1 bg-transparent border-none outline-none px-2 text-sm font-black" placeholder="New habit objective..." value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} autoFocus />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                       {RECOMMENDED_EMOJIS.map(em => (
                         <button key={em} onClick={() => setSelectedEmoji(em)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedEmoji === em ? 'bg-[#3b82f620] border border-[#3b82f6] scale-110' : 'hover:bg-[var(--surface-layer)] border border-transparent'}`}>
                            {em}
                         </button>
                       ))}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                       <button onClick={addHabit} className="flex-1 py-2.5 rounded-xl bg-[#3b82f6] text-white text-xs font-black shadow-[0_5px_15px_rgba(59,130,246,0.2)]">ACTIVATE SYSTEM</button>
                       <button onClick={() => setShowAddHabit(false)} className="px-6 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-xs font-black">ABORT</button>
                    </div>
                  </motion.div>
                ) : (
                  <button onClick={() => setShowAddHabit(true)} className="group flex items-center gap-2 text-xs font-black text-[var(--text-muted)] hover:text-[#3b82f6] transition-all tracking-widest px-4 py-2 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[#3b82f6]">
                    <i className="fas fa-plus text-[10px]" /> ADD HABIT OBJECTIVE
                  </button>
                )}
            </div>
          </motion.div>
        )}

        {tab === 'Tasks' && (
          <motion.div 
            key="tasks"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 pb-20 max-w-7xl mx-auto"
          >
             <div className="max-w-5xl mx-auto">
                <div className="glass rounded-[2.5rem] p-8 border border-[var(--border-color)] mb-12">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Session Progress</h3>
                       <span className="text-xs font-black text-[#3b82f6]">{taskPct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[var(--surface-layer)] rounded-full overflow-hidden border border-[var(--border-color)]">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${taskPct}%` }} transition={{ duration: 1.5, ease: 'circOut' }} className="h-full bg-[#3b82f6]" />
                    </div>
                </div>

                <div className="flex gap-2 mb-8">
                   <input className="flex-1 glass rounded-2xl px-6 py-4 text-sm font-bold outline-none border border-[var(--border-color)] focus:border-[#3b82f6] transition-all" placeholder="Immediate operational objective..." value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} />
                   <button onClick={addTask} className="px-8 flex items-center justify-center rounded-2xl bg-[#3b82f6] text-white text-sm font-black active:scale-95 transition-all">ENGAGE</button>
                </div>

                <div className="space-y-3">
                   {filteredTasks.map((t, idx) => (
                     <motion.div 
                       initial={{ opacity: 0, x: -10 }} 
                       animate={{ opacity: 1, x: 0 }} 
                       key={t.id} 
                       className="group glass rounded-[2rem] p-6 border border-[var(--border-color)] flex items-center gap-4 hover:border-[#3b82f630] transition-all"
                     >
                       <button onClick={() => toggleTask(t.id)} className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${t.status === 'Completed' ? 'bg-[#3b82f6] border-[#3b82f6]' : 'border-[var(--border-color)] hover:border-[#3b82f6]'}`}>
                          {t.status === 'Completed' && <i className="fas fa-check text-[10px] text-white" />}
                       </button>
                       <div className="flex-1">
                          <p className={`text-sm font-bold ${t.status === 'Completed' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: PRIORITY_COLORS_MAP[t.priority] }}>{t.priority} Range</span>
                          </div>
                       </div>
                       <button onClick={() => deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-[#ef4444] transition-all"><i className="fas fa-trash text-xs" /></button>
                     </motion.div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}

        {tab === 'Journal' && (
          <motion.div 
            key="journal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="px-6 pb-20 max-w-7xl mx-auto"
          >
             <div className="max-w-5xl mx-auto">
                <div className="glass rounded-[40px] p-8 border border-[var(--border-color)] mb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12">
                   <i className="fas fa-feather text-[200px]" />
                </div>
                
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-6">Internal Reflection Log</h3>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {MOODS.map(m => (
                    <button key={m.label} onClick={() => setMood(mood?.label === m.label ? null : m)}
                      className={`px-4 py-3 rounded-2xl border transition-all flex items-center gap-2 ${mood?.label === m.label ? 'bg-[var(--surface-layer)] border-[#3b82f6]' : 'border-[var(--border-color)] hover:border-[#3b82f630]'}`}
                    >
                      <span className="text-xl">{m.emoji}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${mood?.label === m.label ? 'text-[#3b82f6]' : 'text-[var(--text-muted)]'}`}>{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                   <div className="flex flex-wrap gap-2 py-2">
                      {JOURNAL_TEMPLATES.map(t => (
                        <button key={t.label} onClick={() => setJournalText(prev => prev + t.text)} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:border-[#3b82f6] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[#3b82f6] transition-all flex items-center gap-2 bg-[var(--surface-layer)]/30">
                           <span>{t.icon}</span> {t.label}
                        </button>
                      ))}
                   </div>
                   <input className="w-full bg-transparent border-b border-[var(--border-color)] pb-4 text-xl font-black outline-none focus:border-[#3b82f6] transition-all" style={{ color: 'var(--text-primary)' }} placeholder="The primary win of this session..." value={wins} onChange={e => setWins(e.target.value)} />
                   <textarea className="w-full bg-transparent p-4 rounded-3xl glass border border-[var(--border-color)] min-h-[160px] outline-none focus:border-[#3b82f6] transition-all font-medium text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }} placeholder="Detailed deep-dive reflections..." value={journalText} onChange={e => setJournalText(e.target.value)} />
                </div>

                <button onClick={addEntry} className="w-full mt-6 py-4 rounded-3xl bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] text-white text-sm font-black shadow-[0_10px_30px_rgba(59,130,246,0.3)] active:scale-95 transition-all">POST REFLECTION LOG</button>
             </div>

             <div className="space-y-6">
                {entries.map((e, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    key={e.id} 
                    className="glass rounded-[32px] overflow-hidden border border-[var(--border-color)] group"
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  >
                    <div className="p-6 flex items-center justify-between cursor-pointer">
                       <div className="flex items-center gap-5">
                          {e.mood && <span className="text-2xl">{e.mood.emoji}</span>}
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">{e.date} · {e.time}</p>
                             <h4 className="text-sm font-black mt-1" style={{ color: 'var(--text-primary)' }}>{e.wins || 'Undocumented Session'}</h4>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <button onClick={(ev) => { ev.stopPropagation(); saveEntries(entries.filter(x => x.id !== e.id)); }} className="p-2 text-[var(--text-muted)] hover:text-[#ef4444] transition-all opacity-0 group-hover:opacity-100"><i className="fas fa-trash text-xs" /></button>
                          <i className={`fas fa-chevron-down text-[10px] text-[var(--text-muted)] transition-transform duration-500 ${expandedId === e.id ? 'rotate-180' : ''}`} />
                       </div>
                    </div>
                    
                    <AnimatePresence>
                      {expandedId === e.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                           <div className="px-6 pb-8 border-t border-[var(--border-color)]/30 pt-4">
                              <p className="text-sm font-medium leading-relaxed text-[var(--text-muted)] italic">"{e.text}"</p>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
           </div>
          </motion.div>
        )}
        {tab === 'Edu Vault' && (
          <motion.div 
            key="edu-vault"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-6 pb-20 max-w-7xl mx-auto"
          >
             <div className="max-w-4xl mx-auto">
                <div className="glass rounded-[40px] p-8 border border-[var(--border-color)] mb-12 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-[0.02] -rotate-12 translate-x-8 -translate-y-8">
                      <i className="fas fa-university text-[160px]" />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#3b82f6] mb-8 flex items-center gap-3">
                      <i className="fas fa-vault" /> Edu Vault Repository
                   </h3>
                   <div className="space-y-4">
                      <textarea 
                        className="w-full bg-[var(--surface-layer)] p-6 rounded-[2rem] border border-[var(--border-color)] min-h-[160px] outline-none focus:border-[#3b82f6] transition-all font-medium text-sm leading-relaxed glass" 
                        style={{ color: 'var(--text-primary)' }}
                        placeholder="Capture study insights, lecture notes, or research findings..." 
                        value={newNote} 
                        onChange={e => setNewNote(e.target.value)} 
                      />
                      <div className="flex flex-col md:flex-row gap-3">
                         <div className="flex-1 relative group">
                            <i className="fas fa-bullseye absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px] group-focus-within:text-[#10b981] transition-colors" />
                            <input 
                              className="w-full bg-[var(--surface-layer)] rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none border border-[var(--border-color)] focus:border-[#10b981] transition-all glass" 
                              style={{ color: 'var(--text-primary)' }}
                              placeholder="Link to Strategic Goal (e.g. Master React)" 
                              value={noteGoal} 
                              onChange={e => setNoteGoal(e.target.value)} 
                            />
                         </div>
                         <button 
                           onClick={addEduNote} 
                           className="px-10 py-4 rounded-2xl bg-[#3b82f6] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                         >
                            Secure Discovery
                         </button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {eduNotes.map((n) => (
                      <motion.div 
                        key={n.id} 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass p-8 rounded-[2.5rem] border border-[var(--border-color)] group relative overflow-hidden hover:border-[#3b82f640] transition-all duration-500"
                      >
                         <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500">
                            <i className="fas fa-scroll text-5xl" />
                         </div>
                         <div className="flex items-center justify-between mb-6">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                               <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> {n.date}
                            </span>
                            <button onClick={() => deleteEduNote(n.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                               <i className="fas fa-trash-can text-xs" />
                            </button>
                         </div>
                         <p className="text-sm font-semibold leading-relaxed mb-8 text-[var(--text-primary)] line-clamp-6">{n.text}</p>
                         {n.goalLink && (
                            <div className="mt-auto pt-5 border-t border-[var(--border-color)]/30 flex items-center gap-3">
                               <div className="flex -space-x-1">
                                  <div className="w-2 h-2 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
                               </div>
                               <span className="text-[9px] font-black uppercase tracking-widest text-[#10b981]">Objective: {n.goalLink}</span>
                            </div>
                         )}
                      </motion.div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </>
  );
}
