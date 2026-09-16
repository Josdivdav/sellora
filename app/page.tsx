"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./home.module.css";

import { useAuth } from "@/context/AuthContext";
import { SignOut } from "@/functions/home.func";
import { useRouter } from "next/navigation";
import SideButton from "@/components/SideButton";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: number;
  image: string;
  author?: string;
};

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});


export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const router = useRouter();

  const [items, setItem] = useState([
      {
      id: "p1",
      name: "Wireless Noise-Cancelling Headphones",
      category: "Electronics",
      price: 45000,
      oldPrice: 58000,
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
        author: "UV store"
    },
    {
      id: "p2",
      name: "Minimalist Analog Watch",
      category: "Fashion",
      price: 32000,
      rating: 4.5,
      image:
        "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=500&q=80",
    },
    {
      id: "p3",
      name: "Everyday Canvas Backpack",
      category: "Fashion",
      price: 21500,
      oldPrice: 27000,
      rating: 4.6,
      image:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80",
    },
    {
      id: "p4",
      name: "Ceramic Pour-Over Coffee Set",
      category: "Home",
      price: 18500,
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80",
    },
    {
      id: "p5",
      name: "Smart Fitness Tracker Band",
      category: "Electronics",
      price: 27500,
      rating: 4.3,
      image:
        "https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=500&q=80",
    },
    {
      id: "p6",
      name: "Leather Bifold Wallet",
      category: "Fashion",
      price: 15800,
      rating: 4.4,
      image:
        "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80",
    },
    {
      id: "p7",
      name: "Portable Bluetooth Speaker",
      category: "Electronics",
      price: 22000,
      rating: 4.6,
      image:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80",
    },
    {
      id: "p8",
      name: "Cold-Pressed Skincare Oil",
      category: "Beauty",
      price: 9800,
      rating: 4.7,
      image:
        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&q=80",
    },
    {
      id: "p11",
      name: "Mechanical Keyboard, 75%",
      category: "Electronics",
      price: 38000,
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500&q=80",
    },
  ]);

  const categories = ["All", ...new Set(items.map((product) => product.category))];

  const { user, loading } = useAuth();

  const [cart, setCart] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("sellora_cart") || "{}");
    } catch {
      return {};
    }
  });

  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(
    () =>
      items.filter(
        (product) =>
          (category === "All" || product.category === category) &&
          product.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [category, search],
  );

  const cct = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  useEffect(() => {
    setCartCount(cct);
  }, [])
  
  function add(product: Product) {
    setCart((current) => {
      const next = { ...current, [product.id]: (current[product.id] || 0) + 1 };
      localStorage.setItem("sellora_cart", JSON.stringify(next));
      return next;
    });
    setToast(`Added “${product.name}” to cart`);
  }

  const HandleSignOut = async () => {
    const r = await SignOut();
    if(r) {
      router.refresh();
    }
  }

  const HandleSignIn = () => {
    router.push("/login");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.menuButton}
          onClick={() => setSidebarOpen(true)}
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
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
        </label>
        <button
          className={styles.cart}
          onClick={() =>
            setToast(
              cartCount
                ? `You have ${cartCount} item${cartCount === 1 ? "" : "s"} in your cart`
                : "Your cart is empty",
            )
          }
          aria-label="View cart"
        >
          <span className="material-icons-round">shopping_cart</span>
          {cartCount > 0 && <span>{cartCount}</span>}
        </button>
      </header>
      <div className={styles.contentArea}>
        <button
          className={`${styles.backdrop} ${sidebarOpen ? styles.backdropVisible : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
        <aside
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
          aria-label="Store menu"
        >
          {<div className={styles.sidebarTitle}>
            { user && <span>My store</span>}
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <span className="material-icons-round">close</span>
            </button>
          </div>}
          { user && <button
            className={styles.createStore}
            onClick={() => {
              setSidebarOpen(false);
              setToast("Create store is coming soon");
            }}
          >
            <span className="material-icons-round">add</span>
            Create store
          </button>}
          <nav className={styles.sideNav}>
            <button className={styles.sideActive}>
              <span className="material-icons-round">storefront</span>Storefront
            </button>
            <SideButton label="My products" icon="inventory_2" n="12"/>
            <SideButton label="Orders" icon="receipt_long" n="3"/>
            <SideButton label="Analytics" icon="insights" n="0"/>
            <SideButton label="Marketing" icon="campaign"/>
            {
              user ? (
                <SideButton label="Logout" icon="exit_to_app" onClick={HandleSignOut}/>
              ) : (
                <SideButton label="Log in" icon="login" onClick={HandleSignIn}/>
              )
            }
          </nav>
          <div className={styles.upgradeCard}>
            <span className="material-icons-round">auto_awesome</span>
            <strong>Grow your store</strong>
            <p>Unlock insights and more seller tools.</p>
            <button>View plans</button>
          </div>
        </aside>
        <main className={styles.main}>
          <section className={styles.categories} aria-label="Categories">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? styles.active : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </section>
          <div className={styles.heading}>
            <h1>{category === "All" ? "All products" : category}</h1>
            <span>
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </span>
          </div>
          {visible.length ? (
            <section className={styles.grid}>
              {visible.map((product) => (
                <article className={styles.card} key={product.id}>
                  <div className={styles.image}>
                    <img src={product.image} alt={product.name} />
                    {product.oldPrice && <b>Sale</b>}
                  </div>
                  <div className={styles.info}>
                    <small>{product.category}</small>
                    <h2>{product.name}</h2>
                    <small>{product?.author || ""}</small>
                    <p className={styles.rating}>
                      <i>
                        {"★".repeat(Math.round(product.rating))}
                        {"☆".repeat(5 - Math.round(product.rating))}
                      </i>
                      {product.rating.toFixed(1)}
                    </p>
                    <p>
                      <strong>{currency.format(product.price)}</strong>
                      {product.oldPrice && (
                        <del>{currency.format(product.oldPrice)}</del>
                      )}
                    </p>
                    <button onClick={() => add(product)}>
                      <span className="material-icons-round">
                        shopping_cart
                      </span>
                      Add to cart
                    </button>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <p className={styles.empty}>No products match your search.</p>
          )}
        </main>
      </div>
      <div
        className={`${styles.toast} ${toast ? styles.show : ""}`}
        role="status"
      >
        {toast}
      </div>
    </div>
  );
}
