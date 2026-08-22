import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "data", "credentials.json");
const indexPath = path.join(root, "index.html");
const startMarker = "              <!-- credentials:start -->";
const endMarker = "              <!-- credentials:end -->";
const checkOnly = process.argv.includes("--check");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const credentials = JSON.parse(await readFile(manifestPath, "utf8"));
const ids = new Set();

for (const credential of credentials) {
  for (const field of ["id", "kind", "title", "issuer", "href", "preview", "alt"]) {
    if (!credential[field]) throw new Error(`Falta ${field} en una credencial.`);
  }
  if (ids.has(credential.id)) throw new Error(`ID duplicado: ${credential.id}`);
  ids.add(credential.id);
  await access(path.join(root, credential.href));
  await access(path.join(root, credential.preview));
}

const renderCredential = (credential) => {
  const badgeClass = credential.badge ? " credential-preview-badge" : "";
  const itemName = credential.badge ? "insignia" : "certificado";
  const metadata = [credential.issuer, credential.date].filter(Boolean).join(" · ");

  return [
    "              <article class=\"credential-slide\">",
    `                <a class="credential-preview${badgeClass}" href="${escapeHtml(credential.href)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${itemName} ${escapeHtml(credential.title)}">`,
    `                  <img src="${escapeHtml(credential.preview)}" width="1000" height="707" loading="lazy" alt="${escapeHtml(credential.alt)}">`,
    `                  <span>Ver ${itemName} ↗</span>`,
    "                </a>",
    `                <div class="credential-slide-body"><p>${escapeHtml(credential.kind)}</p><h4>${escapeHtml(credential.title)}</h4><span>${escapeHtml(metadata)}</span></div>`,
    "              </article>"
  ].join("\n");
};

const original = await readFile(indexPath, "utf8");
const start = original.indexOf(startMarker);
const end = original.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) throw new Error("No se encontraron los marcadores de credenciales en index.html.");

const badges = credentials.filter((credential) => credential.badge).length;
const documents = credentials.length - badges;
const summary = `Explora ${documents} documentos${badges ? ` y ${badges === 1 ? "una insignia" : `${badges} insignias`}` : ""}. Usa las flechas, desliza horizontalmente o navega con el teclado.`;
const block = `${startMarker}\n${credentials.map(renderCredential).join("\n")}`;
let generated = original.slice(0, start) + block + "\n" + original.slice(end);
generated = generated.replace(/Explora \d+ documentos(?: y (?:una|\d+) insignias?)?\. Usa las flechas, desliza horizontalmente o navega con el teclado\./, summary);
generated = generated.replace(/<span data-carousel-total>\d+<\/span>/, `<span data-carousel-total>${credentials.length}</span>`);

if (checkOnly) {
  if (generated !== original) {
    console.error("Las credenciales generadas no coinciden con data/credentials.json. Ejecuta: node scripts/sync-credentials.mjs");
    process.exit(1);
  }
  console.log(`Credenciales verificadas: ${credentials.length}.`);
} else {
  await writeFile(indexPath, generated, "utf8");
  console.log(`Credenciales sincronizadas: ${credentials.length}.`);
}
