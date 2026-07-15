// Lecture seule. Valide la stratégie de pagination AVANT de l'implémenter dans la page.
//
// Ce n'est pas un test du code de page.tsx : il interroge la base directement. Son rôle est
// de démontrer le bug actuel et de prouver que la stratégie visée (range + ordre total) rend
// bien tous les leads, sans doublon ni manquant.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Le télépro au plus gros volume : c'est lui qui exerce le plafond PostgREST.
const { data: telepro } = await db
  .from("profiles")
  .select("id, full_name")
  .eq("full_name", "Lefebvre Sandra")
  .single();

if (!telepro) {
  console.log("Télépro « Lefebvre Sandra » introuvable — impossible de valider la stratégie.");
  process.exit(1);
}

const { count: reel } = await db
  .from("leads")
  .select("*", { count: "exact", head: true })
  .eq("assigned_to", telepro.id);

console.log(`Télépro : ${telepro.full_name}`);
console.log(`  leads réellement en base : ${reel}`);
console.log("");

// --- 1. Le bug actuel : la requête telle qu'écrite dans page.tsx:33-37, sans range ni limit.
const { data: actuel } = await db
  .from("leads")
  .select("*")
  .eq("assigned_to", telepro.id)
  .order("created_at", { ascending: false });

console.log("--- Requête actuelle (sans pagination) ---");
console.log(`  lignes rendues : ${actuel?.length}`);
const tronque = (actuel?.length ?? 0) < reel;
console.log(tronque
  ? `  BUG : ${reel - actuel.length} leads invisibles (${Math.round((1 - actuel.length / reel) * 100)}%)`
  : `  pas de troncature`);
console.log("");

// --- 2. La stratégie visée : range + ordre total, exactement ce que la page va faire.
const PER = 50;
const vus = [];
let pages = 0;
let total = null;

for (let page = 1; ; page++) {
  const { data, count } = await db
    .from("leads")
    .select("*", { count: "exact" })
    .eq("assigned_to", telepro.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);

  if (total === null) total = count;
  if (!data || data.length === 0) break;
  vus.push(...data.map((l) => l.id));
  pages++;
  if (vus.length >= total) break;
}

const distincts = new Set(vus);
const doublons = vus.length - distincts.size;

console.log("--- Stratégie visée (range + ordre total) ---");
console.log(`  total annoncé      : ${total}`);
console.log(`  pages parcourues   : ${pages}`);
console.log(`  ids collectés      : ${vus.length}`);
console.log(`  ids distincts      : ${distincts.size}`);
console.log(`  doublons           : ${doublons}`);
console.log("");

const problemes = [];
if (total !== reel) problemes.push(`total annoncé ${total} != ${reel} réels`);
if (distincts.size !== reel) problemes.push(`${distincts.size} ids distincts != ${reel} réels (${reel - distincts.size} manquants)`);
if (doublons > 0) problemes.push(`${doublons} doublon(s) : l'ordre n'est pas total`);

if (problemes.length) {
  console.log(">>> ECHEC : la stratégie ne rend pas tous les leads.");
  for (const p of problemes) console.log(`    ${p}`);
  process.exit(1);
}

console.log(`>>> SUCCES : les ${reel} leads sont tous atteignables, sans doublon ni manquant.`);
console.log(`    (contre ${actuel?.length} avec la requête actuelle)`);
