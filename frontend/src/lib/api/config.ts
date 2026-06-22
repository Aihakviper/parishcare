type DataSource = 'api' | 'mock'
type RequiredEnv =
  | 'VITE_DATA_SOURCE'
  | 'VITE_API_BASE_URL'
  | 'VITE_API_TIMEOUT_MS'

function requiredEnv(name: RequiredEnv): string {
  const value = import.meta.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} must be configured in frontend/.env`)
  }
  return value
}

const dataSource = requiredEnv('VITE_DATA_SOURCE')
const apiTimeoutMs = Number(requiredEnv('VITE_API_TIMEOUT_MS'))

if (dataSource !== 'api' && dataSource !== 'mock') {
  throw new Error('VITE_DATA_SOURCE must be either "api" or "mock"')
}
if (!Number.isInteger(apiTimeoutMs) || apiTimeoutMs <= 0) {
  throw new Error('VITE_API_TIMEOUT_MS must be a positive integer')
}

export const frontendConfig = {
  dataSource: dataSource as DataSource,
  apiBaseUrl: requiredEnv('VITE_API_BASE_URL').replace(/\/+$/, ''),
  apiTimeoutMs,
}

export const usesBackendApi = frontendConfig.dataSource === 'api'
