/**
 * Format amount as Indian Rupees
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`
}

