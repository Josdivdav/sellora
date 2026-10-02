export interface Product {
  id: string;
  name: string;
  slug?: string;
  category: string;
  price: number;
  oldPrice?: number | null;
  discountPercentage?: number;
  currency?: string;
  rating: number;
  reviewsCount?: number;
  image: string;
  images?: string[];
  author?: string;
  storeId?: string;
  description?: string;
  stock?: number;
  inStock?: boolean;
  sku?: string;
  tags?: string[];
  specifications?: Record<string, string | undefined>;
  createdAt?: string;
  updatedAt?: string;

  // Affiliate Marketing
  isAffiliateEnabled?: boolean;
  affiliateCommissionPercentage?: number; // e.g. 10 (meaning 10%)
  affiliateCommissionAmount?: number;     // e.g. 3500 (₦3,500)
  affiliateCode?: string;                 // unique marketing code e.g. "AFF-JOS-489"
  affiliateMarketingUrl?: string;         // canonical unique marketing URL
  affiliateTerms?: string;                // optional terms / instructions
}
