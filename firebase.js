// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyinTZYGcVAhpsSKn0onkb6wahkzfZEOs",
  authDomain: "canteen-app-de2d1.firebaseapp.com",
  databaseURL: "https://canteen-app-de2d1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "canteen-app-de2d1",
  storageBucket: "canteen-app-de2d1.appspot.com",
  messagingSenderId: "695432104819",
  appId: "1:695432104819:web:fe70b340511a14c7bdd306"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Make db accessible globally
window.db = db;
