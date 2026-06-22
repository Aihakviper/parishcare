import { frontendConfig } from './config'

const ACCESS_TOKEN_KEY = 'parishcare_access_token'
const REFRESH_TOKEN_KEY = 'parishcare_refresh_token'

interface ApiErrorEnvelope {
  error?: {
    code?: string
    message?: string
  }
  detail?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message)
    this.status = status
    this.code = code
  }
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
}

function saveTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function hasAccessToken(): boolean {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY))
}

async function parseError(response: Response): Promise<ApiError> {
  const fallback = `Request failed with status ${response.status}`
  try {
    const body = (await response.json()) as ApiErrorEnvelope
    return new ApiError(
      body.error?.message ?? body.detail ?? fallback,
      response.status,
      body.error?.code,
    )
  } catch {
    return new ApiError(fallback, response.status)
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
  if (!refreshToken) return false

  const response = await fetch(`${frontendConfig.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!response.ok) {
    clearTokens()
    return false
  }
  saveTokens((await response.json()) as TokenPair)
  return true
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<T> {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${frontendConfig.apiBaseUrl}${path}`, {
    ...init,
    headers,
  })
  if (response.status === 401 && retryOnUnauthorized) {
    if (await refreshAccessToken()) {
      return apiRequest<T>(path, init, false)
    }
  }
  if (!response.ok) {
    throw await parseError(response)
  }
  return response.json() as Promise<T>
}

export async function loginRequest(
  email: string,
  password: string,
  mfaCode: string,
): Promise<TokenPair> {
  const body = new URLSearchParams({ username: email, password })
  const headers = new Headers({
    'Content-Type': 'application/x-www-form-urlencoded',
  })
  if (mfaCode.trim()) {
    headers.set('X-MFA-Code', mfaCode.trim())
  }
  const response = await fetch(`${frontendConfig.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers,
    body,
  })
  if (!response.ok) {
    throw await parseError(response)
  }
  const tokens = (await response.json()) as TokenPair
  saveTokens(tokens)
  return tokens
}
