import type { ValidationResult, ValidationStatus, OCRData } from "@/lib/types"
import { calculateSimilarity } from "@/lib/ocr/tesseract"

// ============ CONFIGURATION ============

const EXACT_MATCH_THRESHOLD = 0.85
const PARTIAL_MATCH_THRESHOLD = 0.65
const CROSS_DOCUMENT_THRESHOLD = 0.75
const NAME_CONFLICT_THRESHOLD = 0.6

// ============ NAME NORMALIZATION & HANDLING ============

export interface NameComponents {
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  initials: string
}

export interface NameConflict {
  type: "order_mismatch" | "middle_name_missing" | "initial_expansion" | "typo"
  severity: "low" | "medium" | "high"
  suggestion: string
}

export function parseNameComponents(name: string): NameComponents {
  if (!name) {
    return { firstName: "", middleName: "", lastName: "", fullName: "", initials: "" }
  }
  
  const cleaned = name.trim().replace(/\s+/g, " ")
  const parts = cleaned.split(" ")
  
  let firstName = ""
  let middleName = ""
  let lastName = ""
  let initials = ""
  
  if (parts.length === 1) {
    firstName = parts[0]
    if (parts[0].includes(".") || (parts[0].length <= 3 && parts[0].toUpperCase() === parts[0])) {
      initials = parts[0]
    }
  } else if (parts.length === 2) {
    firstName = parts[0]
    lastName = parts[1]
  } else if (parts.length >= 3) {
    firstName = parts[0]
    lastName = parts[parts.length - 1]
    middleName = parts.slice(1, -1).join(" ")
  }
  
  const initialMatch = cleaned.match(/\b([A-Z])\./g)
  if (initialMatch) {
    initials = initialMatch.join(" ")
  }
  
  return {
    firstName,
    middleName,
    lastName,
    fullName: cleaned,
    initials,
  }
}

