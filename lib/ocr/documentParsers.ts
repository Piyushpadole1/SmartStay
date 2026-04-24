// lib/ocr/documentParsers.ts
import type { ExtractedDocumentData } from './advancedOCR';

export interface ParsedMarksheet {
  studentName: string | null;
  rollNumber: string | null;
  totalMarks: number | null;
  percentage: number | null;
  sgpa: number | null;
  subjects: Array<{ name: string; marks: number; maxMarks: number }>;
  examYear: string | null;
  board: string | null;
  confidence: number;
}

export interface ParsedAadhaar {
  aadhaarNumber: string | null;
  name: string | null;
  dob: string | null;
  gender: string | null;
  confidence: number;
}

export interface ParsedCategoryCertificate {
  category: string | null;
  certificateNumber: string | null;
  issueDate: string | null;
  issuingAuthority: string | null;
  confidence: number;
}

export function parseMarksheetOCR(ocrData: ExtractedDocumentData): ParsedMarksheet {
  const text = ocrData.rawText;
  const lines = ocrData.lines.map(l => l.text);
  
  let studentName: string | null = null;
  let rollNumber: string | null = null;
  let totalMarks: number | null = null;
  let percentage: number | null = null;
  let sgpa: number | null = null;
  let examYear: string | null = null;
  let board: string | null = null;
  const subjects: Array<{ name: string; marks: number; maxMarks: number }> = [];

  // Extract Student Name - Multiple pattern matching
  const namePatterns = [
    /(?:Name of Student|Student'?s Name|Candidate'?s Name|NAME)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,4})\s+(?:Roll No|Registration)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      studentName = match[1].trim();
      if (studentName.length > 3 && studentName.split(' ').length >= 2) break;
    }
  }

  // Extract Roll Number
  const rollPatterns = [
    /(?:Roll No|Roll Number|Enrollment No)[.:\s]+([A-Z0-9\/\-]{8,20})/i,
    /(?:Reg No|Registration Number)[.:\s]+([A-Z0-9\/\-]{8,20})/i,
    /\b([A-Z]{2,5}\d{6,}[A-Z]?\d?)\b/
  ];
  
  for (const pattern of rollPatterns) {
    const match = text.match(pattern);
    if (match) {
      rollNumber = match[1];
      break;
    }
  }

  // Extract Marks, Percentage, SGPA
  const marksPatterns = [
    { pattern: /(?:Total|Aggregate)[:\s]+(\d+)(?:\s*\/\s*(\d+))?/i, type: 'total' },
    { pattern: /(?:Obtained|Secured|Marks Obtained)[:\s]+(\d+)/i, type: 'obtained' },
    { pattern: /Percentage[:\s]+(\d+(?:\.\d+)?)\s*%/i, type: 'percentage' },
    { pattern: /(?:CGPA|SGPA|GPA)[:\s]+(\d+(?:\.\d+)?)/i, type: 'sgpa' }
  ];
  
  for (const { pattern, type } of marksPatterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (type === 'percentage') percentage = value;
      else if (type === 'sgpa') sgpa = value;
      else if (type === 'total' && !totalMarks) totalMarks = value;
      else if (type === 'obtained' && !totalMarks) totalMarks = value;
    }
  }

  // Extract Subject-wise marks from table-like structure
  // Look for lines with subject name followed by numbers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Pattern: "SUBJECT NAME 85 100" or "Mathematics 85 100"
    const subjectMatch = line.match(/^([A-Za-z\s&]{5,30}?)\s+(\d{1,3})\s+(\d{1,3})$/);
    if (subjectMatch) {
      subjects.push({
        name: subjectMatch[1].trim(),
        marks: parseInt(subjectMatch[2]),
        maxMarks: parseInt(subjectMatch[3])
      });
    }
  }

  // Extract Exam Year
  const yearMatch = text.match(/(?:Year|Session|Examination Year)[:\s]+(20\d{2})/i);
  if (yearMatch) examYear = yearMatch[1];

  // Extract Board/University
  const boardMatch = text.match(/(?:Board|University)[:\s]+([A-Za-z\s]{10,50})/i);
  if (boardMatch) board = boardMatch[1].trim();

  // Calculate overall confidence based on what was extracted
  let confidence = 0;
  if (studentName) confidence += 0.3;
  if (totalMarks || percentage || sgpa) confidence += 0.4;
  if (subjects.length > 0) confidence += 0.3;
  confidence = Math.min(confidence * ocrData.confidence, 0.95);

  return {
    studentName,
    rollNumber,
    totalMarks,
    percentage,
    sgpa,
    subjects: subjects.slice(0, 15),
    examYear,
    board,
    confidence
  };
}

