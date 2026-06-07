// UI form-value types shared between the shipping sheets and the zone/page
// components that drive their mutations.

export type ZoneFormValues = { name: string; countries: string[] };

export type RateType = "flat_rate" | "free" | "calculated";

export type MethodFormValues = {
  name: string;
  rateType: RateType;
  price: string;
  minOrderAmount: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
  isActive: boolean;
};
