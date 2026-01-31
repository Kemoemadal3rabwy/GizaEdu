
import { User, Exam, Folder, ExamResult, Announcement, UserRole } from './types';
import { supabase, isSupabaseEnabled } from './supabaseClient';

const DB_KEYS = {
  USERS: 'gizaedu_users',
  EXAMS: 'gizaedu_exams',
  FOLDERS: 'gizaedu_folders',
  RESULTS: 'gizaedu_results',
  ANNOUNCEMENTS: 'gizaedu_announcements',
  CURRENT_USER: 'gizaedu_session'
};

const getLocal = <T,>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const setLocal = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const db = {
  users: {
    getAll: async () => {
      if (isSupabaseEnabled()) {
        const { data } = await supabase!.from('profiles').select('*');
        return (data || []).map((u: any) => ({
           id: u.id,
           email: u.email,
           role: u.role as UserRole,
           firstName: u.first_name,
           lastName: u.last_name,
           universityName: u.university_name,
           isBanned: u.is_banned,
           language: u.language || 'en',
           theme: u.theme || 'light',
           createdAt: new Date(u.created_at).getTime(),
           passwordHash: 'SUPABASE_AUTH',
           twoFactorEnabled: false
        })) as User[];
      }
      return getLocal<User[]>(DB_KEYS.USERS, []);
    },
    save: async (users: User[]) => {
      if (isSupabaseEnabled()) return;
      setLocal(DB_KEYS.USERS, users);
    },
    getById: async (id: string) => {
      if (isSupabaseEnabled()) {
        const { data } = await supabase!.from('profiles').select('*').eq('id', id).single();
        if (data) {
          return {
             id: data.id,
             email: data.email,
             role: data.role as UserRole,
             firstName: data.first_name,
             lastName: data.last_name,
             universityName: data.university_name,
             isBanned: data.is_banned,
             language: data.language || 'en',
             theme: data.theme || 'light',
             createdAt: new Date(data.created_at).getTime(),
             passwordHash: 'SUPABASE_AUTH',
             twoFactorEnabled: false
          } as User;
        }
        return undefined;
      }
      return getLocal<User[]>(DB_KEYS.USERS, []).find(u => u.id === id);
    },
    update: async (id: string, updates: Partial<User>) => {
      if (isSupabaseEnabled()) {
        const dbUpdates: any = {};
        if (updates.firstName) dbUpdates.first_name = updates.firstName;
        if (updates.lastName) dbUpdates.last_name = updates.lastName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.isBanned !== undefined) dbUpdates.is_banned = updates.isBanned;
        if (updates.language) dbUpdates.language = updates.language;
        if (updates.theme) dbUpdates.theme = updates.theme;
        
        await supabase!.from('profiles').update(dbUpdates).eq('id', id);
        return { ...updates, id } as User; 
      }
      const users = getLocal<User[]>(DB_KEYS.USERS, []);
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        setLocal(DB_KEYS.USERS, users);
        return users[index];
      }
      return null;
    }
  },
  exams: {
    getAll: async () => {
      if (isSupabaseEnabled()) {
        const { data } = await supabase!.from('exams').select('*');
        return (data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          questions: e.questions,
          durationMinutes: e.duration_minutes,
          createdAt: new Date(e.created_at).getTime(),
          folderId: e.folder_id || 'root' // Add folder support to SQL mapping
        })) as Exam[];
      }
      return getLocal<Exam[]>(DB_KEYS.EXAMS, []);
    },
    save: async (exams: Exam[]) => {
      if (isSupabaseEnabled()) {
        for (const e of exams) {
           // We only upsert the exams that are passed in. 
           // In a real app, we might want a 'saveOne' method, but this fits the existing structure.
           await supabase!.from('exams').upsert({
             id: e.id,
             title: e.title,
             description: e.description,
             questions: e.questions,
             duration_minutes: e.durationMinutes,
             folder_id: e.folderId
           });
        }
        return;
      }
      setLocal(DB_KEYS.EXAMS, exams);
    },
    // Add helper to save a single exam more efficiently
    addOne: async (exam: Exam) => {
        if (isSupabaseEnabled()) {
            await supabase!.from('exams').upsert({
                id: exam.id,
                title: exam.title,
                description: exam.description,
                questions: exam.questions,
                duration_minutes: exam.durationMinutes,
                folder_id: exam.folderId
            });
        } else {
            const exams = getLocal<Exam[]>(DB_KEYS.EXAMS, []);
            exams.push(exam);
            setLocal(DB_KEYS.EXAMS, exams);
        }
    },
    deleteOne: async (id: string) => {
        if(isSupabaseEnabled()) {
            await supabase!.from('exams').delete().eq('id', id);
        } else {
            const exams = getLocal<Exam[]>(DB_KEYS.EXAMS, []);
            setLocal(DB_KEYS.EXAMS, exams.filter(e => e.id !== id));
        }
    }
  },
  folders: {
    getAll: async () => {
        if (isSupabaseEnabled()) {
            const { data } = await supabase!.from('folders').select('*');
            return (data || []).map((f: any) => ({
                id: f.id,
                name: f.name,
                parentId: f.parent_id
            })) as Folder[];
        }
        return getLocal<Folder[]>(DB_KEYS.FOLDERS, []);
    },
    save: async (folders: Folder[]) => {
        if (isSupabaseEnabled()) {
            // Since this receives all folders, we iterate. 
            // Better to use addOneFolder in UI logic, but for compatibility:
            for(const f of folders) {
                await supabase!.from('folders').upsert({
                    id: f.id,
                    name: f.name,
                    parent_id: f.parentId
                });
            }
            return;
        }
        setLocal(DB_KEYS.FOLDERS, folders);
    },
    addOne: async (folder: Folder) => {
        if (isSupabaseEnabled()) {
            await supabase!.from('folders').insert({
                id: folder.id,
                name: folder.name,
                parent_id: folder.parentId
            });
        } else {
            const folders = getLocal<Folder[]>(DB_KEYS.FOLDERS, []);
            folders.push(folder);
            setLocal(DB_KEYS.FOLDERS, folders);
        }
    },
    deleteOne: async (id: string) => {
        if (isSupabaseEnabled()) {
            await supabase!.from('folders').delete().eq('id', id);
        } else {
            const folders = getLocal<Folder[]>(DB_KEYS.FOLDERS, []);
            setLocal(DB_KEYS.FOLDERS, folders.filter(f => f.id !== id));
        }
    }
  },
  results: {
    getAll: async () => {
      if (isSupabaseEnabled()) {
        const { data } = await supabase!.from('results').select('*');
        return (data || []).map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          examId: r.exam_id,
          score: r.score,
          totalPoints: r.total_points,
          correctCount: 0, 
          incorrectCount: 0,
          answers: r.answers,
          submittedAt: new Date(r.submitted_at).getTime()
        })) as ExamResult[];
      }
      return getLocal<ExamResult[]>(DB_KEYS.RESULTS, []);
    },
    getByStudent: async (studentId: string) => {
      if (isSupabaseEnabled()) {
        const { data } = await supabase!.from('results').select('*').eq('student_id', studentId);
        return (data || []).map((r: any) => ({
          id: r.id,
          studentId: r.student_id,
          examId: r.exam_id,
          score: r.score,
          totalPoints: r.total_points,
          answers: r.answers,
          submittedAt: new Date(r.submitted_at).getTime()
        })) as unknown as ExamResult[];
      }
      return getLocal<ExamResult[]>(DB_KEYS.RESULTS, []).filter(r => r.studentId === studentId);
    },
    add: async (result: ExamResult) => {
      if (isSupabaseEnabled()) {
        await supabase!.from('results').insert({
          id: result.id,
          student_id: result.studentId,
          exam_id: result.examId,
          score: result.score,
          total_points: result.totalPoints,
          answers: result.answers
        });
        return;
      }
      const all = getLocal<ExamResult[]>(DB_KEYS.RESULTS, []);
      all.push(result);
      setLocal(DB_KEYS.RESULTS, all);
    }
  },
  announcements: {
    getAll: async () => getLocal<Announcement[]>(DB_KEYS.ANNOUNCEMENTS, []),
    save: async (ann: Announcement[]) => setLocal(DB_KEYS.ANNOUNCEMENTS, ann)
  },
  session: {
    get: () => getLocal<User | null>(DB_KEYS.CURRENT_USER, null),
    set: (user: User | null) => setLocal(DB_KEYS.CURRENT_USER, user),
    logout: async () => {
      if (isSupabaseEnabled()) {
        await supabase!.auth.signOut();
      }
      localStorage.removeItem(DB_KEYS.CURRENT_USER);
    }
  }
};

