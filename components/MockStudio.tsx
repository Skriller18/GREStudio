"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Clock3, Play, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "./mock.css";

type Question = { id: string; measure: string; topic: string; type: string; difficulty: string;
  stem: string; choices: string[] | string[][] | null; passage?: string; image?: string | null;
  answer?: string | number[] | string[]; explanation?: string; solution_image?: string | null;
  required?: number; numeric_format?: string; correct?: boolean; source?: Record<string, unknown> };
type Section = { measure: string; part: number; minutes: number; deadline?: string;
  question_count?: number; index?: number; questions?: Question[] };
type Attempt = { id: string; test_id: number; finished: boolean; section_index: number;
  answers: Record<string, string | string[] | number[]>; marks: Record<string, boolean>;
  current_question: number; available_sections?: Section[]; section?: Section;
  scores?: Record<string, { raw: number; out_of: number; answered: number; practice_estimate: number | null; second_section: string }>;
  correct?: number; total?: number; review?: { measure: string; part: number; questions: Question[] }[] };
type Catalog = { tests: { id: number; title: string }[]; attempts: { id: string; test_id: number;
  started_at: string; completed_at: string | null; result: { correct: number; total: number } | null }[];
  question_count: number };
const letters = "ABCDEFGHIJ";
const title = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
const sectionName = (s: Pick<Section, "measure" | "part">) => `${title(s.measure)} · Section ${s.part}`;
const pad = (n: number) => String(n).padStart(2, "0");

function MathText({ text }: { text?: string }) {
  const value = String(text || "");
  const pieces = value.split(/(\{\{frac:[^{}]+\}\}|(?<!\w)-?\d+\/-?\d+(?!\w))/g);
  return <>{pieces.map((piece, i) => {
    const fraction = piece.match(/^\{\{frac:(.*?):(.*?)\}\}$/) || piece.match(/^(-?\d+)\/(-?\d+)$/);
    return fraction ? <span className="mock-fraction" key={i}><span>{fraction[1]}</span><span>{fraction[2]}</span></span>
      : <span key={i}>{piece}</span>;
  })}</>;
}
function Stem({ question }: { question: Question }) {
  const match = question.type === "quant_comparison"
    ? question.stem.match(/^([\s\S]*?)\n\nQuantity A: ([^\n]+)\nQuantity B: ([^\n]+)$/) : null;
  return <div className="mock-stem">{match ? <><MathText text={match[1]}/><div className="mock-comparison">
    <div><small>QUANTITY A</small><MathText text={match[2]}/></div><div><small>QUANTITY B</small><MathText text={match[3]}/></div>
  </div></> : <MathText text={question.stem}/>}</div>;
}
function formatAnswer(q: Question, answer: unknown) {
  if (answer == null) return "No answer";
  if (q.type === "text_completion" && Array.isArray(answer))
    return answer.map((x, i) => (q.choices as string[][])?.[i]?.[Number(x)] ?? "—").join(" / ");
  if (q.type === "multi_choice" && Array.isArray(answer))
    return answer.map(x => `${x}: ${(q.choices as string[])?.[letters.indexOf(String(x))] || ""}`).join(" · ");
  if (typeof answer === "string" && q.type !== "numeric_entry")
    return `${answer}: ${(q.choices as string[])?.[letters.indexOf(answer)] || ""}`;
  return String(answer);
}

