export interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referrerSlug: string;
  referrerName: string;
  referredStoreId: string;
  referredStoreName: string;
  referredStoreSlug: string;
  createdAt: string;
  status: "joined" | "premium_activated" | "rewarded";
  rewardAmount: number;
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
  badge?: string;
  topProducts: any;
  phone?: string;
  whatsapp?: string;
  bankDetails?: BankDetails;
  isPremium?: boolean;
  plan?: "free" | "premium";
  premiumActivatedAt?: string;
  premiumPaymentRef?: string;
  referredBy?: string;
  referralsCount?: number;
  referralEarnings?: number;
}
