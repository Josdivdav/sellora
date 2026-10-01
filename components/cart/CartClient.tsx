"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./cart.module.css";
import { useAuth } from "@/context/AuthContext";
import { useStoreStatus } from "@/hooks/useStoreStatus";
import { useCart } from "@/context/CartContext";
import HomeHeader from "@/components/home/HomeHeader";
import Sidebar from "@/components/SidebarN";
import Toast from "@/components/home/Toast";
import type { Product } from "@/types/product";
import { SignOut } from "@/functions/home.func";
import { slugifyStoreName } from "@/lib/storeUrl";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default function CartClient() {
  const router = useRouter();
  const { user } = useAuth();
  const hasStore = useStoreStatus();
  const { cart, cartCount, removeFromCart, setCartItemQuantity, clearCart } = useCart();

  // Navigation states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [toast, setToast] = useState("");

  // Products catalog data matching cart IDs
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const cartProductIds = useMemo(() => {
    return Object.keys(cart).filter((id) => (cart[id] || 0) > 0);
  }, [cart]);

  // Load product catalog for items currently in cart
  const loadCartProducts = useCallback(async () => {
    if (cartProductIds.length === 0) {
      setProductsMap({});
      return;
    }

    setIsLoadingProducts(true);
    try {
      const res = await fetch(`/api/products?ids=${encodeURIComponent(cartProductIds.join(","))}`);
      if (res.ok) {
        const json = await res.json();
        const list: Product[] = json.products || [];
        const nextMap: Record<string, Product> = {};
        list.forEach((p) => {
          nextMap[p.id] = p;
        });
        setProductsMap(nextMap);
      }
    } catch (err) {
      console.error("Failed to load products for cart:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [cartProductIds]);

  useEffect(() => {
    void loadCartProducts();
  }, [loadCartProducts]);

  // Calculations
  const cartItems = useMemo(() => {
    return cartProductIds.map((id) => {
      const prod = productsMap[id];
      const qty = cart[id] || 1;
      const unitPrice = Number(prod?.price || 0);
      const originalPrice = prod?.oldPrice ? Number(prod.oldPrice) : null;
      const totalPrice = unitPrice * qty;

      return {
        id,
        product: prod,
        quantity: qty,
        unitPrice,
        originalPrice,
        totalPrice,
      };
    });
  }, [cartProductIds, cart, productsMap]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [cartItems]);

  // Shipping logic (e.g. Free shipping for all orders or above a threshold)
  const shippingFee = subtotal >= 50000 || subtotal === 0 ? 0 : 0;
  const grandTotal = subtotal + shippingFee;

  // Handlers
  const handleIncreaseQty = async (productId: string, currentQty: number) => {
    const nextQty = currentQty + 1;
    await setCartItemQuantity(productId, nextQty);
  };

  const handleDecreaseQty = async (productId: string, currentQty: number) => {
    if (currentQty <= 1) {
      await handleRemoveItem(productId);
      return;
    }
    const nextQty = currentQty - 1;
    await setCartItemQuantity(productId, nextQty);
  };

  const handleRemoveItem = async (productId: string) => {
    const prodName = productsMap[productId]?.name || "Item";
    await removeFromCart(productId);
    setToast(`Removed "${prodName}" from cart`);
  };

  const handleClearCart = async () => {
    if (confirm("Are you sure you want to remove all items from your cart?")) {
      await clearCart();
      setToast("Cart cleared");
    }
  };

  const handleSignOut = async () => {
    await SignOut();
    router.refresh();
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setToast("Your cart is empty.");
      return;
    }

    if (!user) {
      setToast("Please sign in to complete your checkout.");
      router.push("/login?redirect=/cart");
      return;
    }

    setIsCheckingOut(true);
    setToast("Processing your order...");

    try {
      const items = cartItems.map(({ id, product, quantity, unitPrice, originalPrice }) => ({
        productId: id,
        name: product?.name || "Cart Product",
        slug: product?.slug || "",
        image: (Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : product?.image) || "/favico.png",
        price: unitPrice || 1000,
        originalPrice: originalPrice || null,
        quantity,
        storeName: product?.author || "Sellora Official",
        storeId: product?.storeId || undefined,
        category: product?.category || "General",
      }));

      const firstItem = items[0];
      const token = await user.getIdToken();

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items,
          store: {
            id: firstItem.storeId || "sellora-official",
            name: firstItem.storeName || "Sellora Official Store",
            isVerified: true,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        await clearCart();
        setToast(`Order #${data.order.orderNumber} placed successfully!`);
        setTimeout(() => {
          router.push("/account/orders");
        }, 1200);
      } else {
        setToast(data.error || "Failed to place order. Please try again.");
        setIsCheckingOut(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setToast("An error occurred during checkout. Please try again.");
      setIsCheckingOut(false);
    }
  };

  return (
    <div className={styles.page}>
      <HomeHeader
        search={headerSearch}
        onSearchChange={setHeaderSearch}
        cartCount={cartCount}
        onOpenSidebar={() => setSidebarOpen(true)}
        onCartClick={() => {}}
      />

      <div className={styles.contentArea}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          onSignOut={handleSignOut}
          onSignIn={() => router.push("/login")}
          hasStore={hasStore}
        />

        <main className={styles.main}>
          {/* Header & Breadcrumb */}
          <div className={styles.cartHeader}>
            <div className={styles.breadcrumb}>
              <Link href="/" className={styles.breadcrumbLink}>
                Home
              </Link>
              <span>/</span>
              <span>Shopping Cart</span>
            </div>

            <div className={styles.titleRow}>
              <div className={styles.titleWithBadge}>
                <h1 className={styles.pageTitle}>
                  <span className="material-icons-round">shopping_cart</span>
                  Shopping Cart
                </h1>
                {cartCount > 0 && (
                  <span className={styles.itemCountBadge}>
                    {cartCount} {cartCount === 1 ? "item" : "items"}
                  </span>
                )}
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  className={styles.clearCartBtn}
                  onClick={handleClearCart}
                  title="Remove all items from cart"
                >
                  <span className="material-icons-round">delete_sweep</span>
                  Clear Cart
                </button>
              )}
            </div>
          </div>

          {/* Cart Content: Empty State vs Active Cart */}
          {cartItems.length === 0 && !isLoadingProducts ? (
            <div className={styles.emptyCard}>
              <div className={styles.emptyIconWrapper}>
                <span className="material-icons-round">remove_shopping_cart</span>
              </div>
              <h2 className={styles.emptyTitle}>Your Cart is Empty</h2>
              <p className={styles.emptySubtitle}>
                Looks like you haven&apos;t added any items to your shopping cart yet. Discover
                exceptional products from verified sellers across Nigeria.
              </p>
              <Link href="/" className={styles.emptyActionBtn}>
                <span className="material-icons-round">storefront</span>
                Explore Marketplace
              </Link>
            </div>
          ) : (
            <div className={styles.cartLayout}>
              {/* Left Column: Cart Items List */}
              <div className={styles.itemsCard}>
                <div className={styles.itemsCardHeader}>
                  <span>Item Details</span>
                  <span>Quantity &amp; Subtotal</span>
                </div>

                <div className={styles.itemsList}>
                  {isLoadingProducts && cartItems.length === 0 ? (
                    // Skeleton loader
                    [1, 2].map((i) => (
                      <div key={i} className={styles.skeletonItem}>
                        <div
                          className={styles.skeletonBox}
                          style={{ width: "100px", height: "100px" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div
                            className={styles.skeletonBox}
                            style={{ width: "60%", height: "20px" }}
                          />
                          <div
                            className={styles.skeletonBox}
                            style={{ width: "30%", height: "16px" }}
                          />
                        </div>
                        <div
                          className={styles.skeletonBox}
                          style={{ width: "80px", height: "30px", justifySelf: "end" }}
                        />
                      </div>
                    ))
                  ) : (
                    cartItems.map((item) => {
                      const prod = item.product;
                      const storeSlug = prod?.author ? slugifyStoreName(prod.author) : "";
                      const imageSrc =
                        (Array.isArray(prod?.images) && prod.images.length > 0
                          ? prod.images[0]
                          : prod?.image) || "/favico.png";

                      return (
                        <div key={item.id} className={styles.cartItemRow}>
                          {/* Image */}
                          <div className={styles.itemImageWrapper}>
                            <Link href={`/products/${item.id}`}>
                              <Image
                                src={imageSrc}
                                alt={prod?.name || "Cart item"}
                                width={100}
                                height={100}
                                className={styles.itemImage}
                                unoptimized
                              />
                            </Link>
                          </div>

                          {/* Details */}
                          <div className={styles.itemDetails}>
                            {prod?.author && (
                              <Link
                                href={`/${storeSlug}`}
                                className={styles.storeBadge}
                                title={`Visit ${prod.author}`}
                              >
                                <span className="material-icons-round">store</span>
                                {prod.author}
                              </Link>
                            )}

                            <Link
                              href={`/products/${item.id}`}
                              className={styles.itemName}
                              title={prod?.name || "View Product"}
                            >
                              {prod?.name || "Loading product details..."}
                            </Link>

                            <div className={styles.itemMeta}>
                              <span className={styles.inStockText}>
                                <span className="material-icons-round">check_circle</span>
                                In Stock
                              </span>
                              <span>•</span>
                              <span className={styles.itemPriceUnit}>
                                {currency.format(item.unitPrice)} each
                              </span>
                            </div>
                          </div>

                          {/* Controls (Mobile / Desktop) */}
                          <div className={styles.itemControls || ""}>
                            {/* Quantity Stepper */}
                            <div className={styles.stepperContainer}>
                              <button
                                type="button"
                                className={styles.stepperBtn}
                                onClick={() => handleDecreaseQty(item.id, item.quantity)}
                                aria-label="Decrease quantity"
                                title="Decrease quantity"
                              >
                                <span className="material-icons-round">
                                  {item.quantity <= 1 ? "delete_outline" : "remove"}
                                </span>
                              </button>
                              <span className={styles.stepperValue}>{item.quantity}</span>
                              <button
                                type="button"
                                className={styles.stepperBtn}
                                onClick={() => handleIncreaseQty(item.id, item.quantity)}
                                aria-label="Increase quantity"
                                title="Increase quantity"
                              >
                                <span className="material-icons-round">add</span>
                              </button>
                            </div>
                          </div>

                          {/* Subtotal & Delete */}
                          <div className={styles.itemTotalAndActions}>
                            <div className={styles.itemTotalColumn}>
                              <div className={styles.itemTotalPrice}>
                                {currency.format(item.totalPrice)}
                              </div>
                              {item.originalPrice && item.originalPrice > item.unitPrice && (
                                <div className={styles.itemOldPrice}>
                                  {currency.format(item.originalPrice * item.quantity)}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              className={styles.removeItemBtn}
                              onClick={() => handleRemoveItem(item.id)}
                              aria-label={`Remove ${prod?.name || "item"} from cart`}
                              title="Remove item"
                            >
                              <span className="material-icons-round">delete_outline</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className={styles.summaryCard}>
                <h2 className={styles.summaryTitle}>Order Summary</h2>

                <div className={styles.summaryRows}>
                  <div className={styles.summaryRow}>
                    <span>Items Subtotal</span>
                    <span className={styles.summaryRowVal}>{currency.format(subtotal)}</span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Standard Shipping</span>
                    <span className={styles.freeShippingTag}>FREE</span>
                  </div>

                  <div className={styles.summaryRow}>
                    <span>Estimated Tax</span>
                    <span className={styles.summaryRowVal}>₦0 (Included)</span>
                  </div>
                </div>

                <div className={styles.summaryDivider} />

                <div className={styles.summaryTotalRow}>
                  <span className={styles.summaryTotalLabel}>Grand Total</span>
                  <span className={styles.summaryTotalVal}>{currency.format(grandTotal)}</span>
                </div>

                <button
                  type="button"
                  className={styles.checkoutBtn}
                  onClick={handleCheckout}
                  disabled={isCheckingOut || cartItems.length === 0}
                >
                  <span className="material-icons-round">
                    {isCheckingOut ? "hourglass_top" : "lock"}
                  </span>
                  {isCheckingOut
                    ? "Placing Order..."
                    : `Proceed to Checkout (${cartCount})`}
                </button>

                <Link href="/" className={styles.continueShoppingBtn}>
                  <span className="material-icons-round">arrow_back</span>
                  Continue Shopping
                </Link>

                <div className={styles.trustBadges}>
                  <div className={styles.trustBadgeItem}>
                    <span className="material-icons-round">verified_user</span>
                    <span>256-Bit SSL Encrypted &amp; Secure Checkout</span>
                  </div>
                  <div className={styles.trustBadgeItem}>
                    <span className="material-icons-round">local_shipping</span>
                    <span>Fast Delivery with Real-time Order Tracking</span>
                  </div>
                  <div className={styles.trustBadgeItem}>
                    <span className="material-icons-round">published_with_changes</span>
                    <span>7-Day Buyer Protection &amp; Return Policy</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Toast message={toast} />
    </div>
  );
}
