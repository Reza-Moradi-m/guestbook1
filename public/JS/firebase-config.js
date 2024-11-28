// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDjQvmQKE77NmdCNMjwQ9D8dEtxdo0ZrUc",
    authDomain: "astronomy-guestbook.firebaseapp.com",
    projectId: "astronomy-guestbook",
    storageBucket: "astronomy-guestbook.appspot.com", // Corrected to the default bucket format
    messagingSenderId: "680979689903",
    appId: "1:680979689903:web:b31210872fff1d641b7f5a",
    measurementId: "G-LDFCYT5NGY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication
const auth = getAuth(app);
const storage = getStorage(app);

// Export necessary objects and functions
export { app, auth, storage };
export function signUp(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => userCredential.user)
        .catch((error) => {
            console.error("Sign-up error:", error);
            throw error;
        });
}

export function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => userCredential.user)
        .catch((error) => {
            console.error("Login error:", error);
            throw error;
        });
}
