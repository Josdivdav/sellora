import { NextRequest, NextResponse } from "next/server";
import { getStoreBySlug } from "@/lib/getStore";
import { isReservedRoute } from "@/lib/storeUrl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || isReservedRoute(slug)) {
    return NextResponse.json({ error: "Invalid store identifier" }, { status: 400 });
  }

  try {
    const { store, products } = await getStoreBySlug(slug);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        store,
        products,
      },
    });
  } catch (error) {
    console.error(`Error in GET /api/stores/${slug}:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
