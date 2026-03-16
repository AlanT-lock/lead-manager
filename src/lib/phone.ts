/**
 * Normalise un numéro de téléphone vers E.164 (France +33 par défaut).
 * Gère : +3364664..., p:+33663397057, 064664..., 33..., 9 chiffres.
 * À utiliser à l’affichage, à l’import et à la création de leads pour cohérence avec Twilio.
 */
export function normalizePhoneToE164(phone: string): string {
  let s = (phone ?? "").trim();
  if (!s) return s;
  if (s.toLowerCase().startsWith("p:")) s = s.slice(2).trim();
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return s;
  if (s.startsWith("+33") && digits.length >= 11) return "+33" + digits.slice(-9);
  if (s.startsWith("+") && digits.length >= 10) return s;
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  if (digits.length === 10 && digits[0] === "0") return "+33" + digits.slice(1);
  if (digits.length === 9) return "+33" + digits;
  if (digits.length >= 9) return "+33" + digits.slice(-9);
  return s;
}
