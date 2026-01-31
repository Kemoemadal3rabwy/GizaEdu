
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Folder, Exam, Announcement, Language, Theme, QuestionType, Question } from '../types';
import { db } from '../store';
import { translations } from '../translations';
import { 
  Users, BookOpen, FolderPlus, PlusCircle, AlertCircle, 
  LogOut, LayoutDashboard, Settings, Search, Trash2, 
  ChevronRight, MoreVertical, ShieldAlert, BarChart3, Bell,
  MessageCircle, Heart, Globe, Moon, Sun, ShieldCheck, UserPlus, UserMinus,
  Download, Upload, Database, Save, HardDrive, ArrowLeft, Plus, Check, X, FileText
} from 'lucide-react';

interface AdminPanelProps {
  user: User;
  onLogout: () => void;
  onUpdatePrefs: (updates: Partial<User>) => void;
}

const SUPER_ADMIN_EMAILS = [
  'kareememad20007925@gmail.com',
  'kareememad200792@gmail.com'
];

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onLogout, onUpdatePrefs }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'folders' | 'announcements' | 'database'>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [resultsCount, setResultsCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder & Exam Management State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam>>({
    title: '',
    description: '',
    durationMinutes: 60,
    questions: []
  });

  const t = translations[user.language];
  const isSuperAdmin = SUPER_ADMIN_EMAILS.some(email => email.toLowerCase() === user.email.toLowerCase());

  const fetchData = async () => {
    const allUsers = await db.users.getAll();
    const allExams = await db.exams.getAll();
    const allFolders = await db.folders.getAll();
    const allAnn = await db.announcements.getAll();
    const allResults = await db.results.getAll();
    
    setUsers(allUsers);
    setExams(allExams);
    setFolders(allFolders);
    setAnnouncements(allAnn);
    setResultsCount(allResults.length);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = {
    totalStudents: users.filter(u => u.role === UserRole.STUDENT).length,
    totalExams: exams.length,
    totalResults: resultsCount,
    bannedStudents: users.filter(u => u.isBanned).length
  };

  // --- Database Actions ---
  const exportDatabase = async () => {
    const data = {
      users: await db.users.getAll(),
      exams: await db.exams.getAll(),
      folders: await db.folders.getAll(),
      announcements: await db.announcements.getAll(),
      timestamp: Date.now(),
      version: "GizaEdu-3.0"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GizaEdu_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.users && data.exams && data.folders) {
          if (confirm("تحذير: هذا الإجراء سيقوم باستبدال كافة البيانات الحالية. هل تريد الاستمرار؟")) {
            await db.users.save(data.users);
            await db.exams.save(data.exams);
            await db.folders.save(data.folders);
            if (data.announcements) await db.announcements.save(data.announcements);
            alert("تم استيراد قاعدة البيانات بنجاح! سيتم إعادة تحميل الصفحة.");
            window.location.reload();
          }
        } else {
          alert("خطأ: تنسيق الملف غير صحيح.");
        }
      } catch (err) {
        alert("خطأ في قراءة ملف قاعدة البيانات.");
      }
    };
    reader.readAsText(file);
  };

  // --- User Actions ---
  const handleBanUser = async (id: string, currentStatus: boolean) => {
    const target = users.find(u => u.id === id);
    if (target && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === target.email.toLowerCase())) return; 
    await db.users.update(id, { isBanned: !currentStatus });
    fetchData();
  };

  const handleToggleRole = async (targetUser: User) => {
    if (!isSuperAdmin) return;
    if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === targetUser.email.toLowerCase())) return;
    const newRole = targetUser.role === UserRole.ADMIN ? UserRole.STUDENT : UserRole.ADMIN;
    await db.users.update(targetUser.id, { role: newRole });
    fetchData();
  };

  // --- Exam & Folder Actions ---
  const handleCreateFolder = async () => {
    const name = prompt("Enter Folder Name:");
    if (!name) return;
    const newFolder: Folder = {
        id: `FOLDER-${Math.random().toString(36).substr(2, 9)}`,
        name,
        parentId: currentFolderId
    };
    await db.folders.addOne(newFolder);
    fetchData();
  };

  const handleDeleteFolder = async (id: string) => {
      if(confirm("Delete this folder? Contents may be lost.")) {
          await db.folders.deleteOne(id);
          fetchData();
      }
  };

  const handleDeleteExam = async (id: string) => {
      if(confirm("Delete this exam permanently?")) {
          await db.exams.deleteOne(id);
          fetchData();
      }
  };

  const startNewExam = () => {
      setIsCreatingExam(true);
      setEditingExam({
          title: '',
          description: '',
          durationMinutes: 60,
          questions: []
      });
  };

  const saveExam = async () => {
      if(!editingExam.title || !editingExam.questions?.length) {
          alert("Please fill in the title and add at least one question.");
          return;
      }

      const newExam: Exam = {
          id: `EXAM-${Math.random().toString(36).substr(2, 9)}`,
          folderId: currentFolderId || 'root',
          title: editingExam.title!,
          description: editingExam.description || '',
          durationMinutes: editingExam.durationMinutes || 60,
          questions: editingExam.questions || [],
          createdAt: Date.now()
      };

      await db.exams.addOne(newExam);
      setIsCreatingExam(false);
      fetchData();
  };

  const addQuestion = () => {
      const type = prompt("Type: (1) Multiple Choice, (2) True/False, (3) Essay");
      if(!type) return;

      const newQ: Question = {
          id: Math.random().toString(36).substr(2, 9),
          type: type === '1' ? QuestionType.MULTIPLE_CHOICE : (type === '2' ? QuestionType.TRUE_FALSE : QuestionType.ESSAY),
          prompt: 'New Question',
          points: 1,
          options: type === '1' ? ['Option A', 'Option B'] : undefined,
          correctAnswer: type === '1' ? 'Option A' : (type === '2' ? 'True' : undefined)
      };

      setEditingExam(prev => ({
          ...prev,
          questions: [...(prev.questions || []), newQ]
      }));
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
      setEditingExam(prev => ({
          ...prev,
          questions: prev.questions?.map(q => q.id === qId ? { ...q, ...updates } : q)
      }));
  };

  const removeQuestion = (qId: string) => {
      setEditingExam(prev => ({
          ...prev,
          questions: prev.questions?.filter(q => q.id !== qId)
      }));
  };

  // --- Render Functions ---

  const renderExamEditor = () => (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Exam Editor</h2>
              <div className="flex gap-2">
                  <button onClick={() => setIsCreatingExam(false)} className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold hover:bg-slate-200">Cancel</button>
                  <button onClick={saveExam} className="px-6 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 shadow-lg shadow-violet-200">Save Exam</button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Exam Title</label>
                  <input 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border border-transparent focus:border-violet-500" 
                    placeholder="e.g., Advanced Biology Midterm"
                    value={editingExam.title}
                    onChange={e => setEditingExam({...editingExam, title: e.target.value})}
                  />
              </div>
              <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Duration (Minutes)</label>
                  <input 
                    type="number"
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border border-transparent focus:border-violet-500" 
                    value={editingExam.durationMinutes}
                    onChange={e => setEditingExam({...editingExam, durationMinutes: parseInt(e.target.value)})}
                  />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400">Description</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl outline-none font-bold text-slate-900 dark:text-white border border-transparent focus:border-violet-500 h-24 resize-none" 
                    placeholder="Instructions for students..."
                    value={editingExam.description}
                    onChange={e => setEditingExam({...editingExam, description: e.target.value})}
                  />
              </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Questions ({editingExam.questions?.length})</h3>
                  <button onClick={addQuestion} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100">
                      <PlusCircle size={18} /> Add Question
                  </button>
              </div>

              <div className="space-y-6">
                  {editingExam.questions?.map((q, idx) => (
                      <div key={q.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 relative group">
                          <button onClick={() => removeQuestion(q.id)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                              <Trash2 size={16} />
                          </button>
                          
                          <div className="flex gap-4 items-start mb-4">
                              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-8 h-8 flex items-center justify-center rounded-lg font-black text-xs">{idx + 1}</span>
                              <div className="flex-1 space-y-4">
                                  <input 
                                    className="w-full bg-transparent font-bold text-lg outline-none placeholder:text-slate-300"
                                    placeholder="Enter question prompt..."
                                    value={q.prompt}
                                    onChange={e => updateQuestion(q.id, { prompt: e.target.value })}
                                  />
                                  
                                  <div className="flex items-center gap-4">
                                      <select 
                                        className="p-2 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold uppercase tracking-wider outline-none border border-slate-200 dark:border-slate-700"
                                        value={q.type}
                                        onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                                      >
                                          <option value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</option>
                                          <option value={QuestionType.TRUE_FALSE}>True / False</option>
                                          <option value={QuestionType.ESSAY}>Essay</option>
                                      </select>
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-400">Points:</span>
                                          <input 
                                            type="number" 
                                            className="w-16 p-2 bg-white dark:bg-slate-900 rounded-lg outline-none text-center font-bold text-sm"
                                            value={q.points}
                                            onChange={e => updateQuestion(q.id, { points: parseInt(e.target.value) })}
                                          />
                                      </div>
                                  </div>

                                  {q.type === QuestionType.MULTIPLE_CHOICE && (
                                      <div className="space-y-2 mt-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                          {q.options?.map((opt, i) => (
                                              <div key={i} className="flex items-center gap-2">
                                                  <input 
                                                    type="radio" 
                                                    name={`correct-${q.id}`}
                                                    checked={q.correctAnswer === opt}
                                                    onChange={() => updateQuestion(q.id, { correctAnswer: opt })}
                                                  />
                                                  <input 
                                                    className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-violet-500 outline-none text-sm font-medium"
                                                    value={opt}
                                                    onChange={e => {
                                                        const newOpts = [...(q.options || [])];
                                                        newOpts[i] = e.target.value;
                                                        updateQuestion(q.id, { options: newOpts });
                                                    }}
                                                  />
                                                  <button onClick={() => {
                                                      const newOpts = q.options?.filter((_, idx) => idx !== i);
                                                      updateQuestion(q.id, { options: newOpts });
                                                  }} className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
                                              </div>
                                          ))}
                                          <button onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] })} className="text-xs font-bold text-violet-500 hover:underline">+ Add Option</button>
                                      </div>
                                  )}

                                  {q.type === QuestionType.TRUE_FALSE && (
                                       <div className="flex gap-4 mt-2">
                                          {['True', 'False'].map(val => (
                                              <button 
                                                key={val}
                                                onClick={() => updateQuestion(q.id, { correctAnswer: val })}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${q.correctAnswer === val ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                              >
                                                  {val}
                                              </button>
                                          ))}
                                       </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderFoldersTab = () => {
    if (isCreatingExam) return renderExamEditor();

    const currentFolder = folders.find(f => f.id === currentFolderId);
    const visibleFolders = folders.filter(f => f.parentId === (currentFolderId || null)); // Use null for root comparison if folders have null parentId
    // Fix logic: if currentFolderId is null, show root folders (where parentId is null or undefined)
    const filteredFolders = folders.filter(f => currentFolderId ? f.parentId === currentFolderId : !f.parentId);
    const visibleExams = exams.filter(e => currentFolderId ? e.folderId === currentFolderId : e.folderId === 'root' || !e.folderId);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Breadcrumb & Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <button onClick={() => setCurrentFolderId(null)} className={`hover:text-violet-600 ${!currentFolderId ? 'text-violet-600' : ''}`}>Root</button>
                    {currentFolder && (
                        <>
                            <ChevronRight size={14} />
                            <span className="text-violet-600">{currentFolder.name}</span>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleCreateFolder} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 flex items-center gap-2">
                        <FolderPlus size={16} /> New Folder
                    </button>
                    <button onClick={startNewExam} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-violet-700 flex items-center gap-2">
                        <Plus size={16} /> New Exam
                    </button>
                </div>
            </div>

            {/* Folders Grid */}
            {filteredFolders.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {filteredFolders.map(f => (
                        <div key={f.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-violet-500 transition-all cursor-pointer group relative" onClick={() => setCurrentFolderId(f.id)}>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                            <FolderPlus size={32} className="text-violet-300 dark:text-violet-800 mb-4 group-hover:text-violet-600 transition-colors" />
                            <h4 className="font-bold text-slate-700 dark:text-slate-200">{f.name}</h4>
                            <p className="text-[10px] uppercase font-black text-slate-400 mt-1">Folder</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Exams Grid */}
            <div>
                <h3 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Exams in this directory</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {visibleExams.length === 0 ? (
                        <div className="col-span-3 py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                            <p className="text-slate-400 font-medium">No exams found here.</p>
                        </div>
                    ) : (
                        visibleExams.map(e => (
                            <div key={e.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col group relative">
                                <button onClick={() => handleDeleteExam(e.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                <div className="flex-1">
                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                                        <FileText size={20} />
                                    </div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{e.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">{e.description}</p>
                                </div>
                                <div className="mt-6 flex items-center gap-3 text-[10px] font-black uppercase text-slate-400 border-t border-slate-50 dark:border-slate-800 pt-4">
                                    <span>{e.durationMinutes} Min</span>
                                    <span>•</span>
                                    <span>{e.questions.length} Qs</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <aside className="w-72 bg-slate-950 dark:bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-2xl z-50 rounded-r-[3rem] border-r border-white/5">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-violet-600 rounded-2xl flex items-center justify-center rotate-6">
                <span className="text-white font-black text-xl">G</span>
             </div>
             <h2 className="text-2xl font-black tracking-tight">Spider</h2>
          </div>
          <p className="text-slate-500 text-[10px] uppercase font-black tracking-[0.2em]">Master Terminal</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={<Users size={20} />} label={t.students} active={activeTab === 'students'} onClick={() => setActiveTab('students')} />
          <SidebarItem icon={<FolderPlus size={20} />} label={t.folders} active={activeTab === 'folders'} onClick={() => { setActiveTab('folders'); setIsCreatingExam(false); }} />
          <SidebarItem icon={<Bell size={20} />} label={t.announcements} active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} />
          <SidebarItem icon={<Database size={20} />} label="Database" active={activeTab === 'database'} onClick={() => setActiveTab('database')} />
        </nav>

        <div className="p-6 space-y-4">
          <div className="flex gap-2">
             <button onClick={() => onUpdatePrefs({language: user.language === 'en' ? 'ar' : 'en'})} className="flex-1 p-3 bg-slate-900 rounded-2xl text-slate-400 hover:text-white transition-all border border-slate-800 flex items-center justify-center gap-2 text-[10px] font-black uppercase">
               <Globe size={14} /> {user.language}
             </button>
             <button onClick={() => onUpdatePrefs({theme: user.theme === 'light' ? 'dark' : 'light'})} className="flex-1 p-3 bg-slate-900 rounded-2xl text-slate-400 hover:text-white transition-all border border-slate-800 flex items-center justify-center gap-2 text-[10px] font-black uppercase">
               {user.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />} {user.theme}
             </button>
          </div>
          <button onClick={onLogout} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">{t.logout}</button>
          <div className="text-center pt-2">
              <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-1">Architecture Node</p>
              <p className="text-[9px] font-bold text-slate-500">{t.made_by}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-10 bg-slate-50/50 dark:bg-slate-950 min-h-screen">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{activeTab.toUpperCase()}</h1>
            <p className="text-slate-400 dark:text-slate-500 font-medium">Spider Terminal Control</p>
          </div>
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700" size={18} />
              <input type="text" placeholder={t.search} className="pl-12 pr-6 py-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-violet-600 transition-all w-80 font-medium text-slate-900 dark:text-white shadow-sm" />
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
            <StatCard label="Students" value={stats.totalStudents} icon={<Users className="text-violet-500" />} />
            <StatCard label="Live Exams" value={stats.totalExams} icon={<BookOpen className="text-emerald-500" />} />
            <StatCard label="Banned" value={stats.bannedStudents} icon={<ShieldAlert className="text-rose-500" />} />
            <StatCard label="Submissions" value={stats.totalResults} icon={<BarChart3 className="text-amber-500" />} />
          </div>
        )}

        {activeTab === 'folders' && renderFoldersTab()}

        {activeTab === 'database' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-3xl flex items-center justify-center mb-6">
                    <Download size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">تصدير قاعدة البيانات</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">قم بتحميل نسخة احتياطية كاملة من المنصة (الطلاب، الامتحانات، النتائج) كملف JSON.</p>
                  <button onClick={exportDatabase} className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl shadow-xl shadow-violet-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Save size={18} /> تحميل النسخة (Export)
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mb-6">
                    <Upload size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">استيراد قاعدة البيانات</h3>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">قم برفع ملف JSON لتحديث المنصة بالكامل ببيانات جديدة أو استعادة نسخة سابقة.</p>
                  <input type="file" ref={fileInputRef} onChange={importDatabase} className="hidden" accept=".json" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3">
                    <HardDrive size={18} /> رفع الملف (Import)
                  </button>
                </div>
              </div>
           </div>
        )}

        {activeTab === 'students' && (
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identification</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Information</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Privileges</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                          <td className="py-6 px-8">
                             <p className="font-mono text-xs font-black text-violet-600">{u.id}</p>
                             {SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase()) && <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-black uppercase">{t.super_admin}</span>}
                          </td>
                          <td className="py-6 px-8">
                             <p className="font-black text-slate-900 dark:text-white">{u.firstName} {u.lastName}</p>
                             <p className="text-xs text-slate-400">{u.email}</p>
                          </td>
                          <td className="py-6 px-8">
                             {u.role === UserRole.ADMIN ? (
                               <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                                 <ShieldCheck size={14} /> {t.admin_staff}
                               </span>
                             ) : (
                               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Access Node</span>
                             )}
                          </td>
                          <td className="py-6 px-8">
                             <div className="flex items-center justify-center gap-2">
                               {isSuperAdmin && !SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase()) && (
                                  <button 
                                    onClick={() => handleToggleRole(u)}
                                    title={u.role === UserRole.ADMIN ? t.demote : t.promote}
                                    className={`p-2 rounded-xl transition-all border ${u.role === UserRole.ADMIN ? 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-600 hover:text-white' : 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-600 hover:text-white'}`}
                                  >
                                    {u.role === UserRole.ADMIN ? <UserMinus size={18} /> : <UserPlus size={18} />}
                                  </button>
                               )}
                               <button 
                                 onClick={() => handleBanUser(u.id, u.isBanned)}
                                 disabled={SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase())}
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-30 ${u.isBanned ? 'bg-emerald-600 text-white shadow-lg' : 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white'}`}
                               >
                                 {u.isBanned ? 'Release' : 'Restrict'}
                               </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest ${active ? 'bg-violet-600 text-white shadow-xl shadow-violet-900/40' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>{icon} <span>{label}</span></button>
);

const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col group hover:border-violet-600 transition-all duration-300">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-violet-50 transition-all border border-slate-100 dark:border-slate-700">{icon}</div>
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</p>
  </div>
);

export default AdminPanel;
