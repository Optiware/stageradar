// Chiffrement des sauvegardes sur l'appareil, avec l'API Web Crypto du navigateur : une clé AES-GCM
// de 256 bits tirée du mot de passe par PBKDF2-SHA-256. Le mot de passe ne quitte jamais l'appareil.

/** Itérations PBKDF2-HMAC-SHA256 recommandées par l'OWASP (Password Storage Cheat Sheet). */
const ITERATIONS = 600_000;

function versBase64(octets: Uint8Array): string {
  let texte = '';
  for (let rang = 0; rang < octets.length; rang += 0x8000) {
    texte += String.fromCharCode(...octets.subarray(rang, rang + 0x8000));
  }
  return btoa(texte);
}

function depuisBase64(texte: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(texte), (caractere) => caractere.charCodeAt(0));
}

export function nouveauSel(): string {
  return versBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/** Clé AES-GCM non exportable : elle peut être gardée sur l'appareil sans révéler le mot de passe. */
export async function cleDepuisMotDePasse(motDePasse: string, sel: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(motDePasse),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: depuisBase64(sel), iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function chiffrer(
  cle: CryptoKey,
  texte: string,
): Promise<{ iv: string; donnees: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cle,
    new TextEncoder().encode(texte),
  );
  return { iv: versBase64(iv), donnees: versBase64(new Uint8Array(chiffre)) };
}

/** Déchiffre ; échoue (exception) si la clé ne correspond pas ou si le contenu a été modifié. */
export async function dechiffrer(cle: CryptoKey, iv: string, donnees: string): Promise<string> {
  const clair = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: depuisBase64(iv) },
    cle,
    depuisBase64(donnees),
  );
  return new TextDecoder().decode(clair);
}
