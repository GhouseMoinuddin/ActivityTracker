import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { useTheme } from '@/pages/_app';
import { fetchTrackerData } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Radar, Bar, PolarArea } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
};

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, mounted } = useTheme();
  const isDark = theme === 'dark';
  
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/portal');
  }, [status, router]);

  // INSTANT HYDRATION
  useEffect(() => {
    try {
      const h = localStorage.getItem('at-habits'); if (h) setHabits(JSON.parse(h));
      const c = localStorage.getItem('at-checked'); if (c) setChecked(JSON.parse(c));
      const t = localStorage.getItem('at-tasks');   if (t) setTasks(JSON.parse(t));
    } catch (e) {}
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
        }
      };
      loadServerData();
    }
  }, [session, status]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthKey = `${currentYear}-${currentMonth}`;
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'Completed').length;
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const habitStats = habits.map(h => {
    let d = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      if (((checked[h.id] || {})[monthKey]?.[day]) || checked[h.id]?.[day] === true) d++;
    }
    const g = h.goal || daysInMonth;
    return { ...h, done: d, goal: g, pct: Math.min(Math.round((d / g) * 100), 100) };
  });

  const avgHabitPct = habitStats.length ? Math.round(habitStats.reduce((s, h) => s + h.pct, 0) / habitStats.length) : 0;

  let peakDay = 1;
  let maxCount = 0;
  const dayCounts = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const count = habits.filter(h => ((checked[h.id] || {})[monthKey]?.[day])).length;
    if (count > maxCount) { maxCount = count; peakDay = day; }
    return count;
  });
  const peakPerformanceText = maxCount > 0 ? `DAY ${peakDay}` : 'N/A';
  const entropy = avgHabitPct > 70 ? 'LOW' : avgHabitPct > 40 ? 'MEDIUM' : 'HIGH';

  const [chartRange, setChartRange] = useState('week');

  // ─── CHART DATA PREP ──────────────────────────────────────────────────────
  const lineLabels = [];
  const lineData = [];

  if (chartRange === 'week') {
    for (let i = 6; i >= 0; i--) {
       const date = new Date();
       date.setDate(date.getDate() - i);
       lineLabels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
       const mKey = `${date.getFullYear()}-${date.getMonth()}`;
       const dNum = date.getDate();
       const hCount = habits.filter(h => checked[h.id]?.[mKey]?.[dNum]).length;
       lineData.push(hCount);
    }
  } else if (chartRange === 'month') {
    for (let i = 29; i >= 0; i--) {
       const date = new Date();
       date.setDate(date.getDate() - i);
       lineLabels.push(i % 5 === 0 ? `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })}` : '');
       const mKey = `${date.getFullYear()}-${date.getMonth()}`;
       const dNum = date.getDate();
       const hCount = habits.filter(h => checked[h.id]?.[mKey]?.[dNum]).length;
       lineData.push(hCount);
    }
  } else if (chartRange === '6months') {
    for (let i = 5; i >= 0; i--) {
       const date = new Date();
       date.setMonth(date.getMonth() - i);
       lineLabels.push(date.toLocaleDateString('en-US', { month: 'short' }));
       const mKey = `${date.getFullYear()}-${date.getMonth()}`;
       let total = 0;
       for (const h of habits) {
         if (checked[h.id]?.[mKey]) {
            total += Object.values(checked[h.id][mKey]).filter(Boolean).length;
         }
       }
       lineData.push(total);
    }
  } else if (chartRange === 'year') {
    for (let i = 11; i >= 0; i--) {
       const date = new Date();
       date.setMonth(date.getMonth() - i);
       lineLabels.push(date.toLocaleDateString('en-US', { month: 'short' }));
       const mKey = `${date.getFullYear()}-${date.getMonth()}`;
       let total = 0;
       for (const h of habits) {
         if (checked[h.id]?.[mKey]) {
            total += Object.values(checked[h.id][mKey]).filter(Boolean).length;
         }
       }
       lineData.push(total);
    }
  }

  const lineChartData = {
    labels: lineLabels,
    datasets: [{
      label: chartRange === 'week' || chartRange === 'month' ? 'Daily Completions' : 'Monthly Completions',
      data: lineData,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: chartRange === 'year' || chartRange === '6months' ? 6 : 4,
      pointHoverRadius: 8,
    }]
  };

  const radarData = {
    labels: habitStats.map(h => h.name),
    datasets: [{
      label: 'Habit Stability',
      data: habitStats.map(h => h.pct),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3b82f6',
      pointBackgroundColor: '#3b82f6',
      borderWidth: 2,
    }]
  };

  const doughnutData = {
    labels: habitStats.map(h => h.name),
    datasets: [{
      data: habitStats.map(h => h.done),
      backgroundColor: habitStats.map(h => h.color + 'aa'),
      borderColor: habitStats.map(h => h.color),
      borderWidth: 1,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
        titleColor: isDark ? '#ffffff' : '#000000',
        bodyColor: isDark ? '#ffffff' : '#000000',
        borderColor: '#3b82f620',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      x: { display: true, grid: { display: false }, ticks: { color: 'rgba(156, 163, 175, 0.5)', font: { size: 9, weight: '900' } } },
      y: { display: false }
    }
  };

  const radarOptions = {
    ...chartOptions,
    scales: {
      r: {
        angleLines: { color: 'rgba(156, 163, 175, 0.1)' },
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { display: false },
        pointLabels: { color: 'rgba(156, 163, 175, 0.8)', font: { size: 9, weight: '900' } }
      }
    }
  };

  const isAuthLoading = status === 'loading';

  return (
    <>
      <Head><title>Analytics Interface — Activity Tracker</title></Head>
      <div suppressHydrationWarning className="min-h-screen relative overflow-x-hidden" style={{ background: 'var(--bg)' }}>
        <NavBar session={session} active="/insights" />

        {/* Background Decorative Element */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none" style={{ opacity: isDark ? 0.05 : 0.08 }}>
         <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-[#3b82f6] rounded-full blur-[120px]" />
         <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-[#3b82f6] rounded-full blur-[100px]" />
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
           <h1 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>
             Performance <span className="text-[#3b82f6]">Metrology</span>
           </h1>
           <p className="text-sm font-bold text-[var(--muted)] mt-2 uppercase tracking-widest">Aggregate behavioral data analysis</p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {/* Summary Stat Cards */}
          <motion.div variants={itemVariants} className="glass rounded-[32px] p-8 border border-[var(--border)] relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <i className="fas fa-check-double text-7xl" />
             </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#10b981] mb-2 px-3 py-1 rounded-full w-fit" style={{ background: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.15)' }}>Operational Efficiency</div>
             <div className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>{taskPct}%</div>
             <p className="text-xs font-bold text-[var(--muted)] mt-2">Overall task completion rate</p>
          </motion.div>

          <motion.div variants={itemVariants} className="glass rounded-[32px] p-8 border border-[var(--border)] relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <i className="fas fa-bolt text-7xl" />
             </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#3b82f6] mb-2 px-3 py-1 rounded-full w-fit" style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)' }}>Habit Consistency</div>
             <div className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>{avgHabitPct}%</div>
             <p className="text-xs font-bold text-[var(--muted)] mt-2">Average habit target fulfillment</p>
          </motion.div>

          <motion.div variants={itemVariants} className="glass rounded-[32px] p-8 border border-[var(--border)] relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                <i className="fas fa-calendar-alt text-7xl" />
             </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#3b82f6] mb-2 px-3 py-1 rounded-full w-fit" style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)' }}>System Load</div>
             <div className="text-5xl font-black tracking-tighter" style={{ color: 'var(--text)' }}>{habits.length + tasks.length}</div>
             <p className="text-xs font-bold text-[var(--muted)] mt-2">Total active parameters tracked</p>
          </motion.div>
        </motion.div>

        {/* Consolidated Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[40px] p-6 border border-[var(--border)] h-[300px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2">
                    <i className="fas fa-chart-line text-[#3b82f6]" /> Performance Momentum
                 </h3>
                 <select 
                   value={chartRange} 
                   onChange={(e) => setChartRange(e.target.value)}
                   className="bg-[var(--surface)] text-[10px] font-black uppercase tracking-widest p-2 rounded-xl outline-none border border-[var(--border)] cursor-pointer"
                   style={{ color: 'var(--text-primary)' }}
                 >
                   <option value="week">1 Week</option>
                   <option value="month">1 Month</option>
                   <option value="6months">6 Months</option>
                   <option value="year">1 Year</option>
                 </select>
              </div>
              <div className="flex-1 min-h-0">
                 <Line data={lineChartData} options={chartOptions} />
              </div>
           </motion.div>

           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-[40px] p-6 border border-[var(--border)] h-[300px] flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                 <i className="fas fa-bullseye text-[#3b82f6]" /> Habit Balance Radar
              </h3>
              <div className="flex-1 min-h-0">
                 <Radar data={radarData} options={radarOptions} />
              </div>
           </motion.div>

           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-[40px] p-6 border border-[var(--border)] h-[300px] flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-6 flex items-center gap-2">
                 <i className="fas fa-chart-pie text-[#10b981]" /> Commitment Density
              </h3>
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                 <div className="w-full h-full">
                    <Doughnut data={doughnutData} options={{ ...chartOptions, scales: { x: { display: false }, y: { display: false } } }} />
                 </div>
              </div>
           </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Detailed Habit breakdown */}
           <motion.section initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass rounded-[40px] p-8 border border-[var(--border)]">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-8" style={{ color: 'var(--text)' }}>Habit Precision Breakdown</h2>
              <div className="space-y-6">
                 {habitStats.map((h, i) => (
                   <div key={h.id} className="relative">
                      <div className="flex justify-between items-end mb-2 px-1">
                         <div className="flex items-center gap-2">
                            <span className="text-lg">{h.emoji}</span>
                            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>{h.name}</span>
                         </div>
                         <span className="text-xs font-black" style={{ color: h.color }}>{h.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${h.pct}%` }} transition={{ delay: 0.6 + (i*0.1), duration: 1 }} className="h-full rounded-full" style={{ background: h.color }} />
                      </div>
                      <div className="flex justify-between mt-1 px-1">
                         <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Status: {h.pct >= 80 ? 'Optimal' : h.pct >= 50 ? 'Stable' : 'Unsaturated'}</span>
                         <span className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{h.done} / {h.goal} Cycles</span>
                      </div>
                   </div>
                 ))}
              </div>
           </motion.section>

           {/* Performance Visualization */}
           <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass rounded-[40px] p-8 border border-[var(--border)] overflow-hidden relative">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-8" style={{ color: 'var(--text)' }}>Cyclic Activity Heatmap</h2>
              <div className="grid grid-cols-7 gap-2">
                 {dayCounts.map((completionCount, i) => {
                    const day = i + 1;
                    const maxPossible = habits.length || 1;
                    const opacity = completionCount / maxPossible;
                    return (
                      <motion.div 
                        key={i} 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        transition={{ delay: 0.6 + (i * 0.02) }}
                        className="aspect-square rounded-[8px] flex items-center justify-center text-[8px] font-black group relative"
                        style={{ 
                          background: completionCount > 0 ? `rgba(59, 130, 246, ${0.1 + opacity * 0.9})` : 'var(--surface)',
                          color: completionCount > (maxPossible / 2) ? '#fff' : 'var(--muted)',
                          border: day === new Date().getDate() ? '1px solid #3b82f6' : '1px solid transparent'
                        }}
                      >
                         {day}
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 glass px-2 py-1 rounded-md border border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap text-[9px]">
                            {completionCount} Objectives Met
                         </div>
                      </motion.div>
                    );
                 })}
              </div>
              <div className="mt-8 pt-8 border-t border-[var(--border)]/30">
                 <div className="flex items-center justify-between">
                    <div>
                       <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Peak Performance Day</div>
                       <div className="text-xl font-black text-[#10b981]">{peakPerformanceText}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">System Entropy</div>
                       <div className="text-xl font-black text-[#3b82f6]">{entropy}</div>
                    </div>
                 </div>
              </div>
           </motion.section>
        </div>
      </main>
    </div>
    </>
  );
}
