import { app } from "@/lib/firebase";

import { getAuth, signOut } from "firebase/auth";


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