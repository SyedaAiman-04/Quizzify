import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  History, 
  Play, 
  LogOut, 
  User, 
  ChevronRight, 
  Timer, 
  CheckCircle2, 
  XCircle,
  Brain,
  Gamepad2,
  Music,
  Film,
  Globe,
  Monitor,
  FlaskConical,
  History as HistoryIcon,
  Tv,
  Dribbble
} from "lucide-react";

const CATEGORIES = [
  { id: 9, name: "General Knowledge", icon: <Brain className="w-5 h-5" /> },
  { id: 21, name: "Sports", icon: <Dribbble className="w-5 h-5" /> },
  { id: 23, name: "History", icon: <HistoryIcon className="w-5 h-5" /> },
  { id: 17, name: "Science & Nature", icon: <FlaskConical className="w-5 h-5" /> },
  { id: 11, name: "Movies", icon: <Film className="w-5 h-5" /> },
  { id: 12, name: "Music", icon: <Music className="w-5 h-5" /> },
  { id: 15, name: "Video Games", icon: <Gamepad2 className="w-5 h-5" /> },
  { id: 14, name: "Television", icon: <Tv className="w-5 h-5" /> },
  { id: 22, name: "Geography", icon: <Globe className="w-5 h-5" /> },
  { id: 18, name: "Computers", icon: <Monitor className="w-5 h-5" /> },
];

const DIFFICULTIES = ["easy", "medium", "hard"];
const QUESTION_COUNTS = [5, 10, 15, 20];

