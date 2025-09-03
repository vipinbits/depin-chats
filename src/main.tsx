import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AssignModel from './pages/AssignModel.tsx'

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/assign-model', element: <AssignModel /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
