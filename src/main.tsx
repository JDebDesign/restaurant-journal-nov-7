import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { auth } from './data'
import { registerSW } from 'virtual:pwa-register'
import { ToastProvider } from './components/ui/Toast'
import './index.css'
import { router } from './routes'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } })

registerSW({ immediate: true })

// Restore the stored session (and finish any magic-link sign-in) before the first render so routes don't flash the sign-in page.
await auth.init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