export function normalizeName(name: string, options?: { 
  removeSpecialChars?: boolean
  expandInitials?: boolean
  standardizeOrder?: boolean
}): string {
  if (!name) return ""
  
  const opts = { removeSpecialChars: true, expandInitials: false, standardizeOrder: true, ...options }
  
  let processed = name.toUpperCase().trim()
  
  if (opts.removeSpecialChars) {
    processed = processed.replace(/[^A-Z\s\-']/g, "")
  }
  
  const ocrFixes: Record<string, string> = {
    "GATKWAD": "GAIKWAD",
    "GATK WAD": "GAIKWAD",
    "GAITKWAD": "GAIKWAD",
    "RAMKRUSHNA": "RAMKRUSHNA",
    "PRAKASH": "PRAKASH",
    "KETAN": "KETAN",
    "KARAN": "KARAN",
    "GORE": "GORE",
    "0": "O",
    "1": "I",
    "5": "S",
  }
  
  for (const [wrong, correct] of Object.entries(ocrFixes)) {
    processed = processed.replace(new RegExp(wrong, 'gi'), correct)
  }
  
  processed = processed.replace(/\./g, "")
  processed = processed.replace(/\s+/g, " ").trim()
  
  if (opts.standardizeOrder) {
    const components = parseNameComponents(processed)
    if (components.lastName && components.firstName) {
      processed = `${components.firstName} ${components.lastName}`
    }
  }
  
  return processed
}

export function detectNameConflicts(name1: string, name2: string): NameConflict[] {
  const conflicts: NameConflict[] = []
  
  if (!name1 || !name2) return conflicts
  
  const comp1 = parseNameComponents(name1)
  const comp2 = parseNameComponents(name2)
  
  if (comp1.firstName === comp2.lastName && comp1.lastName === comp2.firstName) {
    conflicts.push({
      type: "order_mismatch",
      severity: "low",
      suggestion: `Name order is reversed. Expected "${comp1.firstName} ${comp1.lastName}" or "${comp2.firstName} ${comp2.lastName}"`,
    })
  }
  
  if (comp1.middleName && !comp2.middleName && comp1.firstName === comp2.firstName && comp1.lastName === comp2.lastName) {
    conflicts.push({
      type: "middle_name_missing",
      severity: "low",
      suggestion: `Middle name "${comp1.middleName}" is missing in one document`,
    })
  }
  
  if (comp1.initials && comp2.firstName) {
    const initialMatch = comp2.firstName.split("").every(char => 
      comp1.initials.toLowerCase().includes(char.toLowerCase())
    )
    if (initialMatch) {
      conflicts.push({
        type: "initial_expansion",
        severity: "low",
        suggestion: `"${comp1.initials}" matches "${comp2.firstName}"`,
      })
    }
  }
  
  const similarity = calculateNameSimilarity(name1, name2)
  if (similarity > NAME_CONFLICT_THRESHOLD && similarity < EXACT_MATCH_THRESHOLD * 100) {
    conflicts.push({
      type: "typo",
      severity: similarity > 80 ? "low" : "medium",
      suggestion: `Names are similar (${similarity.toFixed(0)}% match). Possible typo.`,
    })
  }
  
  return conflicts
}

export function calculateNameSimilarity(
  name1: string, 
  name2: string, 
  detectConflicts: boolean = false
): number {
  if (!name1 || !name2) return 0
  
  const norm1 = normalizeName(name1)
  const norm2 = normalizeName(name2)
  
  if (norm1 === norm2) return 100
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 90
  }
  
  const comp1 = parseNameComponents(norm1)
  const comp2 = parseNameComponents(norm2)
  
  let score = 0
  let totalWeight = 0
  
  if (comp1.firstName && comp2.firstName) {
    totalWeight += 45
    const firstNameSimilarity = calculateStringSimilarity(comp1.firstName, comp2.firstName)
    score += firstNameSimilarity * 45
    
    if (comp1.firstName.length === 1 && comp2.firstName.startsWith(comp1.firstName)) {
      score += 35
    } else if (comp2.firstName.length === 1 && comp1.firstName.startsWith(comp2.firstName)) {
      score += 35
    }
  }
  
  if (comp1.lastName && comp2.lastName) {
    totalWeight += 45
    const lastNameSimilarity = calculateStringSimilarity(comp1.lastName, comp2.lastName)
    score += lastNameSimilarity * 45
  } else if (comp1.lastName && !comp2.lastName) {
    if (norm2.includes(comp1.lastName)) {
      score += 30
      totalWeight += 45
    }
  } else if (!comp1.lastName && comp2.lastName) {
    if (norm1.includes(comp2.lastName)) {
      score += 30
      totalWeight += 45
    }
  }
  
  if (comp1.middleName && comp2.middleName) {
    totalWeight += 10
    const middleSimilarity = calculateStringSimilarity(comp1.middleName, comp2.middleName)
    score += middleSimilarity * 10
  }
  
  if (totalWeight === 0) {
    const fullSimilarity = calculateStringSimilarity(norm1, norm2)
    return fullSimilarity * 100
  }
  
  const words1 = norm1.split(" ")
  const words2 = norm2.split(" ")
  const commonWords = words1.filter(w => words2.includes(w)).length
  const totalUniqueWords = new Set([...words1, ...words2]).size
  const wordOverlapBonus = (commonWords / totalUniqueWords) * 15
  score += wordOverlapBonus
  
  return Math.min(100, score / (totalWeight / 100))
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  
  return matrix[s1.length][s2.length]
}

// ============ SGPA EXTRACTION FUNCTION ==========

export function extractSGPAFromText(text: string): number | null {
  if (!text) return null;
  
  console.log("🔍 ========== SGPA EXTRACTION STARTED ==========");
  
  // Method 1: Look for SGPA with label
  const sgpaWithLabel = text.match(/SGPA\s*:\s*(\d+\.?\d{1,2})/i);
  if (sgpaWithLabel) {
    const value = parseFloat(sgpaWithLabel[1]);
    if (value >= 0 && value <= 10) {
      console.log(`✅ SGPA found with label: ${value}`);
      return value;
    }
  }
  
  // Method 2: Look for SGPA in table format
  const sgpaTable = text.match(/SGPA\s+(\d+\.?\d{1,2})/i);
  if (sgpaTable) {
    const value = parseFloat(sgpaTable[1]);
    if (value >= 0 && value <= 10) {
      console.log(`✅ SGPA found in table: ${value}`);
      return value;
    }
  }
  
  // Method 3: Look for bracket pattern
  const bracketPattern = /\]\s*(\d+\.\d{2})\s*\|/;
  const bracketMatch = text.match(bracketPattern);
  if (bracketMatch && bracketMatch[1]) {
    const value = parseFloat(bracketMatch[1]);
    if (value >= 5.0 && value <= 10.0) {
      console.log(`✅ SGPA found in bracket pattern: ${value}`);
      return value;
    }
  }
  
  // Method 4: Look for decimal in bottom lines
  const lines = text.split('\n');
  const lastLines = lines.slice(-15).join('\n');
  const decimals = lastLines.match(/\b([5-9]\.[0-9]{2})\b/g);
  if (decimals) {
    for (const dec of decimals) {
      const value = parseFloat(dec);
      if (value >= 5.0 && value <= 10.0) {
        console.log(`✅ SGPA found in bottom lines: ${value}`);
        return value;
      }
    }
  }
  
  console.log("❌ SGPA NOT FOUND");
  return null;
}

