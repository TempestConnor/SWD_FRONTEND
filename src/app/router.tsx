import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from './AppLayout'
import { CpuGamePage } from './CpuGamePage'
import { HomePage } from './HomePage'
import { LocalGamePage } from './LocalGamePage'
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
    ],
  },
]

export const router = createBrowserRouter(routes)