const MASTER_EMAILS = [
  'kareememad20007925@gmail.com',
  'kareememad200792@gmail.com'
];
const DEFAULT_ADMIN_HASH = '$2a$10$wS2P0Y3Z7W6H1Z9Y9Y9Yu.vR0eJ.Z.I/4j4q.J8hI1m5r5g8o6vC';

export const syncMasterAdmins = async () => {
  if (isSupabaseEnabled()) {
    for (const email of MASTER_EMAILS) {
      const { data } = await supabase!.from('profiles').select('*').eq('email', email).single();
      if (data && data.role !== 'ADMIN') {
        await supabase!.from('profiles').update({ role: 'ADMIN' }).eq('email', email);
      }
    }
    return;
  }

  const users = await db.users.getAll();
  let updated = false;
  const newUsersList = [...users];

  for (const email of MASTER_EMAILS) {
    const existingIndex = newUsersList.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (existingIndex === -1) {
      newUsersList.push({
        id: `GIZA-MASTER-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        role: UserRole.ADMIN,
        email: email.toLowerCase(),
        firstName: 'Karim',
        lastName: 'Emad',
        isBanned: false,
        passwordHash: DEFAULT_ADMIN_HASH,
        twoFactorEnabled: false,
        language: 'en',
        theme: 'light',
        createdAt: Date.now()
      });
      updated = true;
    } else if (newUsersList[existingIndex].role !== UserRole.ADMIN) {
      newUsersList[existingIndex].role = UserRole.ADMIN;
      updated = true;
    }
  }

  if (updated) {
    await db.users.save(newUsersList);
  }
};