// ============ FIELD VALIDATION ============

export interface FieldValidationOptions {
  exactMatchThreshold?: number
  partialMatchThreshold?: number
  allowNull?: boolean
}

export function validateField(
  userValue: string | number | undefined,
  ocrValue: string | number | undefined | null,
  options?: FieldValidationOptions
): ValidationStatus {
  const opts = { exactMatchThreshold: EXACT_MATCH_THRESHOLD, partialMatchThreshold: PARTIAL_MATCH_THRESHOLD, allowNull: false, ...options }
  
  if ((ocrValue === null || ocrValue === undefined || ocrValue === "") && !opts.allowNull) {
    return "pending"
  }
  
  if ((userValue === undefined || userValue === "") && !opts.allowNull) {
    return "pending"
  }
  
  if (typeof userValue === "number" && typeof ocrValue === "number") {
    return validateNumericField(userValue, ocrValue, opts)
  }
  
  if (typeof userValue === "string" && typeof ocrValue === "string") {
    return validateStringField(userValue, ocrValue, opts)
  }
  
  if (userValue === ocrValue) return "verified"
  
  return "error"
}

function validateNumericField(
  userValue: number, 
  ocrValue: number, 
  opts: { exactMatchThreshold: number; partialMatchThreshold: number }
): ValidationStatus {
  const diff = Math.abs(userValue - ocrValue)
  const maxVal = Math.max(Math.abs(userValue), Math.abs(ocrValue))
  const similarity = maxVal === 0 ? 1 : 1 - diff / maxVal
  
  if (similarity >= opts.exactMatchThreshold) return "verified"
  if (similarity >= opts.partialMatchThreshold) return "warning"
  return "error"
}

function validateStringField(
  userValue: string,
  ocrValue: string,
  opts: { exactMatchThreshold: number; partialMatchThreshold: number }
): ValidationStatus {
  const normalizedUser = normalizeName(userValue)
  const normalizedOCR = normalizeName(ocrValue)
  
  const similarity = calculateStringSimilarity(normalizedUser, normalizedOCR)
  
  if (similarity >= opts.exactMatchThreshold) return "verified"
  if (similarity >= opts.partialMatchThreshold) return "warning"
  return "error"
}

// ============ ENHANCED NAME VALIDATION ============

export interface NameValidationResult {
  status: ValidationStatus
  similarity: number
  conflicts: NameConflict[]
  suggestedName: string | null
  matchDetails: {
    firstNameMatch: boolean
    lastNameMatch: boolean
    middleNameMatch: boolean
    orderMatch: boolean
  }
}

