import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { productsQueryOptions } from "../queries";
import { deleteProductServerFn } from "../server";

export function DeleteProductButton({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = React.useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => deleteProductServerFn({ data: { productId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsQueryOptions().queryKey,
      });
      navigate({ to: "/admin/products" });
    },
  });

  if (!confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirming(true)}
      >
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete product
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Are you sure?</span>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
      >
        {deleteMutation.isPending ? (
          <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Delete"
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
