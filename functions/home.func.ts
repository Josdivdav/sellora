import { app } from "@/lib/firebase";

import { getAuth, signOut, User } from "firebase/auth";

export const notifySessionExpired = () => {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sellora_session_expired"));
    }
};

export const SignOut = async () => {
    const auth = getAuth(app);
    try {
        await signOut(auth);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("sellora_store_status_changed"));
            window.dispatchEvent(new Event("sellora_session_expired"));
        }
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export const fetchUserData = async (user : any) => {
    const token = await user?.getIdToken();

    try {
        const response = await fetch("/api/user/me/", {
            method: "GET",
            headers: {
                'authorization': 'Bearer '+token
            }
        });

        if (response.status === 401) {
            notifySessionExpired();
            return null;
        }

        const result = await response.json();
        return result.user;
    } catch (error) {
        console.error(error);
    }
}