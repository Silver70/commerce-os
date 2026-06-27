import { ShoppingBag } from "lucide-react";

/**
 * Header cart entry point: the cart icon with an optional item-count badge.
 *
 * The live count (via `useCart()`) is wired up with the cart feature; until
 * then this renders a plain link to the cart page. Uses an `<a>` because the
 * `/cart` route lands in the cart phase — swap to a typed `<Link>` then.
 */
export function CartButton({ count = 0 }: { count?: number }) {
  return (
    <a
      href="/cart"
      aria-label={
        count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"
      }
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </a>
  );
}
