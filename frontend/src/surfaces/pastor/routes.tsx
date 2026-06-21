import { Navigate, Route, Routes } from 'react-router-dom'
import { PastorPulse } from './Pulse'
import { PastorApprovals } from './Approvals'

export function PastorRoutes() {
  return (
    <Routes>
      <Route index element={<PastorPulse />} />
      <Route path="approvals" element={<PastorApprovals />} />
      <Route path="*" element={<Navigate to="/pastor" replace />} />
    </Routes>
  )
}
