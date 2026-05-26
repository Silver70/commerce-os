export function add(a: number, b: number): number {
  return Math.trunc(a) + Math.trunc(b);
}

export function subtract(a: number, b: number): number {
  return Math.trunc(a) - Math.trunc(b);
}

export function multiply(cents: number, qty: number): number {
  return Math.trunc(cents) * Math.trunc(qty);
}

export function applyPercentage(cents: number, basisPoints: number): number {
  return Math.round((Math.trunc(cents) * basisPoints) / 10000);
}

export function format(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}
