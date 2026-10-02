"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./checkout.module.css";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import Toast from "@/components/home/Toast";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import type { Store } from "@/types/store";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Rivers",
  "Oyo",
  "Ogun",
  "Kano",
  "Kaduna",
  "Delta",
  "Edo",
  "Anambra",
  "Enugu",
  "Akwa Ibom",
  "Abia",
  "Plateau",
  "Ondo",
  "Osun",
  "Kwara",
  "Imo",
  "Cross River",
  "Benue",
  "Bayelsa",
  "Bauchi",
  "Adamawa",
  "Sokoto",
  "Niger",
  "Kogi",
  "Kebbi",
  "Katsina",
  "Jigawa",
  "Gombe",
  "Ekiti",
  "Ebonyi",
  "Borno",
  "Yobe",
  "Taraba",
  "Nasarawa",
  "Zamfara",
];

const PROMO_CODES: Record<string, { type: "percent" | "fixed" | "freeship"; value: number; label: string }> = {
  WELCOME10: { type: "percent", value: 10, label: "10% off entire order" },
  SELLORA5: { type: "percent", value: 5, label: "5% discount" },
  FREESHIP: { type: "freeship", value: 2500, label: "Free express shipping" },
};

const STORE_BANK = {
  bankName: process.env.NEXT_PUBLIC_STORE_BANK_NAME || "OPay",
  accountNumber: process.env.NEXT_PUBLIC_STORE_ACCOUNT_NUMBER || "8038737198",
  accountName: process.env.NEXT_PUBLIC_STORE_ACCOUNT_NAME || "Divine Joshua David",
};

const WHATSAPP_CONTACT = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "2348038737198";

