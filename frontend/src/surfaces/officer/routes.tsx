import { OfficerQueue } from './Queue'
import { CaseDetail } from './CaseDetail'
import { VerificationFlow } from './VerificationFlow'
import { DisbursementFlow } from './DisbursementFlow'
import { Routes, Route } from 'react-router-dom'

export function OfficerRoutes() {
  return (
    <Routes>
      <Route index element={<OfficerQueue />} />
      <Route path="case/:id" element={<CaseDetail />}>
        <Route path="verify" element={<VerificationFlow />} />
        <Route path="disburse" element={<DisbursementFlow />} />
      </Route>
    </Routes>
  )
}
