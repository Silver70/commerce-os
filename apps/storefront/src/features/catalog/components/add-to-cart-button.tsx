import { Button } from "~/components/ui/button";

interface AddToCartButtonProps {
  /** Resolved variant to add; null while the selection is incomplete. */
  variantId: string | null;
}

/**
 * Add-to-cart action for the product detail page.
 *
 * Phase 2 (catalog read path) renders the button and its enabled/disabled state
 * from the selected variant. The cart mutation is wired in the cart phase —
 * this is the seam where `useCartMutations().addToCart` will be called.
 */
export function AddToCartButton({ variantId }: AddToCartButtonProps) {
  return (
    <Button size="lg" className="w-full" disabled={!variantId}>
      {variantId ? "Add to cart" : "Select options"}
    </Button>
  );
}
