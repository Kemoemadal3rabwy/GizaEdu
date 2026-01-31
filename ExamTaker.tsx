
import React, { useState, useEffect } from 'react';
import { User, Exam, Question, QuestionType, ExamResult } from '../types';
import { db } from '../store';
import { Clock, AlertCircle, ChevronRight, ChevronLeft, CheckCircle2, ArrowLeft } from 'lucide-react';

interface ExamTakerProps {
  user: User;
  exam: Exam;
  onComplete: () => void;
  onCancel: () => void;
}

const ExamTaker: React.FC<ExamTakerProps> = ({ user, exam, onComplete, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const currentQuestion = exam.questions[currentIdx];

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleSubmit = () => {
    let score = 0;
    let correctCount = 0;
    let totalPoints = 0;

    exam.questions.forEach(q => {
      totalPoints += q.points;
      if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.TRUE_FALSE) {
        if (answers[q.id] === q.correctAnswer) {
          score += q.points;
          correctCount++;
        }
      }
    });

    const result: ExamResult = {
      id: Math.random().toString(36).substr(2, 9),
      studentId: user.id,
      examId: exam.id,
      score,
      totalPoints,
      correctCount,
      incorrectCount: exam.questions.length - correctCount,
      answers,
      submittedAt: Date.now()
    };

    db.results.add(result);
    setIsFinished(true);
  };

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="bg-white p-16 rounded-[4rem] shadow-2xl max-w-xl w-full text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 transform rotate-12 shadow-xl shadow-emerald-50">
            <CheckCircle2 size={56} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">Module Completed</h2>
          <p className="text-slate-400 font-medium mb-10 text-lg">Your response signals have been securely stored in the platform vault.</p>
          <button 
            onClick={onComplete}
            className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-8 py-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button onClick={onCancel} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all border border-slate-100">
            <ArrowLeft size={20} />
          </button>
          <div className="hidden md:block">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Active Module</span>
             <h2 className="font-black text-slate-900 text-xl tracking-tight">{exam.title}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
             <div className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black font-mono transition-all text-xl tracking-tighter shadow-sm border ${timeLeft < 300 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-slate-950 text-white border-slate-900'}`}>
              <Clock size={20} className={timeLeft < 300 ? 'text-rose-600' : 'text-violet-400'} /> {formatTime(timeLeft)}
            </div>
        </div>
      </header>

      {/* Modern Progress Tracking */}
      <div className="px-8 pt-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between mb-2">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Node Accuracy Track</span>
               <span className="text-xs font-black text-violet-600">{Math.round(((currentIdx + 1) / exam.questions.length) * 100)}%</span>
          </div>
          <div className="max-w-4xl mx-auto h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
            <div 
              className="h-full bg-violet-600 rounded-full transition-all duration-700 ease-out shadow-lg shadow-violet-100"
              style={{ width: `${((currentIdx + 1) / exam.questions.length) * 100}%` }}
            ></div>
          </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-8 md:p-20">
        <div className="max-w-4xl w-full">
          <div className="mb-14 animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-1 bg-violet-600 rounded-full"></span>
                <span className="text-xs font-black uppercase tracking-[0.4em] text-violet-600">
                  Question {currentIdx + 1} // {exam.questions.length}
                </span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter">
              {currentQuestion.prompt}
            </h3>
          </div>

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {currentQuestion.options?.map((opt, i) => (
                    <label 
                        key={i} 
                        className={`flex items-center p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 group ${answers[currentQuestion.id] === opt ? 'bg-slate-950 border-slate-950 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 hover:border-violet-200 text-slate-600'}`}
                    >
                        <input 
                        type="radio" 
                        name={currentQuestion.id} 
                        className="hidden" 
                        checked={answers[currentQuestion.id] === opt}
                        onChange={() => handleAnswer(opt)}
                        />
                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center mr-6 shrink-0 transition-all ${answers[currentQuestion.id] === opt ? 'border-violet-400 bg-violet-600' : 'border-slate-200 group-hover:border-violet-300'}`}>
                        {answers[currentQuestion.id] === opt && <CheckCircle2 size={16} className="text-white" />}
                        </div>
                        <span className="font-black text-xl tracking-tight">{opt}</span>
                    </label>
                    ))}
              </div>
            )}

            {currentQuestion.type === QuestionType.TRUE_FALSE && (
              <div className="flex gap-6 max-w-2xl mx-auto">
                {['True', 'False'].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAnswer(val)}
                    className={`flex-1 p-12 rounded-[2.5rem] border-2 font-black text-3xl tracking-tighter transition-all ${answers[currentQuestion.id] === val ? 'bg-violet-600 border-violet-600 text-white shadow-2xl scale-105' : 'bg-slate-50 border-slate-100 text-slate-300 hover:bg-white hover:border-violet-100 hover:text-violet-600'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === QuestionType.ESSAY && (
              <div className="bg-slate-50 p-2 rounded-[2.5rem] border border-slate-100 focus-within:border-violet-600 focus-within:bg-white transition-all">
                  <textarea 
                    className="w-full p-8 bg-transparent outline-none text-xl font-medium min-h-[300px] resize-none"
                    placeholder="Initialize response terminal..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                  />
              </div>
            )}

            {currentQuestion.type === QuestionType.EXTERNAL_LINK && (
              <div className="p-12 bg-amber-50 rounded-[3rem] border-2 border-amber-100 text-center">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-200">
                    <AlertCircle size={32} className="text-amber-500" />
                </div>
                <h4 className="text-2xl font-black text-amber-900 mb-2 tracking-tight">External Validation Required</h4>
                <p className="text-amber-700/70 font-medium mb-10 max-w-md mx-auto">This module connects to an external data source. Authenticate and return here with your findings.</p>
                <a 
                  href={currentQuestion.externalUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex px-10 py-4 bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-200 hover:bg-amber-600 hover:scale-105 transition-all text-xs uppercase tracking-widest"
                >
                  Access Link Node
                </a>
                <div className="mt-12 bg-white/50 p-2 rounded-[2rem] border border-amber-200 focus-within:bg-white transition-all">
                    <textarea 
                    className="w-full p-6 bg-transparent outline-none text-lg font-medium min-h-[150px] resize-none"
                    placeholder="Enter validation report..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="bg-white border-t border-slate-100 p-8 flex justify-between items-center sticky bottom-0 z-50">
        <button 
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 disabled:opacity-0 transition-all"
        >
          <ChevronLeft size={18} /> Previous Node
        </button>

        <div className="hidden sm:flex gap-1.5">
             {exam.questions.map((_, i) => (
                 <div key={i} className={`w-2 h-2 rounded-full ${i === currentIdx ? 'bg-violet-600 scale-125' : 'bg-slate-200'}`}></div>
             ))}
        </div>

        {currentIdx === exam.questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            className="px-12 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            Finalize Submission
          </button>
        ) : (
          <button 
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="flex items-center gap-3 px-12 py-4 bg-slate-950 text-white font-black rounded-2xl shadow-xl shadow-slate-300 hover:bg-black hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
          >
            Next Node <ChevronRight size={18} />
          </button>
        )}
      </footer>
    </div>
  );
};

export default ExamTaker;