export function validateNameField(
  userFullName: string,
  ocrExtractedName: string | null | undefined
): NameValidationResult {
  if (!ocrExtractedName) {
    return {
      status: "pending",
      similarity: 0,
      conflicts: [],
      suggestedName: null,
      matchDetails: { firstNameMatch: false, lastNameMatch: false, middleNameMatch: false, orderMatch: false }
    }
  }
  
  if (!userFullName) {
    return {
      status: "pending",
      similarity: 0,
      conflicts: [],
      suggestedName: null,
      matchDetails: { firstNameMatch: false, lastNameMatch: false, middleNameMatch: false, orderMatch: false }
    }
  }
  
  const similarity = calculateNameSimilarity(userFullName, ocrExtractedName)
  const conflicts = detectNameConflicts(userFullName, ocrExtractedName)
  
  const userComponents = parseNameComponents(userFullName)
  const ocrComponents = parseNameComponents(ocrExtractedName)
  
  const firstNameMatch = userComponents.firstName && ocrComponents.firstName && 
    calculateStringSimilarity(
      normalizeName(userComponents.firstName), 
      normalizeName(ocrComponents.firstName)
    ) > 0.75
  const lastNameMatch = userComponents.lastName && ocrComponents.lastName &&
    calculateStringSimilarity(
      normalizeName(userComponents.lastName), 
      normalizeName(ocrComponents.lastName)
    ) > 0.75
  const middleNameMatch = userComponents.middleName && ocrComponents.middleName &&
    calculateStringSimilarity(
      normalizeName(userComponents.middleName), 
      normalizeName(ocrComponents.middleName)
    ) > 0.7
  const orderMatch = userComponents.firstName === ocrComponents.firstName && 
    userComponents.lastName === ocrComponents.lastName
  
  let status: ValidationStatus = "error"
  if (similarity >= EXACT_MATCH_THRESHOLD * 100) {
    status = "verified"
  } else if (similarity >= PARTIAL_MATCH_THRESHOLD * 100) {
    status = "warning"
  }
  
  let suggestedName: string | null = null
  if (status === "warning" && similarity > 60) {
    suggestedName = userFullName.length >= (ocrExtractedName?.length || 0) ? userFullName : ocrExtractedName || null
  }
  
  return {
    status,
    similarity,
    conflicts,
    suggestedName,
    matchDetails: { firstNameMatch, lastNameMatch, middleNameMatch, orderMatch }
  }
}

// ============ SGPA & MARKS VALIDATION ============

export interface MarksValidationResult {
  status: ValidationStatus
  extractedValue: number | null
  userValue: number | null
  difference: number
  isSGPA: boolean
}

export function validateMarksField(
  userMarks: number | undefined,
  userSGPA: number | undefined,
  ocrMarks: number | null | undefined,
  ocrSGPA: number | null | undefined
): MarksValidationResult {
  const userValue = userMarks ?? userSGPA
  const ocrValue = ocrMarks ?? ocrSGPA
  const isSGPA = (userSGPA !== undefined && userSGPA <= 10) || (ocrSGPA !== undefined && ocrSGPA <= 10) || (ocrValue !== null && ocrValue <= 10)
  
  console.log(`📊 Marks Validation - User: ${userValue}, OCR: ${ocrValue}, isSGPA: ${isSGPA}`);
  
  // If OCR has SGPA but user hasn't entered it - this is INFO, not warning
  if (!userValue && ocrValue) {
    console.log(`📊 SGPA extracted (${ocrValue}) but user input missing`);
    return {
      status: "pending",  // pending, not warning
      extractedValue: ocrValue,
      userValue: null,
      difference: 0,
      isSGPA
    }
  }
  
  if (!userValue) {
    return {
      status: "pending",
      extractedValue: ocrValue || null,
      userValue: null,
      difference: 0,
      isSGPA
    }
  }
  
  if (!ocrValue) {
    // Only show warning if SGPA was expected but not found in OCR
    // AND user has entered a value
    if (isSGPA && userValue) {
      console.log(`⚠️ SGPA not found in OCR but user entered ${userValue}`);
      return {
        status: "warning",  // Only warning when SGPA is expected but not found
        extractedValue: null,
        userValue,
        difference: 0,
        isSGPA
      }
    }
    return {
      status: "pending",
      extractedValue: null,
      userValue,
      difference: 0,
      isSGPA
    }
  }
  
  const diff = Math.abs(userValue - ocrValue)
  let status: ValidationStatus
  
  if (isSGPA) {
    if (diff <= 0.3) status = "verified"
    else if (diff <= 0.6) status = "warning"
    else status = "error"
    console.log(`📊 SGPA Comparison - User: ${userValue}, OCR: ${ocrValue}, Diff: ${diff}, Status: ${status}`);
  } else {
    const percentageDiff = (diff / Math.max(userValue, ocrValue)) * 100
    if (percentageDiff <= 5) status = "verified"
    else if (percentageDiff <= 15) status = "warning"
    else status = "error"
  }
  
  return {
    status,
    extractedValue: ocrValue,
    userValue,
    difference: diff,
    isSGPA
  }
}

