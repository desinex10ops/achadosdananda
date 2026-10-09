import { NextResponse } from "next/server";
import { ShopeeAffiliateService } from "@/modules/marketplaces/shopee";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const creds = await ShopeeAffiliateService.getCredentials();
    return NextResponse.json({
      success: true,
      data: {
        appId: creds.appId || "",
        appSecretMasked: creds.appSecret ? "••••••••" + creds.appSecret.slice(-4) : "",
        hasSecret: Boolean(creds.appSecret),
        affiliateTag: creds.affiliateTag || "",
        isConfigured: creds.isConfigured,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, appId, appSecret, affiliateTag } = body;

    if (action === "TEST_CONNECTION") {
      const creds = await ShopeeAffiliateService.getCredentials();
      const targetAppId = appId || creds.appId;
      const targetSecret = appSecret || creds.appSecret;

      if (!targetAppId || !targetSecret) {
        return NextResponse.json({
          success: false,
          error: "Informe o App ID e o App Secret para testar a conexão.",
        });
      }

      const testResult = await ShopeeAffiliateService.testConnection(targetAppId, targetSecret);
      return NextResponse.json(testResult);
    }

    // Ação: Salvar credenciais
    await ShopeeAffiliateService.saveCredentials({
      appId,
      appSecret,
      affiliateTag,
    });

    return NextResponse.json({
      success: true,
      message: "Credenciais da Shopee salvas com sucesso!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
