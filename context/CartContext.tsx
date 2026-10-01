"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";

interface CartContextType {
  cart: Record<string, number>;
  cartCount: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  setCartItemQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  cart: {},
  cartCount: 0,
  addToCart: async () => {},
  removeFromCart: async () => {},
  setCartItemQuantity: async () => {},
  clearCart: async () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Record<string, number>>({});

  // Sync cart from Firestore database when user signs in
  useEffect(() => {
    let isMounted = true;
    async function loadUserCart() {
      if (!user) {
        setCart({});
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/user/cart", {
          headers: { authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.cart) {
            setCart(data.cart);
          }
        }
      } catch (err) {
        console.warn("Could not sync cart from database:", err);
      }
    }

    void loadUserCart();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const addToCart = useCallback(
    async (productId: string, quantity: number = 1) => {
      setCart((prev) => ({
        ...prev,
        [productId]: (prev[productId] || 0) + quantity,
      }));

      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/user/cart", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId, quantity, action: "add" }),
          });
        } catch (err) {
          console.warn("Could not persist cart addition to database:", err);
        }
      }
    },
    [user]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      setCart((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });

      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/user/cart", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId, action: "remove" }),
          });
        } catch (err) {
          console.warn("Could not persist cart removal to database:", err);
        }
      }
    },
    [user]
  );

  const setCartItemQuantity = useCallback(
    async (productId: string, quantity: number) => {
      setCart((prev) => {
        if (quantity <= 0) {
          const next = { ...prev };
          delete next[productId];
          return next;
        }
        return {
          ...prev,
          [productId]: quantity,
        };
      });

      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/user/cart", {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ productId, quantity, action: "set" }),
          });
        } catch (err) {
          console.warn("Could not persist cart quantity to database:", err);
        }
      }
    },
    [user]
  );

  const clearCart = useCallback(async () => {
    setCart({});
    if (user) {
      try {
        const token = await user.getIdToken();
        await fetch("/api/user/cart", {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn("Could not clear cart in database:", err);
      }
    }
  }, [user]);

  const cartCount = useMemo(() => {
    return Object.values(cart).reduce((acc, qty) => acc + (typeof qty === "number" ? qty : 1), 0);
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        removeFromCart,
        setCartItemQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