export function parseAadhaarOCR(ocrData: ExtractedDocumentData): ParsedAadhaar {
  let text = ocrData.rawText;
  
  let aadhaarNumber: string | null = null;
  let name: string | null = null;
  let dob: string | null = null;
  let gender: string | null = null;

  // Extract 12-digit Aadhaar number (handles spaces)
  const aadhaarPatterns = [
    /\b(\d{4})\s*(\d{4})\s*(\d{4})\b/,
    /\b(\d{12})\b/,
    /(?:UIDAI|Aadhaar|आधार)[:\s]*(\d{4}[-\s]?\d{4}[-\s]?\d{4})/i
  ];
  
  for (const pattern of aadhaarPatterns) {
    const match = text.match(pattern);
    if (match) {
      aadhaarNumber = match[0].replace(/[\s-]/g, '');
      if (aadhaarNumber.length === 12) break;
      aadhaarNumber = null;
    }
  }

  // Extract Name (English and Hindi patterns)
  const namePatterns = [
    /(?:Name|नाम|Applicant'?s Name)[:\s]+([A-Z][A-Za-z\s]{3,40}?)(?:\n|,|\d|Enrolment)/i,
    /(?:Name|नाम)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+(?:S\/O|D\/O|W\/O|son of|daughter of)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      if (name.length > 2) break;
    }
  }

  // Extract DOB
  const dobPatterns = [
    /(?:DOB|Date of Birth|जन्म तिथि)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:DOB|Date of Birth|जन्म तिथि)[:\s]+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
  ];
  
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match) {
      dob = match[1];
      break;
    }
  }

  // Extract Gender
  const genderMatch = text.match(/(?:Gender|लिंग)[:\s]+(Male|Female|महिला|पुरुष|M|F)/i);
  if (genderMatch) {
    gender = genderMatch[1].toLowerCase().includes('male') || genderMatch[1] === 'M' ? 'Male' : 'Female';
  }

  const confidence = (aadhaarNumber ? 0.5 : 0) + (name ? 0.3 : 0) + (dob ? 0.2 : 0);
  
  return {
    aadhaarNumber,
    name,
    dob,
    gender,
    confidence: Math.min(confidence * ocrData.confidence, 0.95)
  };
}

export function parseCategoryProofOCR(ocrData: ExtractedDocumentData): ParsedCategoryCertificate {
  const text = ocrData.rawText.toUpperCase();
  
  let category: string | null = null;
  let certificateNumber: string | null = null;
  let issueDate: string | null = null;
  let issuingAuthority: string | null = null;

  // Category detection with weighted scoring
  const categoryKeywords: Record<string, { keywords: string[]; weight: number }[]> = {
    'SC/ST': [
      { keywords: ['SCHEDULED CASTE', 'SCHEDULED TRIBE', 'SC', 'ST'], weight: 1.0 },
      { keywords: ['MAHARASHTRA SC', 'MAHARASHTRA ST'], weight: 0.9 }
    ],
    'OBC': [
      { keywords: ['OTHER BACKWARD CLASS', 'OBC', 'OBC-NCL'], weight: 1.0 },
      { keywords: ['NON CREAMY LAYER', 'OBC CERTIFICATE'], weight: 0.9 }
    ],
    'VJNT': [
      { keywords: ['VJNT', 'VIMUKTA JATI', 'NOMADIC TRIBE'], weight: 1.0 }
    ],
    'EWS': [
      { keywords: ['EWS', 'ECONOMICALLY WEAKER', 'SEBC'], weight: 1.0 }
    ],
    'PWD': [
      { keywords: ['PWD', 'PERSON WITH DISABILITY', 'DIVYANG'], weight: 1.0 }
    ],
    'OPEN': [
      { keywords: ['GENERAL', 'OPEN', 'UNRESERVED'], weight: 0.8 }
    ]
  };

  let maxScore = 0;
  for (const [cat, patterns] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (text.includes(keyword)) {
          score += pattern.weight;
          break;
        }
      }
    }
    if (score > maxScore) {
      maxScore = score;
      category = cat;
    }
  }

  // Extract Certificate Number
  const certPatterns = [
    /(?:Certificate No|Cert No|No)[.:\s]+([A-Z0-9\/\-]{8,20})/i,
    /([A-Z]{2,5}\d{6,}[A-Z]?\d?)/i
  ];
  for (const pattern of certPatterns) {
    const match = text.match(pattern);
    if (match) {
      certificateNumber = match[1];
      break;
    }
  }

  // Extract Issue Date
  const datePatterns = [
    /(?:Issue Date|Date of Issue|Dated)[.:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      issueDate = match[1];
      break;
    }
  }

  // Extract Issuing Authority
  const authorityPatterns = [
    /(?:Issued by|Issuing Authority|Tehsildar|Tahsildar)[.:\s]+([A-Z\s]{10,50})/i,
    /(?:Collector|District Magistrate)[.:\s]+([A-Z\s]{10,50})/i
  ];
  for (const pattern of authorityPatterns) {
    const match = text.match(pattern);
    if (match) {
      issuingAuthority = match[1].trim();
      break;
    }
  }

  const confidence = (category ? 0.5 : 0) + (certificateNumber ? 0.3 : 0) + (issuingAuthority ? 0.2 : 0);
  
  return {
    category,
    certificateNumber,
    issueDate,
    issuingAuthority,
    confidence: Math.min(confidence * ocrData.confidence, 0.95)
  };
}