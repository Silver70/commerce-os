import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/login')({
  beforeLoad: () => {
    throw redirect({ href: '/api/auth/sign-in' })
  },
})
