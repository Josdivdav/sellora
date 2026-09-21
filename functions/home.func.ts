import { app } from "@/lib/firebase";

import { getAuth, signOut, User } from "firebase/auth";

export const SignOut = async () => {
    const auth = getAuth(app);
    try {
        await signOut(auth);
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

        const result = await response.json();
        return result.user;
    } catch (error) {
        console.error(error);
    }
}