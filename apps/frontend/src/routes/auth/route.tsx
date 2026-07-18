import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex h-screen">
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <img
          src="/images/auth-layout.png"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto bg-white dark:bg-gray-950">
        <Outlet />
      </div>
    </div>
  );
}
