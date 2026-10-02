import { NextRequest, NextResponse } from "next/server";
import { getAllProducts } from "@/lib/getProduct";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  try {
    const { products, categories, stores } = await getAllProducts();

    if (!q) {
      // Default trending & popular suggestions
      const trendingTerms = [
        "iPhone",
        "Sneakers",
        "Smart Watch",
        "Designer Bags",
        "Wireless Earbuds",
        "Laptops",
        "Men's Fashion",
        "Women's Perfume",
      ];
      return NextResponse.json({
        query: "",
        terms: trendingTerms,
        categories: categories.filter((c) => c !== "All").slice(0, 6),
        stores: stores.slice(0, 4).map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          logo: s.logo,
          isVerified: s.isVerified,
          category: s.category,
        })),
        products: [],
      });
    }

    // Case-insensitive terms matching
    const matchingTermsSet = new Set<string>();

    // 1. Matches in product names and tags
    products.forEach((p) => {
      const lowerName = p.name.toLowerCase();
      if (lowerName.includes(q)) {
        matchingTermsSet.add(p.name);
      }
      p.tags?.forEach((tag) => {
        if (tag.toLowerCase().includes(q)) {
          matchingTermsSet.add(tag);
        }
      });
    });

    // 2. Matches in categories
    const matchingCategories = categories
      .filter((c) => c !== "All" && c.toLowerCase().includes(q))
      .slice(0, 4);

    // 3. Matches in stores
    const matchingStores = stores
      .filter((s) => s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logo: s.logo,
        isVerified: s.isVerified,
        category: s.category,
      }));

    // 4. Top product previews (up to 4)
    const matchingProducts = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.author?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        image: p.image || p.images?.[0] || "/logo.png",
        category: p.category,
        author: p.author,
      }));

    return NextResponse.json({
      query: q,
      terms: Array.from(matchingTermsSet).slice(0, 6),
      categories: matchingCategories,
      stores: matchingStores,
      products: matchingProducts,
    });
  } catch (error) {
    console.error("Error in search suggestions API:", error);
    return NextResponse.json({ query: q, terms: [], categories: [], stores: [], products: [] });
  }
}
