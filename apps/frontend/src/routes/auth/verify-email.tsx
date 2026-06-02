import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/verify-email')({
  beforeLoad: () => {
    throw redirect({ href: '/api/auth/sign-in' })
  },
})
