import { Inngest } from "inngest";

// Local dev only (no signing key / Inngest Cloud) — run `inngest dev` to
// point the local Dev Server at this app's serve endpoint.
export const inngest = new Inngest({ id: "ircc-whatsapp-bot", isDev: true });
