// Sends the crawl/ingest.requested event to the local Inngest Dev Server.
// Requires: `node scripts/inngest/serve.js` running AND `inngest dev` running.
// Usage: node scripts/inngest/trigger-ingest.js <dataset.json> <tag-prefix>
import path from "node:path";
import "dotenv/config";
import { inngest } from "./client.js";

const [, , datasetPath, tagPrefix] = process.argv;
if (!datasetPath || !tagPrefix) {
  console.error("Usage: node scripts/inngest/trigger-ingest.js <dataset.json> <tag-prefix>");
  process.exit(1);
}

const { ids } = await inngest.send({
  name: "crawl/ingest.requested",
  data: { datasetPath: path.resolve(datasetPath), tagPrefix },
});

console.log(`Sent event, run id(s): ${ids.join(", ")}`);
console.log(`Watch progress in the Inngest Dev Server UI (default http://localhost:8288).`);
