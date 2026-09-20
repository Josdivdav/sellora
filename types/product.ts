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
  description?: string;
  stock?: number;
  inStock?: boolean;
  sku?: string;
  tags?: string[];
  specifications?: Record<string, string | undefined>;
  createdAt?: string;
  updatedAt?: string;
}
