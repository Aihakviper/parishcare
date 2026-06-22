type DataSource = 'api' | 'mock'

const dataSource = (
  import.meta.env.VITE_DATA_SOURCE?.trim() || 'mock'
) as DataSource
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  'http://127.0.0.1:8000/api/v1'
).replace(/\/+$/, '')
const apiTimeoutMs = Number(
  import.meta.env.VITE_API_TIMEOUT_MS?.trim() || '10000',
)

if (dataSource !== 'api' && dataSource !== 'mock') {
  throw new Error('VITE_DATA_SOURCE must be either "api" or "mock"')
}
if (!Number.isInteger(apiTimeoutMs) || apiTimeoutMs <= 0) {
  throw new Error('VITE_API_TIMEOUT_MS must be a positive integer')
}

export const frontendConfig = {
  dataSource,
  apiBaseUrl,
  apiTimeoutMs,
}

export const usesBackendApi = frontendConfig.dataSource === 'api'
