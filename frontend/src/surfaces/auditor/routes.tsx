import { AuditorDashboard } from './Dashboard'
import { ChainExplorer } from './ChainExplorer'
import { AuditReport } from './AuditReport'
import { Route, Routes } from 'react-router-dom'
import { AuditorLayout } from './AuditorLayout'

export function AuditorRoutes() {
  return (
    <Routes>
      <Route element={<AuditorLayout />}>
        <Route index element={<AuditorDashboard />} />
        <Route path="chain" element={<ChainExplorer />} />
        <Route path="report" element={<AuditReport />} />
      </Route>
    </Routes>
  )
}