export default function CheckoutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartCount, clearCart } = useCart();

  const [toast, setToast] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Lagos");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"standard" | "express">("standard");
  const [paymentMethod, setPaymentMethod] = useState<"pod" | "transfer">("pod");

  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; label: string; discount: number } | null>(null);

  // Products catalog data
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [storesMap, setStoresMap] = useState<Record<string, Store>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Auto-populate user data when loaded
  useEffect(() => {
    if (user) {
      if (user.email && !email) setEmail(user.email);
      if (user.displayName && !fullName) setFullName(user.displayName);
    }
  }, [user, email, fullName]);

  const cartProductIds = useMemo(() => {
    return Object.keys(cart).filter((id) => (cart[id] || 0) > 0);
  }, [cart]);

  // Load product catalog & merchant store details
  const loadProducts = useCallback(async () => {
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

        if (Array.isArray(json.stores)) {
          const sMap: Record<string, Store> = {};
          json.stores.forEach((s: Store) => {
            if (s.id) sMap[s.id.toLowerCase()] = s;
            if (s.name) sMap[s.name.toLowerCase()] = s;
            if (s.slug) sMap[s.slug.toLowerCase()] = s;
          });
          setStoresMap(sMap);
        }
      }
    } catch (err) {
      console.error("Failed to load products for checkout:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [cartProductIds]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Active store resolution (the store owner whose product is being checked out)
  const activeStore = useMemo<Store | null>(() => {
    if (cartProductIds.length === 0) return null;
    const firstProduct = productsMap[cartProductIds[0]];
    if (!firstProduct) return null;
    const storeId = firstProduct.storeId?.toLowerCase();
    const author = firstProduct.author?.toLowerCase();
    if (storeId && storesMap[storeId]) return storesMap[storeId];
    if (author && storesMap[author]) return storesMap[author];
    return null;
  }, [cartProductIds, productsMap, storesMap]);

  // Dynamic store bank details (belonging to this store owner)
  const storeBank = useMemo(() => {
    if (activeStore?.bankDetails?.accountNumber) {
      return activeStore.bankDetails;
    }
    return STORE_BANK;
  }, [activeStore]);

  // Dynamic store WhatsApp phone (belonging to this store owner)
  const storeWhatsApp = useMemo(() => {
    if (activeStore?.whatsapp) return activeStore.whatsapp;
    if (activeStore?.phone) return activeStore.phone;
    return WHATSAPP_CONTACT;
  }, [activeStore]);

  // Items calculation
  const items = useMemo(() => {
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
    return items.reduce((acc, it) => acc + it.totalPrice, 0);
  }, [items]);

  // Shipping fee
  const shippingFee = useMemo(() => {
    if (subtotal === 0) return 0;
    if (appliedPromo?.code === "FREESHIP") return 0;
    return deliveryMethod === "express" ? 2500 : 0;
  }, [subtotal, deliveryMethod, appliedPromo]);

  // Discount calculation
  const discount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.code === "FREESHIP") return 0;
    return appliedPromo.discount;
  }, [appliedPromo]);

  const grandTotal = Math.max(0, subtotal + shippingFee - discount);

  // Apply Promo Code
  const handleApplyPromo = () => {
    const clean = promoInput.trim().toUpperCase();
    if (!clean) return;

    const promo = PROMO_CODES[clean];
    if (!promo) {
      setToast("Invalid promo code. Try WELCOME10 or SELLORA5");
      return;
    }

    let calculatedDiscount = 0;
    if (promo.type === "percent") {
      calculatedDiscount = Math.round((subtotal * promo.value) / 100);
    } else if (promo.type === "fixed") {
      calculatedDiscount = promo.value;
    }

    setAppliedPromo({
      code: clean,
      label: promo.label,
      discount: calculatedDiscount,
    });
    setToast(`Coupon "${clean}" applied successfully!`);
    setPromoInput("");
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setToast("Promo code removed");
  };

  const handleCopyAccount = (accNo: string) => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(accNo);
      setCopiedAccount(true);
      setToast("Account number copied to clipboard!");
      setTimeout(() => setCopiedAccount(false), 2500);
    }
  };

  // Validation
  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) errs.fullName = "Please enter your full name.";
    if (!email.trim() || !email.includes("@")) errs.email = "Please enter a valid email address.";
    if (!phone.trim()) {
      errs.phone = "Please enter your phone number for delivery updates.";
    } else if (phone.replace(/\D/g, "").length < 8) {
      errs.phone = "Please enter a valid phone number.";
    }
    if (!street.trim()) errs.street = "Please enter your delivery street address.";
    if (!city.trim()) errs.city = "Please enter your city / district.";
    if (!state.trim()) errs.state = "Please select a state.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Place Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      setToast("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (!validateForm()) {
      setToast("Please fill in all required delivery details.");
      return;
    }

    if (!user) {
      setToast("Please sign in to securely finalize your order.");
      router.push("/login?redirect=/checkout");
      return;
    }

    setIsSubmitting(true);
    setToast("Securing order and processing payment...");

    try {
      const token = await user.getIdToken();

      const orderItems = items.map(({ id, product, quantity, unitPrice, originalPrice }) => ({
        productId: id,
        name: product?.name || "Sellora Item",
        slug: product?.slug || "",
        image:
          (Array.isArray(product?.images) && product.images.length > 0
            ? product.images[0]
            : product?.image) || "/favico.png",
        price: unitPrice || 1000,
        originalPrice: originalPrice || null,
        quantity,
        storeName: product?.author || "Sellora Official Store",
        storeId: product?.storeId || undefined,
        category: product?.category || "General",
      }));

      const firstItem = orderItems[0];
      const paymentMethodNames: Record<string, string> = {
        pod: "Cash / POS on Delivery (Pay on Arrival)",
        transfer: "Direct Bank Transfer",
      };

      const payload = {
        items: orderItems,
        store: {
          id: firstItem?.storeId || activeStore?.id || "sellora-store",
          name: firstItem?.storeName || activeStore?.name || "Sellora Official",
          phone: storeWhatsApp || "",
          bankDetails: storeBank || null,
          isVerified: activeStore?.isVerified ?? true,
        },
        shippingAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: "101241",
          country: "Nigeria",
        },
        notes: deliveryNotes.trim(),
        deliveryNotes: deliveryNotes.trim(),
        deliveryMethod,
        discount,
        payment: {
          method: paymentMethodNames[paymentMethod] || "Cash / POS on Delivery",
          status: paymentMethod === "transfer" ? "PENDING" : "PENDING",
        },
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        await clearCart();
        setPlacedOrder(data.order);
        setToast(`Order #${data.order.orderNumber} placed successfully!`);
      } else {
        setToast(data.error || "Failed to complete order. Please try again.");
      }
    } catch (err) {
      console.error("Order error:", err);
      setToast("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was successfully placed, display confirmation view
  if (placedOrder) {
    const activeBank = (placedOrder.store as any)?.bankDetails || storeBank;
    const activePhone = (placedOrder.store as any)?.phone || storeWhatsApp;
    const activeStoreName = placedOrder.store?.name || activeStore?.name || "Merchant Store";

    return (
      <div className={styles.page}>
        <header className={styles.checkoutNav}>
          <div className={styles.checkoutNavInner}>
            <Link href="/" className={styles.logoLink}>
              <span className={`material-icons-round ${styles.logoIcon}`}>shopping_bag</span>
              Sellora
            </Link>
            <div className={styles.secureBadge}>
              <span className="material-icons-round">verified</span>
              Order Confirmed
            </div>
          </div>
        </header>

        <main className={styles.checkoutContainer}>
          <div className={styles.successModal}>
            <div className={styles.successIconWrapper}>
              <span className="material-icons-round">check_circle</span>
            </div>

            <h1 className={styles.successTitle}>Thank You For Your Order!</h1>
            <p className={styles.successSubtitle}>
              Your order has been recorded for <strong>{activeStoreName}</strong>.{" "}
              {placedOrder.payment?.method?.includes("Transfer")
                ? "Please transfer to the seller's account below to finalize processing."
                : "You will pay upon package arrival at your doorstep."}
            </p>

            {/* Seller's Bank Transfer Details Box if payment is via Transfer */}
            {placedOrder.payment?.method?.includes("Transfer") && (
              <div className={styles.bankTransferCard}>
                <div className={styles.bankTransferHeader}>
                  <span className="material-icons-round" style={{ color: "#2b6dff", fontSize: "20px" }}>
                    account_balance
                  </span>
                  <strong>{activeStoreName} — Bank Transfer Details</strong>
                </div>
                <p className={styles.bankTransferSub}>
                  Please transfer <strong>{currency.format(placedOrder.pricing?.total || grandTotal)}</strong> to the seller's account below:
                </p>
                <div className={styles.bankDetailsGrid}>
                  <div className={styles.bankDetailItem}>
                    <span className={styles.bankDetailLabel}>Bank Name</span>
                    <span className={styles.bankDetailVal}>{activeBank.bankName}</span>
                  </div>
                  <div className={styles.bankDetailItem}>
                    <span className={styles.bankDetailLabel}>Account Number</span>
                    <div className={styles.bankAccRow}>
                      <span className={styles.bankDetailValAcc}>{activeBank.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAccount(activeBank.accountNumber)}
                        className={styles.bankCopyBtn}
                        title="Copy account number"
                      >
                        <span className="material-icons-round" style={{ fontSize: "15px" }}>
                          {copiedAccount ? "check" : "content_copy"}
                        </span>
                        {copiedAccount ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.bankDetailItem}>
                    <span className={styles.bankDetailLabel}>Account Name</span>
                    <span className={styles.bankDetailVal}>{activeBank.accountName}</span>
                  </div>
                </div>
                <div className={styles.bankTransferNote}>
                  <span className="material-icons-round" style={{ fontSize: "16px", color: "#f59e0b" }}>
                    info
                  </span>
                  <span>
                    Use Order Reference <strong>#{placedOrder.orderNumber}</strong> as your payment narration.
                  </span>
                </div>
              </div>
            )}

            {/* Pay on Delivery Notice */}
            {!placedOrder.payment?.method?.includes("Transfer") && (
              <div className={styles.podNoticeCard}>
                <span className="material-icons-round" style={{ color: "#10b981", fontSize: "22px" }}>
                  local_shipping
                </span>
                <div>
                  <strong>Pay on Delivery Active</strong>
                  <p>Please have cash or your ATM card ready for the dispatch rider when your parcel arrives from {activeStoreName}.</p>
                </div>
              </div>
            )}

            <div className={styles.orderReceiptBox}>
              <div className={styles.receiptRow}>
                <span>Order Reference:</span>
                <span className={styles.receiptRowVal}>#{placedOrder.orderNumber}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Seller Store:</span>
                <span className={styles.receiptRowVal}>{activeStoreName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Recipient:</span>
                <span className={styles.receiptRowVal}>{placedOrder.shippingAddress?.fullName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Delivery Address:</span>
                <span className={styles.receiptRowVal}>
                  {placedOrder.shippingAddress?.street}, {placedOrder.shippingAddress?.city},{" "}
                  {placedOrder.shippingAddress?.state}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span>Estimated Delivery:</span>
                <span className={styles.receiptRowVal}>
                  {new Date(placedOrder.estimatedDelivery).toLocaleDateString("en-NG", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className={styles.receiptRow}>
                <span>Payment Mode:</span>
                <span className={styles.receiptRowVal}>{placedOrder.payment?.method || "Cash on Delivery"}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>Total Amount:</span>
                <span className={styles.receiptRowVal} style={{ color: "#2b6dff", fontSize: "16px" }}>
                  {currency.format(placedOrder.pricing?.total || grandTotal)}
                </span>
              </div>
            </div>

            {/* WhatsApp Order Confirmation Button directly to Store Owner */}
            <div className={styles.whatsappActionWrap}>
              <a
                href={`https://wa.me/${activePhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                  `*Sellora Order Confirmation*\n` +
                  `Store: ${activeStoreName}\n` +
                  `Order Ref: #${placedOrder.orderNumber}\n` +
                  `Customer: ${placedOrder.shippingAddress?.fullName}\n` +
                  `Phone: ${placedOrder.shippingAddress?.phone}\n` +
                  `Address: ${placedOrder.shippingAddress?.street}, ${placedOrder.shippingAddress?.city}, ${placedOrder.shippingAddress?.state}\n` +
                  `Amount: ${currency.format(placedOrder.pricing?.total || grandTotal)}\n` +
                  `Payment: ${placedOrder.payment?.method || paymentMethod}\n\n` +
                  `Hello ${activeStoreName}! I just placed an order on Sellora and would like to confirm it.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappConfirmBtn}
                title={`Send confirmation to ${activeStoreName} on WhatsApp`}
              >
                <span className="material-icons-round" style={{ fontSize: "20px" }}>
                  chat
                </span>
                <span>Confirm Order via WhatsApp with {activeStoreName}</span>
              </a>
            </div>

            <div className={styles.successActions}>
              <Link href="/account/orders" className={styles.primarySuccessBtn}>
                <span className="material-icons-round">receipt_long</span>
                View &amp; Track Orders
              </Link>
              <Link href="/" className={styles.secondarySuccessBtn}>
                <span className="material-icons-round">storefront</span>
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If cart is completely empty
  if (items.length === 0 && !isLoadingProducts) {
    return (
      <div className={styles.page}>
        <header className={styles.checkoutNav}>
          <div className={styles.checkoutNavInner}>
            <Link href="/" className={styles.logoLink}>
              <span className={`material-icons-round ${styles.logoIcon}`}>shopping_bag</span>
              Sellora
            </Link>
            <Link href="/cart" className={styles.returnToCartLink}>
              <span className="material-icons-round">arrow_back</span>
              Return to Cart
            </Link>
          </div>
        </header>

        <main className={styles.checkoutContainer}>
          <div className={styles.successModal}>
            <div className={styles.successIconWrapper} style={{ background: "rgba(43, 109, 255, 0.08)", color: "#2b6dff" }}>
              <span className="material-icons-round">shopping_cart</span>
            </div>
            <h1 className={styles.successTitle}>Your Cart is Empty</h1>
            <p className={styles.successSubtitle}>
              You do not have any items ready for checkout. Browse our wide catalog to find something you love.
            </p>
            <Link href="/" className={styles.primarySuccessBtn}>
              <span className="material-icons-round">storefront</span>
              Explore Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Secure Header */}
      <header className={styles.checkoutNav}>
        <div className={styles.checkoutNavInner}>
          <Link href="/" className={styles.logoLink}>
            <span className={`material-icons-round ${styles.logoIcon}`}>shopping_bag</span>
            Sellora
          </Link>

          <div className={styles.secureBadge}>
            <span className="material-icons-round">lock</span>
            256-Bit Bank-Grade Encryption
          </div>

          <Link href="/cart" className={styles.returnToCartLink}>
            <span className="material-icons-round">arrow_back</span>
            Return to Cart
          </Link>
        </div>
      </header>

      {/* Main Checkout Form & Summary */}
      <main className={styles.checkoutContainer}>
        <form onSubmit={handlePlaceOrder} className={styles.checkoutLayout} noValidate>
          {/* Left: Interactive Step Forms */}
          <div className={styles.formColumn}>
            {/* Step 1: Customer Contact Info */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNumber}>1</div>
                <div>
                  <h2 className={styles.stepTitle}>Contact Information</h2>
                  <p className={styles.stepSubtitle}>
                    We will send order confirmation and dispatch receipts to this address.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label className={styles.label}>
                    Email Address <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                    placeholder="e.g. buyer@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    required
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Full Name <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.fullName ? styles.inputError : ""}`}
                    placeholder="e.g. Adebayo Ogunlesi"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                    required
                  />
                  {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Phone Number <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <div className={`${styles.inputWithPrefix} ${errors.phone ? styles.inputError : ""}`}>
                    <span className={styles.prefix}>+234</span>
                    <input
                      type="tel"
                      className={styles.inputInsidePrefix}
                      placeholder="801 234 5678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                      }}
                      required
                    />
                  </div>
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>
              </div>
            </div>

            {/* Step 2: Delivery Address */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNumber}>2</div>
                <div>
                  <h2 className={styles.stepTitle}>Shipping Address</h2>
                  <p className={styles.stepSubtitle}>
                    Enter your street address where the package should be delivered.
                  </p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroupFull}>
                  <label className={styles.label}>
                    Street Address <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.street ? styles.inputError : ""}`}
                    placeholder="House number, street name, apartment or suite"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      if (errors.street) setErrors((prev) => ({ ...prev, street: "" }));
                    }}
                    required
                  />
                  {errors.street && <span className={styles.errorText}>{errors.street}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    City / Town <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <input
                    type="text"
                    className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
                    placeholder="e.g. Lekki Phase 1, Ikeja, Garki"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                    }}
                    required
                  />
                  {errors.city && <span className={styles.errorText}>{errors.city}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    State <span className={styles.requiredAsterisk}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Delivery Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    className={styles.textarea}
                    placeholder="e.g. Landmark, leave with estate security, call 10 mins before arrival..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Delivery Options */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNumber}>3</div>
                <div>
                  <h2 className={styles.stepTitle}>Delivery Method</h2>
                  <p className={styles.stepSubtitle}>
                    Choose how quickly you would like to receive your shipment.
                  </p>
                </div>
              </div>

              <div className={styles.optionsGrid}>
                <div
                  className={`${styles.optionCard} ${
                    deliveryMethod === "standard" ? styles.optionCardActive : ""
                  }`}
                  onClick={() => setDeliveryMethod("standard")}
                >
                  <div className={styles.optionLeft}>
                    <div className={styles.radioCircle}>
                      {deliveryMethod === "standard" && <div className={styles.radioDot} />}
                    </div>
                    <div>
                      <div className={styles.optionTitle}>Standard Nationwide Delivery</div>
                      <div className={styles.optionDesc}>2 - 4 business days with end-to-end tracking</div>
                    </div>
                  </div>
                  <div className={styles.optionPriceFree}>FREE</div>
                </div>

                <div
                  className={`${styles.optionCard} ${
                    deliveryMethod === "express" ? styles.optionCardActive : ""
                  }`}
                  onClick={() => setDeliveryMethod("express")}
                >
                  <div className={styles.optionLeft}>
                    <div className={styles.radioCircle}>
                      {deliveryMethod === "express" && <div className={styles.radioDot} />}
                    </div>
                    <div>
                      <div className={styles.optionTitle}>Express Priority Delivery</div>
                      <div className={styles.optionDesc}>Next business day dispatch directly to your doorstep</div>
                    </div>
                  </div>
                  <div className={styles.optionPrice}>
                    {appliedPromo?.code === "FREESHIP" ? (
                      <span className={styles.optionPriceFree}>FREE</span>
                    ) : (
                      "₦2,500"
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Payment Method */}
            <div className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <div className={styles.stepNumber}>4</div>
                <div>
                  <h2 className={styles.stepTitle}>Payment Method</h2>
                  <p className={styles.stepSubtitle}>
                    All transactions are secure and encrypted with bank-level protection.
                  </p>
                </div>
              </div>

              <div className={styles.paymentCards}>
                {/* Option 1: Cash / POS on Delivery */}
                <div
                  className={`${styles.paymentCard} ${
                    paymentMethod === "pod" ? styles.paymentCardActive : ""
                  }`}
                  onClick={() => setPaymentMethod("pod")}
                >
                  <div className={styles.optionLeft}>
                    <div className={styles.radioCircle}>
                      {paymentMethod === "pod" && <div className={styles.radioDot} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <div className={styles.optionTitle}>Cash / POS on Delivery (Pay on Arrival)</div>
                        <span className={styles.popularBadge}>Most Popular in Nigeria</span>
                      </div>
                      <div className={styles.optionDesc}>
                        Inspect your package upon arrival and pay the delivery rider using Cash or Debit Card via POS
                      </div>
                    </div>
                  </div>
                  <span className="material-icons-round" style={{ color: "#10b981", fontSize: "24px" }}>
                    payments
                  </span>
                </div>

                {/* Option 2: Direct Bank Transfer */}
                <div
                  className={`${styles.paymentCard} ${
                    paymentMethod === "transfer" ? styles.paymentCardActive : ""
                  }`}
                  onClick={() => setPaymentMethod("transfer")}
                >
                  <div className={styles.optionLeft}>
                    <div className={styles.radioCircle}>
                      {paymentMethod === "transfer" && <div className={styles.radioDot} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <div className={styles.optionTitle}>Direct Bank Transfer</div>
                        <span className={styles.instantBadge}>Mobile App Transfer</span>
                      </div>
                      <div className={styles.optionDesc}>
                        Transfer from any Nigerian bank app. Account details and reference provided on order completion
                      </div>
                    </div>
                  </div>
                  <span className="material-icons-round" style={{ color: "#2b6dff", fontSize: "24px" }}>
                    account_balance
                  </span>
                </div>

                {/* Transfer Info Preview when selected */}
                {paymentMethod === "transfer" && (
                  <div className={styles.paymentMethodPreviewNote}>
                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#2b6dff" }}>
                      info
                    </span>
                    <span>
                      You will pay directly to <strong>{activeStore?.name || "the seller"}</strong>&apos;s verified account ({storeBank.bankName}: <strong>{storeBank.accountNumber}</strong>) and confirm on WhatsApp.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Sticky Order Summary & Place Order */}
          <div className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <h2 className={styles.summaryTitle}>Order Summary</h2>
                <span className={styles.itemsCountBadge}>
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Mini Item List Preview */}
              <div className={styles.miniItemsList}>
                {items.map((it) => {
                  const prod = it.product;
                  const imgSrc =
                    (Array.isArray(prod?.images) && prod.images.length > 0
                      ? prod.images[0]
                      : prod?.image) || "/favico.png";

                  return (
                    <div key={it.id} className={styles.miniItemRow}>
                      <Image
                        src={imgSrc}
                        alt={prod?.name || "Product"}
                        width={48}
                        height={48}
                        className={styles.miniItemImage}
                        unoptimized
                      />
                      <div className={styles.miniItemInfo}>
                        <div className={styles.miniItemName}>{prod?.name || "Product"}</div>
                        <div className={styles.miniItemMeta}>
                          Qty: {it.quantity} • {prod?.author || "Sellora"}
                        </div>
                      </div>
                      <div className={styles.miniItemPrice}>
                        {currency.format(it.totalPrice)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code Box */}
              <div className={styles.promoContainer}>
                {appliedPromo ? (
                  <div className={styles.promoSuccessBadge}>
                    <span>
                      <strong>{appliedPromo.code}</strong> applied ({appliedPromo.label})
                    </span>
                    <button
                      type="button"
                      className={styles.promoRemoveBtn}
                      onClick={handleRemovePromo}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className={styles.promoInputRow}>
                    <input
                      type="text"
                      className={styles.promoInput}
                      placeholder="Promo code (e.g. WELCOME10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.promoApplyBtn}
                      onClick={handleApplyPromo}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span className={styles.summaryRowVal}>{currency.format(subtotal)}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Delivery ({deliveryMethod === "express" ? "Express" : "Standard"})</span>
                  <span className={styles.summaryRowVal}>
                    {shippingFee === 0 ? (
                      <span className={styles.discountVal}>FREE</span>
                    ) : (
                      currency.format(shippingFee)
                    )}
                  </span>
                </div>

                {discount > 0 && (
                  <div className={styles.summaryRow}>
                    <span>Promo Discount</span>
                    <span className={styles.discountVal}>-{currency.format(discount)}</span>
                  </div>
                )}

                <div className={styles.summaryRow}>
                  <span>Estimated Tax</span>
                  <span className={styles.summaryRowVal}>₦0 (Included)</span>
                </div>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryTotalLabel}>Total Amount</span>
                <span className={styles.summaryTotalVal}>{currency.format(grandTotal)}</span>
              </div>

              <button
                type="submit"
                className={styles.placeOrderBtn}
                disabled={isSubmitting || items.length === 0}
              >
                <span className="material-icons-round">
                  {isSubmitting ? "hourglass_top" : "lock"}
                </span>
                {isSubmitting ? "Placing Order..." : `Place Order • ${currency.format(grandTotal)}`}
              </button>

              <div className={styles.trustFooter}>
                <div className={styles.trustItem}>
                  <span className="material-icons-round">verified_user</span>
                  <span>100% Protected &amp; Verified Transactions</span>
                </div>
                <div className={styles.trustItem}>
                  <span className="material-icons-round">published_with_changes</span>
                  <span>7-Day Return &amp; Exchange Policy</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Toast message={toast} />
    </div>
  );
}
