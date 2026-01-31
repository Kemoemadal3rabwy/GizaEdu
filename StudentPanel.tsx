
import React, { useState, useEffect } from 'react';
import { User, Exam, ExamResult, Announcement, Language, Theme } from '../types';
import { db } from '../store';
import { translations } from '../translations';
import { 
  Book, Award, User as UserIcon, LogOut, Search, 
  ChevronRight, Clock, HelpCircle, ArrowRight,
  BarChart3, Calendar, Bell, ShieldCheck, Fingerprint, 
  Lock, Zap, Star, MessageCircle, Heart, Moon, Sun, Globe
} from 'lucide-react';
import ExamTaker from './ExamTaker';

interface StudentPanelProps {
  user: User;
  onLogout: () => void;
  onUpdatePrefs: (updates: Partial<User>) => void;
}

const StudentPanel: React.FC<StudentPanelProps> = ({ user: initialUser, onLogout, onUpdatePrefs }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'results' | 'profile' | 'security'>('browse');
  const [user, setUser] = useState<User>(initialUser);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [takingExam, setTakingExam] = useState<Exam | null>(null);

  const t = translations[user.language];

  useEffect(() => {
    const fetchData = async () => {
      setExams(await db.exams.getAll());
      setResults(await db.results.getByStudent(user.id));
      setAnnouncements(await db.announcements.getAll());
    };
    fetchData();
  }, [user.id]);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const stats = {
    examsCompleted: results.length,
    averageScore: results.length > 0 ? (results.reduce((acc, r) => acc + (r.score / r.totalPoints), 0) / results.length * 100).toFixed(1) : 0,
    topScore: results.length > 0 ? Math.max(...results.map(r => (r.score / r.totalPoints) * 100)).toFixed(1) : 0
  };

  const toggleLanguage = () => {
    onUpdatePrefs({ language: user.language === 'en' ? 'ar' : 'en' });
  };

  const toggleTheme = () => {
    onUpdatePrefs({ theme: user.theme === 'light' ? 'dark' : 'light' });
  };

  if (takingExam) {
    return <ExamTaker user={user} exam={takingExam} onComplete={async () => {
      setTakingExam(null);
      setResults(await db.results.getByStudent(user.id));
      setActiveTab('results');
    }} onCancel={() => setTakingExam(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-slate-950 flex flex-col transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
          {/* Top Nav */}
          <nav className="flex items-center justify-between mb-12 bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 backdrop-blur-md sticky top-6 z-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-violet-600 rounded-[1.25rem] flex items-center justify-center rotate-6 shadow-xl shadow-violet-200 dark:shadow-none">
                <span className="text-white font-black text-2xl">G</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">GizaEdu</h1>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
              <TabButton active={activeTab === 'browse'} label={t.discover} icon={<Zap size={16} />} onClick={() => setActiveTab('browse')} />
              <TabButton active={activeTab === 'results'} label={t.results} icon={<Award size={16} />} onClick={() => setActiveTab('results')} />
              <TabButton active={activeTab === 'profile'} label={t.account} icon={<UserIcon size={16} />} onClick={() => setActiveTab('profile')} />
              <TabButton active={activeTab === 'security'} label={t.vault} icon={<Lock size={16} />} onClick={() => setActiveTab('security')} />
            </div>

            <div className="flex items-center gap-4">
              <button onClick={toggleLanguage} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-all border border-transparent dark:border-slate-700">
                <Globe size={20} />
              </button>
              <button onClick={toggleTheme} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all border border-transparent dark:border-slate-700">
                {user.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
              <button onClick={onLogout} className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100 dark:border-rose-900/50">
                <LogOut size={20} />
              </button>
            </div>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {activeTab === 'browse' && (
                <>
                  <div className="bg-slate-950 dark:bg-violet-950/40 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl border border-white/5">
                    <div className="relative z-10">
                      <h2 className="text-5xl font-black mb-4 tracking-tighter leading-none">{t.welcome}</h2>
                      <p className="text-slate-400 dark:text-violet-200/60 max-w-sm mb-10 leading-relaxed font-medium text-lg">{t.description}</p>
                      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 w-fit px-6 py-3 rounded-2xl backdrop-blur-xl border border-white/10">
                        <BarChart3 size={16} className="text-violet-400" /> {exams.length} {t.modules}
                      </div>
                    </div>
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-600/30 rounded-full blur-[100px]"></div>
                  </div>

                  <section>
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{t.modules}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {exams.length === 0 ? (
                        <div className="col-span-2 p-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center">
                          <Book size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-6" />
                          <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-xs tracking-[0.2em]">Exams arriving soon</p>
                        </div>
                      ) : (
                        exams.map(e => (
                          <ExamCard key={e.id} exam={e} onStart={() => setTakingExam(e)} t={t} />
                        ))
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ... Profile & Security Tabs using t. translations ... */}
              {activeTab === 'profile' && (
                <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">
                  <div className="flex flex-col md:flex-row gap-12 items-center md:items-start text-center md:text-left">
                    <div className="w-44 h-44 bg-slate-50 dark:bg-slate-800 rounded-[3rem] overflow-hidden border-8 border-white dark:border-slate-900 shadow-2xl">
                      <img src={user.profilePic || `https://picsum.photos/seed/${user.id}/400`} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 w-full space-y-8">
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{user.firstName} {user.lastName}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ProfileItem label="Email" value={user.email} />
                        <ProfileItem label="Language" value={user.language.toUpperCase()} />
                        <ProfileItem label="Mode" value={user.theme.toUpperCase()} />
                        <ProfileItem label="Platform ID" value={user.id} />
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Widgets */}
            <div className="lg:col-span-4 space-y-10">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] mb-8">Metrics Engine</h4>
                <div className="space-y-4">
                  <SmallStat label="Mastered" value={stats.examsCompleted} icon={<Book size={16} />} color="violet" />
                  <SmallStat label="Efficiency" value={`${stats.averageScore}%`} icon={<BarChart3 size={16} />} color="emerald" />
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-8 rounded-[3rem] border border-emerald-100 dark:border-emerald-800/50">
                <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <MessageCircle size={16} /> {t.support}
                </h4>
                <a href="https://wa.me/201129847667" className="w-full block py-4 bg-white dark:bg-slate-950 text-center rounded-2xl font-black text-xs text-emerald-600 dark:text-emerald-400 shadow-sm">01129847667</a>
              </div>
            </div>
          </div>
        </div>

        <footer className="py-12 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto px-6 text-center">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-4">GizaEdu Ecosystem v3.0</p>
                <div className="flex items-center justify-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <span>{t.made_by}</span>
                    <Heart size={14} className="text-rose-500 fill-rose-500" />
                </div>
            </div>
        </footer>
    </div>
  );
};

const TabButton = ({ active, label, icon, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all duration-500 font-black text-xs uppercase tracking-widest ${active ? 'bg-slate-950 dark:bg-violet-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>
    {icon} <span>{label}</span>
  </button>
);

const ExamCard = ({ exam, onStart, t }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group">
    <div className="flex justify-between items-start mb-6">
      <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/20 rounded-3xl flex items-center justify-center border border-violet-100 dark:border-violet-800/50">
        <Book size={28} className="text-violet-600 dark:text-violet-400" />
      </div>
      <div className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">{exam.durationMinutes}m</div>
    </div>
    <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{exam.title}</h4>
    <button onClick={onStart} className="w-full mt-6 py-4 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-violet-700 transition-all">{t.start_exam}</button>
  </div>
);

const ProfileItem = ({ label, value }: any) => (
  <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700">
    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">{label}</p>
    <p className="text-sm font-black text-slate-900 dark:text-slate-200">{value}</p>
  </div>
);

const SmallStat = ({ label, value, icon, color }: any) => (
  <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 dark:text-${color}-400`}>{icon}</div>
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{label}</span>
    </div>
    <span className="text-base font-black text-slate-900 dark:text-slate-200">{value}</span>
  </div>
);

export default StudentPanel;