// ============ COMPREHENSIVE APPLICATION VALIDATION ============

export interface ApplicationValidationResult extends ValidationResult {
  nameValidation: NameValidationResult
  marksValidation: MarksValidationResult
  crossDocumentValidation?: CrossDocumentValidation
  overallStatus: ValidationStatus
  suggestions: string[]
  extractedName?: string | null
  extractedSGPA?: number | null
  extractedCategory?: string | null
  extractedAadhaar?: string | null
  extractedCollege?: string | null
  extractedRollNo?: string | null
}

export interface CrossDocumentValidation {
  isValid: boolean
  matchScore: number
  issues: string[]
  warnings: string[]
  details: {
    marksheetVsAadhaar: { similarity: number; status: ValidationStatus; conflicts: NameConflict[] }
    marksheetVsCategory: { similarity: number; status: ValidationStatus; conflicts: NameConflict[] }
    aadhaarVsCategory: { similarity: number; status: ValidationStatus; conflicts: NameConflict[] }
    bestName: string | null
    consensusName: string | null
  }
}

export interface DocumentData {
  fullName: string | null
  marks?: number | null
  sgpa?: number | null
  college?: string | null
  aadhaarNumber?: string | null
  category?: string | null
}

export function validateCrossDocuments(
  marksheetData: DocumentData,
  aadhaarData: DocumentData,
  categoryData: DocumentData,
  selectedCategory?: string
): CrossDocumentValidation {
  const issues: string[] = []
  const warnings: string[] = []
  let matchScore = 100
  
  const marksheetName = marksheetData.fullName
  const aadhaarName = aadhaarData.fullName
  const categoryName = categoryData.fullName
  
  let marksheetVsAadhaar = { similarity: 0, status: "pending" as ValidationStatus, conflicts: [] as NameConflict[] }
  let marksheetVsCategory = { similarity: 0, status: "pending" as ValidationStatus, conflicts: [] as NameConflict[] }
  let aadhaarVsCategory = { similarity: 0, status: "pending" as ValidationStatus, conflicts: [] as NameConflict[] }
  
  if (marksheetName && aadhaarName) {
    const similarity = calculateNameSimilarity(marksheetName, aadhaarName)
    const conflicts = detectNameConflicts(marksheetName, aadhaarName)
    marksheetVsAadhaar = { similarity, status: "pending", conflicts }
    
    if (similarity >= CROSS_DOCUMENT_THRESHOLD * 100) {
      marksheetVsAadhaar.status = "verified"
    } else if (similarity >= PARTIAL_MATCH_THRESHOLD * 100) {
      marksheetVsAadhaar.status = "warning"
      
      if (conflicts.length > 0) {
        warnings.push(`Name conflict between Marksheet and Aadhaar: ${conflicts[0].suggestion}`)
      } else {
        warnings.push(`Name similarity is ${similarity.toFixed(0)}% between Marksheet and Aadhaar`)
      }
      matchScore = Math.min(matchScore, 70)
    } else {
      marksheetVsAadhaar.status = "error"
      issues.push(`Name mismatch between Marksheet and Aadhaar`)
      matchScore = Math.min(matchScore, 30)
    }
  }
  
  const needsCategoryCheck = selectedCategory && selectedCategory !== "Open"
  if (needsCategoryCheck && marksheetName && categoryName) {
    const similarity = calculateNameSimilarity(marksheetName, categoryName)
    const conflicts = detectNameConflicts(marksheetName, categoryName)
    marksheetVsCategory = { similarity, status: "pending", conflicts }
    
    if (similarity >= CROSS_DOCUMENT_THRESHOLD * 100) {
      marksheetVsCategory.status = "verified"
    } else if (similarity >= PARTIAL_MATCH_THRESHOLD * 100) {
      marksheetVsCategory.status = "warning"
      
      if (conflicts.length > 0) {
        warnings.push(`Name conflict between Marksheet and Category Certificate: ${conflicts[0].suggestion}`)
      } else {
        warnings.push(`Name similarity is ${similarity.toFixed(0)}% between Marksheet and Category Certificate`)
      }
      matchScore = Math.min(matchScore, 70)
    } else {
      marksheetVsCategory.status = "error"
      issues.push(`Name mismatch between Marksheet and Category Certificate`)
      matchScore = Math.min(matchScore, 30)
    }
  }
  
  const allNames = [
    { name: marksheetName, source: "marksheet" },
    { name: aadhaarName, source: "aadhaar" },
    { name: categoryName, source: "category" }
  ].filter(item => item.name)
  
  const nameFrequency = new Map<string, { count: number; sources: string[]; original: string }>()
  allNames.forEach(({ name, source }) => {
    const normalized = normalizeName(name!)
    const existing = nameFrequency.get(normalized)
    if (existing) {
      existing.count++
      existing.sources.push(source)
    } else {
      nameFrequency.set(normalized, { count: 1, sources: [source], original: name! })
    }
  })
  
  let bestName: string | null = null
  let consensusName: string | null = null
  let maxFrequency = 0
  
  for (const [normalized, { count, original, sources }] of nameFrequency) {
    if (count > maxFrequency) {
      maxFrequency = count
      bestName = original
      if (count >= 2) {
        consensusName = original
      }
    }
  }
  
  const isValid = issues.length === 0 && matchScore >= 50
  
  return {
    isValid,
    matchScore,
    issues,
    warnings,
    details: {
      marksheetVsAadhaar,
      marksheetVsCategory,
      aadhaarVsCategory,
      bestName,
      consensusName
    }
  }
}

