/**
 * Client-side helper for toggling and fetching store follow state directly with the database
 */

export interface FollowResult {
  success: boolean;
  isFollowing?: boolean;
  followersCount?: number;
  reason?: "NOT_LOGGED_IN" | "IS_OWNER" | "ERROR";
  message?: string;
}

export async function toggleStoreFollow(params: {
  storeSlug: string;
  storeId?: string;
  storeName?: string;
  token?: string | null;
  isLoggedIn: boolean;
  isOwner: boolean;
}): Promise<FollowResult> {
  const { storeSlug, storeId, storeName, token, isLoggedIn, isOwner } = params;

  // 1. Guard: Check if logged in
  if (!isLoggedIn || !token) {
    return {
      success: false,
      reason: "NOT_LOGGED_IN",
      message: "Please sign in to follow this store.",
    };
  }

  // 2. Guard: Check if user is the store owner
  if (isOwner) {
    return {
      success: false,
      reason: "IS_OWNER",
      message: "You cannot follow your own store.",
    };
  }

  try {
    const res = await fetch(`/api/stores/${encodeURIComponent(storeSlug)}/follow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "toggle" }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        return {
          success: false,
          reason: "NOT_LOGGED_IN",
          message: data.error || "Please sign in to follow this store.",
        };
      }
      if (data.code === "IS_OWNER") {
        return {
          success: false,
          reason: "IS_OWNER",
          message: "You cannot follow your own store.",
        };
      }
      return {
        success: false,
        reason: "ERROR",
        message: data.error || "Could not update follow status.",
      };
    }

    const { isFollowing, followersCount } = data;

    // Broadcast event across components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sellora_store_follow_changed", {
          detail: {
            storeSlug,
            storeId,
            isFollowing,
            followersCount,
            storeName,
          },
        })
      );
      window.dispatchEvent(new Event("sellora_favorites_updated"));
    }

    return {
      success: true,
      isFollowing,
      followersCount,
      message: isFollowing
        ? `Following ${storeName || "store"}! You will receive new arrival updates.`
        : `Unfollowed ${storeName || "store"}.`,
    };
  } catch (error) {
    console.error("Error in toggleStoreFollow:", error);
    return {
      success: false,
      reason: "ERROR",
      message: "Network error while updating follow status.",
    };
  }
}
