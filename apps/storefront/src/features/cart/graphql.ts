/**
 * GraphQL operations for the cart feature. All are store-scoped (require only
 * the `X-API-Key`, attached server-side). The cart id is always supplied by the
 * server from the httpOnly cookie — never by the browser.
 */

// Full cart shape, including the enriched line items the storefront renders.
const CART_FIELDS = /* GraphQL */ `
  id
  status
  couponCode
  subtotal
  discountAmount
  taxAmount
  shippingAmount
  total
  currency
  items {
    id
    variantId
    quantity
    unitPrice
    totalPrice
    productName
    productSlug
    variantName
    sku
    imageUrl
  }
`;

export const CART_QUERY = /* GraphQL */ `
  query Cart($cartId: ID!) {
    cart(cartId: $cartId) { ${CART_FIELDS} }
  }
`;

export const ADD_TO_CART_MUTATION = /* GraphQL */ `
  mutation AddToCart($cartId: ID!, $variantId: ID!, $quantity: Int!) {
    addToCart(cartId: $cartId, variantId: $variantId, quantity: $quantity) { ${CART_FIELDS} }
  }
`;

export const UPDATE_CART_ITEM_MUTATION = /* GraphQL */ `
  mutation UpdateCartItem($cartId: ID!, $itemId: ID!, $quantity: Int!) {
    updateCartItem(cartId: $cartId, itemId: $itemId, quantity: $quantity) { ${CART_FIELDS} }
  }
`;

export const REMOVE_FROM_CART_MUTATION = /* GraphQL */ `
  mutation RemoveFromCart($cartId: ID!, $itemId: ID!) {
    removeFromCart(cartId: $cartId, itemId: $itemId) { ${CART_FIELDS} }
  }
`;

export const APPLY_COUPON_MUTATION = /* GraphQL */ `
  mutation ApplyCoupon($cartId: ID!, $code: String!) {
    applyCoupon(cartId: $cartId, code: $code) { ${CART_FIELDS} }
  }
`;

export const REMOVE_COUPON_MUTATION = /* GraphQL */ `
  mutation RemoveCoupon($cartId: ID!) {
    removeCoupon(cartId: $cartId) { ${CART_FIELDS} }
  }
`;
