// lib/utils/document-verification.ts

export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ========== CET DATA EXTRACTION (MOVED TO TOP) ==========

// Extract CET Total Percentile (PCM Percentile) from marksheet
export const extractCETPercentileFromText = (text: string): number | null => {
  if (!text) return null
  
  console.log("🔍 Extracting CET Total Percentile from marksheet...")
  
  // Pattern 1: Look for "Total Percentile Score PCM" (from your example)
  const totalPercentilePatterns = [
    /Total\s*Percentile\s*Score\s*PCM\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /Total\s*Percentile\s*Score\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /PCM\s*Percentile\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /Overall\s*Percentile\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /MHT\s*CET\s*Percentile\s*Score\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /Percentile\s*Score\s*PCM\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
  ]
  
  for (const pattern of totalPercentilePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const value = parseFloat(match[1])
      if (value >= 0 && value <= 100) {
        console.log(`✅ CET Total Percentile extracted: ${value}`)
        return value
      }
    }
  }
  
  // Pattern 2: Look for decimal numbers near "Percentile" context in bottom of document
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().includes('percentile')) {
      const decimalMatch = line.match(/\b(\d{2,3}\.\d+)\b/)
      if (decimalMatch && decimalMatch[1]) {
        const value = parseFloat(decimalMatch[1])
        if (value >= 0 && value <= 100) {
          console.log(`✅ CET Percentile found in context: ${value}`)
          return value
        }
      }
    }
  }
  
  console.log("❌ No CET percentile found in marksheet")
  return null
}

// Extract CET marks from text
export const extractCETMarksFromText = (text: string): number | null => {
  if (!text) return null
  
  console.log("🔍 Extracting CET marks from marksheet...")
  
  const cetPatterns = [
    /CET\s*Marks\s*[:=\-]\s*(\d{1,3})/i,
    /CET\s*Score\s*[:=\-]\s*(\d{1,3})/i,
    /Total\s*Marks\s*[:=\-]\s*(\d{1,3})\s*\/\s*200/i,
    /(\d{1,3})\s*\/\s*200/i,
  ]
  
  for (const pattern of cetPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const marks = parseInt(match[1])
      if (marks >= 0 && marks <= 200) {
        console.log(`✅ CET Marks extracted: ${marks}`)
        return marks
      }
    }
  }
  
  console.log("❌ No CET marks found in marksheet")
  return null
}

// Extract subject-wise percentiles (optional)
export const extractSubjectPercentiles = (text: string): { physics: number | null; chemistry: number | null; mathematics: number | null } => {
  const result = { physics: null, chemistry: null, mathematics: null }
  
  const physicsMatch = text.match(/Physics\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i)
  const chemistryMatch = text.match(/Chemistry\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i)
  const mathsMatch = text.match(/Mathematics\s*[:=\-]?\s*(\d{1,3}(?:\.\d+)?)/i)
  
  if (physicsMatch) result.physics = parseFloat(physicsMatch[1])
  if (chemistryMatch) result.chemistry = parseFloat(chemistryMatch[1])
  if (mathsMatch) result.mathematics = parseFloat(mathsMatch[1])
  
  return result
}

// ========== NAME EXTRACTION ==========

