import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon, ChevronsUpDownIcon, XIcon, CheckIcon } from 'lucide-react'
import { Logo } from '~/components/Logo'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'

export const Route = createFileRoute('/onboarding/step2')({
  component: OnboardingStep2,
})

const COUNTRIES = [
  'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada',
  'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic',
  'Denmark', 'Egypt', 'Finland', 'France', 'Germany',
  'Ghana', 'Greece', 'Hungary', 'India', 'Indonesia',
  'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya',
  'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Singapore',
  'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
  'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates',
  'United Kingdom', 'United States', 'Vietnam',
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

function CountryMultiSelect({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(country: string) {
    onChange(
      selected.includes(country)
        ? selected.filter((c) => c !== country)
        : [...selected, country]
    )
  }

  function remove(country: string) {
    onChange(selected.filter((c) => c !== country))
  }

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
                const isSelected = selected.includes(country)
                return (
                  <button
                    key={country}
                    type="button"
                    onClick={() => toggle(country)}
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
                    {country}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((country) => (
            <Badge
              key={country}
              variant="secondary"
              className="gap-1 pr-1 h-6 text-xs"
            >
              {country}
              <button
                type="button"
                onClick={() => remove(country)}
                aria-label={`Remove ${country}`}
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
  const [selectedCountries, setSelectedCountries] = React.useState<string[]>([])

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

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Shipping countries / regions <span className="text-destructive">*</span>
            </Label>
            <CountryMultiSelect
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />
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
                className="flex-1 h-8 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none">USD</span>
            </div>
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
                className="flex-1 h-8 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none">USD</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button asChild variant="outline" size="lg">
              <Link to="/onboarding/step1">
                <ChevronLeftIcon />
                Back
              </Link>
            </Button>
            <Button asChild size="lg" className="flex-1">
              <Link to="/onboarding/step3">
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
