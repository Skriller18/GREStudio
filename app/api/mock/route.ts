import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { questions, sections } from "@/lib/mock-bank";

export function GET() {
  return NextResponse.json({
    sections,
    questions: questions.map(({ answer: _answer, explanation: _explanation, ...publicQuestion }) => publicQuestion),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token) return NextResponse.json({ error: "Sign in to submit a test." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 });

  let body: { answers?: Record<string, string | string[]>; startedAt?: number };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const answers = body.answers ?? {};
  const results = questions.map(q => {
    const given = answers[q.id];
    const correct = Array.isArray(q.answer)
      ? Array.isArray(given) && q.answer.length === given.length && q.answer.every(v => given.includes(v))
      : q.type === "numeric"
        ? typeof given === "string" && given.trim() !== "" && Number.isFinite(Number(given)) && Number(given) === Number(q.answer)
        : typeof given === "string" && given.trim().toLowerCase() === q.answer.toLowerCase();
    return { id: q.id, section: q.section, given: given ?? null, answer: q.answer, correct, explanation: q.explanation };
  });
  const bySection = sections.map((section, index) => ({
    title: section.title,
    correct: results.filter(r => r.section === index && r.correct).length,
    total: section.count,
  }));
  const result = {
    submittedAt: new Date().toISOString(),
    startedAt: typeof body.startedAt === "number" ? body.startedAt : null,
    correct: results.filter(r => r.correct).length,
    total: questions.length,
    bySection,
    results,
  };
  const { error } = await client.from("study_records").upsert({
    user_id: user.id, record_type: "mock_result", record_key: result.submittedAt,
    data: result,
  }, { onConflict: "user_id,record_type,record_key" });
  if (error) return NextResponse.json({ error: `Could not save result: ${error.message}` }, { status: 500 });
  return NextResponse.json(result);
}