export const extractNameFromText = (text: string, documentType?: string): string | null => {
  if (!text) return null
  
  if (documentType === 'aadhaar') {
    return null
  }
  
  console.log("🔍 Extracting name from text...")
  
  const labelPatterns = [
    /Student Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Student's Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Name of Student\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Candidate Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Applicant Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Full Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
    /Candidate's Full Name\s*[:：]\s*([A-Za-z\s\.]{3,50})/i,
  ]
  
  for (const pattern of labelPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      let name = match[1].trim()
      name = name.replace(/Roll No\.?\s*\d*/i, '').trim()
      name = name.replace(/Enrolment No\.?\s*\d*/i, '').trim()
      name = name.replace(/PRN No\.?\s*\d*/i, '').trim()
      name = name.replace(/[0-9]/g, '').trim()
      if (name.length >= 3 && /[A-Za-z]/.test(name)) {
        console.log(`✅ Name extracted via label pattern: "${name}"`)
        return name
      }
    }
  }
  
  const uppercasePattern = /\b([A-Z]{2,}(?:\s+[A-Z]{2,}){1,3})\b/
  const uppercaseMatch = text.match(uppercasePattern)
  if (uppercaseMatch && uppercaseMatch[1]) {
    let name = uppercaseMatch[1].trim()
    if (name.length >= 5 && name.split(' ').length >= 2) {
      console.log(`✅ Name extracted via uppercase pattern: "${name}"`)
      return name
    }
  }
  
  const properCasePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/
  const properCaseMatch = text.match(properCasePattern)
  if (properCaseMatch && properCaseMatch[1]) {
    let name = properCaseMatch[1].trim()
    if (name.length >= 5 && name.split(' ').length >= 2) {
      console.log(`✅ Name extracted via proper case pattern: "${name}"`)
      return name
    }
  }
  
  console.log("❌ No name extracted from document")
  return null
}

// ========== AADHAAR EXTRACTION ==========

export const extractAadhaarFromText = (text: string): string | null => {
  if (!text) return null
  
  const patterns = [
    /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/,
    /\b(\d{12})\b/,
    /Aadhaar[:\s]*(\d{4}\s?\d{4}\s?\d{4})/i,
    /UID[:\s]*(\d{4}\s?\d{4}\s?\d{4})/i,
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const cleaned = match[1].replace(/[\s-]/g, '')
      if (/^\d{12}$/.test(cleaned)) {
        return cleaned
      }
    }
  }
  return null
}

// ========== SGPA EXTRACTION ==========

export const extractSGPAFromText = (text: string): number | null => {
  if (!text) return null
  
  console.log("🔍 Starting SGPA extraction...")
  
  const toFloat = (num: number): number => parseFloat(num.toFixed(2))
  const isValidSGPA = (num: number): boolean => !isNaN(num) && num >= 5.00 && num <= 10.00
  
  const explicitPatterns = [
    /SGPA\s*[:=\-]\s*(\d+\.?\d*)/i,
    /SGPA\s+(\d+\.?\d*)/i,
    /SGPA\s*(\d+\.?\d*)/i,
    /S\.G\.P\.A\.\s*[:=\-]\s*(\d+\.?\d*)/i,
    /CGPA\s*[:=\-]\s*(\d+\.?\d*)/i,
    /GPA\s*[:=\-]\s*(\d+\.?\d*)/i,
    /Semester\s*SGPA\s*[:=\-]\s*(\d+\.?\d*)/i,
    /SGPA\s*:\s*(\d+\.?\d*)/i,
  ]
  
  for (const pattern of explicitPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const num = parseFloat(match[1])
      if (isValidSGPA(num)) {
        console.log(`✅ SGPA found via explicit pattern: ${num}`)
        return toFloat(num)
      }
    }
  }
  
  const lines = text.split('\n')
  const lastLines = lines.slice(-40).join('\n')
  
  const tablePatterns = [
    /\|\s*SGPA\s*\|\s*(\d+\.?\d{1,2})\s*\|/i,
    /SGPA\s*\|\s*(\d+\.?\d{1,2})/i,
    /Semester GPA\s*[:=\-]\s*(\d+\.?\d{1,2})/i,
    /SGPA\s*:?\s*(\d+\.?\d{1,2})\s*(?:\/|out of)?\s*10/i,
  ]
  
  for (const pattern of tablePatterns) {
    const match = lastLines.match(pattern)
    if (match && match[1]) {
      const num = parseFloat(match[1])
      if (isValidSGPA(num)) {
        console.log(`✅ SGPA found via table pattern: ${num}`)
        return toFloat(num)
      }
    }
  }
  
  console.log("❌ No SGPA found in document")
  return null
}

// ========== CATEGORY EXTRACTION ==========

