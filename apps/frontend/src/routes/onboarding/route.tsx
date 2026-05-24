import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingLayout,
})

function OnboardingLayout() {
  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col">
        <img
          src="/images/auth-hero.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-12 left-10 right-10">
          <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-3">
            Commerce OS
          </p>
          <h2 className="text-white text-2xl font-semibold leading-snug">
            Everything you need to run your store — in one place.
          </h2>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto bg-white dark:bg-gray-950">
        <Outlet />
      </div>
    </div>
  )
}
