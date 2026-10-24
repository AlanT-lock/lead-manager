import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeAddress } from "@/lib/geocode";
import {
  parseSavInput,
  SAV_MAX_PHOTO_BYTES,
  SAV_MAX_PHOTOS,
  SAV_PHOTOS_BUCKET,
  type SavRequest,
  type SavRequestWithUrls,
} from "@/lib/sav";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function extractPhotoFiles(formData: FormData): File[] {
  return formData.getAll("photos").filter((v): v is File => v instanceof File && v.size > 0);
}

export function validatePhotos(files: File[], alreadyStored = 0): string | null {
  if (files.length + alreadyStored > SAV_MAX_PHOTOS) return `Maximum ${SAV_MAX_PHOTOS} photos par demande.`;
  for (const f of files) {
    if (!EXT_BY_TYPE[f.type]) return "Seules les images (JPEG, PNG, WebP, HEIC) sont acceptées.";
    if (f.size > SAV_MAX_PHOTO_BYTES) return "Une photo dépasse 5 Mo.";
  }
  return null;
}

/** Envoie les photos dans le bucket privé et renvoie leurs chemins de stockage. */
export async function uploadSavPhotos(
  admin: SupabaseClient,
  savId: string,
  files: File[]
): Promise<{ paths: string[]; error?: string }> {
  const paths: string[] = [];
  for (const file of files) {
    const path = `${savId}/${randomUUID()}.${EXT_BY_TYPE[file.type]}`;
    const { error } = await admin.storage
      .from(SAV_PHOTOS_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
    if (error) {
      // Pas de photo orpheline si l'envoi échoue à mi-parcours.
      if (paths.length) await admin.storage.from(SAV_PHOTOS_BUCKET).remove(paths);
      return { paths: [], error: error.message };
    }
    paths.push(path);
  }
  return { paths };
}

/** Crée une demande SAV depuis un FormData (formulaire public ou interne). */
export async function createSavFromFormData(
  admin: SupabaseClient,
  formData: FormData,
  origin: { source: "client" | "interne"; createdBy?: string }
): Promise<{ ok: true; sav: SavRequest } | { ok: false; error: string; status: number }> {
  const parsed = parseSavInput(Object.fromEntries(formData.entries()));
  if (!parsed.ok) return { ok: false, error: parsed.error, status: 400 };

  const files = extractPhotoFiles(formData);
  const photoError = validatePhotos(files);
  if (photoError) return { ok: false, error: photoError, status: 400 };

  const input = parsed.data;
  // Adresse saisie sans choisir de suggestion : on tente de la géocoder pour la carte.
  if (input.lat === null || input.lng === null) {
    const geo = await geocodeAddress(input.address);
    if (geo) {
      input.lat = geo.lat;
      input.lng = geo.lng;
    }
  }

  const id = randomUUID();
  const { paths, error: uploadError } = await uploadSavPhotos(admin, id, files);
  if (uploadError) return { ok: false, error: "Échec de l'envoi des photos.", status: 500 };

  const { data, error } = await admin
    .from("sav_requests")
    .insert({ id, ...input, photos: paths, source: origin.source, created_by: origin.createdBy ?? null })
    .select()
    .single();

  if (error || !data) {
    if (paths.length) await admin.storage.from(SAV_PHOTOS_BUCKET).remove(paths);
    console.error("[sav] insertion en échec", error);
    return { ok: false, error: "Impossible d'enregistrer la demande.", status: 500 };
  }
  return { ok: true, sav: data as SavRequest };
}

/** Ajoute à chaque demande les URLs signées (1 h) de ses photos. */
export async function withPhotoUrls(admin: SupabaseClient, rows: SavRequest[]): Promise<SavRequestWithUrls[]> {
  const allPaths = rows.flatMap((r) => r.photos ?? []);
  const urlByPath = new Map<string, string>();
  if (allPaths.length) {
    const { data } = await admin.storage.from(SAV_PHOTOS_BUCKET).createSignedUrls(allPaths, 3600);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
    }
  }
  return rows.map((r) => ({
    ...r,
    photos: r.photos ?? [],
    photo_urls: (r.photos ?? []).map((p) => urlByPath.get(p) ?? ""),
  }));
}

/** Vérifie que l'appelant est connecté en admin ou secrétaire. */
export async function requireSavStaff(
  getUser: () => Promise<{ id: string } | null>,
  admin: SupabaseClient
): Promise<{ userId: string } | { error: string; status: number }> {
  const user = await getUser();
  if (!user) return { error: "Non autorisé", status: 401 };
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role?.toString().trim().toLowerCase();
  if (role !== "admin" && role !== "secretaire") return { error: "Accès refusé", status: 403 };
  return { userId: user.id };
}
