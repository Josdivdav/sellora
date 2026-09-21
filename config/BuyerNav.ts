export type NavItem = {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  badgeKey?: "activeOrders" | "favoriteStores";
};

const buyerNav: NavItem[] = [
  { label: "Browse", href: "/", icon: "storefront" },
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
  { label: "Help", href: "/help", icon: "help" },
  {
    label: "Me",
    href: "/account/me",
    icon: "settings",
    requiresAuth: true,
  },
];

export default buyerNav;
