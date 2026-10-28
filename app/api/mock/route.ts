import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
type Section = { measure: "verbal" | "quant"; part: number; minutes: number; questions?: string[]; paths?: Record<string, string[]> };
type Answer = string | string[] | number[] | null;
type Attempt = { id: string; user_id: string; test_id: number; completed_at: string | null; section_order: number[];
  selections: Record<string, string[]>; answers: Record<string, Answer>; marks: Record<string, boolean>;
  active_section: number | null; deadline: string | null; current_question: number; result: any };
type Question = { id: string; measure: string; topic: string; type: string; difficulty: string; stem: string;
  choices: any; answer: any; explanation: string; passage?: string; image?: string; solution_image?: string;
  required?: number; numeric_format?: string; choices_in_image?: boolean; source?: any };
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const out = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const db = () => createClient(endpoint, secret, { auth: { persistSession: false, autoRefreshToken: false } });
async function session(req: NextRequest) {
  if (!endpoint || !pub || !secret) throw new Error("Mock database is not configured.");
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return null;
  const client = createClient(endpoint, pub, { auth: { persistSession: false } });
  const { data: { user } } = await client.auth.getUser(token);
  return user || null;
}
type DB = ReturnType<typeof db>;
async function plan(client: DB, id: number): Promise<Section[]> {
  const { data, error } = await client.from("mock_tests").select("plan").eq("id", id).eq("published", true).single();
  if (error || !data) throw new Error("Test unavailable.");
  return data.plan;
}
async function bank(client: DB, ids: string[]): Promise<Question[]> {
  const { data, error } = await client.from("mock_questions").select("*").in("id", ids);
  if (error || !data || data.length !== new Set(ids).size) throw new Error("Test questions unavailable.");
  const found = new Map((data as Question[]).map(q => [q.id, q]));
  return ids.map(id => found.get(id)!);
}
function correct(q: Question, given: Answer | undefined): boolean {
  if (given == null) return false;
  if (q.type === "single_choice" || q.type === "quant_comparison") return given === q.answer;
  if (q.type === "text_completion") return JSON.stringify(given) === JSON.stringify(q.answer);
  if (q.type === "multi_choice") return Array.isArray(given) && given.length === new Set<unknown>(given).size
    && given.length === q.answer.length && given.every(x => q.answer.includes(x));
  if (q.type === "numeric_entry") {
    const parse = (v: unknown) => { const s = String(v ?? "").trim(); if (!s) return NaN;
      if (q.numeric_format === "fraction" && s.includes("/")) {
        const pieces = s.split("/"); return pieces.length === 2 && +pieces[1] !== 0 ? +pieces[0] / +pieces[1] : NaN;
      } return Number(s); };
    const a = parse(given), b = parse(q.answer);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-8;
  }
  return false;
}
async function tier(client: DB, a: Attempt, sections: Section[], measure: string) {
  const i = sections.findIndex(s => s.measure === measure && s.part === 1);
  const qs = await bank(client, a.selections[String(i)] || sections[i].questions || []);
  const raw = qs.filter(q => correct(q, a.answers[q.id])).length;
  return raw <= 4 ? "easy" : raw <= 8 ? "medium" : "hard";
}
function available(a: Attempt) {
  const o = a.section_order;
  return o.length === 0 ? [0, 2] : o.length === 1 ? [o[0] === 0 ? 2 : 0]
    : o.length === 2 ? [1, 3] : o.length === 3 ? [o[2] === 1 ? 3 : 1] : [];
}
async function signed(client: DB, path?: string) {
  if (!path) return null;
  const { data } = await client.storage.from("gre-mock-assets").createSignedUrl(path.replace(/^\//, ""), 3600);
  return data?.signedUrl || null;
}
async function visible(client: DB, q: Question, review = false) {
  return { id: q.id, measure: q.measure, topic: q.topic, type: q.type, difficulty: q.difficulty,
    stem: q.stem, choices: q.choices, passage: q.passage, image: await signed(client, q.image),
    required: q.required, numeric_format: q.numeric_format, choices_in_image: q.choices_in_image,
    ...(review ? { answer: q.answer, explanation: q.explanation, source: q.source,
      solution_image: await signed(client, q.solution_image) } : {}) };
}
async function finish(client: DB, a: Attempt, sections: Section[]) {
  if (a.section_order.length !== 4) return;
  const qs = await bank(client, a.section_order.flatMap(i => a.selections[String(i)] || []));
  const scores: Record<string, unknown> = {};
  for (const measure of ["verbal", "quant"]) {
    const group = qs.filter(q => q.measure === measure), raw = group.filter(q => correct(q, a.answers[q.id])).length;
    const answered = group.filter(q => a.answers[q.id] != null).length;
    const route = await tier(client, a, sections, measure);
    scores[measure] = { raw, out_of: group.length, answered, second_section: route,
      practice_estimate: answered ? Math.max(130, Math.min(170,
        130 + Math.round(40 * raw / 27) + { easy: -2, medium: 0, hard: 2 }[route])) : null };
  }
  const byId = new Map(qs.map(q => [q.id, q]));
  a.result = { scores, correct: qs.filter(q => correct(q, a.answers[q.id])).length, total: qs.length,
    review: a.section_order.map(i => ({ index: i, measure: sections[i].measure, part: sections[i].part,
      questions: (a.selections[String(i)] || []).map(id => ({ id, correct: correct(byId.get(id)!, a.answers[id]) })) })) };
  a.completed_at = new Date().toISOString();
}
async function save(client: DB, a: Attempt): Promise<Attempt> {
  const { data, error } = await client.from("mock_attempts").update({
    section_order: a.section_order, selections: a.selections, answers: a.answers, marks: a.marks,
    active_section: a.active_section, deadline: a.deadline, current_question: a.current_question,
    completed_at: a.completed_at, result: a.result, updated_at: new Date().toISOString(),
  }).eq("id", a.id).eq("user_id", a.user_id).select("*").single();
  if (error || !data) throw new Error(error?.message || "Could not save attempt.");
  return data as Attempt;
}
async function sync(client: DB, a: Attempt, sections: Section[]) {
  if (a.active_section === null || !a.deadline || Date.now() < Date.parse(a.deadline)) return a;
  a.active_section = null; a.deadline = null; a.current_question = 0;
  await finish(client, a, sections);
  return save(client, a);
}
async function present(client: DB, a: Attempt, sections: Section[]) {
  const base = { id: a.id, test_id: a.test_id, finished: !!a.completed_at,
    section_index: a.section_order.length - (a.active_section === null ? 0 : 1),
    answers: a.answers, marks: a.marks, current_question: a.current_question };
  if (a.completed_at) {
    const review = a.result.review as { index: number; measure: string; part: number; questions: { id: string; correct: boolean }[] }[];
    const qs = await bank(client, review.flatMap(s => s.questions.map(q => q.id)));
    const found = new Map(qs.map(q => [q.id, q]));
    return { ...base, scores: a.result.scores, correct: a.result.correct, total: a.result.total,
      review: await Promise.all(review.map(async s => ({ measure: s.measure, part: s.part,
        questions: await Promise.all(s.questions.map(async item => ({ ...await visible(client, found.get(item.id)!, true), correct: item.correct }))) }))) };
  }
  if (a.active_section === null) return { ...base, available_sections: available(a).map(i => ({
    index: i, measure: sections[i].measure, part: sections[i].part, minutes: sections[i].minutes,
    question_count: sections[i].part === 1 ? 12 : 15 })) };
  const index = a.active_section, qs = await bank(client, a.selections[String(index)]);
  return { ...base, section: { measure: sections[index].measure, part: sections[index].part,
    minutes: sections[index].minutes, deadline: a.deadline,
    questions: await Promise.all(qs.map(q => visible(client, q))) } };
}
export async function GET(req: NextRequest) {
  try {
    const user = await session(req); if (!user) return out({ error: "Sign in to access mock tests." }, 401);
    const client = db(), id = req.nextUrl.searchParams.get("attempt");
    if (!id) {
      const [{ data: tests, error: e1 }, { data: attempts, error: e2 }, { count }] = await Promise.all([
        client.from("mock_tests").select("id,title").eq("published", true).order("id"),
        client.from("mock_attempts").select("id,test_id,started_at,completed_at,result").eq("user_id", user.id).order("started_at", { ascending: false }).limit(100),
        client.from("mock_questions").select("id", { count: "exact", head: true }),
      ]);
      if (e1 || e2) throw new Error(e1?.message || e2?.message);
      return out({ tests, attempts, question_count: count });
    }
    const { data, error } = await client.from("mock_attempts").select("*").eq("id", id).eq("user_id", user.id).single();
    if (error || !data) return out({ error: "Attempt not found." }, 404);
    const sections = await plan(client, data.test_id);
    return out(await present(client, await sync(client, data as Attempt, sections), sections));
  } catch (e) { return out({ error: e instanceof Error ? e.message : "Could not load tests." }, 500); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await session(req); if (!user) return out({ error: "Sign in to access mock tests." }, 401);
    const client = db(), body = await req.json() as { action?: string; test_id?: number; attempt_id?: string;
      section?: number; question_id?: string; response?: Answer; marked?: boolean; index?: number };
    if (body.action === "create") {
      if (!Number.isInteger(body.test_id)) return out({ error: "Choose a valid test." }, 400);
      const sections = await plan(client, body.test_id!);
      const { data, error } = await client.from("mock_attempts").insert({ user_id: user.id, test_id: body.test_id }).select("*").single();
      if (error || !data) throw new Error(error?.message || "Could not create attempt.");
      return out(await present(client, data as Attempt, sections));
    }
    if (!body.attempt_id) return out({ error: "Attempt ID required." }, 400);
    const { data, error } = await client.from("mock_attempts").select("*").eq("id", body.attempt_id).eq("user_id", user.id).single();
    if (error || !data) return out({ error: "Attempt not found." }, 404);
    const sections = await plan(client, data.test_id), a = await sync(client, data as Attempt, sections);
    if (a.completed_at) return out(await present(client, a, sections));
    if (body.action === "start") {
      if (a.active_section !== null || !available(a).includes(body.section!)) return out({ error: "Section unavailable." }, 400);
      const s = sections[body.section!], route = s.part === 2 ? await tier(client, a, sections, s.measure) : "";
      a.selections[String(body.section)] = s.part === 1 ? s.questions! : s.paths![route];
      a.section_order.push(body.section!); a.active_section = body.section!;
      a.deadline = new Date(Date.now() + s.minutes * 60_000).toISOString(); a.current_question = 0;
    } else if (body.action === "answer" || body.action === "mark" || body.action === "navigate") {
      if (a.active_section === null) return out({ error: "Start a section first." }, 400);
      const ids = a.selections[String(a.active_section)] || [];
      if (body.action === "navigate") {
        if (!Number.isInteger(body.index) || body.index! < 0 || body.index! >= ids.length) return out({ error: "Invalid question." }, 400);
        a.current_question = body.index!;
      } else {
        if (!body.question_id || !ids.includes(body.question_id)) return out({ error: "Question outside section." }, 400);
        if (body.action === "mark") a.marks[body.question_id] = !!body.marked;
        else {
          const q = (await bank(client, [body.question_id]))[0], value = body.response;
          const valid = value === null || (q.type === "text_completion"
            ? Array.isArray(value) && value.length === q.choices.length && value.every((x, i) => Number.isInteger(x) && Number(x) >= -1 && Number(x) < q.choices[i].length)
            : q.type === "multi_choice" ? Array.isArray(value) && value.length <= (q.required || 10) && value.every(x => typeof x === "string" && /^[A-J]$/.test(x))
            : typeof value === "string" && value.length <= 100 && (q.type === "numeric_entry" || /^[A-J]$/.test(value)));
          if (!valid) return out({ error: "Invalid answer format." }, 400);
          if (value === null) delete a.answers[body.question_id]; else a.answers[body.question_id] = value!;
        }
      }
    } else if (body.action === "advance") {
      if (a.active_section === null) return out({ error: "No active section." }, 400);
      a.active_section = null; a.deadline = null; a.current_question = 0; await finish(client, a, sections);
    } else return out({ error: "Unknown action." }, 400);
    return out(await present(client, await save(client, a), sections));
  } catch (e) { return out({ error: e instanceof Error ? e.message : "Could not save test." }, 500); }
}
