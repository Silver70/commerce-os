import { storeConfig } from "~/config/store.config";

/** Storefront footer: brand blurb, optional social links, and a copyright line. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{storeConfig.name}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {storeConfig.description}
          </p>
        </div>

        {storeConfig.social.length > 0 && (
          <nav className="flex flex-wrap gap-x-4 gap-y-1">
            {storeConfig.social.map((item) => (
              <a
                key={item.to}
                href={item.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {year} {storeConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
