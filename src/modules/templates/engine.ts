import { formatCurrency, formatPercentage } from "@/lib/utils";

export interface OfferDataForTemplate {
  title: string;
  callout?: string | null;
  originalPrice: number;
  currentPrice: number;
  discountPercentage?: number;
  savedAmount?: number;
  couponCode?: string | null;
  shippingInfo?: string | null;
  affiliateUrl: string;
  originalUrl?: string;
  marketplaceName?: string;
}

export interface TemplateData {
  header?: string;
  structure: string;
  cta?: string;
  footer?: string | null;
  showOriginalPrice?: boolean;
  showDiscount?: boolean;
  showCoupon?: boolean;
  showShipping?: boolean;
}

export function generateOfferMessage(offer: OfferDataForTemplate, template: TemplateData): string {
  const precoDe = offer.originalPrice > offer.currentPrice && template.showOriginalPrice !== false
    ? `De: ~${formatCurrency(offer.originalPrice)}~`
    : "";

  const precoPor = `Por apenas: *${formatCurrency(offer.currentPrice)}*`;

  const desconto = offer.discountPercentage && offer.discountPercentage > 0 && template.showDiscount !== false
    ? formatPercentage(offer.discountPercentage)
    : "";

  const economia = offer.savedAmount && offer.savedAmount > 0
    ? formatCurrency(offer.savedAmount)
    : "";

  const cupom = offer.couponCode && template.showCoupon !== false
    ? `Cupom: *${offer.couponCode}*`
    : "";

  const frete = offer.shippingInfo && template.showShipping !== false
    ? offer.shippingInfo
    : "Frete Grátis";

  const link = offer.affiliateUrl || offer.originalUrl || "";
  const cta = template.cta || "👇 COMPRE PELO LINK ABAIXO:";
  const rodape = template.footer || "";
  const chamada = offer.callout ? `✨ ${offer.callout}` : "";

  let result = template.structure;

  // Replacements
  result = result.replace(/{TITULO}/g, offer.title.trim());
  result = result.replace(/{CHAMADA}/g, chamada);
  result = result.replace(/{PRECO_DE}/g, precoDe);
  result = result.replace(/{PRECO_POR}/g, precoPor);
  result = result.replace(/{DESCONTO}/g, desconto);
  result = result.replace(/{VALOR_ECONOMIZADO}/g, economia);
  result = result.replace(/{CUPOM}/g, cupom);
  result = result.replace(/{FRETE}/g, frete);
  result = result.replace(/{LINK}/g, link);
  result = result.replace(/{CTA}/g, cta);
  result = result.replace(/{RODAPE}/g, rodape);

  // Clean up empty lines caused by missing cupom or preco_de
  const lines = result
    .split("\n")
    .filter((line) => {
      // remove lines that ended up like "🎟️ " with no cupom, or empty bullet
      const trimmed = line.trim();
      if (trimmed === "🎟️" || trimmed === "🎟️ :" || trimmed === "🎟️ Cupom:" || trimmed === "De: ~~") {
        return false;
      }
      return true;
    });

  // Condense multiple empty lines into at most 2
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
