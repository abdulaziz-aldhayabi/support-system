// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBK522X3bdHL-olbOZmn3rZswNId7z8iJQ",
  authDomain: "support-100.firebaseapp.com",
  projectId: "support-100",
  storageBucket: "support-100.firebasestorage.app",
  messagingSenderId: "108468769660",
  appId: "1:108468769660:web:a646ed010b2727d5754af9",
  measurementId: "G-6YJF9E63PG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);