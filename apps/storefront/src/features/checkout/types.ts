/** Feature-local checkout form state. Shared API shapes live in types/api. */

/** Controlled state for the shipping address + contact email form. */
export interface ShippingAddressFormState {
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string;
  phone: string;
}

export const emptyShippingAddress: ShippingAddressFormState = {
  email: "",
  firstName: "",
  lastName: "",
  company: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  countryCode: "",
  phone: "",
};

export type ShippingAddressErrors = Partial<
  Record<keyof ShippingAddressFormState, string>
>;
