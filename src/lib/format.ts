export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatQty(amount: number, unit: string): string {
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(amount)} ${unit}`;
}