function decode(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Question {
  question: string;
  correct: string;
  options: string[];
}

interface UserData {
  id: number;
  username: string;
}

interface ScoreRecord {
  id: number;
  category: string;
  difficulty: string;
  score: number;
  total: number;
  timestamp: string;
}

export default function App() {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("quiz_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [screen, setScreen] = useState<"auth" | "dashboard" | "history" | "setup" | "loading" | "quiz" | "result">("auth");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [answers, setAnswers] = useState<any[]>([]);
  const [history, setHistory] = useState<ScoreRecord[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      setScreen("dashboard");
      fetchHistory();
    } else {
      setScreen("auth");
    }
  }, [user]);

  useEffect(() => {
    if (screen === "quiz" && !answered) {
      setTimeLeft(15);
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleAnswer(null);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, screen, answered]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/scores/${user.id}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error("Failed to fetch history");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        localStorage.setItem("quiz_user", JSON.stringify(data));
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Connection error");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("quiz_user");
    setScreen("auth");
  };

  async function startQuiz() {
    if (!category) return;
    setScreen("loading");
    setError(null);
    try {
      const url = `https://opentdb.com/api.php?amount=${count}&category=${category.id}&difficulty=${difficulty}&type=multiple`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.response_code !== 0 || !data.results.length) {
        setError("Not enough questions available. Try different settings.");
        setScreen("setup");
        return;
      }
      const formatted = data.results.map((q: any) => ({
        question: decode(q.question),
        correct: decode(q.correct_answer),
        options: shuffle([q.correct_answer, ...q.incorrect_answers].map(decode)),
      }));
      setQuestions(formatted);
      setCurrent(0);
      setScore(0);
      setAnswers([]);
      setSelected(null);
      setAnswered(false);
      setScreen("quiz");
    } catch {
      setError("Failed to fetch questions. Check your connection.");
      setScreen("setup");
    }
  }

  function handleAnswer(option: string | null) {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(true);
    setSelected(option);
    const correct = questions[current].correct;
    const isCorrect = option === correct;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((a) => [...a, { question: questions[current].question, selected: option, correct, isCorrect }]);
  }

  async function next() {
    if (current + 1 >= questions.length) {
      setScreen("result");
      // Save score to backend
      if (user && category) {
        await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            category: category.name,
            difficulty,
            score,
            total: questions.length
          }),
        });
        fetchHistory();
      }
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-[#f0ede8] font-sans selection:bg-emerald-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col">
        {/* Header */}
        {user && (
          <header className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <User className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest">Player</p>
                <p className="font-bold">{user.username}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </header>
        )}

        <main className="flex-grow flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {screen === "auth" && (
              <motion.div 
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-md mx-auto w-full"
              >
                <div className="text-center mb-8">
                  <h1 className="text-5xl font-black tracking-tighter mb-2 uppercase">Quizzify</h1>
                  <p className="text-white/40 font-mono text-sm uppercase tracking-widest">The Ultimate Trivia Engine</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-2">Username</label>
                      <input 
                        type="text" 
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-2">Password</label>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                    {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] uppercase tracking-widest text-sm">
                      {authMode === "login" ? "Sign In" : "Create Account"}
                    </button>
                  </form>
                  <button 
                    onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                    className="w-full mt-6 text-xs text-white/40 hover:text-white transition-colors uppercase tracking-widest"
                  >
                    {authMode === "login" ? "Need an account? Register" : "Already have an account? Login"}
                  </button>
                </div>
              </motion.div>
            )}

            {screen === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setScreen("setup")}
                    className="group relative overflow-hidden bg-emerald-500 p-8 rounded-3xl text-black text-left transition-all hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                  >
                    <div className="relative z-10">
                      <Play className="w-12 h-12 mb-4 fill-black" />
                      <h2 className="text-3xl font-black uppercase tracking-tighter">New Game</h2>
                      <p className="text-black/60 font-medium">Test your knowledge now</p>
                    </div>
                    <ChevronRight className="absolute right-8 bottom-8 w-8 h-8 opacity-20 group-hover:translate-x-2 transition-transform" />
                  </button>

                  <button 
                    onClick={() => setScreen("history")}
                    className="group relative overflow-hidden bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all hover:bg-white/10"
                  >
                    <div className="relative z-10">
                      <History className="w-12 h-12 mb-4 text-emerald-400" />
                      <h2 className="text-3xl font-black uppercase tracking-tighter">History</h2>
                      <p className="text-white/40 font-medium">View your past scores</p>
                    </div>
                    <ChevronRight className="absolute right-8 bottom-8 w-8 h-8 opacity-20 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-6">Recent Performance</h3>
                  {history.length > 0 ? (
                    <div className="space-y-4">
                      {history.slice(0, 3).map((h) => (
                        <div key={h.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                          <div>
                            <p className="font-bold">{h.category}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/40">{h.difficulty} • {new Date(h.timestamp).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-emerald-400">{h.score}/{h.total}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/20">{Math.round((h.score/h.total)*100)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-white/20 font-mono text-sm">No games played yet</p>
                  )}
                </div>
              </motion.div>
            )}

            {screen === "history" && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Score History</h2>
                  <button onClick={() => setScreen("dashboard")} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">Back to Home</button>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {history.map((h) => (
                    <div key={h.id} className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/10">
                      <div>
                        <p className="text-xl font-bold">{h.category}</p>
                        <p className="text-xs uppercase tracking-widest text-white/40">{h.difficulty} • {new Date(h.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-emerald-400">{h.score}/{h.total}</p>
                        <p className="text-xs uppercase tracking-widest text-white/20">{Math.round((h.score/h.total)*100)}%</p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-center py-20 text-white/20">No scores found.</p>}
                </div>
              </motion.div>
            )}

            {screen === "setup" && (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-black uppercase tracking-tighter">Game Setup</h2>
                  <button onClick={() => setScreen("dashboard")} className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors">Cancel</button>
                </div>

                <div className="space-y-8">
                  <section>
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-4">Select Category</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {CATEGORIES.map((c) => (
                        <button 
                          key={c.id}
                          onClick={() => setCategory(c)}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${
                            category?.id === c.id 
                              ? "bg-emerald-500 border-emerald-500 text-black" 
                              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                          }`}
                        >
                          {c.icon}
                          <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-4">Difficulty</h3>
                      <div className="flex gap-2">
                        {DIFFICULTIES.map((d) => (
                          <button 
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                              difficulty === d 
                                ? "bg-white text-black border-white" 
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-4">Questions</h3>
                      <div className="flex gap-2">
                        {QUESTION_COUNTS.map((n) => (
                          <button 
                            key={n}
                            onClick={() => setCount(n)}
                            className={`flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                              count === n 
                                ? "bg-white text-black border-white" 
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  <button 
                    onClick={startQuiz}
                    disabled={!category}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 disabled:cursor-not-allowed text-black font-black py-6 rounded-3xl transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-lg shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
                  >
                    Launch Quiz
                  </button>
                </div>
              </motion.div>
            )}

            {screen === "loading" && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-6" />
                <p className="font-mono text-sm uppercase tracking-[0.3em] text-white/40">Initializing Neural Link...</p>
              </motion.div>
            )}

            {screen === "quiz" && (
              <motion.div 
                key="quiz"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-1">{category?.name}</p>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Question {current + 1} <span className="text-white/20">/ {questions.length}</span></h2>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-mono text-lg ${timeLeft <= 5 ? "bg-red-500/10 border-red-500/50 text-red-400 animate-pulse" : "bg-white/5 border-white/10 text-white/60"}`}>
                    <Timer className="w-4 h-4" />
                    {timeLeft}s
                  </div>
                </div>

                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((current) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="bg-white/5 border border-white/10 p-10 rounded-[40px] backdrop-blur-2xl">
                  <p className="text-2xl md:text-3xl font-bold leading-tight mb-10">{questions[current].question}</p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {questions[current].options.map((opt, i) => {
                      let state: "idle" | "correct" | "wrong" | "dimmed" = "idle";
                      if (answered) {
                        if (opt === questions[current].correct) state = "correct";
                        else if (opt === selected) state = "wrong";
                        else state = "dimmed";
                      }

                      return (
                        <button 
                          key={i}
                          onClick={() => handleAnswer(opt)}
                          disabled={answered}
                          className={`group relative flex items-center gap-4 p-6 rounded-2xl border text-left transition-all ${
                            state === "idle" ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20" :
                            state === "correct" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
                            state === "wrong" ? "bg-red-500/20 border-red-500 text-red-400" :
                            "opacity-30 border-white/5"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs border transition-colors ${
                            state === "idle" ? "bg-white/5 border-white/10 group-hover:border-white/30" :
                            state === "correct" ? "bg-emerald-500 text-black border-emerald-500" :
                            state === "wrong" ? "bg-red-500 text-white border-red-500" :
                            "bg-transparent border-white/10"
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="font-bold">{opt}</span>
                          {state === "correct" && <CheckCircle2 className="absolute right-6 w-6 h-6" />}
                          {state === "wrong" && <XCircle className="absolute right-6 w-6 h-6" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {answered && (
                  <motion.button 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={next}
                    className="w-full bg-white text-black font-black py-5 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors"
                  >
                    {current + 1 >= questions.length ? "Finish Session" : "Next Question"}
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {screen === "result" && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8"
              >
                <div className="relative inline-block">
                  <div className="w-48 h-48 rounded-full border-8 border-white/5 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-black">{pct}%</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{score} / {questions.length}</p>
                    </div>
                  </div>
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -top-2 -right-2 w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Trophy className="w-8 h-8 text-black" />
                  </motion.div>
                </div>

                <div>
                  <h2 className="text-5xl font-black uppercase tracking-tighter mb-2">
                    {pct === 100 ? "Perfect!" : pct >= 70 ? "Great Job!" : pct >= 40 ? "Not Bad" : "Keep Trying"}
                  </h2>
                  <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Session Analysis Complete</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 max-h-[300px] overflow-y-auto custom-scrollbar text-left space-y-3">
                  {answers.map((a, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${a.isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                      <p className="text-sm font-bold mb-1">{a.question}</p>
                      <p className="text-[10px] uppercase tracking-widest">
                        {a.isCorrect ? (
                          <span className="text-emerald-400">Correct: {a.correct}</span>
                        ) : (
                          <span className="text-red-400">You: {a.selected || "Timed Out"} • Correct: {a.correct}</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setScreen("setup")}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-black py-5 rounded-2xl uppercase tracking-widest transition-all"
                  >
                    Play Again
                  </button>
                  <button 
                    onClick={() => setScreen("dashboard")}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black py-5 rounded-2xl uppercase tracking-widest transition-all"
                  >
                    Dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-12 text-center">
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-bold">Powered by Open Trivia DB & AI Studio</p>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
