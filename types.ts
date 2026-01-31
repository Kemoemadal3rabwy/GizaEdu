
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  ESSAY = 'ESSAY',
  TRUE_FALSE = 'TRUE_FALSE',
  EXTERNAL_LINK = 'EXTERNAL_LINK'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT'
}

export type Language = 'en' | 'ar';
export type Theme = 'light' | 'dark';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  externalUrl?: string;
  points: number;
}

export interface Exam {
  id: string;
  folderId: string;
  title: string;
  description: string;
  questions: Question[];
  durationMinutes: number;
  createdAt: number;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
}

export interface ExamResult {
  id: string;
  studentId: string;
  examId: string;
  score: number;
  totalPoints: number;
  correctCount: number;
  incorrectCount: number;
  answers: Record<string, string>;
  submittedAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface User {
  id: string;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  universityName?: string;
  universityId?: string;
  phoneNumber?: string;
  academicYear?: string;
  profilePic?: string;
  isBanned: boolean;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  language: Language;
  theme: Theme;
  createdAt: number;
}
