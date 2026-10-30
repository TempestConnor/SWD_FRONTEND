import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from './AppLayout'
import { CpuGamePage } from './CpuGamePage'
import { HistoryGamePage } from './HistoryGamePage'
import { HomePage } from './HomePage'
import { InvitePage } from './InvitePage'
import { JoinInvitePage } from './JoinInvitePage'
import { LocalGamePage } from './LocalGamePage'
import { MatchHistoryPage } from './MatchHistoryPage'
import { OnlineGamePage } from './OnlineGamePage'
import { SignInPage } from './SignInPage'
import { SignUpPage } from './SignUpPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/signup', element: <SignUpPage /> },
      { path: '/local', element: <LocalGamePage /> },
      { path: '/cpu', element: <CpuGamePage /> },
      { path: '/invite', element: <InvitePage /> },
      { path: '/invite/:token', element: <JoinInvitePage /> },
      { path: '/games/:gameId', element: <OnlineGamePage /> },
      { path: '/history', element: <MatchHistoryPage /> },
      { path: '/history/:gameId', element: <HistoryGamePage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
