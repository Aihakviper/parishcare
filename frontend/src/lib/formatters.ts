/** Format kobo as whole-naira display string. */
export function formatNaira(kobo: number): string {
  const naira = Math.round(kobo / 100)
  return `₦${naira.toLocaleString('en-NG')}`
}

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+234 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 13 && digits.startsWith('234')) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`
  }
  return raw
}
