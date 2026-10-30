import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from './AppLayout'
import { HomePage } from './HomePage'
import { SignInPage } from './SignInPage'
import { SignUpPage } from './SignUpPage'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/signup', element: <SignUpPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
