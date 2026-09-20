export interface StoreTopProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number | null;
  image: string;
  rating: number;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo: string;
  banner: string;
  rating: number;
  reviewsCount: number;
  followersCount: number;
  productsCount: number;
  isVerified: boolean;
  isFavorite?: boolean;
  joinedDate: string;
  location: string;
  deliverySpeed: string;
  responseRate: string;
  tags: string[];
  topProducts: StoreTopProduct[];
  badge?: string;
}
