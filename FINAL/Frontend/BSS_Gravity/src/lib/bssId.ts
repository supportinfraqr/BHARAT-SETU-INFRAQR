const BSS_ID_PATTERN = /^BSS([2-9]\d{10})(\d)$/;
// Current worker ID format: "BSS-W" + 10 random alphanumeric chars
// (the charset is A-Z / 2-9, no I/O/0/1). Legacy PK-derived numeric IDs
// (BSS-W + 10 digits) are still accepted so old cards keep working.
const WORKER_BSS_ID_PATTERN = /^BSS-W[A-Z0-9]{10}$/;
const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]] as const;
const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]] as const;
const inverse = [0,4,3,2,1,5,6,7,8,9] as const;

export function calculateVerhoeffDigit(payload: string): string {
  if (!/^\d+$/.test(payload)) throw new Error("Checksum payload must contain digits only.");
  let checksum = 0;
  [...payload].reverse().forEach((character, index) => { checksum = d[checksum][p[(index + 1) % 8][Number(character)]]; });
  return String(inverse[checksum]);
}

export function isValidBSSID(value: string): boolean {
  if (WORKER_BSS_ID_PATTERN.test(value)) return true;
  const match = BSS_ID_PATTERN.exec(value);
  if (!match) return false;
  let checksum = 0;
  [...`${match[1]}${match[2]}`].reverse().forEach((character, index) => { checksum = d[checksum][p[index % 8][Number(character)]]; });
  return checksum === 0;
}

export function formatBSSID(value: string): string {
  if (WORKER_BSS_ID_PATTERN.test(value)) return value;
  return value.replace(/^(BSS)(\d{4})(\d{4})(\d{4})$/, "$1 $2 $3 $4");
}
