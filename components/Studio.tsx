"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, BookOpenText, BrainCircuit, Check, ChevronDown, CircleHelp, Clock3, Compass, LayoutDashboard, LogOut, Map, Menu, Play, RotateCcw, Save, Search, Sparkles, Target, Trophy, Volume2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Essay, Palace, Question } from "@/lib/types";
import palaceData from "@/data/palaces.json";
import essayData from "@/data/essays.json";

const palaces = palaceData as Palace[];
const essays = essayData as Essay[];
type View = "dashboard" | "vocab" | "essays" | "mock";
type RecordRow = { user_id: string; record_type: string; record_key: string; data: any; updated_at: string };
type PublicQuestion = Omit<Question, "answer" | "explanation">;
type MockData = { sections: { title: string; minutes: number; count: number }[]; questions: PublicQuestion[] };
type Attempt = { section: number; index: number; answers: Record<string, string | string[]>; deadline: number; startedAt: number };
type Result = { submittedAt: string; correct: number; total: number; bySection: { title: string; correct: number; total: number }[]; results: { id: string; answer: string | string[]; given: string | string[] | null; correct: boolean; explanation: string }[] };
const nav: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view:"dashboard",label:"Overview",icon:LayoutDashboard },
  { view:"vocab",label:"Memory palaces",icon:Map },
  { view:"essays",label:"Essay practice",icon:BookOpenText },
  { view:"mock",label:"Mock test",icon:Target },
];
const recordId = (type: string, key: string) => `${type}:${key}`;
const initials = (user: User) => (user.email?.slice(0, 2) || "ST").toUpperCase();
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;

