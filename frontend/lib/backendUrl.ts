export function publicBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  return url || ''
}

