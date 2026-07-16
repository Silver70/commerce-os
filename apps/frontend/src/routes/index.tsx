import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export const Route = createFileRoute("/")({
  // beforeLoad: async () => {
  //   const auth = await getAuth();
  //   if (auth.user) throw redirect({ to: "/admin/dashboard" });
  //   throw redirect({ href: "/api/auth/sign-in" });
  // },
  component: HomePage,
});

function HomePage() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>hello world</h1>
      <button
        onClick={() => setCount((c) => c + 1)}
        className="rounded border px-3 py-1"
      >
        count is {count}
      </button>
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
