import { storeConfig } from "~/config/store.config";
import { CartButton } from "./cart-button";

/**
 * Storefront header: brand wordmark, primary nav (from `store.config`), and the
 * cart button. Nav targets use `<a>` for now because the catalog/cart routes
 * land in later phases — these become typed `<Link>`s once those routes exist.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="/" className="text-base font-semibold tracking-tight">
          {storeConfig.name}
        </a>

        <nav className="hidden items-center gap-1 sm:flex">
          {storeConfig.nav.map((item) => (
            <a
              key={item.to}
              href={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <CartButton />
      </div>
    </header>
  );
}
