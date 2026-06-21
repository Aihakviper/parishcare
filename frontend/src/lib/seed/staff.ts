import type { StaffMember } from '../types/domain'
import { parishes } from './parishes'

/** Parish-linked staff for maker–checker enforcement. */
export const staff: StaffMember[] = parishes.flatMap((parish) => [
  {
    id: `officer-${parish.id}`,
    name: parish.welfareOfficerName,
    role: 'officer' as const,
    parishId: parish.id,
  },
  {
    id: `pastor-${parish.id}`,
    name: parish.pastorName,
    role: 'pastor' as const,
    parishId: parish.id,
  },
  {
    id: `checker-${parish.id}`,
    name: parish.welfareOfficerName.includes('Sister')
      ? `Brother ${parish.welfareOfficerName.split(' ').pop()}`
      : `Sister ${parish.pastorName.split(' ').pop()}`,
    role: 'checker' as const,
    parishId: parish.id,
  },
])

export function getStaffById(id: string): StaffMember | undefined {
  return staff.find((s) => s.id === id)
}

export function officersForParish(parishId: string): StaffMember[] {
  return staff.filter((s) => s.parishId === parishId)
}
