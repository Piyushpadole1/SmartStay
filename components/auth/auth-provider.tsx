"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  type UserCredential,
} from "firebase/auth"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase/config"
import type { User, UserRole } from "@/lib/types"

interface AuthContextType {
  user: FirebaseUser | null
  userData: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<UserCredential>
  signUp: (email: string, password: string, role?: UserRole) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User)
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, "users", result.user.uid))
    if (userDoc.exists()) {
      setUserData(userDoc.data() as User)
    }
    return result
  }

  const signUp = async (email: string, password: string, role: UserRole = "student") => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    
    const newUser: Omit<User, "createdAt"> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      uid: result.user.uid,
      email: result.user.email!,
      role,
      createdAt: serverTimestamp(),
    }
    
    await setDoc(doc(db, "users", result.user.uid), newUser)
    setUserData(newUser as unknown as User)
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUserData(null)
  }

  const isAdmin = userData?.role === "admin"

  return (
    <AuthContext.Provider value={{ user, userData, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
