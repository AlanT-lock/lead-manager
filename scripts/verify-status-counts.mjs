// Lecture seule : SELECT + RPC stable uniquement.
// Prouve que lead_status_counts() renvoie exactement les mêmes compteurs que la
// boucle de src/app/(app)/layout.tsx, pour l'admin comme pour un télépro.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ms = (t) => Math.round(performance.now() - t);

// Reproduction fidèle de la boucle actuelle (layout.tsx:62-79).
async function loopCounts(assignedTo) {
  const counts = {};
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db.from("leads").select("status, category").range(from, from + PAGE - 1);
    if (assignedTo) q = q.eq("assigned_to", assignedTo);
    const { data: rows, error } = await q;
    if (error) throw error;
    if (!rows || rows.length === 0) break;
    for (const r of rows) {
      counts[r.category] ??= {};
      counts[r.category][r.status] = (counts[r.category][r.status] ?? 0) + 1;
    }
    if (rows.length < PAGE) break;
  }
  return counts;
}

async function rpcCounts(assignedTo) {
  const { data, error } = await db.rpc("lead_status_counts", {
    p_assigned_to: assignedTo ?? null,
  });
  if (error) throw error;
  const counts = {};
  for (const r of data) {
    counts[r.category] ??= {};
    counts[r.category][r.status] = Number(r.count);
  }
  return counts;
}

// Compare uniquement les compteurs non nuls : la boucle n'émet pas de zéros.
function diff(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const problems = [];
  for (const cat of keys) {
    const statuses = new Set([
      ...Object.keys(a[cat] ?? {}),
      ...Object.keys(b[cat] ?? {}),
    ]);
    for (const s of statuses) {
      const x = a[cat]?.[s] ?? 0;
      const y = b[cat]?.[s] ?? 0;
      if (x !== y) problems.push(`${cat}/${s}: boucle=${x} rpc=${y}`);
    }
  }
  return problems;
}

async function check(label, assignedTo) {
  let t = performance.now();
  const loop = await loopCounts(assignedTo);
  const loopMs = ms(t);

  t = performance.now();
  const rpc = await rpcCounts(assignedTo);
  const rpcMs = ms(t);

  const problems = diff(loop, rpc);
  const total = Object.values(loop).flatMap((c) => Object.values(c)).reduce((s, n) => s + n, 0);

  console.log(`\n=== ${label} ===`);
  console.log(`  leads comptés : ${total}`);
  console.log(`  boucle : ${loopMs}ms   rpc : ${rpcMs}ms`);
  if (problems.length) {
    console.log(`  ECHEC — ${problems.length} compteur(s) divergent(s) :`);
    for (const p of problems) console.log(`    ${p}`);
    return false;
  }
  console.log(`  OK — compteurs identiques`);
  return true;
}

// Un télépro réel, pour exercer la branche p_assigned_to renseigné.
const { data: telepro } = await db
  .from("profiles")
  .select("id, email")
  .eq("role", "telepro")
  .is("deleted_at", null)
  .limit(1)
  .single();

const okAdmin = await check("ADMIN / SECRETAIRE (p_assigned_to = null)", null);
const okTelepro = telepro
  ? await check(`TELEPRO ${telepro.email} (p_assigned_to = ${telepro.id})`, telepro.id)
  : (console.log("\nAucun télépro actif : branche p_assigned_to non vérifiée"), false);

console.log("");
if (okAdmin && okTelepro) {
  console.log(">>> SUCCES : les deux chemins donnent des compteurs identiques.");
} else {
  console.log(">>> ECHEC : ne pas déployer, les compteurs divergent.");
  process.exit(1);
}
