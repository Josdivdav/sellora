export type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  badgeKey?: "activeOrders" | "favoriteStores";
};

const buyerNav: NavItem[] = [
  { label: "Browse", href: "/", icon: "storefront" },
  { label: "Cart", href: "/cart", icon: "shopping_cart" },
  {
    label: "My orders",
    href: "/account/orders",
    icon: "receipt_long",
    badgeKey: "activeOrders",
    requiresAuth: true,
  },
  { 
    label: "Favorite stores", 
    href: "/account/favorites", 
    icon: "favorite", 
    badgeKey: "favoriteStores",
    requiresAuth: true,
  },
  {
    label: "Refer & Earn",
    href: "/account/manage-store?tab=referrals",
    icon: "card_giftcard",
    requiresAuth: true,
  },
  { label: "About Sellora", href: "/about", icon: "info" },
  { label: "How it works", href: "/about#tutorial", icon: "menu_book" },
  {
    label: "Me",
    href: "/account/me",
    icon: "settings",
    requiresAuth: true,
  },
];

export default buyerNav;