// ============ MAIN VALIDATION FUNCTION ============

export function validateApplication(
  userInput: {
    fullName: string
    cetMarks?: number
    sgpa?: number
    category: string
    aadhaarNumber: string
  },
  ocrData: OCRData,
  crossDocumentValidation?: CrossDocumentValidation,
  rawText?: string
): ApplicationValidationResult {
  
  console.log("========== VALIDATION STARTED ==========");
  
  // ========== NAME VALIDATION ==========
  const nameValidation = validateNameField(userInput.fullName, ocrData.extractedName);
  
  // ========== SGPA EXTRACTION & VALIDATION ==========
  let extractedSGPA = ocrData.extractedSGPA;
  
  // If SGPA not in ocrData, try to extract from raw text
  if (!extractedSGPA && rawText) {
    console.log("🔍 SGPA not in OCR data, searching raw text...");
    const foundSGPA = extractSGPAFromText(rawText);
    if (foundSGPA) {
      extractedSGPA = foundSGPA;
      console.log(`✅ SGPA extracted from raw text: ${extractedSGPA}`);
    }
  }
  
  console.log(`📊 Final SGPA value: ${extractedSGPA || "NOT FOUND"}`);
  
  const marksValidation = validateMarksField(
    userInput.cetMarks,
    userInput.sgpa,
    ocrData.extractedMarks,
    extractedSGPA
  );
  
  // ========== CATEGORY VALIDATION ==========
  let extractedCategory = ocrData.extractedCategory;
  if (!extractedCategory && rawText) {
    const categories = ['SC', 'ST', 'OBC', 'VJNT', 'EWS', 'SEBC', 'PWD', 'OPEN', 'GENERAL'];
    for (const cat of categories) {
      if (rawText.toUpperCase().includes(cat)) {
        extractedCategory = cat;
        break;
      }
    }
  }
  
  const categoryMatch = validateField(userInput.category, extractedCategory);
  
  // ========== AADHAAR VALIDATION ==========
  let extractedAadhaar = ocrData.extractedAadhaar;
  if (!extractedAadhaar && rawText) {
    const aadhaarMatch = rawText.match(/\d{4}\s?\d{4}\s?\d{4}/);
    if (aadhaarMatch) {
      extractedAadhaar = aadhaarMatch[0].replace(/\s/g, '');
    }
  }
  
  const aadhaarMatch = validateField(
    userInput.aadhaarNumber.replace(/\s/g, ""),
    extractedAadhaar?.replace(/\s/g, "") || ""
  );
  
  // ========== COLLECT SUGGESTIONS (ONLY REAL ISSUES) ==========
  const suggestions: string[] = [];
  
  if (nameValidation.status === "warning" && nameValidation.suggestedName) {
    suggestions.push(`Consider using "${nameValidation.suggestedName}" as the standard name`);
  }
  
  // ONLY add warning if SGPA is missing AND user expects it
  if (marksValidation.status === "warning" && marksValidation.isSGPA && !marksValidation.extractedValue && marksValidation.userValue) {
    suggestions.push(`SGPA could not be extracted from marksheet. Please enter manually.`);
  } else if (marksValidation.status === "warning" && marksValidation.isSGPA && marksValidation.extractedValue && marksValidation.userValue) {
    suggestions.push(`SGPA difference of ${marksValidation.difference.toFixed(1)} points.`);
  }
  
  if (categoryMatch === "warning" || categoryMatch === "error") {
    suggestions.push(`Category mismatch: Expected "${userInput.category}", got "${extractedCategory || 'not found'}"`);
  }
  
  if (aadhaarMatch === "error") {
    suggestions.push(`Aadhaar number mismatch`);
  }
  
  // ========== DETERMINE OVERALL STATUS ==========
  const statuses = [nameValidation.status, marksValidation.status, categoryMatch, aadhaarMatch];
  let overallStatus: ValidationStatus = "pending";
  
  if (statuses.includes("error")) overallStatus = "error";
  else if (statuses.includes("warning")) overallStatus = "warning";
  else if (statuses.every(s => s === "verified")) overallStatus = "verified";
  
  if (crossDocumentValidation) {
    if (!crossDocumentValidation.isValid) {
      overallStatus = overallStatus === "verified" ? "warning" : overallStatus;
      if (crossDocumentValidation.issues.length > 0 && overallStatus !== "error") {
        overallStatus = "error";
      }
    }
  }
  
  console.log("Overall Status:", overallStatus);
  console.log("========== VALIDATION COMPLETE ==========");
  
  return {
    nameMatch: nameValidation.status,
    marksMatch: marksValidation.status,
    categoryMatch,
    aadhaarMatch,
    crossDocumentStatus: crossDocumentValidation?.isValid ? "verified" : crossDocumentValidation ? "error" : undefined,
    crossDocumentIssues: crossDocumentValidation?.issues,
    crossDocumentWarnings: crossDocumentValidation?.warnings,
    crossDocumentScore: crossDocumentValidation?.matchScore,
    nameValidation,
    marksValidation,
    crossDocumentValidation,
    overallStatus,
    suggestions,
    extractedName: ocrData.extractedName,
    extractedSGPA: extractedSGPA,
    extractedCategory: extractedCategory,
    extractedAadhaar: extractedAadhaar,
    extractedCollege: ocrData.extractedCollege,
    extractedRollNo: ocrData.extractedRollNo
  };
}

// ============ UI HELPERS ============

export function getValidationIcon(status: ValidationStatus): string {
  switch (status) {
    case "verified": return "check-circle"
    case "warning": return "alert-triangle"
    case "error": return "x-circle"
    case "pending": return "clock"
    default: return "help-circle"
  }
}

export function getValidationColor(status: ValidationStatus): string {
  switch (status) {
    case "verified": return "text-emerald-600"
    case "warning": return "text-amber-500"
    case "error": return "text-red-500"
    case "pending": return "text-muted-foreground"
    default: return "text-muted-foreground"
  }
}

export function getOverallValidationStatus(validation: ApplicationValidationResult): ValidationStatus {
  return validation.overallStatus
}

// ============ EXPORTS ============
export {
  EXACT_MATCH_THRESHOLD,
  PARTIAL_MATCH_THRESHOLD,
  CROSS_DOCUMENT_THRESHOLD,
  NAME_CONFLICT_THRESHOLD
}