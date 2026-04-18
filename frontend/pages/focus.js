import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from '@/components/NavBar';
import { useTheme } from '@/pages/_app';
import { fetchTrackerData, syncTrackerData } from '@/lib/api';

const DURATIONS = [
  { label: 'Short Focus', mins: 15, color: '#10b981' },
  { label: 'Deep Work',   mins: 25, color: '#3b82f6' },
  { label: 'Intense',     mins: 45, color: '#60a5fa' },
  { label: 'Extended',    mins: 60, color: '#2563eb' },
];

const AMBIENT_SOUNDS = [
  { id: 'lofi',  label: 'Focus Lo-fi',  url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', icon: 'fa-headphones' },
  { id: 'rain',  label: 'Rain Protocol', url: 'https://assets.mixkit.co/sfx/preview/mixkit-light-rain-loop-2393.mp3', icon: 'fa-cloud-showers-heavy' },
  { id: 'space', label: 'Deep Space', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', icon: 'fa-atom' },
];

export default function FocusPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, mounted } = useTheme();
  
  const [seconds, setSeconds] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(25);
  const [endTime, setEndTime] = useState(null);
  const [stats, setStats] = useState({ todaySessions: 0, totalMinutes: 0 });
  const [currentSound, setCurrentSound] = useState(null);
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/portal');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const loadServerData = async () => {
        const data = await fetchTrackerData(session.user.email);
        if (data && data.focusStats) {
          setStats(data.focusStats);
          localStorage.setItem('at-focus-stats', JSON.stringify(data.focusStats));
        } else {
          try {
            const s = localStorage.getItem('at-focus-stats');
            if (s) {
              const parsed = JSON.parse(s);
              setStats(parsed);
              syncTrackerData(session.user.email, { focusStats: parsed });
            }
          } catch {}
        }
      };
      loadServerData();
    }
  }, [session, status]);

  useEffect(() => {
    let interval = null;
    if (isActive && endTime) {
      interval = setInterval(() => {
        const remaining = Math.round((endTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setSeconds(0);
        } else {
          setSeconds(remaining);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isActive, endTime]);

  useEffect(() => {
    if (seconds === 0 && isActive && endTime) {
      handleComplete();
    }
  }, [seconds, isActive, endTime]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('Audio playback failed', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSound]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggleSound = (sound) => {
    if (currentSound?.id === sound.id) {
      setCurrentSound(null);
      setIsPlaying(false);
    } else {
      setCurrentSound(sound);
      setIsPlaying(true);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    setEndTime(null);
    const newStats = {
      todaySessions: stats.todaySessions + 1,
      totalMinutes: stats.totalMinutes + sessionTime
    };
    setStats(newStats);
    localStorage.setItem('at-focus-stats', JSON.stringify(newStats));
    if (session?.user?.email) {
      syncTrackerData(session.user.email, { focusStats: newStats });
    }
    setShowCelebration(true);
  };

  const startTimer = (mins) => {
    setIsActive(false);
    setSessionTime(mins);
    setSeconds(mins * 60);
    setEndTime(Date.now() + mins * 60000);
    setIsActive(true);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = (seconds / (sessionTime * 60));
  const dashOffset = 2 * Math.PI * 140 * progress;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--background-main)' }}>
      <Head><title>Deep Focus — Activity Tracker</title></Head>
      <NavBar session={session} active="/focus" />

      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none -center">
         <motion.div 
           animate={{ 
             scale: isActive ? [1, 1.1, 1] : 1,
             opacity: isActive ? [0.05, 0.1, 0.05] : 0.05
           }}
           transition={{ duration: 4, repeat: Infinity }}
           className="w-[800px] h-[800px] bg-[#3b82f6] rounded-full blur-[150px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" 
         />
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-12 pb-4 relative z-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-16">
           <h1 className="text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Deep <span className="text-[#3b82f6]">Focus</span></h1>
           <p className="text-xs font-black text-[var(--text-muted)] mt-2 uppercase tracking-[0.3em]">{isActive ? 'Isolation Protocol Active' : 'Standby for Operative Focus'}</p>
        </motion.div>

        {/* Timer Core */}
        <div className="flex flex-col items-center">
           <div className="relative w-[320px] h-[320px] mb-16">
              {/* Circular Progress SVG */}
              <svg className="w-full h-full -rotate-90">
                 <circle cx="160" cy="160" r="140" fill="transparent" stroke="var(--surface-layer)" strokeWidth="12" />
                 <motion.circle 
                    cx="160" cy="160" r="140" fill="transparent" stroke="#3b82f6" strokeWidth="12" 
                    strokeDasharray={2 * Math.PI * 140}
                    animate={{ strokeDashoffset: 2 * Math.PI * 140 - dashOffset }}
                    transition={{ ease: 'linear' }}
                    strokeLinecap="round"
                 />
              </svg>
              
              {/* Central Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <div className="text-7xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {formatTime(seconds)}
                 </div>
                 <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-2">Time Remaining</div>
              </div>

              {/* Decorative Pulsing Dots (active only) */}
              {isActive && (
                <div className="absolute inset-0 pointer-events-none">
                  {[0, 90, 180, 270].map(deg => (
                    <motion.div 
                      key={deg}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, delay: deg / 90 * 0.5 }}
                      className="absolute w-2 h-2 rounded-full bg-[#3b82f6]"
                      style={{ 
                        top: '50%', left: '50%',
                        transform: `rotate(${deg}deg) translate(140px, -50%)`
                      }} 
                    />
                  ))}
                </div>
              )}
           </div>

           {/* Audio Hub */}
           <div className="mb-12 glass rounded-[2rem] p-4 md:px-6 border border-[var(--border-color)] w-full flex flex-wrap justify-center items-center gap-4 lg:gap-6 transition-all">
              <div className="flex flex-wrap justify-center items-center gap-4">
                 <div className="flex gap-2 shrink-0">
                    {AMBIENT_SOUNDS.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => toggleSound(s)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentSound?.id === s.id ? 'bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:bg-[var(--surface-layer)] text-[var(--text-muted)]'}`}
                      >
                        <i className={`fas ${s.icon} text-lg`} />
                      </button>
                    ))}
                 </div>
                 <div className="hidden sm:block h-8 w-[1px] bg-[var(--border-color)] shrink-0" />
                 <div className="flex items-center gap-3 shrink-0">
                    <i className="fas fa-volume-low text-[var(--text-muted)] text-xs" />
                    <input 
                      type="range" min="0" max="1" step="0.01" 
                      value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
                      className="w-20 md:w-24 accent-[#3b82f6] bg-[var(--surface-layer)] h-1 rounded-full appearance-none cursor-pointer"
                    />
                    <i className="fas fa-volume-high text-[var(--text-muted)] text-xs" />
                 </div>
              </div>

              {currentSound && (
                <>
                  <div className="flex items-center justify-center gap-3 w-full sm:w-auto border-t lg:border-t-0 lg:border-l border-[var(--border-color)] pt-3 lg:pt-0 lg:pl-6 shrink-0 transition-all">
                     <button 
                       onClick={() => setIsPlaying(!isPlaying)}
                       className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-[#10b98120] text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[var(--surface-layer)] text-[var(--text-primary)] hover:bg-[#3b82f620] hover:text-[#3b82f6]'}`}
                     >
                       <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm ml-0.5`} />
                     </button>
                     <div className="text-left">
                       <p className={`text-[10px] font-black uppercase tracking-widest ${isPlaying ? 'text-[#3b82f6] animate-pulse' : 'text-[var(--text-muted)]'}`}>
                         {isPlaying ? 'Playing:' : 'Paused:'}
                       </p>
                       <p className="text-[11px] font-bold text-[var(--text-primary)] truncate max-w-[120px]">
                         {currentSound.label}
                       </p>
                     </div>
                  </div>
                </>
              )}
              {currentSound && (
                <audio ref={audioRef} src={currentSound.url} loop />
              )}
           </div>

           {/* Controls */}
           <div className="flex flex-wrap justify-center gap-3 mb-16">
              {DURATIONS.map(d => (
                <button 
                  key={d.label} 
                  onClick={() => startTimer(d.mins)}
                  disabled={isActive && sessionTime === d.mins}
                  className={`px-5 py-3 rounded-2xl glass border font-black text-[10px] uppercase tracking-widest transition-all ${isActive && sessionTime === d.mins ? 'bg-[#3b82f615] border-[#3b82f6] text-[#3b82f6]' : 'border-[var(--border-color)] hover:border-[#3b82f630] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  {d.label} ({d.mins}m)
                </button>
              ))}
           </div>

           <div className="flex gap-4">
              <button 
                onClick={() => {
                  if (isActive) {
                    setIsActive(false);
                    setEndTime(null);
                  } else {
                    setEndTime(Date.now() + seconds * 1000);
                    setIsActive(true);
                  }
                }}
                className={`px-10 py-5 rounded-3xl font-black text-sm transition-all shadow-2xl ${isActive ? 'bg-[var(--surface-layer)] text-[var(--text-primary)] border border-[var(--border-color)]' : 'bg-[#3b82f6] text-white hover:scale-105 active:scale-95'}`}
              >
                 {isActive ? 'SUSPEND SESSION' : 'ENGAGE FOCUS'}
              </button>
              <button 
                onClick={() => { setIsActive(false); setEndTime(null); setSeconds(sessionTime * 60); }}
                className="px-6 py-5 rounded-3xl glass border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[#ef4444] transition-all"
              >
                 <i className="fas fa-redo-alt" />
              </button>
           </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-6 mt-24">
           <div className="glass rounded-[32px] p-8 border border-[var(--border-color)] text-center relative overflow-hidden group">
              <div className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{stats.todaySessions}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sessions Completed Today</div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#3b82f608] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
           <div className="glass rounded-[32px] p-8 border border-[var(--border-color)] text-center relative overflow-hidden group">
              <div className="text-4xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>{stats.totalMinutes}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total Minutes Deep Work</div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#3b82f608] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
        </div>
      </main>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }} 
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
          >
             <motion.div 
                initial={{ scale: 0.8, y: 50 }} 
                animate={{ scale: 1, y: 0 }} 
                exit={{ scale: 0.8, opacity: 0 }}
                className="glass p-10 rounded-[3rem] border border-[#10b981] text-center max-w-sm w-full shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden relative"
             >
                {/* Ferrari Effect */}
                <motion.div 
                   className="absolute top-1/4 -translate-y-1/2 text-[120px] z-0 opacity-30 blur-[1px]"
                   initial={{ x: '-150vw', skewX: -30 }}
                   animate={{ x: '150vw' }}
                   transition={{ duration: 0.8, ease: "easeIn", delay: 0.1 }}
                >
                   🏎️💨
                </motion.div>
                
                <div className="relative z-10">
                   <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                      className="w-24 h-24 mx-auto bg-[#10b98120] rounded-full flex items-center justify-center mb-6 border border-[#10b981]"
                   >
                      <i className="fas fa-trophy text-4xl text-[#10b981]" />
                   </motion.div>
                   <h2 className="text-3xl font-black mb-2 text-white">Focus Secured.</h2>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10b981] mb-10">Mission Accomplished</p>
                   
                   <button 
                     onClick={() => setShowCelebration(false)}
                     className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-xs font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all"
                   >
                     Continue Protocol
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
