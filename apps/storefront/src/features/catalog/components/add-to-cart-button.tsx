import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useCartMutations } from "~/features/cart/hooks";

interface AddToCartButtonProps {
  /** Resolved variant to add; null while the selection is incomplete. */
  variantId: string | null;
}

/** Adds the selected variant to the cart, with pending and confirmation states. */
export function AddToCartButton({ variantId }: AddToCartButtonProps) {
  const { addToCart } = useCartMutations();
  const [justAdded, setJustAdded] = React.useState(false);

  // Reset the confirmation when the shopper changes their selection.
  React.useEffect(() => setJustAdded(false), [variantId]);

  const handleAdd = () => {
    if (!variantId) return;
    addToCart.mutate(
      { variantId, quantity: 1 },
      { onSuccess: () => setJustAdded(true) },
    );
  };

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={!variantId || addToCart.isPending}
      onClick={handleAdd}
    >
      {addToCart.isPending ? (
        "Adding…"
      ) : justAdded ? (
        <>
          <Check /> Added to cart
        </>
      ) : variantId ? (
        "Add to cart"
      ) : (
        "Select options"
      )}
    </Button>
  );
}
