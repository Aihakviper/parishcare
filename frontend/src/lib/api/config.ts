type DataSource = 'api' | 'mock'

function requiredEnv(name: 'VITE_DATA_SOURCE' | 'VITE_API_BASE_URL'): string {
  const value = import.meta.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} must be configured in frontend/.env`)
  }
  return value
}

const dataSource = requiredEnv('VITE_DATA_SOURCE')

if (dataSource !== 'api' && dataSource !== 'mock') {
  throw new Error('VITE_DATA_SOURCE must be either "api" or "mock"')
}

export const frontendConfig = {
  dataSource: dataSource as DataSource,
  apiBaseUrl: requiredEnv('VITE_API_BASE_URL').replace(/\/+$/, ''),
}

export const usesBackendApi = frontendConfig.dataSource === 'api'
