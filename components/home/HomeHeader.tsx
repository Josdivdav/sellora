import styles from "@/app/home.module.css";

interface HomeHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  cartCount: number;
  onOpenSidebar: () => void;
  onCartClick: () => void;
}

export default function HomeHeader({
  search,
  onSearchChange,
  cartCount,
  onOpenSidebar,
  onCartClick,
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

      <div className={styles.logo}>
        <img src="/favico.png" width="35" height="35" alt="Sellora" />
        <img src="/logo-text.png" width="75" height="26" alt="Sellora" />
      </div>

      <label className={styles.search}>
        <span className="material-icons-round">search</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
        />
      </label>

      <button
        className={styles.cart}
        onClick={onCartClick}
        aria-label="View cart"
      >
        <span className="material-icons-round">shopping_cart</span>
        {cartCount > 0 && <span>{cartCount}</span>}
      </button>
    </header>
  );
}
