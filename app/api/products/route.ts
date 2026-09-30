import { NextResponse, NextRequest } from "next/server";
import { getAllProducts } from "@/lib/getProduct";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const searchParam = searchParams.get("search");

    const { products, categories, stores } = await getAllProducts();

    let filtered = products;
    if (categoryParam && categoryParam !== "All") {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === categoryParam.toLowerCase()
      );
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.author && p.author.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    return NextResponse.json(
      {
        success: true,
        products: filtered,
        categories,
        stores,
        total: filtered.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
