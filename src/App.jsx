import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SupplementProvider } from './context/SupplementContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Stack from './pages/Stack'
import AddSupplement from './pages/AddSupplement'
import Schedule from './pages/Schedule'
import Gaps from './pages/Gaps'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <SupplementProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stack" element={<Stack />} />
            <Route path="add" element={<AddSupplement />} />
            <Route path="edit/:id" element={<AddSupplement />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="gaps" element={<Gaps />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SupplementProvider>
  )
}
