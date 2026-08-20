import "dotenv/config";
import { retrieve, closeDb } from "./db.js";
import { synthesize } from "./llm.js";

const question = process.argv[2] ?? "How to come to Canada?";

const chunks = await retrieve(question);
console.log(`Retrieved ${chunks.length} chunk(s), top similarity: ${chunks[0]?.similarity?.toFixed(3) ?? "n/a"}`);

const answer = await synthesize(question, chunks);
console.log("\n--- Answer ---\n");
console.log(answer);

await closeDb();
