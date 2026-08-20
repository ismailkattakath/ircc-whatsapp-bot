// Ingests an apify/website-content-crawler dataset export (JSON array of
// {url, markdown}) into the ragdb RAG store, chunked on paragraph
// boundaries per the rag skill's guidance (~500-1000 chars, slight
// overlap). Each page is tagged with a per-topic source (derived from its
// URL path under /services/), not one flat tag — graph.js's PR/citizenship/
// topic branches filter retrieval by these exact source tags, so a single
// flat tag would make that scoping impossible. All rows under the given
// --tag-prefix are cleared first (across all derived per-topic tags).
//
// Usage: node scripts/ingest-crawl.js <path-to-dataset.json> <tag-prefix>
// For a durable, resumable version (retries per page, survives a crash
// midway through a large dataset without redoing already-ingested pages),
// see scripts/inngest/ — same chunking logic, shared via scripts/chunking.js.
import fs from "node:fs";
import pg from "pg";
import { chunkMarkdown, topicFor, titleFor } from "./chunking.js";

const [, , datasetPath, tagPrefix] = process.argv;
if (!datasetPath || !tagPrefix) {
  console.error("Usage: node scripts/ingest-crawl.js <dataset.json> <tag-prefix>");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.RAGDB_URI ?? "postgresql://mcp@127.0.0.1:5433/ragdb",
});

async function main() {
  const raw = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  const items = Array.isArray(raw) ? raw : raw.items;
  console.log(`Loaded ${items.length} pages from ${datasetPath}`);

  await pool.query("DELETE FROM docs WHERE metadata->>'source' LIKE $1", [`${tagPrefix}-%`]);
  console.log(`Cleared existing rows with source LIKE "${tagPrefix}-%"`);

  let totalChunks = 0;
  let skippedPages = 0;
  const startTime = Date.now();

  for (let p = 0; p < items.length; p++) {
    const item = items[p];
    const markdown = item.markdown ?? "";
    if (markdown.trim().length < 100) {
      skippedPages++;
      continue;
    }

    const chunks = chunkMarkdown(markdown);
    const title = titleFor(item, markdown);
    const source = `${tagPrefix}-${topicFor(item.url)}`;

    for (let c = 0; c < chunks.length; c++) {
      const content = chunks[c];
      const metadata = { source, url: item.url, title, chunk: c };
      await pool.query(
        "INSERT INTO docs (content, metadata, embedding) VALUES ($1, $2::jsonb, embed($1))",
        [content, JSON.stringify(metadata)]
      );
      totalChunks++;
    }

    if ((p + 1) % 20 === 0 || p === items.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`[${p + 1}/${items.length} pages] ${totalChunks} chunks inserted so far (${elapsed}s elapsed)`);
    }
  }

  console.log(`Done. ${totalChunks} chunks inserted, ${skippedPages} pages skipped (too short).`);
  await pool.end();
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