export const extractCategoryFromText = (text: string): string | null => {
  if (!text) return null
  
  console.log("🔍 Extracting caste/category from certificate...")
  
  const labelPatterns = [
    /Category\s*[:：]\s*([A-Za-z\s\/]+)/i,
    /Caste\s*[:：]\s*([A-Za-z\s\/]+)/i,
    /Caste Category\s*[:：]\s*([A-Za-z\s\/]+)/i,
    /Social Category\s*[:：]\s*([A-Za-z\s\/]+)/i,
    /Community\s*[:：]\s*([A-Za-z\s\/]+)/i,
  ]
  
  for (const pattern of labelPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const category = match[1].trim().toUpperCase()
      const normalized = normalizeCategory(category)
      if (normalized) {
        console.log(`✅ Category extracted via label pattern: "${normalized}"`)
        return normalized
      }
    }
  }
  
  const categoryKeywords = [
    { keywords: ["MARATHA", "SEBC"], value: "SEBC" },
    { keywords: ["OBC", "OTHER BACKWARD CLASS"], value: "OBC" },
    { keywords: ["SC", "SCHEDULED CASTE"], value: "SC" },
    { keywords: ["ST", "SCHEDULED TRIBE"], value: "ST" },
    { keywords: ["VJNT", "VIMUKTA JATI"], value: "VJNT" },
    { keywords: ["EWS", "ECONOMICALLY WEAKER"], value: "EWS" },
    { keywords: ["NT", "NOMADIC TRIBE"], value: "NT" },
    { keywords: ["OPEN", "GENERAL"], value: "Open" },
  ]
  
  for (const item of categoryKeywords) {
    for (const keyword of item.keywords) {
      if (text.match(new RegExp(`\\b${keyword}\\b`, 'i'))) {
        console.log(`✅ Category extracted via keyword: "${item.value}"`)
        return item.value
      }
    }
  }
  
  console.log("❌ No caste/category extracted from certificate")
  return null
}

const normalizeCategory = (category: string): string | null => {
  const upperCat = category.toUpperCase()
  
  if (upperCat.includes("SEBC") || upperCat.includes("MARATHA")) return "SEBC"
  if (upperCat.includes("OBC") || upperCat.includes("OTHER BACKWARD")) return "OBC"
  if (upperCat.includes("SC") || upperCat.includes("SCHEDULED CASTE")) return "SC"
  if (upperCat.includes("ST") || upperCat.includes("SCHEDULED TRIBE")) return "ST"
  if (upperCat.includes("VJNT") || upperCat.includes("VIMUKTA")) return "VJNT"
  if (upperCat.includes("EWS") || upperCat.includes("ECONOMICALLY")) return "EWS"
  if (upperCat.includes("NT") || upperCat.includes("NOMADIC")) return "NT"
  if (upperCat.includes("OPEN") || upperCat.includes("GENERAL")) return "Open"
  
  return null
}

// ========== COLLEGE EXTRACTION ==========

export const extractCollegeFromText = (text: string): string | null => {
  if (!text) return null
  
  if (text.match(/GOVERNMENT COLLEGE OF ENGINEERING,? NAGPUR/i)) {
    return "Government College of Engineering, Nagpur"
  }
  
  return null
}

// ========== NAME SIMILARITY ==========

export const calculateNameSimilarity = (name1: string, name2: string): number => {
  if (!name1 || !name2) return 0
  
  const norm1 = normalizeText(name1)
  const norm2 = normalizeText(name2)
  
  if (norm1 === norm2) return 100
  
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 85
  }
  
  const words1 = norm1.split(' ')
  const words2 = norm2.split(' ')
  
  let matchingWords = 0
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matchingWords++
        break
      }
    }
  }
  
  const totalUniqueWords = new Set([...words1, ...words2]).size
  if (totalUniqueWords === 0) return 0
  return (matchingWords / totalUniqueWords) * 100
}

// ========== MAIN EXTRACT FUNCTION ==========

