export type ParsedRow = { date: string; description: string; amount: number; type: "CREDIT" | "DEBIT" };

export function isValidIsoDate(s: string): boolean {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
  } catch {
    return false;
  }
}

function parseDate(raw: string): string | null {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = m ? `${m[3]}-${m[2]}-${m[1]}` : raw;
  return isValidIsoDate(iso) ? iso : null;
}

function parseAmount(raw: string): number | null {
  let s = raw.replace(/[R$\s]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return s !== "" && Number.isFinite(n) && n !== 0 ? n : null;
}

/** Formato: data;descrição;valor (valor negativo = despesa). A 1ª linha costuma ser o cabeçalho e não conta como erro. */
export function parseCsv(csv: string): { rows: ParsedRow[]; skipped: number } {
  const rows: ParsedRow[] = [];
  let skipped = 0;
  csv.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const sep = line.includes(";") ? ";" : ",";
    const [d, desc, ...rest] = line.split(sep);
    const date = parseDate((d ?? "").trim());
    const amount = parseAmount(rest.join(sep));
    const description = (desc ?? "").trim();
    if (date && amount !== null && description) {
      rows.push({ date, description: description.slice(0, 255), amount: Math.abs(amount), type: amount < 0 ? "DEBIT" : "CREDIT" });
    } else if (i > 0) skipped++;
  });
  return { rows, skipped };
}
