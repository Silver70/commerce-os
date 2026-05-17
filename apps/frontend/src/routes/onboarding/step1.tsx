import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { Logo } from '~/components/Logo'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export const Route = createFileRoute('/onboarding/step1')({
  component: OnboardingStep1,
})

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? 'w-5 h-2 bg-foreground'
              : n < current
                ? 'w-2 h-2 bg-muted-foreground/50'
                : 'w-2 h-2 bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

function OnboardingStep1() {
  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Set up your store
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us a bit about your business
          </p>
        </div>

        <StepDots current={1} />

        <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest mb-5">
          Step 1 of 3 — Store details
        </p>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="store-name">
              Store name <span className="text-destructive">*</span>
            </Label>
            <Input id="store-name" placeholder="Acme Co." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="store-slug">
              Store URL slug <span className="text-destructive">*</span>
            </Label>
            <Input id="store-slug" placeholder="acme" />
            <p className="text-xs text-muted-foreground pl-0.5">
              acme.mycommerce.com
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select defaultValue="USD">
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">
                Timezone <span className="text-destructive">*</span>
              </Label>
              <Select defaultValue="UTC">
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <Button asChild size="lg" className="w-full">
              <Link to="/onboarding/step2">
                Continue
                <ChevronRightIcon />
              </Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
