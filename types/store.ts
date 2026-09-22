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
  badge?: string;
  topProducts: any;
}
