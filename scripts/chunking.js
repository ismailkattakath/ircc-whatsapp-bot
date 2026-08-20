// Shared by scripts/ingest-crawl.js (plain CLI) and scripts/inngest/functions.js
// (durable version) — keep both ingestion paths consistent.

export const TOPIC_MAP = {
  "canadian-citizenship": "citizenship",
  "immigrate-canada": "pr",
  "study-canada": "study",
  "work-canada": "work",
  "visit-canada": "visit",
  refugees: "refugees",
  "canadian-passports": "passports",
};

export function topicFor(url) {
  const match = url.match(/\/services\/([^/]+)/);
  const segment = match?.[1];
  return TOPIC_MAP[segment] ?? "other";
}

const TARGET_CHUNK_CHARS = 800;
const OVERLAP_PARAGRAPHS = 1;

export function chunkMarkdown(markdown) {
  const paragraphs = markdown
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    if (currentLen > 0 && currentLen + para.length > TARGET_CHUNK_CHARS) {
      chunks.push(current.join("\n\n"));
      current = current.slice(-OVERLAP_PARAGRAPHS);
      currentLen = current.reduce((n, p) => n + p.length, 0);
    }
    current.push(para);
    currentLen += para.length;
  }
  if (current.length) chunks.push(current.join("\n\n"));

  return chunks.filter((c) => c.length >= 60); // drop near-empty fragments
}

export function titleFor(item, markdown) {
  return (
    item["metadata.title"] ??
    item.metadata?.title ??
    markdown.match(/^#\s+(.+)$/m)?.[1] ??
    ""
  );
}