export const extractAllDataFromOCR = (text: string, documentType?: string) => {
  if (!text) {
    return {
      fullName: null,
      aadhaarNumber: null,
      sgpa: null,
      cetMarks: null,
      cetPercentile: null,
      cetSubjectPercentiles: null,
      category: null,
      college: null,
    }
  }
  
  if (documentType === 'marksheet') {
    return {
      fullName: extractNameFromText(text, documentType),
      aadhaarNumber: extractAadhaarFromText(text),
      sgpa: extractSGPAFromText(text),
      cetMarks: extractCETMarksFromText(text),
      cetPercentile: extractCETPercentileFromText(text),
      cetSubjectPercentiles: extractSubjectPercentiles(text),
      category: extractCategoryFromText(text),
      college: extractCollegeFromText(text),
    }
  }
  
  return {
    fullName: extractNameFromText(text, documentType),
    aadhaarNumber: extractAadhaarFromText(text),
    sgpa: null,
    cetMarks: null,
    cetPercentile: null,
    cetSubjectPercentiles: null,
    category: extractCategoryFromText(text),
    college: extractCollegeFromText(text),
  }
}

// ========== VALIDATION FUNCTIONS ==========

export const validateDocumentsWithUserInput = (
  extractedData: {
    fullName: string | null
    aadhaarNumber: string | null
    sgpa: number | null
    cetPercentile: number | null
    category: string | null
  },
  userInput: {
    fullName: string
    aadhaarNumber: string
    sgpa?: number
    cetPercentile?: number
    category: string
    admissionType: string
  }
): {
  isValid: boolean
  matchScore: number
  errors: string[]
  warnings: string[]
  fieldMatches: any
} => {
  console.log("🔍 Validating user input against extracted documents...")
  console.log("Extracted:", extractedData)
  console.log("User Input:", userInput)
  
  const errors: string[] = []
  const warnings: string[] = []
  let totalScore = 0
  let scoreCount = 0
  
  // 1. NAME VALIDATION (30% weight)
  let nameMatchStatus = "pending"
  let nameSimilarity = 0
  let nameScore = 0
  
  if (extractedData.fullName && userInput.fullName) {
    nameSimilarity = calculateNameSimilarity(userInput.fullName, extractedData.fullName)
    
    if (nameSimilarity >= 90) {
      nameMatchStatus = "verified"
      nameScore = 100
    } else if (nameSimilarity >= 70) {
      nameMatchStatus = "warning"
      nameScore = 70
      warnings.push(`Name similarity is ${nameSimilarity.toFixed(0)}%`)
    } else {
      nameMatchStatus = "error"
      nameScore = 0
      errors.push(`Name mismatch: Form shows "${userInput.fullName}" but document shows "${extractedData.fullName}"`)
    }
  } else if (extractedData.fullName && !userInput.fullName) {
    nameMatchStatus = "warning"
    nameScore = 50
    warnings.push(`Name not entered in form. Document shows "${extractedData.fullName}"`)
  } else if (!extractedData.fullName && userInput.fullName) {
    nameMatchStatus = "warning"
    nameScore = 50
    warnings.push("Could not extract name from document")
  } else {
    nameMatchStatus = "error"
    nameScore = 0
    errors.push("Could not verify name")
  }
  totalScore += nameScore * 0.30
  scoreCount++
  
  // 2. AADHAAR VALIDATION (30% weight)
  let aadhaarMatchStatus = "pending"
  let aadhaarMatch = false
  let aadhaarScore = 0
  
  if (extractedData.aadhaarNumber && userInput.aadhaarNumber) {
    const extractedClean = extractedData.aadhaarNumber.replace(/\s/g, '')
    const inputClean = userInput.aadhaarNumber.replace(/\s/g, '')
    
    if (extractedClean === inputClean) {
      aadhaarMatchStatus = "verified"
      aadhaarMatch = true
      aadhaarScore = 100
    } else {
      aadhaarMatchStatus = "error"
      aadhaarMatch = false
      aadhaarScore = 0
      errors.push(`Aadhaar mismatch`)
    }
  } else if (extractedData.aadhaarNumber && !userInput.aadhaarNumber) {
    aadhaarMatchStatus = "warning"
    aadhaarScore = 50
    warnings.push(`Aadhaar not entered in form`)
  } else if (!extractedData.aadhaarNumber && userInput.aadhaarNumber) {
    aadhaarMatchStatus = "warning"
    aadhaarScore = 50
    warnings.push("Could not extract Aadhaar from document")
  } else {
    aadhaarMatchStatus = "error"
    aadhaarScore = 0
    errors.push("Could not verify Aadhaar")
  }
  totalScore += aadhaarScore * 0.30
  scoreCount++
  
  // 3. MARKS VALIDATION (20% weight)
  let marksMatchStatus = "pending"
  let extractedMarks = null
  let enteredMarks = null
  let marksScore = 0
  
  if (userInput.admissionType === "CET") {
    extractedMarks = extractedData.cetPercentile
    enteredMarks = userInput.cetPercentile || null
  } else {
    extractedMarks = extractedData.sgpa
    enteredMarks = userInput.sgpa || null
  }
  
  if (extractedMarks !== null && enteredMarks !== null) {
    const marksDiff = Math.abs(extractedMarks - enteredMarks)
    
    if (marksDiff === 0) {
      marksMatchStatus = "verified"
      marksScore = 100
    } else if (marksDiff <= 2) {
      marksMatchStatus = "warning"
      marksScore = 70
      warnings.push(`${userInput.admissionType === "CET" ? "CET Percentile" : "SGPA"} slight difference: Form ${enteredMarks} vs Document ${extractedMarks}`)
    } else {
      marksMatchStatus = "error"
      marksScore = 0
      errors.push(`${userInput.admissionType === "CET" ? "CET Percentile" : "SGPA"} mismatch`)
    }
  } else if (extractedMarks !== null && enteredMarks === null) {
    marksMatchStatus = "warning"
    marksScore = 50
    warnings.push(`${userInput.admissionType === "CET" ? "CET Percentile" : "SGPA"} not entered in form. Document shows ${extractedMarks}`)
  } else if (extractedMarks === null && enteredMarks !== null) {
    marksMatchStatus = "warning"
    marksScore = 50
    warnings.push(`Could not extract ${userInput.admissionType === "CET" ? "CET Percentile" : "SGPA"} from document`)
  } else {
    marksMatchStatus = "error"
    marksScore = 0
    errors.push(`Could not verify ${userInput.admissionType === "CET" ? "CET Percentile" : "SGPA"}`)
  }
  totalScore += marksScore * 0.20
  scoreCount++
  
  // 4. CATEGORY VALIDATION (20% weight)
  let categoryMatchStatus = "pending"
  let categoryScore = 0
  
  if (extractedData.category && userInput.category) {
    const extractedCat = extractedData.category.toUpperCase()
    const inputCat = userInput.category.toUpperCase()
    
    if (extractedCat === inputCat) {
      categoryMatchStatus = "verified"
      categoryScore = 100
    } else {
      categoryMatchStatus = "error"
      categoryScore = 0
      errors.push(`Category mismatch: Certificate shows "${extractedData.category}" but you selected "${userInput.category}"`)
    }
  } else if (extractedData.category && !userInput.category) {
    categoryMatchStatus = "warning"
    categoryScore = 50
    warnings.push(`Category not selected in form. Certificate shows "${extractedData.category}"`)
  } else if (!extractedData.category && userInput.category && userInput.category !== "Open") {
    categoryMatchStatus = "warning"
    categoryScore = 50
    warnings.push("Could not extract category from certificate")
  } else {
    categoryMatchStatus = "verified"
    categoryScore = 100
  }
  totalScore += categoryScore * 0.20
  scoreCount++
  
  const finalScore = scoreCount > 0 ? totalScore : 0
  const isValid = finalScore >= 75 && errors.length === 0
  
  return {
    isValid,
    matchScore: finalScore,
    errors,
    warnings,
    fieldMatches: {
      nameMatch: { status: nameMatchStatus, similarity: nameSimilarity },
      aadhaarMatch: { status: aadhaarMatchStatus, isMatch: aadhaarMatch },
      marksMatch: { status: marksMatchStatus, extracted: extractedMarks, entered: enteredMarks },
      categoryMatch: { status: categoryMatchStatus, extracted: extractedData.category, entered: userInput.category }
    }
  }
}

