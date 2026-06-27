import { createFileRoute } from "@tanstack/react-router";
import { storeConfig } from "~/config/store.config";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-center">
      <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
        {storeConfig.name}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        {storeConfig.description}
      </p>
      <div className="mt-8">
        <Button size="lg" asChild>
          <a href="/products">Shop all</a>
        </Button>
      </div>
    </section>
  );
}
