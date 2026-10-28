"""Import the rights-cleared local GRE-MockTests bank into Supabase.

Usage: python3 scripts/import_mock_bank.py --source ../GRE-MockTests
The source repository's ignored data/ and web/diagrams/ must be present locally.
SUPABASE_SECRET_KEY is read from the environment or the ignored .env.local file.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BUCKET = "gre-mock-assets"


def config(name: str) -> str:
    if os.environ.get(name):
        return os.environ[name]
    local = ROOT / ".env.local"
    if local.exists():
        for line in local.read_text().splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1]
    raise RuntimeError(f"Missing {name}")


def request(url: str, key: str, payload: bytes, content_type: str,
            extra: dict[str, str] | None = None) -> None:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": content_type,
        **(extra or {}),
    }
    command = ["curl", "-sS", "--max-time", "90", "-X", "POST", url,
               "--data-binary", "@-", "-w", "\n%{http_code}"]
    for name, value in headers.items():
        command += ["-H", f"{name}: {value}"]
    for attempt in range(6):
        completed = subprocess.run(command, input=payload, capture_output=True)
        response, _, status = completed.stdout.rpartition(b"\n")
        code = int(status) if status.isdigit() else 0
        if completed.returncode == 0 and 200 <= code < 300:
            return
        if code not in (0, 408, 429, 500, 502, 503, 504) or attempt == 5:
            raise RuntimeError(f"HTTP {code}: {response[:300].decode('utf-8', 'replace')}")
        time.sleep(min(2 ** attempt, 12))


def upload_rows(url: str, key: str, table: str, rows: list[dict], batch: int = 100) -> None:
    endpoint = f"{url}/rest/v1/{table}?on_conflict=id"
    for offset in range(0, len(rows), batch):
        payload = json.dumps(rows[offset:offset + batch], ensure_ascii=False, separators=(",", ":")).encode()
        request(endpoint, key, payload, "application/json",
                {"Prefer": "resolution=merge-duplicates,return=minimal"})
        print(f"{table}: {min(offset + batch, len(rows))}/{len(rows)}", flush=True)


def build_plans(source: Path, questions: list[dict]) -> list[dict]:
    sys.path.insert(0, str(source))
    from assembly import keys, make_plan  # type: ignore[import-not-found]

    by_id = {q["id"]: q for q in questions}
    blocked: set[tuple] = set()
    tests: list[dict] = []
    for test_id in range(1, 51):
        try:
            plan = make_plan(questions, blocked, test_id * 100003)
        except ValueError:
            # The source bank supports 43 non-repeating medium-route plans;
            # reuse is necessary for the final slots and alternate routes.
            blocked.clear()
            plan = make_plan(questions, blocked, test_id * 100003)
        for section in plan:
            chosen = section.get("questions") or section["paths"]["medium"]
            for qid in chosen:
                blocked.update(keys(by_id[qid]))
        tests.append({"id": test_id, "title": f"Practice Test {test_id:02d}", "plan": plan, "published": True})
        if test_id % 10 == 0:
            print(f"Planned {test_id}/50 tests", flush=True)
    return tests


def upload_image(item: tuple[str, Path], url: str, key: str) -> None:
    name, path = item
    mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
    endpoint = f"{url}/storage/v1/object/{BUCKET}/{quote(name, safe='/')}"
    request(endpoint, key, path.read_bytes(), mime, {"x-upsert": "true"})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--skip-images", action="store_true")
    parser.add_argument("--images-only", action="store_true")
    parser.add_argument("--limit-images", type=int, default=0)
    parser.add_argument("--workers", type=int, default=12)
    parser.add_argument("--prepare-dir", type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    data = source / "data"
    if not (data / "questions.json").exists():
        parser.error("The source's ignored data/ question bank is required")
    url = config("NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    key = config("SUPABASE_SECRET_KEY")
    if not key.startswith("sb_secret_"):
        parser.error("SUPABASE_SECRET_KEY must be a Supabase server key")

    sys.path.insert(0, str(source))
    from assembly import load_book_questions  # type: ignore[import-not-found]
    questions = load_book_questions(data)
    overrides = json.loads((data / "question_overrides.json").read_text())
    questions = [{**question, **overrides.get(question["id"], {})} for question in questions]
    if len(questions) != 6228:
        parser.error(f"Expected 6228 active questions, found {len(questions)}")

    if not args.images_only:
        rows = []
        allowed = {"id", "measure", "topic", "type", "difficulty", "stem", "choices",
                   "answer", "explanation", "passage", "image", "solution_image", "required",
                   "numeric_format", "choices_in_image", "source"}
        for question in questions:
            rows.append({k: v for k, v in question.items() if k in allowed})
        if args.prepare_dir:
            args.prepare_dir.mkdir(parents=True, exist_ok=True)
            for offset in range(0, len(rows), 100):
                (args.prepare_dir / f"mock_questions_{offset // 100:03d}.json").write_text(
                    json.dumps(rows[offset:offset + 100], ensure_ascii=False, separators=(",", ":")))
            tests = build_plans(source, questions)
            for offset in range(0, len(tests), 10):
                (args.prepare_dir / f"mock_tests_{offset // 10:03d}.json").write_text(
                    json.dumps(tests[offset:offset + 10], ensure_ascii=False, separators=(",", ":")))
            print(f"Prepared {len(rows)} questions and {len(tests)} tests", flush=True)
            return
        upload_rows(url, key, "mock_questions", rows)
        upload_rows(url, key, "mock_tests", build_plans(source, questions), batch=10)

    if args.skip_images:
        return
    images = sorted({q[k].lstrip("/") for q in questions
                     for k in ("image", "solution_image") if q.get(k)})
    if args.limit_images:
        images = images[:args.limit_images]
    items = [(name, source / "web" / name) for name in images]
    missing = [name for name, path in items if not path.is_file()]
    if missing:
        parser.error(f"Missing {len(missing)} source images; first: {missing[0]}")
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(upload_image, item, url, key) for item in items]
        done = 0
        for future in as_completed(futures):
            future.result()
            done += 1
            if done % 100 == 0 or done == len(items):
                print(f"images: {done}/{len(items)}", flush=True)


if __name__ == "__main__":
    main()
