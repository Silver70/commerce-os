import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, KeyIcon, ShieldIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { createApiKeyFromSettingsServerFn } from "../server";

export function GenerateKeySheet({
  open,
  onOpenChange,
  storeId,
  storeName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  storeName: string;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [name, setName] = React.useState("");
  const [genKey, setGenKey] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setName("");
      setGenKey("");
      setCopied(false);
      setError("");
    }
  }, [open]);

  const generateMutation = useMutation({
    mutationFn: () =>
      createApiKeyFromSettingsServerFn({ data: { name: name.trim(), storeId } }),
    onSuccess: (data) => {
      setGenKey(data.rawKey);
      setStep(2);
      void queryClient.invalidateQueries({
        queryKey: ["settings", "api-keys", storeId],
      });
    },
    onError: (err) => setError(err.message),
  });

  function handleCopy() {
    navigator.clipboard.writeText(genKey).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>
            {step === 1 ? "Generate API key" : "Copy your new key"}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? "API keys grant full access to your store. Only share with trusted applications."
              : "This key will not be shown again. Copy it now and store it safely."}
          </SheetDescription>
        </SheetHeader>

        {step === 1 ? (
          <>
            <div className="flex-1 px-4 py-5 space-y-4">
              {storeName && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <KeyIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Key will be scoped to{" "}
                    <span className="font-medium text-foreground">
                      {storeName}
                    </span>
                  </span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="key-name">
                  Key name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Next.js Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <SheetFooter className="border-t">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                disabled={!name.trim() || generateMutation.isPending}
                className="flex-1"
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? "Generating…" : "Generate key"}
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <div className="flex-1 px-4 py-5 space-y-5">
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  This key is shown <strong>only once</strong>. Copy it now — you
                  will not be able to retrieve it later.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Your new API key</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
                    {genKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <CopyIcon className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <SheetFooter className="border-t">
              <Button
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                I've saved my key — done
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
