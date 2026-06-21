import { ProvincialDashboard } from './Dashboard'
import { ParishComparison } from './ParishComparison'
import { Heatmap } from './Heatmap'
import { ProvincialLayout } from './ProvincialLayout'
import { Route, Routes } from 'react-router-dom'

export function ProvincialRoutes() {
  return (
    <Routes>
      <Route element={<ProvincialLayout />}>
        <Route index element={<ProvincialDashboard />} />
        <Route path="parishes" element={<ParishComparison />} />
        <Route path="map" element={<Heatmap />} />
      </Route>
    </Routes>
  )
}
