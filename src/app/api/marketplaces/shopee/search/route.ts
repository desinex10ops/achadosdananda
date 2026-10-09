import { NextResponse } from "next/server";
import { ShopeeAffiliateService, ShopeeSearchParams } from "@/modules/marketplaces/shopee";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || undefined;
    const category = searchParams.get("category") || undefined;
    const sort = (searchParams.get("sort") as any) || (keyword ? "RELEVANCE" : "DISCOUNT_DESC");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const topSellersOnly = searchParams.get("topSellers") === "true";
    const extraCommissionOnly = searchParams.get("extraCommission") === "true";

    const params: ShopeeSearchParams = {
      keyword,
      category,
      sort,
      limit,
      page,
      topSellersOnly,
      extraCommissionOnly,
    };

    const result = await ShopeeAffiliateService.searchProducts(params);

    return NextResponse.json({
      success: true,
      data: result.items,
      total: result.total,
      source: result.source,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
