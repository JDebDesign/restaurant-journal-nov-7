import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Asked from './pages/Asked'
import AuthCallback from './pages/AuthCallback'
import Home from './pages/Home'
import Log from './pages/Log'
import Places from './pages/Places'
import Rec from './pages/Rec'
import RecOgCard from './pages/RecOgCard'
import Settings from './pages/Settings'
import SignIn from './pages/SignIn'
import VisitDetail from './pages/VisitDetail'
import Want from './pages/Want'

export const router = createBrowserRouter([
  { path: '/sign-in', element: <SignIn /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  // Public, no account needed
  { path: '/r/:slug', element: <Rec /> },
  { path: '/r/:slug/card', element: <RecOgCard /> },
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'log', element: <Log /> },
      { path: 'visits/:id', element: <VisitDetail /> },
      { path: 'places', element: <Places /> },
      { path: 'want', element: <Want /> },
      { path: 'asked', element: <Asked /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
