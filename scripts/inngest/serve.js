import "dotenv/config";
import http from "node:http";
import { serve } from "inngest/node";
import { inngest } from "./client.js";
import { ingestCrawlDataset } from "./functions.js";

const PORT = process.env.INNGEST_SERVE_PORT ?? 3210;

const server = http.createServer(
  serve({ client: inngest, functions: [ingestCrawlDataset] })
);
server.listen(PORT, () => {
  console.log(`Inngest functions served on http://localhost:${PORT}/api/inngest`);
  console.log(`Run 'inngest dev' in another terminal to start the local Dev Server,`);
  console.log(`then trigger with: node scripts/inngest/trigger-ingest.js <dataset.json> <tag-prefix>`);
});
