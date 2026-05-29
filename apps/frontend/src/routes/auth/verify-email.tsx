import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Logo } from '~/components/Logo'
import { verifyEmailServerFn, resendVerificationServerFn } from '~/server/auth'

const SearchSchema = z.object({
  userId: z.string().catch(''),
  email: z.string().catch(''),
})

export const Route = createFileRoute('/auth/verify-email')({
  validateSearch: SearchSchema,
  component: VerifyEmailPage,
})

const RESEND_COOLDOWN = 30

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100'

function VerifyEmailPage() {
  const { userId, email } = Route.useSearch()
  const navigate = useNavigate()

  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  const [countdown, setCountdown] = React.useState(RESEND_COOLDOWN)
  const [isResending, setIsResending] = React.useState(false)
  const [resendSuccess, setResendSuccess] = React.useState(false)

  // Tick countdown down to 0
  React.useEffect(() => {
    if (countdown <= 0) return
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Enter the 6-digit code from your email')
      return
    }

    setIsPending(true)
    try {
      await verifyEmailServerFn({ data: { userId, code } })
      await navigate({ to: '/auth/login', search: { verified: '1' } })
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setIsPending(false)
    }
  }

  function extractMessage(err: unknown): string {
    if (!(err instanceof Error)) return 'Something went wrong'
    // TanStack Start serialises Zod issues as a JSON array in the message
    try {
      const parsed: unknown = JSON.parse(err.message)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as { message?: string }
        return first.message ?? err.message
      }
    } catch {
      // not JSON — fall through
    }
    return err.message
  }

  async function handleResend() {
    if (!userId) return
    setIsResending(true)
    setResendSuccess(false)
    setError(null)
    try {
      await resendVerificationServerFn({ data: { userId } })
      setResendSuccess(true)
      setCountdown(RESEND_COOLDOWN)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            We sent a 6-digit code to{' '}
            {email ? (
              <span className="font-medium text-gray-900 dark:text-white">{email}</span>
            ) : (
              'your email address'
            )}
            . Enter it below to verify your account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-2.5 text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}

          {resendSuccess && (
            <p className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
              Code resent — check your inbox.
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="w-full rounded-lg bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        {userId ? (
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Didn't receive it?{' '}
            {countdown > 0 ? (
              <span className="text-gray-400 dark:text-gray-500">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="font-medium text-gray-900 dark:text-white hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Missing account info —{' '}
            <Link to="/auth/signup" className="font-medium text-gray-900 dark:text-white hover:underline">
              sign up again
            </Link>
          </p>
        )}

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Wrong account?{' '}
          <Link to="/auth/signup" className="font-medium text-gray-900 dark:text-white hover:underline">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  )
}
