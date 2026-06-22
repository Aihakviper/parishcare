type DataSource = 'api' | 'mock'

const dataSource = (import.meta.env.VITE_DATA_SOURCE?.trim() || 'mock') as DataSource
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:8000'
).replace(/\/+$/, '')

if (dataSource !== 'api' && dataSource !== 'mock') {
  throw new Error('VITE_DATA_SOURCE must be either "api" or "mock"')
}

export const frontendConfig = {
  dataSource,
  apiBaseUrl,
}

export const usesBackendApi = frontendConfig.dataSource === 'api'
