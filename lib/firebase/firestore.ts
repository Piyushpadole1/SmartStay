import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type QueryConstraint,
  writeBatch,
  Timestamp,
} from "firebase/firestore"
import { db } from "./config"
import type { Application, Room, Settings, User, Category, DEFAULT_SEAT_DISTRIBUTION } from "@/lib/types"

// Users
export async function getUser(uid: string): Promise<User | null> {
  const docRef = doc(db, "users", uid)
  const docSnap = await getDoc(docRef)
  return docSnap.exists() ? (docSnap.data() as User) : null
}

// Applications
export async function createApplication(application: Omit<Application, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const docRef = doc(collection(db, "applications"))
  await setDoc(docRef, {
    ...application,
    id: docRef.id,
    // Add default validation object if not provided
    validation: application.validation || {
      nameMatch: "pending",
      marksMatch: "pending",
      aadhaarMatch: "pending",
      categoryMatch: "pending"
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getApplication(id: string): Promise<Application | null> {
  const docRef = doc(db, "applications", id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Application
}

export async function getUserApplication(userId: string): Promise<Application | null> {
  const q = query(collection(db, "applications"), where("userId", "==", userId))
  const querySnapshot = await getDocs(q)
  if (querySnapshot.empty) return null
  const doc = querySnapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Application
}

export async function updateApplication(id: string, data: Partial<Application>): Promise<void> {
  const docRef = doc(db, "applications", id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllApplications(constraints: QueryConstraint[] = []): Promise<Application[]> {
  const q = query(collection(db, "applications"), ...constraints)
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Application)
}

export async function getApplicationsByStatus(status: Application["status"]): Promise<Application[]> {
  return getAllApplications([where("status", "==", status), orderBy("createdAt", "desc")])
}

export async function getApplicationsByBranchYear(branch: string, year: number): Promise<Application[]> {
  return getAllApplications([
    where("branch", "==", branch),
    where("year", "==", year),
    where("status", "in", ["pending", "selected", "waitlisted", "confirmed"]),
  ])
}

export async function getApplicationsByGender(gender: "male" | "female"): Promise<Application[]> {
  return getAllApplications([where("gender", "==", gender), orderBy("createdAt", "desc")])
}

// Rooms
export async function initializeRooms(hostelType?: "boys" | "girls", structure?: { floors: number; roomsPerFloor: number; capacityPerRoom: number }): Promise<void> {
  const batch = writeBatch(db)
  
  // Default structure if not provided
  const floors = structure?.floors || 6
  const roomsPerFloor = structure?.roomsPerFloor || 16
  const capacity = structure?.capacityPerRoom || 2
  
  // Prefix for room numbers: B for boys, G for girls, or none for mixed
  const prefix = hostelType === "boys" ? "B" : hostelType === "girls" ? "G" : ""
  
  for (let floor = 1; floor <= floors; floor++) {
    for (let room = 1; room <= roomsPerFloor; room++) {
      const roomNumber = `${prefix}${floor}${room.toString().padStart(2, "0")}`
      const docRef = doc(db, "rooms", roomNumber)
      batch.set(docRef, {
        roomNumber,
        floor,
        capacity,
        occupants: [],
        status: "available",
        hostelType: hostelType || null,
      })
    }
  }
  
  await batch.commit()
}

// Initialize rooms for boys hostel only
export async function initializeBoysRooms(structure?: { floors: number; roomsPerFloor: number; capacityPerRoom: number }): Promise<void> {
  return initializeRooms("boys", structure)
}

// Initialize rooms for girls hostel only
export async function initializeGirlsRooms(structure?: { floors: number; roomsPerFloor: number; capacityPerRoom: number }): Promise<void> {
  return initializeRooms("girls", structure)
}

export async function getRoom(roomNumber: string): Promise<Room | null> {
  const docRef = doc(db, "rooms", roomNumber)
  const docSnap = await getDoc(docRef)
  return docSnap.exists() ? (docSnap.data() as Room) : null
}

export async function getAllRooms(hostelType?: "boys" | "girls"): Promise<Room[]> {
  let q
  if (hostelType) {
    q = query(collection(db, "rooms"), where("hostelType", "==", hostelType), orderBy("roomNumber"))
  } else {
    q = query(collection(db, "rooms"), orderBy("roomNumber"))
  }
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => doc.data() as Room)
}

export async function assignRoom(roomNumber: string, applicationId: string): Promise<boolean> {
  const room = await getRoom(roomNumber)
  if (!room || room.occupants.length >= room.capacity) return false
  
  const newOccupants = [...room.occupants, applicationId]
  await updateDoc(doc(db, "rooms", roomNumber), {
    occupants: newOccupants,
    status: newOccupants.length >= room.capacity ? "full" : "partial",
  })
  
  return true
}

export async function removeFromRoom(roomNumber: string, applicationId: string): Promise<void> {
  const room = await getRoom(roomNumber)
  if (!room) return
  
  const newOccupants = room.occupants.filter((id) => id !== applicationId)
  await updateDoc(doc(db, "rooms", roomNumber), {
    occupants: newOccupants,
    status: newOccupants.length === 0 ? "available" : "partial",
  })
}

// Settings
export async function getSettings(): Promise<Settings | null> {
  const docRef = doc(db, "settings", "global")
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return docSnap.data() as Settings
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
  const docRef = doc(db, "settings", "global")
  await setDoc(docRef, data, { merge: true })
}

export async function initializeSettings(seatDistribution: typeof DEFAULT_SEAT_DISTRIBUTION): Promise<void> {
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 30) // 30 days from now
  
  await setDoc(doc(db, "settings", "global"), {
    applicationDeadline: Timestamp.fromDate(deadline),
    confirmationPeriodDays: 3,
    seatDistributionBoys: seatDistribution,
    seatDistributionGirls: seatDistribution,
    seatsPerBranchYear: 10,
  })
}

// Batch operations for allocation
export async function batchUpdateApplications(
  updates: { id: string; data: Partial<Application> }[]
): Promise<void> {
  const batch = writeBatch(db)
  
  for (const { id, data } of updates) {
    const docRef = doc(db, "applications", id)
    batch.update(docRef, { ...data, updatedAt: serverTimestamp() })
  }
  
  await batch.commit()
}

// Get available rooms by hostel type
export async function getAvailableRooms(hostelType: "boys" | "girls"): Promise<Room[]> {
  const q = query(
    collection(db, "rooms"),
    where("hostelType", "==", hostelType),
    where("status", "in", ["available", "partial"])
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map((doc) => doc.data() as Room)
}

// Get room statistics by hostel type
export async function getRoomStats(hostelType?: "boys" | "girls"): Promise<{
  total: number
  available: number
  partial: number
  full: number
  totalCapacity: number
  occupiedCapacity: number
}> {
  let rooms: Room[]
  if (hostelType) {
    rooms = await getAllRooms(hostelType)
  } else {
    rooms = await getAllRooms()
  }
  
  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === "available").length,
    partial: rooms.filter(r => r.status === "partial").length,
    full: rooms.filter(r => r.status === "full").length,
    totalCapacity: rooms.reduce((sum, r) => sum + r.capacity, 0),
    occupiedCapacity: rooms.reduce((sum, r) => sum + r.occupants.length, 0),
  }
  
  return stats
}