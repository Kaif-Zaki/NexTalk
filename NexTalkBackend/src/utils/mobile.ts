export function normalizeMobileNumber(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''

  return hasPlus ? `+${digits}` : digits
}
