
import React, { useState, useEffect } from 'react';
import { User, UserRole, Language, Theme } from './types';
import { db, syncMasterAdmins } from './store';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import StudentPanel from './components/StudentPanel';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      // 1. Force sync admin roles before checking session
      await syncMasterAdmins();
      
      // 2. Check for existing session
      const currentUser = db.session.get();
      if (currentUser) {
        const freshUser = await db.users.getById(currentUser.id);
        if (freshUser && !freshUser.isBanned) {
          setUser(freshUser);
          applyTheme(freshUser.theme);
          applyLanguage(freshUser.language);
        } else {
          db.session.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };
    initApp();
  }, []);

  const applyTheme = (theme: Theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const applyLanguage = (lang: Language) => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const handleLogin = (u: User) => {
    db.session.set(u);
    setUser(u);
    applyTheme(u.theme);
    applyLanguage(u.language);
  };

  const handleLogout = () => {
    db.session.logout();
    setUser(null);
  };

  const updatePreferences = async (updates: Partial<User>) => {
    if (user) {
      const updated = await db.users.update(user.id, updates);
      if (updated) {
        setUser(updated);
        db.session.set(updated);
        if (updates.theme) applyTheme(updates.theme);
        if (updates.language) applyLanguage(updates.language);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
           <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-violet-600 border-opacity-50"></div>
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] animate-pulse">Initializing Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {user.role === UserRole.ADMIN ? (
        <AdminPanel user={user} onLogout={handleLogout} onUpdatePrefs={updatePreferences} />
      ) : (
        <StudentPanel user={user} onLogout={handleLogout} onUpdatePrefs={updatePreferences} />
      )}
    </div>
  );
};

export default App;
