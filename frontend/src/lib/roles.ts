export type StewardRole = 'resident' | 'artisan' | 'console'

export interface RoleDefinition {
  id: StewardRole
  label: string
  navLabel: string
  persona: string
  contextLabel: string
  homePath: string
}

export const ROLES: RoleDefinition[] = [
  {
    id: 'resident',
    label: 'Resident',
    navLabel: 'Resident app',
    persona: 'Funmi Adebanjo',
    contextLabel: 'RCCG Camp · Phase 2',
    homePath: '/resident',
  },
  {
    id: 'artisan',
    label: 'Artisan',
    navLabel: 'Artisan app',
    persona: 'Tunde Akinwale',
    contextLabel: 'Trusted Steward · Generator tech',
    homePath: '/artisan',
  },
  {
    id: 'console',
    label: 'Console',
    navLabel: 'Camp console',
    persona: 'Pastor Adekunle Olatunde',
    contextLabel: 'Camp Administrator · RCCG Mowe',
    homePath: '/console',
  },
]

export function getRole(id: StewardRole): RoleDefinition {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}

export function nextRole(current: StewardRole): StewardRole {
  const i = ROLES.findIndex((r) => r.id === current)
  return ROLES[(i + 1) % ROLES.length].id
}

export function roleToastMessage(role: StewardRole): string {
  const def = getRole(role)
  if (role === 'artisan') {
    return `Now viewing as ${def.persona} — Artisan (Trusted)`
  }
  if (role === 'console') {
    return `Now viewing as ${def.persona} — Camp Administrator`
  }
  return `Now viewing as ${def.persona} — Resident`
}
