import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SupplementProvider } from './context/SupplementContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stack from './pages/Stack'
import AddSupplement from './pages/AddSupplement'
import Schedule from './pages/Schedule'
import Gaps from './pages/Gaps'

export default function App() {
  return (
    <SupplementProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stack" element={<Stack />} />
            <Route path="add" element={<AddSupplement />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="gaps" element={<Gaps />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SupplementProvider>
  )
}