// ========== LEGACY FUNCTION FOR BACKWARD COMPATIBILITY ==========

export const validateDocumentsWithoutAI = (
  marksheetText: string,
  aadhaarText: string,
  categoryText: string | null,
  selectedCategory?: string,
  admissionType?: string
) => {
  const marksheetData = extractAllDataFromOCR(marksheetText, 'marksheet')
  const aadhaarData = extractAllDataFromOCR(aadhaarText, 'aadhaar')
  const categoryData = categoryText ? extractAllDataFromOCR(categoryText, 'category') : null
  
  console.log("📊 Marksheet extracted data:", marksheetData)
  console.log("📊 Admission Type:", admissionType)
  console.log("📊 CET Percentile extracted:", marksheetData.cetPercentile)
  console.log("📊 SGPA extracted:", marksheetData.sgpa)
  
  const issues: string[] = []
  const warnings: string[] = []
  let matchScore = 100
  
  if (!marksheetData.fullName) {
    issues.push("Could not extract name from marksheet")
    matchScore -= 30
  }
  
  if (!aadhaarData.aadhaarNumber) {
    issues.push("Could not extract Aadhaar number")
    matchScore -= 30
  } else if (!/^\d{12}$/.test(aadhaarData.aadhaarNumber)) {
    warnings.push("Invalid Aadhaar number format")
    matchScore -= 10
  }
  
  // CET Admission (1st Year)
  if (admissionType === "CET") {
    console.log("🎓 Processing CET admission (1st Year Student)")
    
    if (!marksheetData.cetPercentile) {
      warnings.push("Could not extract CET percentile from marksheet")
      matchScore -= 20
    } else if (marksheetData.cetPercentile < 0 || marksheetData.cetPercentile > 100) {
      warnings.push(`CET percentile ${marksheetData.cetPercentile} is outside valid range (0-100)`)
      matchScore -= 10
    } else {
      console.log(`✅ CET Percentile: ${marksheetData.cetPercentile}%`)
    }
  } 
  // SGPA Admission (2nd-4th Year)
  else if (admissionType === "SGPA") {
    console.log("🎓 Processing SGPA admission (2nd-4th Year Student)")
    
    if (!marksheetData.sgpa) {
      warnings.push("Could not extract SGPA from marksheet")
      matchScore -= 20
    } else if (marksheetData.sgpa < 5 || marksheetData.sgpa > 10) {
      warnings.push(`SGPA ${marksheetData.sgpa} is outside valid range (5-10)`)
      matchScore -= 10
    } else {
      console.log(`✅ SGPA: ${marksheetData.sgpa}`)
    }
  }
  
  if (selectedCategory && selectedCategory !== "Open") {
    if (!categoryData?.category) {
      warnings.push("Could not extract caste/category from certificate")
      matchScore -= 20
    } else if (categoryData.category !== selectedCategory) {
      issues.push(`Category mismatch: Certificate shows "${categoryData.category}" but you selected "${selectedCategory}"`)
      matchScore -= 30
    }
  }
  
  const finalScore = Math.max(0, matchScore)
  
  return {
    isValid: finalScore >= 70 && issues.length === 0,
    matchScore: finalScore,
    issues,
    warnings,
    data: {
      marksheet: marksheetData,
      aadhaar: aadhaarData,
      category: categoryData,
    },
    combinedData: {
      fullName: marksheetData.fullName,
      aadhaarNumber: aadhaarData.aadhaarNumber,
      marks: admissionType === "CET" ? marksheetData.cetPercentile : marksheetData.sgpa,
      cetPercentile: marksheetData.cetPercentile,
      cetMarks: marksheetData.cetMarks,
      cetSubjectPercentiles: marksheetData.cetSubjectPercentiles,
      sgpa: marksheetData.sgpa,
      category: categoryData?.category || marksheetData.category,
      college: marksheetData.college,
    }
  }
}