export default function MockStudio() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [number, setNumber] = useState(0);
  const [numericDraft, setNumericDraft] = useState("");
  const [fractionTop, setFractionTop] = useState("");
  const [fractionBottom, setFractionBottom] = useState("");
  const [calculator, setCalculator] = useState(false);
  const [calcValue, setCalcValue] = useState("0");

  const api = useCallback(async (params?: { action: string; [key: string]: unknown }, attemptId?: string) => {
    const { data: { session } } = await supabase().auth.getSession();
    if (!session) throw new Error("Sign in again to continue.");
    const response = await fetch(attemptId ? `/api/mock?attempt=${encodeURIComponent(attemptId)}` : "/api/mock", {
      method: params ? "POST" : "GET",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }, []);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { setCatalog(await api() as Catalog); }
    catch (e) { setError(e instanceof Error ? e.message : "Tests unavailable."); }
    finally { setBusy(false); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const tick = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(tick); }, []);
  useEffect(() => {
    if (!attempt?.section?.deadline || now < Date.parse(attempt.section.deadline)) return;
    void api(undefined, attempt.id).then((next: Attempt) => { setAttempt(next); setNumber(next.current_question); })
      .catch(e => setError(e.message));
  }, [now, attempt?.section?.deadline, attempt?.id, api]);
  useEffect(() => {
    const q = attempt?.section?.questions?.[number];
    const value = q && attempt?.answers[q.id];
    setNumericDraft(typeof value === "string" ? value : "");
    const parts = typeof value === "string" ? value.split("/") : [];
    setFractionTop(parts[0] || ""); setFractionBottom(parts[1] || "");
  }, [attempt?.section?.questions, attempt?.answers, number]);

  async function act(action: string, fields: Record<string, unknown> = {}) {
    if (!attempt) return;
    setBusy(true); setError("");
    try {
      const next = await api({ action, attempt_id: attempt.id, ...fields }) as Attempt;
      setAttempt(next); setNumber(next.current_question);
      if (next.finished) await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function create(id: number) {
    setBusy(true); setError("");
    try { setAttempt(await api({ action: "create", test_id: id }) as Attempt); setSelectedTest(id); setNumber(0); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not start."); }
    finally { setBusy(false); }
  }
  async function resume(id: string) {
    setBusy(true); setError("");
    try { const next = await api(undefined, id) as Attempt; setAttempt(next); setSelectedTest(next.test_id); setNumber(next.current_question); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not resume."); }
    finally { setBusy(false); }
  }
  async function back() { setAttempt(null); setSelectedTest(null); await load(); }
  const q = attempt?.section?.questions?.[number];
  const seconds = attempt?.section?.deadline ? Math.max(0, Math.ceil((Date.parse(attempt.section.deadline) - now) / 1000)) : 0;
  const answered = attempt?.section?.questions?.filter(item => attempt.answers[item.id] != null).length || 0;
  const answer = q ? attempt?.answers[q.id] : null;
  const select = (value: string | string[] | number[] | null) => { if (q) void act("answer", { question_id: q.id, response: value }); };
  const nav = (index: number) => { setNumber(index); void act("navigate", { index }); };
  const answerChoices = (question: Question, response: unknown, disabled = false) => {
    if (question.type === "numeric_entry") return <div className="mock-numeric">
      {question.numeric_format === "fraction" ? <>
        <label>Numerator<input inputMode="decimal" value={disabled ? String(response || "").split("/")[0] || "" : fractionTop}
          disabled={disabled} onChange={e => setFractionTop(e.target.value)}/></label><span>/</span>
        <label>Denominator<input inputMode="decimal" value={disabled ? String(response || "").split("/")[1] || "" : fractionBottom}
          disabled={disabled} onChange={e => setFractionBottom(e.target.value)}/></label>
        {!disabled && <button className="button secondary" onClick={() => select(`${fractionTop}/${fractionBottom}`)}>Save answer</button>}
      </> : <><label>Enter your answer<input inputMode="decimal" value={disabled ? String(response || "") : numericDraft}
        disabled={disabled} onChange={e => setNumericDraft(e.target.value)}/></label>
        {!disabled && <button className="button secondary" onClick={() => select(numericDraft)}>Save answer</button>}</>}
    </div>;
    if (question.type === "text_completion") return <div className="mock-blanks">{(question.choices as string[][])?.map((choices, i) => <div key={i}>
      <small>BLANK {i + 1}</small><div className="mock-options">{choices.map((choice, j) =>
        <button key={j} className={`mock-option ${Array.isArray(response) && response[i] === j ? "selected" : ""}`}
          disabled={disabled} onClick={() => { const next = Array.isArray(response) ? [...response] : Array(question.choices!.length).fill(-1);
            next[i] = j; if (next.every(x => x >= 0)) select(next); else setAttempt(a => a ? { ...a, answers: { ...a.answers, [question.id]: next } } : a); }}>
          <span>{letters[j]}</span><MathText text={choice}/></button>)}</div></div>)}</div>;
    return <div className="mock-options">{(question.choices as string[] || []).map((choice, i) => {
      const letter = letters[i], selected = Array.isArray(response) ? response.includes(letter) : response === letter;
      return <button key={i} className={`mock-option ${selected ? "selected" : ""}`} disabled={disabled}
        onClick={() => question.type === "multi_choice" ? select((Array.isArray(response) ? response as string[] : [])
          .includes(letter) ? (response as string[]).filter(x => x !== letter)
            : [...(Array.isArray(response) ? response as string[] : []), letter].slice(0, question.required || 10)) : select(letter)}>
        <span>{letter}</span><MathText text={choice}/></button>;
    })}</div>;
  };
  const questionBody = (question: Question) => <>{question.passage && <div className="mock-passage"><MathText text={question.passage}/></div>}
    {question.image && <img className="mock-diagram" src={question.image} alt="Question diagram" loading="lazy"/>}
    <Stem question={question}/></>;

  return <div className="feature-page mock-studio">
    <div className="feature-heading"><div><div className="eyebrow">FOCUSED PRACTICE</div><h1>Mock tests</h1><p>Four timed sections, adaptive second sections, and worked solutions after submission.</p></div></div>
    {error && <div className="mock-error" role="alert">{error}</div>}
    {!attempt && <><div className="mock-summary"><span><strong>50</strong> tests</span><span><strong>{catalog?.question_count?.toLocaleString() || "—"}</strong> questions</span>
      <span><strong>54</strong> per attempt</span><span><strong>88 min</strong> reasoning time</span></div>
      {catalog?.attempts.some(a => !a.completed_at) && <section className="mock-catalog-section"><h2>Continue studying</h2><div className="mock-test-grid">
        {catalog.attempts.filter(a => !a.completed_at).map(a => <button key={a.id} className="mock-test-card" onClick={() => resume(a.id)}>
          <small>TEST {pad(a.test_id)}</small><strong>Resume attempt</strong><span>Started {new Date(a.started_at).toLocaleDateString()}</span><ArrowRight size={18}/></button>)}</div></section>}
      {catalog?.attempts.some(a => a.completed_at) && <section className="mock-catalog-section"><h2>Results</h2><div className="mock-test-grid">
        {catalog.attempts.filter(a => a.completed_at).map(a => <button key={a.id} className="mock-test-card" onClick={() => resume(a.id)}>
          <small>TEST {pad(a.test_id)}</small><strong>{a.result?.correct} / {a.result?.total} correct</strong>
          <span>{new Date(a.completed_at!).toLocaleDateString()}</span><ArrowRight size={18}/></button>)}</div></section>}
      <section className="mock-catalog-section"><h2>Practice tests</h2><div className="mock-test-grid">
        {catalog?.tests.map(t => <button key={t.id} className="mock-test-card" disabled={busy} onClick={() => create(t.id)}>
          <small>TEST {pad(t.id)}</small><strong>{t.title}</strong><span>Verbal + Quant · 54 questions</span><ArrowRight size={18}/></button>)}</div></section>
      {!catalog && !error && <p>Loading tests…</p>}
      <p className="mock-note">Raw scores reflect your answers. The 130–170 scores are practice estimates, not official GRE scores.</p>
    </>}
    {attempt && !attempt.finished && !attempt.section && <div className="mock-stage">
      <button className="mock-back" onClick={back}><ArrowLeft size={16}/> All tests</button>
      <div className="eyebrow">PRACTICE TEST {pad(attempt.test_id)}</div>
      <h2>{attempt.section_index === 0 ? "Choose your first section" : "Ready for the next section?"}</h2>
      <p>The timer starts when you enter a section. You can change answers and mark questions until time expires. The clock pauses between sections.</p>
      <div className="mock-section-choices">{attempt.available_sections?.map(s => <button key={s.index} disabled={busy} onClick={() => void act("start", { section: s.index })}>
        <span>{sectionName(s)}</span><small>{s.question_count} questions · {s.minutes} minutes</small><Play size={18}/></button>)}</div>
    </div>}
    {attempt?.section && q && <div className="mock-exam">
      <div className="mock-exam-bar"><div><button className="mock-back" onClick={back}><ArrowLeft size={16}/> Tests</button>
        <strong>Test {pad(attempt.test_id)} / {sectionName(attempt.section)}</strong></div>
        <div className={`mock-timer ${seconds < 120 ? "urgent" : ""}`}><Clock3 size={18}/>{pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}</div></div>
      <div className="mock-exam-grid"><main className="mock-question-panel">
        <div className="mock-question-head"><div><small>QUESTION {number + 1} OF {attempt.section.questions!.length}</small><span>{title(q.topic)}</span></div>
          <button className="button secondary" disabled={busy} onClick={() => void act("mark", { question_id: q.id, marked: !attempt.marks[q.id] })}>
            <Bookmark size={16} fill={attempt.marks[q.id] ? "currentColor" : "none"}/> {attempt.marks[q.id] ? "Marked" : "Mark"}</button></div>
        {questionBody(q)}{q.type === "multi_choice" && <p className="mock-hint">Select {q.required ? `up to ${q.required}` : "all"} that apply.</p>}
        {answerChoices(q, answer)}
        <div className="mock-question-actions"><button className="button secondary" disabled={busy || number === 0} onClick={() => nav(number - 1)}>
          <ArrowLeft size={16}/> Previous</button><button className="button secondary" disabled={busy} onClick={() => select(null)}><RotateCcw size={15}/> Clear</button>
          <button className="button primary" disabled={busy || number === attempt.section.questions!.length - 1} onClick={() => nav(number + 1)}>
            Next <ArrowRight size={16}/></button></div>
      </main><aside className="mock-navigator"><small>SECTION NAVIGATOR</small><h3>{sectionName(attempt.section)}</h3>
        <p>{answered} / {attempt.section.questions!.length} answered</p><div className="mock-number-grid">
          {attempt.section.questions!.map((item, i) => <button key={item.id} className={`${i === number ? "active" : ""} ${attempt.answers[item.id] != null ? "answered" : ""} ${attempt.marks[item.id] ? "marked" : ""}`}
            disabled={busy} onClick={() => nav(i)}>{i + 1}</button>)}</div>
        <button className="button primary mock-submit" disabled={busy} onClick={() => {
          const left = attempt.section!.questions!.length - answered;
          if (window.confirm(`Submit ${sectionName(attempt.section!)}? You cannot return to it.${left ? ` ${left} unanswered.` : ""}`))
            void act("advance");
        }}>Submit section <ArrowRight size={16}/></button>
        {attempt.section.measure === "quant" && <><button className="button secondary mock-submit" onClick={() => setCalculator(v => !v)}>Calculator</button>
          {calculator && <div className="mock-calculator"><output>{calcValue}</output><div>{["7","8","9","÷","4","5","6","×","1","2","3","−","0",".","C","+","=","√"].map(key =>
            <button key={key} onClick={() => { if (key === "C") setCalcValue("0"); else if (key === "=" || key === "√") {
              try { const expression = calcValue.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-");
                if (!/^[0-9+*/(). -]+$/.test(expression)) throw Error();
                const result = Function(`return (${expression})`)();
                setCalcValue(String(key === "√" ? Math.sqrt(result) : result)); } catch { setCalcValue("Error"); }
            } else setCalcValue(v => v === "0" || v === "Error" ? key : v + key); }}>{key}</button>)}</div></div>}</>}
        <p className="mock-note">Your answers save to your account. The active section timer continues if you leave this page.</p>
      </aside></div></div>}
    {attempt?.finished && <div className="mock-results">
      <button className="mock-back" onClick={back}><ArrowLeft size={16}/> All tests</button>
      <div className="eyebrow">PRACTICE TEST {pad(attempt.test_id)} · COMPLETE</div><h2>Your results</h2>
      <p>Raw scores are exact for this attempt. Scaled scores are practice estimates.</p>
      <div className="mock-score-grid">{(["verbal", "quant"] as const).map(measure => {
        const score = attempt.scores?.[measure]; return <div key={measure}><small>{title(measure)} Reasoning</small>
          <strong>{score?.practice_estimate ?? "NS"}</strong><span>130–170 practice estimate</span>
          <p>{score?.raw} / {score?.out_of} correct · Section 2: {score?.second_section}</p></div>;
      })}</div><h3>Answer review</h3>{attempt.review?.map((section, index) => <section key={index} className="mock-review-section">
        <h4>{sectionName(section)}</h4>{section.questions.map((item, i) => <article key={item.id} className={`mock-review ${item.correct ? "correct" : "incorrect"}`}>
          <div className="mock-review-status">{item.correct ? "✓ Correct" : "✕ Incorrect"} · Question {i + 1} <small>{title(item.topic)}</small></div>
          {questionBody(item)}<div className="mock-answer-line"><strong>Your answer</strong><span>{formatAnswer(item, attempt.answers[item.id])}</span>
            <strong>Correct answer</strong><span>{formatAnswer(item, item.answer)}</span></div>
          <p className="mock-explanation"><MathText text={item.explanation}/></p>
          {item.solution_image && <img className="mock-solution" src={item.solution_image} alt="Worked solution" loading="lazy"/>}
          {!!item.source?.book && <small className="mock-source">{String(item.source.book)} · Page {String(item.source.page || "—")}</small>}
        </article>)}</section>)}
    </div>}
  </div>;
}
