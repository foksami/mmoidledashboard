// Consistent number/date formatting for SSR+CSR — always 'en-US' to avoid hydration mismatches

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US")
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US")
}
