// UI-only types for the product create flow — draft state held in the form
// before it is validated and persisted. Server-shaped types live in ~/types/api.

export type VariantDraft = {
  id: string;
  sku: string;
  name: string;
  price: string; // dollars, e.g. "149.99"
  compareAt: string;
  cost: string;
  initialStock: string;
  weight: string;
  allowBackorder: boolean;
  active: boolean;
  optionValueIds: string[];
};

export type OptionGroup = {
  id: string;
  name: string;
  values: string[];
};

export type PendingFile = {
  id: string;
  file: File;
  altText: string;
  primary: boolean;
};

// Category create/edit form values — collected in the sheet, persisted via
// the create/update server fns.
export type CategoryFormValues = {
  name: string;
  parentId: string | null;
  description: string;
};
