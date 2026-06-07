import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA53XfASR6IRGTKbFOzL_PpgNguW6l6FYc",
  authDomain: "jeeappv1.firebaseapp.com",
  projectId: "jeeappv1",
  storageBucket: "jeeappv1.firebasestorage.app",
  messagingSenderId: "132830857624",
  appId: "1:132830857624:web:b6e1edbbc59724549883ed",
  measurementId: "G-YMQ20WPK78"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();