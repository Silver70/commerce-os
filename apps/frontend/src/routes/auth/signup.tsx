import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Logo } from '~/components/Logo'
import { signupServerFn } from '~/server/auth'

export const Route = createFileRoute('/auth/signup')({
  component: SignupPage,
})

const SignupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  organizationName: z.string().min(2, 'Organization name is required'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100'

function SignupPage() {
  const navigate = useNavigate()

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
  })
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setServerError(null)

    const result = SignupSchema.safeParse(form)
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0])
        if (!errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }

    setIsPending(true)
    try {
      const { userId, email } = await signupServerFn({
        data: {
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          email: result.data.email,
          password: result.data.password,
          organizationName: result.data.organizationName,
        },
      })
      await navigate({
        to: '/auth/verify-email',
        search: { userId, email },
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
            Create an account
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started right into the world of commerce
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {serverError && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
              {serverError}
            </p>
          )}

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Jane"
                value={form.firstName}
                onChange={set('firstName')}
                className={inputCls}
              />
              {fieldErrors.firstName && (
                <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Smith"
                value={form.lastName}
                onChange={set('lastName')}
                className={inputCls}
              />
              {fieldErrors.lastName && (
                <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Organization name
            </label>
            <input
              id="organizationName"
              type="text"
              placeholder="Acme Inc"
              value={form.organizationName}
              onChange={set('organizationName')}
              className={inputCls}
            />
            {fieldErrors.organizationName && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.organizationName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              className={inputCls}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              className={inputCls}
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              className={inputCls}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/auth/login" className="font-medium text-gray-900 dark:text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
