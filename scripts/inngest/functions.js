import fs from "node:fs";
import pg from "pg";
import { inngest } from "./client.js";
import { chunkMarkdown, topicFor, titleFor } from "../chunking.js";

const pool = new pg.Pool({
  connectionString: process.env.RAGDB_URI ?? "postgresql://mcp@127.0.0.1:5433/ragdb",
});

/**
 * Durable version of scripts/ingest-crawl.js. Each page is its own
 * `step.run` — Inngest memoizes completed steps, so if the run crashes or
 * is retried partway through a 300-page dataset, already-ingested pages
 * are NOT redone; only the page that failed (and anything after it)
 * re-runs. The plain CLI script has no such protection — a crash midway
 * means starting over from page 0 (each rerun is idempotent since it
 * clears the tag prefix first, but you still repeat all the embedding
 * work already done).
 *
 * step.run only memoizes on successful completion — a step killed
 * mid-execution (not yet returned) is NOT memoized and retries from its
 * own top. Verified this the hard way: a real crash-mid-run test produced
 * duplicate rows specifically for the largest/slowest pages (the ones
 * statistically most likely to still be mid-insert-loop at kill time).
 * Fix: each page's chunk inserts run in a single transaction, so a step
 * killed partway through rolls back cleanly — retry starts from zero
 * rows for that page, not a partial set plus a full redo.
 *
 * Trigger: send event "crawl/ingest.requested" with
 *   { datasetPath: "/abs/path/to/dataset.json", tagPrefix: "ircc-crawl" }
 */
export const ingestCrawlDataset = inngest.createFunction(
  { id: "ingest-crawl-dataset", retries: 3, triggers: { event: "crawl/ingest.requested" } },
  async ({ event, step }) => {
    const { datasetPath, tagPrefix } = event.data;

    const items = await step.run("load-dataset", async () => {
      const raw = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
      return Array.isArray(raw) ? raw : raw.items;
    });

    await step.run("clear-existing-rows", async () => {
      const { rowCount } = await pool.query(
        "DELETE FROM docs WHERE metadata->>'source' LIKE $1",
        [`${tagPrefix}-%`]
      );
      return { cleared: rowCount };
    });

    let totalChunks = 0;
    let skippedPages = 0;

    for (let p = 0; p < items.length; p++) {
      const item = items[p];
      const result = await step.run(`ingest-page-${p}`, async () => {
        const markdown = item.markdown ?? "";
        if (markdown.trim().length < 100) return { skipped: true, chunks: 0 };

        const chunks = chunkMarkdown(markdown);
        const title = titleFor(item, markdown);
        const source = `${tagPrefix}-${topicFor(item.url)}`;

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (let c = 0; c < chunks.length; c++) {
            const content = chunks[c];
            const metadata = { source, url: item.url, title, chunk: c };
            await client.query(
              "INSERT INTO docs (content, metadata, embedding) VALUES ($1, $2::jsonb, embed($1))",
              [content, JSON.stringify(metadata)]
            );
          }
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
        return { skipped: false, chunks: chunks.length };
      });

      if (result.skipped) skippedPages++;
      else totalChunks += result.chunks;
    }

    return { totalPages: items.length, totalChunks, skippedPages };
  }
);
