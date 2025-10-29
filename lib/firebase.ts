import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJtUj8TXFRHp0-OAOAB_LFYMPwFadOXsU",
  authDomain: "skillbridge-sepm.firebaseapp.com",
  projectId: "skillbridge-sepm",
  storageBucket: "skillbridge-sepm.firebasestorage.app",
  messagingSenderId: "596417414557",
  appId: "1:596417414557:web:e1237e8152ab9d49ebdb74",
  measurementId: "G-BZG05BDJHS"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
