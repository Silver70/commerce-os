import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuth } from '@workos/authkit-tanstack-react-start'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const auth = await getAuth()
    if (auth.user) throw redirect({ to: '/admin/dashboard' })
    throw redirect({ href: '/api/auth/sign-in' })
  },
})
