import fs from "node:fs/promises";
import path from "node:path";

// The source package is included for one production deployment, then removed
// after Supabase is seeded. Later builds skip this step.
const root = process.cwd();
const seedDir = path.join(root, "seed");
if (process.env.VERCEL_ENV !== "production" || !(await fs.stat(seedDir).catch(() => null))) {
  console.log("Mock bank seed skipped.");
  process.exit(0);
}
const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!endpoint || !key) throw Error("Supabase seed credentials missing.");
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const questions = JSON.parse(await fs.readFile(path.join(seedDir, "questions.json"), "utf8"));
const tests = JSON.parse(await fs.readFile(path.join(seedDir, "tests.json"), "utf8"));

async function send(url, data, contentType, extra = {}) {
  for (let n = 0; n < 7; n++) {
    try {
      const response = await fetch(url, { method: "POST", body: data, headers: {
        ...headers, "Content-Type": contentType, ...extra,
      } });
      if (response.ok) return;
      const body = await response.text();
      if (![408, 429, 500, 502, 503, 504].includes(response.status))
        throw Error(`HTTP ${response.status}: ${body.slice(0, 250)}`);
      if (n === 6) throw Error(`HTTP ${response.status}: ${body.slice(0, 250)}`);
    } catch (error) { if (n === 6) throw error; }
    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** n, 12000)));
  }
}

async function rows(table, items, chunkSize) {
  for (let offset = 0; offset < items.length; offset += chunkSize) {
    await send(`${endpoint}/rest/v1/${table}?on_conflict=id`,
      JSON.stringify(items.slice(offset, offset + chunkSize)), "application/json",
      { Prefer: "resolution=merge-duplicates,return=minimal" });
    if ((offset / chunkSize) % 10 === 0) console.log(`${table}: ${Math.min(offset + chunkSize, items.length)}/${items.length}`);
  }
}

await rows("mock_questions", questions, 100);
await rows("mock_tests", tests, 10);

const images = [...new Set(questions.flatMap(q => [q.image, q.solution_image].filter(Boolean)))];
let next = 0, done = 0;
const workers = Array.from({ length: 16 }, async () => {
  while (next < images.length) {
    const name = images[next++];
    const image = await fs.readFile(path.join(root, "public", name));
    const mime = name.endsWith(".png") ? "image/png" : "image/jpeg";
    await send(`${endpoint}/storage/v1/object/gre-mock-assets/${name.split("/").map(encodeURIComponent).join("/")}`,
      image, mime, { "x-upsert": "true" });
    done++;
    if (done % 250 === 0 || done === images.length) console.log(`mock images: ${done}/${images.length}`);
  }
});
await Promise.all(workers);
console.log(`Mock bank seeded: ${questions.length} questions, ${tests.length} tests, ${images.length} images.`);
