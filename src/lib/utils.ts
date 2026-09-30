import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0%";
  return `${Math.round(value)}% OFF`;
}

export function calculateDiscount(originalPrice: number, currentPrice: number) {
  if (!originalPrice || originalPrice <= 0 || !currentPrice || currentPrice >= originalPrice) {
    return {
      discountPercentage: 0,
      savedAmount: 0,
    };
  }

  const savedAmount = Math.max(0, originalPrice - currentPrice);
  const discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);

  return {
    discountPercentage,
    savedAmount: Number(savedAmount.toFixed(2)),
  };
}
