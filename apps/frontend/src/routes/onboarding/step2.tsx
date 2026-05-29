import * as React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, XIcon, CheckIcon } from 'lucide-react'
import { z } from 'zod'
import { Logo } from '~/components/Logo'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { createShippingZoneServerFn, createShippingMethodServerFn } from '~/server/shipping'
import { setOnboardingStepServerFn } from '~/server/stores'

export const Route = createFileRoute('/onboarding/step2')({
  component: OnboardingStep2,
})

const COUNTRY_LIST: Array<{ code: string; name: string }> = [
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
]

const step2Schema = z.object({
  selectedCodes: z.array(z.string()).min(1, 'Select at least one country'),
  flatRate: z.coerce
    .number({ invalid_type_error: 'Enter a valid rate' })
    .nonnegative('Rate cannot be negative'),
  freeThreshold: z.coerce
    .number({ invalid_type_error: 'Enter a valid amount' })
    .nonnegative('Amount cannot be negative'),
})

type Step2Fields = z.infer<typeof step2Schema>
type Step2Errors = Partial<Record<keyof Step2Fields, string>>

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

function CountryMultiSelect({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (codes: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filtered = COUNTRY_LIST.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    )
  }

  function remove(code: string) {
    onChange(selected.filter((c) => c !== code))
  }

  const nameByCode = Object.fromEntries(COUNTRY_LIST.map((c) => [c.code, c.name]))

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-muted-foreground"
            size="lg"
            type="button"
          >
            {selected.length === 0
              ? 'Select countries…'
              : `${selected.length} countr${selected.length === 1 ? 'y' : 'ies'} selected`}
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width)"
          align="start"
        >
          <div className="border-b border-border px-3 py-2">
            <Input
              placeholder="Search countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none h-7 text-sm"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No countries found.
              </p>
            ) : (
              filtered.map((country) => {
                const isSelected = selected.includes(country.code)
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => toggle(country.code)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input'
                      }`}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                    {country.name}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="gap-1 pr-1 h-6 text-xs"
            >
              {nameByCode[code] ?? code}
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`Remove ${nameByCode[code] ?? code}`}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 transition-opacity"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function OnboardingStep2() {
  const navigate = useNavigate()
  const [selectedCodes, setSelectedCodes] = React.useState<string[]>([])
  const [flatRate, setFlatRate] = React.useState('')
  const [freeThreshold, setFreeThreshold] = React.useState('')
  const [errors, setErrors] = React.useState<Step2Errors>({})
  const [apiError, setApiError] = React.useState('')
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setApiError('')

    const result = step2Schema.safeParse({
      selectedCodes,
      flatRate: flatRate === '' ? 0 : flatRate,
      freeThreshold: freeThreshold === '' ? 0 : freeThreshold,
    })
    if (!result.success) {
      const fieldErrors: Step2Errors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof Step2Fields
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setPending(true)
    try {
      const zone = await createShippingZoneServerFn({
        data: {
          name: 'Default Zone',
          countries: result.data.selectedCodes,
          isDefault: true,
        },
      })

      const flatRateCents = Math.round(result.data.flatRate * 100)
      if (flatRateCents > 0) {
        await createShippingMethodServerFn({
          data: {
            zoneId: zone.id,
            name: 'Standard Shipping',
            rateType: 'flat_rate',
            price: flatRateCents,
            isActive: true,
          },
        })
      }

      const thresholdCents = Math.round(result.data.freeThreshold * 100)
      if (thresholdCents > 0) {
        await createShippingMethodServerFn({
          data: {
            zoneId: zone.id,
            name: 'Free Shipping',
            rateType: 'free',
            price: 0,
            minOrderAmount: thresholdCents,
            isActive: true,
          },
        })
      }

      await setOnboardingStepServerFn({ data: { step: '3' } })
      void navigate({ to: '/onboarding/step3' })
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 justify-center px-8 sm:px-16 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold text-foreground">
            Where do you ship?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your default shipping configuration
          </p>
        </div>

        <StepDots current={2} />

        <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest mb-5">
          Step 2 of 3 — Shipping basics
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label>
              Shipping countries / regions <span className="text-destructive">*</span>
            </Label>
            <CountryMultiSelect
              selected={selectedCodes}
              onChange={setSelectedCodes}
            />
            {errors.selectedCodes && (
              <p className="text-xs text-destructive pl-0.5">{errors.selectedCodes}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flat-rate">
              Default flat rate <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-all overflow-hidden dark:bg-input/30">
              <span className="pl-3 text-sm text-muted-foreground select-none">$</span>
              <input
                id="flat-rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={flatRate}
                onChange={(e) => setFlatRate(e.target.value)}
                className="flex-1 h-8 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none">USD</span>
            </div>
            {errors.flatRate && (
              <p className="text-xs text-destructive pl-0.5">{errors.flatRate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="free-shipping" className="justify-between">
              Free shipping above
              <span className="text-xs font-normal text-muted-foreground">optional</span>
            </Label>
            <div className="flex items-center rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-all overflow-hidden dark:bg-input/30">
              <span className="pl-3 text-sm text-muted-foreground select-none">$</span>
              <input
                id="free-shipping"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={freeThreshold}
                onChange={(e) => setFreeThreshold(e.target.value)}
                className="flex-1 h-8 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none">USD</span>
            </div>
            {errors.freeThreshold && (
              <p className="text-xs text-destructive pl-0.5">{errors.freeThreshold}</p>
            )}
          </div>

          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button asChild variant="outline" size="lg">
              <Link to="/onboarding/step1">
                <ChevronLeftIcon />
                Back
              </Link>
            </Button>
            <Button type="submit" size="lg" className="flex-1" disabled={pending}>
              {pending ? 'Saving…' : 'Continue'}
              {!pending && <ChevronRightIcon />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