export default function Studio() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [records, setRecords] = useState<Record<string, RecordRow>>({});
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [palaceId, setPalaceId] = useState(1);
  const [stop, setStop] = useState(0);
  const [palaceQuery, setPalaceQuery] = useState("");
  const [palaceOpen, setPalaceOpen] = useState(false);
  const [quiz, setQuiz] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [essayQuery, setEssayQuery] = useState("");
  const [essayId, setEssayId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sampleOpen, setSampleOpen] = useState(false);
  const [essaySeconds, setEssaySeconds] = useState(1800);
  const [essayRunning, setEssayRunning] = useState(false);
  const [mock, setMock] = useState<MockData | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [mockBusy, setMockBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    const client = supabase();
    client.auth.getUser().then(({ data }: { data: { user: User | null } }) => { if (active) { setUser(data.user); setLoading(false); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: string, session: { user: User } | null) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) { setRecords({}); setAttempt(null); setResult(null); return; }
    let active = true;
    supabase().from("study_records").select("*").eq("user_id", user.id).then(({ data, error }: { data: RecordRow[] | null; error: { message: string } | null }) => {
      if (!active) return;
      if (error) setNotice("Cloud progress is unavailable. Apply the Supabase migration before studying.");
      else {
        const next: Record<string, RecordRow> = {};
        (data as RecordRow[] | null)?.forEach(row => { next[recordId(row.record_type, row.record_key)] = row; });
        setRecords(next);
        const saved = next[recordId("mock_attempt", "active")]?.data as Attempt | undefined;
        if (saved?.startedAt && saved?.answers) setAttempt(saved);
      }
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, []);
  useEffect(() => {
    if (!essayRunning) return;
    const handle = window.setInterval(() => setEssaySeconds(s => {
      if (s <= 1) { setEssayRunning(false); return 0; }
      return s - 1;
    }), 1000);
    return () => window.clearInterval(handle);
  }, [essayRunning]);

  const saveRecord = useCallback(async (type: string, key: string, data: any) => {
    if (!user) return;
    const row: RecordRow = { user_id:user.id, record_type:type, record_key:key, data, updated_at:new Date().toISOString() };
    setRecords(prev => ({...prev,[recordId(type,key)]:row}));
    const { error } = await supabase().from("study_records").upsert(row, { onConflict:"user_id,record_type,record_key" });
    if (error) setNotice(`Could not save progress: ${error.message}`);
  }, [user]);
  const deleteRecord = useCallback(async (type: string, key: string) => {
    if (!user) return;
    setRecords(prev => { const next = {...prev}; delete next[recordId(type,key)]; return next; });
    const { error } = await supabase().from("study_records").delete().eq("user_id",user.id).eq("record_type",type).eq("record_key",key);
    if (error) setNotice(`Could not remove record: ${error.message}`);
  }, [user]);

  useEffect(() => {
    if (!essayId || !user || !draft.trim()) return;
    const handle = window.setTimeout(() => { void saveRecord("essay_draft", String(essayId), { text:draft, savedAt:new Date().toISOString() }); }, 1200);
    return () => window.clearTimeout(handle);
  }, [essayId, draft, user, saveRecord]);

  useEffect(() => {
    if (view !== "mock" || mock) return;
    fetch("/api/mock").then(r => r.json()).then(setMock).catch(() => setNotice("Could not load the mock test."));
  }, [view, mock]);

  const navigate = (next: View) => { setView(next); setMobileMenu(false); window.scrollTo({top:0,behavior:"smooth"}); };
  const palace = palaces[palaceId-1];
  const currentWord = palace.words[stop];
  const savedWords = Object.values(records).filter(r => r.record_type === "vocab_word" && r.data.saved);
  const masteredWords = Object.values(records).filter(r => r.record_type === "vocab_word" && r.data.mastered);
  const essayDrafts = Object.values(records).filter(r => r.record_type === "essay_draft");
  const mockResults = Object.values(records).filter(r => r.record_type === "mock_result");
  const selectedEssay = essayId ? essays.find(e => e.id === essayId) : null;
  const wordState = records[recordId("vocab_word", currentWord.word)]?.data ?? {};
  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const filteredPalaces = useMemo(() => {
    const q = palaceQuery.trim().toLowerCase();
    return q ? palaces.filter(p => p.title.toLowerCase().includes(q) || p.words.some(w => w.word.includes(q))) : palaces;
  }, [palaceQuery]);
  const filteredEssays = useMemo(() => {
    const q = essayQuery.trim().toLowerCase();
    return q ? essays.filter(e => e.topic.toLowerCase().includes(q) || e.category.includes(q)) : essays;
  }, [essayQuery]);
  const quizOptions = useMemo(() => {
    const target = palace.words[quizIndex % 10];
    return [target, ...palace.words.filter(w => w.word !== target.word).slice((quizIndex*3)%7,((quizIndex*3)%7)+3)].sort((a,b) => (a.word.charCodeAt(0) + quizIndex*7)%13 - (b.word.charCodeAt(0) + quizIndex*7)%13);
  }, [palace, quizIndex]);

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault(); setAuthBusy(true); setAuthMessage("");
    const client = supabase();
    const action = authMode === "sign-up"
      ? client.auth.signUp({ email, password, options:{ emailRedirectTo:window.location.origin } })
      : client.auth.signInWithPassword({ email, password });
    const { data, error } = await action;
    setAuthBusy(false);
    if (error) setAuthMessage(error.message);
    else if (authMode === "sign-up" && !data.session) setAuthMessage("Check your email to confirm your account, then sign in.");
  }

  function chooseEssay(essay: Essay) {
    setEssayId(essay.id);
    setDraft(String(records[recordId("essay_draft",String(essay.id))]?.data.text ?? ""));
    setSampleOpen(false); setEssaySeconds(1800); setEssayRunning(false);
  }
  function choosePalace(id: number) {
    setPalaceId(id); setStop(0); setPalaceOpen(false); setQuiz(false); setQuizIndex(0); setQuizChoice(null);
  }
  function toggleWord(field: "saved" | "mastered") {
    const existing = records[recordId("vocab_word",currentWord.word)]?.data ?? {};
    void saveRecord("vocab_word", currentWord.word, {...existing,[field]:!existing[field],palaceId});
  }
  function beginMock() {
    if (!mock) return;
    const start = Date.now();
    const next: Attempt = {section:0,index:0,answers:{},deadline:start+mock.sections[0].minutes*60*1000,startedAt:start};
    setAttempt(next); setResult(null); void saveRecord("mock_attempt","active",next);
  }
  function answerMock(q: PublicQuestion, value: string) {
    if (!attempt) return;
    const previous = attempt.answers[q.id];
    const nextValue = q.type === "multi" ? (Array.isArray(previous) ? previous.includes(value) ? previous.filter(v=>v!==value) : [...previous,value].slice(0,2) : [value]) : value;
    const next = {...attempt,answers:{...attempt.answers,[q.id]:nextValue}};
    setAttempt(next); void saveRecord("mock_attempt","active",next);
  }
  async function submitMock(current: Attempt) {
    setMockBusy(true);
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) { setNotice("Your session expired. Sign in again."); setMockBusy(false); return; }
    try {
      const response = await fetch("/api/mock", {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({answers:current.answers,startedAt:current.startedAt})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed.");
      setResult(data as Result); setAttempt(null); void saveRecord("mock_result", data.submittedAt, data); await deleteRecord("mock_attempt","active");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Submission failed."); }
    finally { setMockBusy(false); }
  }
  function nextQuestion() {
    if (!attempt || !mock) return;
    const sectionQuestions = mock.questions.filter(q => q.section === attempt.section);
    if (attempt.index < sectionQuestions.length-1) {
      const next = {...attempt,index:attempt.index+1}; setAttempt(next); void saveRecord("mock_attempt","active",next);
    } else if (attempt.section < mock.sections.length-1) {
      const nextSection = attempt.section+1;
      const next = {...attempt,section:nextSection,index:0,deadline:Date.now()+mock.sections[nextSection].minutes*60*1000};
      setAttempt(next); void saveRecord("mock_attempt","active",next);
    } else void submitMock(attempt);
  }
  useEffect(() => {
    if (!attempt || !mock || mockBusy || now < attempt.deadline) return;
    if (attempt.section < 3) {
      const nextSection = attempt.section+1;
      const next = {...attempt,section:nextSection,index:0,deadline:Date.now()+mock.sections[nextSection].minutes*60*1000};
      setAttempt(next); void saveRecord("mock_attempt","active",next);
    } else void submitMock(attempt);
    // Timer transitions only when the deadline expires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, attempt?.deadline, mock, mockBusy]);

  if (loading) return <div className="loading-screen"><span className="brand-symbol">G</span><p>Opening your studio…</p></div>;
  if (!user) return <main className="auth-shell">
    <div className="auth-art">
      <div className="auth-brand"><span className="brand-symbol">G</span><span>GRE <b>Studio</b></span></div>
      <div className="auth-art-content"><div className="eyebrow light">YOUR PREP, ALL IN ONE PLACE</div><h1>Make progress<br/><em>feel possible.</em></h1><p>One thoughtfully designed home for writing, vocabulary, and full-length practice.</p><div className="auth-benefits"><span><Map size={18}/> 102 visual memory palaces</span><span><BookOpenText size={18}/> 159 essay prompts</span><span><Target size={18}/> Original practice test</span></div></div>
      <div className="auth-orbit orbit-one">A</div><div className="auth-orbit orbit-two">28</div><div className="auth-orbit orbit-three">✦</div>
      <div className="auth-foot">A focused space for ambitious minds.</div>
    </div>
    <div className="auth-form-wrap"><div className="auth-card"><div className="eyebrow">WELCOME TO GRE STUDIO</div><h2>{authMode==="sign-up"?"Create your account":"Welcome back"}</h2><p className="muted">{authMode==="sign-up"?"Your practice, notes, and progress stay in sync.":"Pick up exactly where you left off."}</p><form onSubmit={submitAuth}><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete={authMode==="sign-up"?"new-password":"current-password"}/></label>{authMessage&&<div className="form-message" role="status">{authMessage}</div>}<button className="button primary wide" disabled={authBusy}>{authBusy?"Please wait…":authMode==="sign-up"?"Create account":"Sign in"}<ArrowRight size={18}/></button></form><p className="auth-switch">{authMode==="sign-up"?"Already have an account?":"New to GRE Studio?"} <button onClick={()=>{setAuthMode(authMode==="sign-up"?"sign-in":"sign-up");setAuthMessage("");}}>{authMode==="sign-up"?"Sign in":"Create an account"}</button></p></div></div>
  </main>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu?"open":""}`}>
      <div className="sidebar-brand"><span className="brand-symbol">G</span><span>GRE <b>Studio</b></span><button className="icon-button mobile-close" onClick={()=>setMobileMenu(false)} aria-label="Close menu"><X size={20}/></button></div>
      <div className="sidebar-caption">YOUR WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map(item=><button key={item.view} className={`nav-item ${view===item.view?"active":""}`} onClick={()=>navigate(item.view)}><item.icon size={19}/><span>{item.label}</span>{view===item.view&&<span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={20}/></div><strong>Little steps add up.</strong><p>Build a steady rhythm across words, writing, and reasoning.</p></div>
      <div className="sidebar-user"><span className="avatar">{initials(user)}</span><span className="user-meta"><strong>My workspace</strong><small>{user.email}</small></span><button className="icon-button" onClick={()=>void supabase().auth.signOut()} aria-label="Sign out" title="Sign out"><LogOut size={18}/></button></div>
    </aside>
    {mobileMenu&&<button className="menu-scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <div className="main-area"><header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMobileMenu(true)} aria-label="Open menu"><Menu size={21}/></button><div className="breadcrumb">GRE Studio <span>/</span> <strong>{nav.find(n=>n.view===view)?.label}</strong></div><div className="top-actions"><span className="today-label">Your focused space</span><span className="avatar small">{initials(user)}</span></div></header>
      {notice&&<div className="notice" role="alert"><CircleHelp size={18}/><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={17}/></button></div>}
      <main className="page-content">
      {view==="dashboard"&&<div className="dashboard">
        <section className="dashboard-hero"><div><div className="eyebrow light">YOUR GRE JOURNEY STARTS HERE</div><h1>Good to see you,<br/><em>future grad.</em></h1><p>Everything you need to practice with purpose, in one calm place.</p><button className="button hero-button" onClick={()=>navigate("vocab")}>Explore memory palaces <ArrowRight size={18}/></button></div><div className="hero-graphic" aria-hidden="true"><div className="graphic-ring ring-1"/><div className="graphic-ring ring-2"/><div className="graphic-card card-a">abound <span>↗</span></div><div className="graphic-card card-b">Think. Write. Grow.</div><div className="graphic-center">G<span>✦</span></div></div></section>
        <div className="section-heading"><div><div className="eyebrow">AT A GLANCE</div><h2>Your workspace</h2></div><span className="section-subtitle">A little progress, every day.</span></div>
        <div className="stats-grid"><div className="stat-card"><div className="stat-icon lavender"><BrainCircuit size={21}/></div><strong>{masteredWords.length}</strong><span>Words mastered</span><small>of 1,020 in 102 palaces</small></div><div className="stat-card"><div className="stat-icon peach"><BookOpenText size={21}/></div><strong>{essayDrafts.length}</strong><span>Essays started</span><small>159 prompts to explore</small></div><div className="stat-card"><div className="stat-icon mint"><Trophy size={21}/></div><strong>{mockResults.length}</strong><span>Tests completed</span><small>Original GRE-style practice</small></div></div>
        <div className="section-heading modules-heading"><div><div className="eyebrow">CHOOSE YOUR FOCUS</div><h2>Where will you begin?</h2></div></div>
        <div className="module-grid"><button className="module-card vocab-card" onClick={()=>navigate("vocab")}><span className="module-icon"><Map size={26}/></span><span className="module-copy"><small>VOCABULARY</small><strong>Memory palaces</strong><span>Turn 1,020 words into places you can picture.</span></span><ArrowRight className="module-arrow" size={19}/></button><button className="module-card essay-card" onClick={()=>navigate("essays")}><span className="module-icon"><BookOpenText size={26}/></span><span className="module-copy"><small>ANALYTICAL WRITING</small><strong>Essay practice</strong><span>Think clearly, write confidently, and review models.</span></span><ArrowRight className="module-arrow" size={19}/></button><button className="module-card mock-card" onClick={()=>navigate("mock")}><span className="module-icon"><Target size={26}/></span><span className="module-copy"><small>TEST PRACTICE</small><strong>Mock test</strong><span>Find your rhythm with timed Verbal and Quant.</span></span><ArrowRight className="module-arrow" size={19}/></button></div>
        <div className="footer-note">GRE Studio is an independent practice tool and is not affiliated with ETS.</div>
      </div>}
      {view==="vocab"&&<div className="feature-page">
        <div className="page-heading"><div><div className="eyebrow">VOCABULARY, MADE VISUAL</div><h1>Memory palaces</h1><p>Walk a route, picture a scene, and make each word stick.</p></div><div className="heading-pill"><Compass size={17}/> {palaces.length} palaces · 1,020 words</div></div>
        <div className="palace-layout"><div className="palace-selector"><div className="panel-top"><div><h3>Choose a palace</h3><p>Ten stops in every place</p></div><button className="icon-button" onClick={()=>setPalaceOpen(!palaceOpen)} aria-label="Toggle palace list"><ChevronDown size={18}/></button></div><div className="search-field"><Search size={17}/><input value={palaceQuery} onChange={e=>setPalaceQuery(e.target.value)} placeholder="Search places or words…"/></div><div className={`palace-list ${palaceOpen?"expanded":""}`}>{filteredPalaces.map(p=><button className={`palace-list-item ${p.id===palaceId?"selected":""}`} key={p.id} onClick={()=>choosePalace(p.id)}><span className="palace-emoji">{p.icon}</span><span><strong>{p.title}</strong><small>Palace {String(p.id).padStart(3,"0")} · 10 words</small></span><ArrowRight size={16}/></button>)}</div></div>
          <div className="palace-main"><div className="palace-header"><div><span className="eyebrow">PALACE {String(palace.id).padStart(3,"0")} / {String(palaces.length).padStart(3,"0")}</span><h2>{palace.icon} {palace.title}</h2><p>{palace.build}</p></div><button className="button secondary" onClick={()=>{setQuiz(!quiz);setQuizIndex(0);setQuizChoice(null);}}>{quiz?"Back to map":"Practice words"} <ArrowRight size={17}/></button></div>
          {!quiz?<><div className="map-panel"><div className="map-top"><span><Map size={17}/> YOUR WALKING ROUTE</span><span>Tap a stop to explore</span></div><div className="route-map"><svg className="route-line" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true"><path d="M70 312 C160 310 150 90 270 112 S390 355 485 311 S575 93 684 117 S795 340 927 206" fill="none" stroke="#e5d4ff" strokeWidth="32" strokeLinecap="round"/><path d="M70 312 C160 310 150 90 270 112 S390 355 485 311 S575 93 684 117 S795 340 927 206" fill="none" stroke="#a87ae9" strokeWidth="3" strokeDasharray="8 11" strokeLinecap="round"/></svg>{palace.words.map((w,i)=><button key={w.word} style={{left:`${[7,17,27,37,47,57,67,77,87,93][i]}%`,top:`${[73,52,26,35,72,58,26,39,72,48][i]}%`}} className={`map-stop ${stop===i?"current":""} ${records[recordId("vocab_word",w.word)]?.data.mastered?"mastered":""}`} onClick={()=>setStop(i)} aria-label={`Stop ${i+1}: ${w.locus}`}><span>{w.icon}</span><small>{i+1}</small></button>)}</div><div className="map-legend"><span><i className="legend-current"/> Current stop</span><span><i className="legend-mastered"/> Mastered</span><span>Start at the entrance → follow the path</span></div></div><div className="word-detail"><div className="word-scene-icon">{currentWord.icon}</div><div className="word-detail-body"><span className="eyebrow">STOP {stop+1} · {currentWord.locus.toUpperCase()}</span><h3>{currentWord.word}</h3><p className="meaning">{currentWord.meaning}</p><p className="scene"><Sparkles size={17}/> {currentWord.scene}</p><div className="word-actions"><button className={`button small ${wordState.saved?"selected-button":"secondary"}`} onClick={()=>toggleWord("saved")}><Save size={16}/>{wordState.saved?"Saved":"Save word"}</button><button className={`button small ${wordState.mastered?"selected-button":"secondary"}`} onClick={()=>toggleWord("mastered")}><Check size={16}/>{wordState.mastered?"Mastered":"Mark mastered"}</button><button className="button small secondary" onClick={()=>{if("speechSynthesis" in window){window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(currentWord.word);utterance.lang="en-US";window.speechSynthesis.speak(utterance);}}}><Volume2 size={16}/> Hear word</button><button className="button small ghost" onClick={()=>setStop((stop+1)%10)}>Next stop <ArrowRight size={16}/></button></div></div></div></>:<div className="quiz-panel"><div className="quiz-heading"><span className="eyebrow">PALACE PRACTICE</span><h3>What does <em>{palace.words[quizIndex%10].word}</em> mean?</h3><p>Question {quizIndex+1} of 10</p></div><div className="quiz-options">{quizOptions.map(w=><button key={w.word} disabled={quizChoice!==null} className={`quiz-option ${quizChoice===w.meaning?"chosen":""} ${quizChoice&&w.word===palace.words[quizIndex%10].word?"correct":""}`} onClick={()=>setQuizChoice(w.meaning)}>{w.meaning}{quizChoice&&w.word===palace.words[quizIndex%10].word&&<Check size={18}/>}</button>)}</div>{quizChoice&&<div className="quiz-feedback"><strong>{quizChoice===palace.words[quizIndex%10].meaning?"Nicely done!":"Keep the scene in mind."}</strong><p>{palace.words[quizIndex%10].scene}</p><button className="button primary small" onClick={()=>{if(quizIndex===9){setQuiz(false);setStop(0);}else setQuizIndex(quizIndex+1);setQuizChoice(null);}}>{quizIndex===9?"Finish practice":"Next word"} <ArrowRight size={16}/></button></div>}</div>}</div></div>
        {savedWords.length>0&&<div className="saved-words"><div><span className="eyebrow">YOUR COLLECTION</span><h3>Saved words <small>({savedWords.length})</small></h3></div><div className="saved-word-list">{savedWords.slice(0,30).map(r=><button key={r.record_key} onClick={()=>{const p=Number(r.data.palaceId)||1;choosePalace(p);setStop(Math.max(0,palaces[p-1]?.words.findIndex(w=>w.word===r.record_key)??0));}}>{r.record_key}<ArrowRight size={14}/></button>)}</div></div>}<div className="footer-note">Each route and mnemonic scene is written for GRE Studio. Word progress is saved to your account.</div>
      </div>}
      {view==="essays"&&<div className="feature-page"><div className="page-heading"><div><div className="eyebrow">THINK CLEARLY. WRITE BOLDLY.</div><h1>Essay practice</h1><p>Choose an issue, build your argument, and compare with a model response.</p></div><div className="heading-pill"><BookOpenText size={17}/> {essays.length} prompts</div></div><div className="essay-layout"><div className="essay-list-panel"><div className="panel-top"><div><h3>Issue prompts</h3><p>{filteredEssays.length} to explore</p></div></div><div className="search-field"><Search size={17}/><input value={essayQuery} onChange={e=>setEssayQuery(e.target.value)} placeholder="Search prompts or topics…"/></div><div className="essay-list">{filteredEssays.map(e=><button key={e.id} className={`essay-list-item ${essayId===e.id?"selected":""}`} onClick={()=>chooseEssay(e)}><span className="essay-number">{String(e.id).padStart(3,"0")}</span><span><strong>{e.topic}</strong><small>{e.category} {records[recordId("essay_draft",String(e.id))]?"· Draft saved":""}</small></span></button>)}</div></div><div className="essay-workspace">{selectedEssay?<><div className="essay-workspace-top"><span className="eyebrow">ISSUE {String(selectedEssay.id).padStart(3,"0")} · {selectedEssay.category.toUpperCase()}</span><div className="timer"><Clock3 size={17}/>{formatTime(essaySeconds)} <button onClick={()=>setEssayRunning(!essayRunning)}>{essayRunning?"Pause":"Start"}</button><button onClick={()=>{setEssayRunning(false);setEssaySeconds(1800);}} title="Reset timer"><RotateCcw size={15}/></button></div></div><h2>{selectedEssay.topic}</h2><div className="prompt-instructions">{selectedEssay.instructions}</div><div className="editor-heading"><h3>Your response</h3><span>{wordCount} words</span></div><textarea className="essay-editor" value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Begin with your position, then build a clear argument with specific examples…" aria-label="Your essay response"/><div className="editor-bottom"><span><Save size={15}/> Auto-saved to your account</span><button className="button secondary small" onClick={()=>void saveRecord("essay_draft",String(selectedEssay.id),{text:draft,savedAt:new Date().toISOString()})}><Save size={16}/> Save now</button></div><div className="sample-section"><button className="sample-toggle" onClick={()=>setSampleOpen(!sampleOpen)}><span><Sparkles size={18}/> Sample response <small>{selectedEssay.word_count} words</small></span><ChevronDown className={sampleOpen?"rotated":""} size={19}/></button>{sampleOpen&&<div className="sample-copy">{selectedEssay.essay.split("\n\n").map((p,i)=><p key={i}>{p}</p>)}</div>}</div></>:<div className="empty-workspace"><div className="empty-icon"><BookOpenText size={31}/></div><h2>Make your case.</h2><p>Select a prompt on the left to start writing. Your draft saves as you go.</p><button className="button primary" onClick={()=>chooseEssay(essays[0])}>Start with prompt 001 <ArrowRight size={17}/></button></div>}</div></div><div className="footer-note">Sample responses are study models, not official scoring samples.</div></div>}
      {view==="mock"&&<div className="feature-page"><div className="page-heading"><div><div className="eyebrow">PRACTICE UNDER REAL CONDITIONS</div><h1>Mock test</h1><p>Build endurance with a timed, original GRE-style practice test.</p></div><div className="heading-pill"><Clock3 size={17}/> 4 timed sections</div></div>{!mock?<div className="loading-panel">Loading your test…</div>:result?<div className="result-panel"><div className="result-hero"><div className="result-icon"><Trophy size={30}/></div><span className="eyebrow light">TEST COMPLETE</span><h2>Progress is something to celebrate.</h2><p>You answered <strong>{result.correct} of {result.total}</strong> questions correctly.</p><button className="button hero-button" onClick={()=>{setResult(null);beginMock();}}>Try again <RotateCcw size={17}/></button></div><div className="result-sections">{result.bySection.map(s=><div key={s.title}><strong>{s.title}</strong><span>{s.correct} / {s.total} correct</span><div className="progress-track"><i style={{width:`${100*s.correct/s.total}%`}}/></div></div>)}</div><div className="review-list"><h3>Review your answers</h3>{result.results.map((r,i)=><details key={r.id}><summary><span className={`review-status ${r.correct?"right":"wrong"}`}>{r.correct?<Check size={16}/>:<X size={16}/>}</span>Question {i+1}<span>{r.correct?"Correct":"Review"}</span></summary><div><p><b>Question:</b> {mock?.questions.find(q=>q.id===r.id)?.stem}</p><p><b>Your answer:</b> {Array.isArray(r.given)?r.given.join(", "):r.given||"No answer"}</p><p><b>Correct answer:</b> {Array.isArray(r.answer)?r.answer.join(", "):r.answer}</p><p>{r.explanation}</p></div></details>)}</div></div>:attempt?<div className="test-runner"><div className="test-toolbar"><div><span className="eyebrow">ORIGINAL PRACTICE TEST</span><h2>{mock.sections[attempt.section].title}</h2></div><div className={`test-timer ${attempt.deadline-now<60000?"urgent":""}`}><Clock3 size={18}/>{formatTime(Math.max(0,Math.ceil((attempt.deadline-now)/1000)))}</div></div><div className="test-progress"><div className="progress-track"><i style={{width:`${100*(attempt.index+1)/mock.sections[attempt.section].count}%`}}/></div><span>Question {attempt.index+1} of {mock.sections[attempt.section].count}</span></div>{(()=>{const q=mock.questions.filter(q=>q.section===attempt.section)[attempt.index];const selected=attempt.answers[q.id];return <div className="question-card"><div className="question-type">{q.type==="multi"?"SELECT TWO ANSWERS":q.type==="numeric"?"NUMERIC ENTRY":"SELECT ONE ANSWER"}</div><h3>{q.stem}</h3>{q.type==="numeric"?<input className="numeric-input" inputMode="decimal" value={typeof selected==="string"?selected:""} onChange={e=>answerMock(q,e.target.value)} placeholder="Enter your answer"/>:<div className="answer-list">{q.choices?.map((choice,i)=><button key={choice} className={`answer-option ${Array.isArray(selected)?selected.includes(choice)?"selected":"":selected===choice?"selected":""}`} onClick={()=>answerMock(q,choice)}><span>{String.fromCharCode(65+i)}</span>{choice}{(Array.isArray(selected)?selected.includes(choice):selected===choice)&&<Check size={18}/>}</button>)}</div>}</div>})()}<div className="test-footer"><button className="button secondary" disabled={attempt.index===0} onClick={()=>{const next={...attempt,index:attempt.index-1};setAttempt(next);void saveRecord("mock_attempt","active",next);}}><ArrowLeft size={17}/> Previous</button><div className="question-dots">{mock.questions.filter(q=>q.section===attempt.section).map((q,i)=><button key={q.id} className={`${i===attempt.index?"active":""} ${attempt.answers[q.id]?"answered":""}`} onClick={()=>{const next={...attempt,index:i};setAttempt(next);void saveRecord("mock_attempt","active",next);}} aria-label={`Question ${i+1}`}>{i+1}</button>)}</div><button className="button primary" disabled={mockBusy} onClick={nextQuestion}>{attempt.section===3&&attempt.index===14?"Submit test":attempt.index===mock.sections[attempt.section].count-1?"Next section":"Next question"} <ArrowRight size={17}/></button></div></div>:<div className="mock-intro"><div className="mock-intro-art"><div className="mock-badge"><Target size={40}/></div><span className="tiny-star star-one">✦</span><span className="tiny-star star-two">✦</span></div><div className="mock-intro-copy"><div className="eyebrow">A FOCUSED PRACTICE SESSION</div><h2>Ready to see where you stand?</h2><p>Work through 54 original Verbal and Quant questions in four timed sections. Your answers are saved as you go, and explanations appear after submission.</p><div className="test-format">{mock.sections.map((s,i)=><div key={s.title}><span>{String(i+1).padStart(2,"0")}</span><strong>{s.title}</strong><small>{s.count} questions · {s.minutes} min</small></div>)}</div><button className="button primary" onClick={beginMock}><Play size={17}/> Begin practice test</button><p className="test-disclaimer">Scores show raw practice accuracy. They are not official GRE scaled scores.</p></div></div>}{!attempt&&!result&&mockResults.length>0&&<div className="past-results"><h3>Past results</h3>{mockResults.slice().reverse().slice(0,5).map(r=><button key={r.record_key} onClick={()=>setResult(r.data as Result)}><span><Trophy size={17}/> {new Date(r.record_key).toLocaleDateString()}</span><strong>{r.data.correct} / {r.data.total} correct</strong><ArrowRight size={16}/></button>)}</div>}<div className="footer-note">This test uses original practice questions. It is not affiliated with or scored by ETS.</div></div>}
      </main>
    </div>
  </div>;
}
