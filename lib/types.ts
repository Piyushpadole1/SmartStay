import type { Timestamp } from "firebase/firestore"

export type UserRole = "student" | "admin"

export type Branch = "Civil" | "ETC" | "Mechanical" | "Electrical" | "CSE"
export type Year = 1 | 2 | 3 | 4
export type Category = "Open" | "SC" | "ST" | "VJNT" | "OBC" | "EWS" | "SEBC" | "PWD"
export type AdmissionType = "CET" | "SGPA"
export type ApplicationStatus = "draft" | "pending" | "selected" | "waitlisted" | "confirmed" | "expired" | "rejected"
export type ValidationStatus = "verified" | "warning" | "error" | "pending"
export type Gender = "male" | "female"
export type HostelType = "boys" | "girls"

export interface User {
  uid: string
  email: string
  role: UserRole
  createdAt: Timestamp
}

export interface OCRData {
  extractedName: string
  extractedMarks: number | null
  extractedCategory: string
  extractedAadhaar: string
  extractedCollege: string
  confidence: number
}

export interface ValidationResult {
  nameMatch: ValidationStatus
  marksMatch: ValidationStatus
  categoryMatch: ValidationStatus
  aadhaarMatch: ValidationStatus
  crossDocumentStatus?: ValidationStatus
  crossDocumentIssues?: string[]
  crossDocumentWarnings?: string[]
  crossDocumentScore?: number
  // Add for display
  extractedName?: string | null
  extractedSGPA?: number | null
  extractedCategory?: string | null
  extractedAadhaar?: string | null
  extractedCollege?: string | null
  extractedRollNo?: string | null
}

export interface Documents {
  marksheet: string
  aadhaarCard: string
  categoryProof?: string
  profilePhoto: string
  signature: string
}

export interface Application {
  id: string
  userId: string
  status: ApplicationStatus
  
  // Student Info
  fullName: string
  email: string
  phone: string
  branch: Branch
  year: Year
  category: Category
  aadhaarNumber: string
  hostelType: HostelType
  gender?: "male" | "female" | "other"
  caste?: string
  permanentAddress?: string
  pincode?: string
  // Academic
  admissionType: AdmissionType
  cetMarks?: number
  sgpa?: number
  
  // Documents (base64 or data URLs for now)
  documents: Documents
  
  // OCR Data (only for marksheet, aadhaar, category)
  ocrData: OCRData
  
  // Validation (only for documents with OCR)
  validation: ValidationResult
  
  // Allocation
  meritRank?: number
  roomNumber?: string
  floor?: number
  confirmationDeadline?: Timestamp
  
  createdAt: Timestamp
  updatedAt: Timestamp
}
export interface Room {
  roomNumber: string
  floor: number
  capacity: number
  occupants: string[]
  status: "available" | "partial" | "full"
  hostelType?: "boys" | "girls"  // Add this line
}
export interface Settings {
  applicationDeadline: Timestamp
  confirmationPeriodDays: number
  seatDistributionBoys: Record<Category, number>
  seatDistributionGirls: Record<Category, number>
  seatsPerBranchYear: number
}

export const BRANCHES: Branch[] = ["Civil", "ETC", "Mechanical", "Electrical", "CSE"]
export const YEARS: Year[] = [1, 2, 3, 4]
export const CATEGORIES: Category[] = ["Open", "SC", "ST", "VJNT", "OBC", "EWS", "SEBC", "PWD"]

export const DEFAULT_SEAT_DISTRIBUTION: Record<Category, number> = {
  "Open": 3,
  "SC/ST": 2,
  "VJNT": 1,
  "OBC": 2,
  "EWS/SEBC": 1,
  "PWD": 1
}
