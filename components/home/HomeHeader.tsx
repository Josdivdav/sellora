import Link from "next/link";
import styles from "@/app/home.module.css";

interface HomeHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  cartCount: number;
  onOpenSidebar: () => void;
  onCartClick: () => void;
  onLogoClick?: () => void;
}

export default function HomeHeader({
  search,
  onSearchChange,
  cartCount,
  onOpenSidebar,
  onCartClick,
  onLogoClick,
}: HomeHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        className={styles.menuButton}
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <span className="material-icons-round">menu</span>
      </button>

      <Link
        href="/"
        onClick={onLogoClick}
        className={styles.logoLink}
        title="Sellora — Home"
      >
        <div className={styles.logo}>
          <img src="/favico.png" width="35" height="35" alt="Sellora icon" />
          <img src="/logo-text.png" width="75" height="26" alt="Sellora logo" />
        </div>
      </Link>

      <label className={styles.search}>
        <span className="material-icons-round">search</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products by name, store, category…"
          aria-label="Search products"
        />
        {search.trim().length > 0 && (
          <button
            type="button"
            className={styles.headerSearchClear}
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            title="Clear search"
          >
            <span className="material-icons-round" style={{ fontSize: "17px" }}>
              close
            </span>
          </button>
        )}
      </label>

      <button
        className={styles.cart}
        onClick={onCartClick}
        aria-label={`View cart with ${cartCount} items`}
      >
        <span className="material-icons-round">shopping_cart</span>
        {cartCount > 0 && <span>{cartCount}</span>}
      </button>
    </header>
  );
}
