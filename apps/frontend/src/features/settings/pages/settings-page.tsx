import * as React from "react";
import { cn } from "~/lib/utils";
import { GeneralSettings } from "../panels/general-settings";
import { StoresSettings } from "../panels/stores-settings";
import { TeamSettings } from "../panels/team-settings";
import { ApiKeysSettings } from "../panels/api-keys-settings";
import { TaxRatesSettings } from "../panels/tax-rates-settings";
import { AuditLogSettings } from "../panels/audit-log-settings";

type Section =
  | "general"
  | "stores"
  | "team"
  | "api-keys"
  | "tax-rates"
  | "audit-log";

const SETTINGS_NAV: { key: Section; label: string }[] = [
  { key: "general", label: "General" },
  { key: "stores", label: "Stores" },
  { key: "team", label: "Team" },
  { key: "api-keys", label: "API Keys" },
  { key: "tax-rates", label: "Tax Rates" },
  { key: "audit-log", label: "Audit Log" },
];

export function SettingsPage() {
  const [section, setSection] = React.useState<Section>("general");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your store configuration.
        </p>
      </div>

      <div className="flex gap-8">
        <nav className="w-44 shrink-0 space-y-0.5">
          {SETTINGS_NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                section === item.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {section === "general" && <GeneralSettings />}
          {section === "stores" && <StoresSettings />}
          {section === "team" && <TeamSettings />}
          {section === "api-keys" && <ApiKeysSettings />}
          {section === "tax-rates" && <TaxRatesSettings />}
          {section === "audit-log" && <AuditLogSettings />}
        </div>
      </div>
    </div>
  );
}
