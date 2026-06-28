/**
 * GraphQL operations for checkout & guest order status. All store-scoped
 * (X-API-Key attached server-side). Prices are integer cents.
 */

export const SHIPPING_RATES_QUERY = /* GraphQL */ `
  query ShippingRates($countryCode: String!, $orderSubtotal: Int!) {
    shippingRates(countryCode: $countryCode, orderSubtotal: $orderSubtotal) {
      methodId
      name
      price
      rateType
      estimatedDaysMin
      estimatedDaysMax
    }
  }
`;

export const CHECKOUT_MUTATION = /* GraphQL */ `
  mutation Checkout($cartId: ID!, $input: CheckoutInput!) {
    checkout(cartId: $cartId, input: $input) {
      orderId
      orderNumber
      paymentClientSecret
      total
      currency
    }
  }
`;

export const ORDER_STATUS_QUERY = /* GraphQL */ `
  query OrderStatus($orderNumber: String!, $email: String!) {
    orderStatus(orderNumber: $orderNumber, email: $email) {
      id
      orderNumber
      status
      fulfillmentStatus
      subtotal
      discountAmount
      taxAmount
      shippingAmount
      total
      currency
      couponCode
      shippingAddress {
        firstName
        lastName
        company
        line1
        line2
        city
        state
        postalCode
        countryCode
        phone
      }
      lineItems {
        id
        productName
        variantName
        sku
        imageUrl
        quantity
        unitPrice
        totalPrice
        discountAmount
      }
      createdAt
      updatedAt
    }
  }
`;
