
import React, { useState } from 'react';
import { User, UserRole, Language, Theme } from '../types';
import { db } from '../store';
import { supabase, isSupabaseEnabled } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import { ShieldCheck, ArrowLeft, Eye, EyeOff, Globe, Moon, Sun, Lock } from 'lucide-react';

interface AuthProps {
  onAuthSuccess: (user: User) => void;
}

const MASTER_ADMIN_EMAILS = [
  'kareememad20007925@gmail.com',
  'kareememad200792@gmail.com'
];

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<'auth' | '2fa'>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    universityName: '',
    universityId: '',
    phoneNumber: '',
    academicYear: '1st Year',
    language: 'en' as Language,
    theme: 'light' as Theme
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generateId = () => {
    return `GIZA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  };

  const isMasterNode = (e: string) => {
    const trimmed = e.trim().toLowerCase();
    return MASTER_ADMIN_EMAILS.some(addr => addr.toLowerCase() === trimmed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const emailToUse = email.trim().toLowerCase();

    // ---------------------------------------------------------
    // SUPABASE AUTH FLOW
    // ---------------------------------------------------------
    if (isSupabaseEnabled()) {
        try {
            if (isLogin) {
                const { data, error } = await supabase!.auth.signInWithPassword({
                    email: emailToUse,
                    password: password
                });

                if (error) throw error;
                
                if (data.user) {
                    const profile = await db.users.getById(data.user.id);
                    if (profile) {
                         if (profile.isBanned) {
                            setError('Account restricted.');
                            await supabase!.auth.signOut();
                         } else {
                            onAuthSuccess(profile);
                         }
                    } else {
                         // Fallback if auth exists but profile missing
                         setError('Profile data missing. Contact admin.');
                    }
                }
            } else {
                // Register
                const { data, error } = await supabase!.auth.signUp({
                    email: emailToUse,
                    password: password,
                    options: {
                        data: {
                            first_name: formData.firstName,
                            last_name: formData.lastName
                        }
                    }
                });

                if (error) throw error;
                if (data.user) {
                     // Wait a moment for the trigger to create the profile
                     setTimeout(async () => {
                        const profile = await db.users.getById(data.user!.id);
                        if (profile) onAuthSuccess(profile);
                     }, 1000);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Authentication Protocol Failed');
        } finally {
            setLoading(false);
        }
        return;
    }

    // ---------------------------------------------------------
    // LOCAL STORAGE FALLBACK FLOW
    // ---------------------------------------------------------
    try {
      if (isLogin) {
        if (isMasterNode(emailToUse)) {
          const users = await db.users.getAll();
          let admin = users.find(u => u.email.toLowerCase() === emailToUse);
          if (!admin) {
             admin = {
                id: `GIZA-MASTER-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                role: UserRole.ADMIN,
                email: emailToUse,
                firstName: 'Karim',
                lastName: 'Emad',
                isBanned: false,
                passwordHash: 'MASTER_BYPASS',
                twoFactorEnabled: false,
                language: 'en',
                theme: 'light',
                createdAt: Date.now()
             };
             await db.users.save([...users, admin]);
          } else {
             if (admin.role !== UserRole.ADMIN) {
                admin.role = UserRole.ADMIN;
                await db.users.update(admin.id, { role: UserRole.ADMIN });
             }
          }
          onAuthSuccess(admin);
          return;
        }

        const users = await db.users.getAll();
        const user = users.find(u => u.email.toLowerCase() === emailToUse);
        
        if (user) {
          if (user.isBanned) {
            setError('Account locked by administration.');
            return;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (isValid) {
            if (user.twoFactorEnabled) {
              setPendingUser(user);
              setStep('2fa');
            } else {
              onAuthSuccess(user);
            }
          } else {
            setError('Invalid credentials.');
          }
        } else {
          setError('Account not found.');
        }
      } else {
        const users = await db.users.getAll();
        if (users.some(u => u.email.toLowerCase() === emailToUse)) {
          setError('Email already registered.');
          return;
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser: User = {
          id: generateId(),
          role: UserRole.STUDENT,
          email: emailToUse,
          ...formData,
          passwordHash,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: Date.now()
        };

        await db.users.save([...users, newUser]);
        onAuthSuccess(newUser);
      }
    } catch (err) {
      setError('System authentication error.');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode === '123456') { 
      if (pendingUser) onAuthSuccess(pendingUser);
    } else {
      setError('Invalid code.');
    }
  };

  const masterDetected = isMasterNode(email);

  if (step === '2fa') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-12">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Verification</h2>
          <p className="text-slate-500 mb-8 text-sm">Enter synchronization code.</p>
          <form onSubmit={handle2FAVerify} className="space-y-4">
            <input
              type="text"
              required
              className="w-full px-4 py-5 text-center text-4xl font-black rounded-2xl bg-slate-50 border-2 border-slate-100 outline-none focus:border-violet-600 transition-all"
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
            />
            {error && <p className="text-rose-500 text-sm font-bold">{error}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl">Confirm</button>
          </form>
          <button onClick={() => setStep('auth')} className="mt-8 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold mx-auto"><ArrowLeft size={16} /> Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg border border-slate-100">
        <div className="text-center mb-10">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 rotate-6 shadow-xl transition-all duration-500 ${masterDetected ? 'bg-amber-500' : 'bg-violet-600'}`}>
            <span className="text-white text-3xl font-black">G</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">GizaEdu</h1>
          <p className="text-slate-400 mt-2 font-medium">Professional Ecosystem</p>
          {isSupabaseEnabled() && <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em] mt-2 block">Database Connected</span>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-violet-600 outline-none transition-all font-medium"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Security Key</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={!masterDetected}
                disabled={masterDetected && !isSupabaseEnabled()}
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-2 outline-none transition-all font-medium pr-14 ${masterDetected && !isSupabaseEnabled() ? 'border-amber-400 bg-amber-50/50 cursor-not-allowed' : 'border-transparent focus:border-violet-600'}`}
                placeholder={masterDetected && !isSupabaseEnabled() ? "MASTER BYPASS ACTIVE" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400">
                {masterDetected && !isSupabaseEnabled() ? <Lock size={20} className="text-amber-500" /> : (
                  <button type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {!isLogin && !masterDetected && (
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="First Name" required className="px-5 py-4 rounded-2xl bg-slate-50 outline-none focus:border-violet-600 border-2 border-transparent" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
              <input placeholder="Last Name" required className="px-5 py-4 rounded-2xl bg-slate-50 outline-none focus:border-violet-600 border-2 border-transparent" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          )}

          {error && <p className="text-rose-500 text-sm font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all mt-6 text-lg ${masterDetected ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
          >
            {loading ? 'Processing...' : (masterDetected ? 'Initialize Node' : (isLogin ? 'Sign In' : 'Join Now'))}
          </button>
        </form>

        <div className="mt-8 text-center">
          {!masterDetected && (
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-slate-400 font-bold hover:text-violet-600 transition-colors">
              {isLogin ? "Need an account?" : 'Already registered?'}
            </button>
          )}
        </div>
      </div>
      <footer className="mt-12 text-center text-slate-500 font-black uppercase text-[10px] tracking-[0.4em]">
          Ecosystem Managed by <span className="text-violet-400">Karim Emad Al3rabwy</span>
      </footer>
    </div>
  );
};

export default Auth;
