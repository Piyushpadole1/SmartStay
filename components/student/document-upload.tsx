"use client"

import { useCallback, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, CheckCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { extractFullTextWithModes, type OCRProgress } from "@/lib/ocr/tesseract"
import type { OCRData } from "@/lib/types"

interface DocumentUploadProps {
  type: "marksheet" | "aadhaarCard" | "categoryProof" | "profilePhoto" | "signature"
  label: string
  description: string
  required?: boolean
  value?: string
  onChange: (dataUrl: string) => void
  onOCRComplete?: (data: Partial<OCRData>, rawText: string) => void
}

async function compressImage(base64String: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = reject;
    img.src = base64String;
  });
}

async function compressFile(file: File, maxWidth: number = 800, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const compressed = await compressImage(e.target?.result as string, maxWidth, quality);
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========== SGPA EXTRACTION FUNCTION (ONLY FOR MARKSHEET) ==========
function extractSGPAFromText(text: string): string | null {
  if (!text) return null;
  
  console.log("🔍 Searching for SGPA in marksheet...");
  let sgpa = "";
  
  // Method 1: Look for SGPA with label
  const sgpaWithLabel = text.match(/SGPA\s*:\s*(\d+\.?\d{1,2})/i);
  if (sgpaWithLabel) {
    const value = parseFloat(sgpaWithLabel[1]);
    if (value >= 0 && value <= 10) {
      sgpa = sgpaWithLabel[1];
      console.log(`✅ SGPA found with label: ${sgpa}`);
      return sgpa;
    }
  }
  
  // Method 2: Look for SGPA in table format
  const sgpaTable = text.match(/SGPA\s+(\d+\.?\d{1,2})/i);
  if (sgpaTable) {
    const value = parseFloat(sgpaTable[1]);
    if (value >= 0 && value <= 10) {
      sgpa = sgpaTable[1];
      console.log(`✅ SGPA found in table: ${sgpa}`);
      return sgpa;
    }
  }
  
  // Method 3: Look for decimal numbers in bottom of document
  const lines = text.split('\n');
  const lastLines = lines.slice(-15).join('\n');
  const decimals = lastLines.match(/\b([5-9]\.[0-9]{2})\b/g);
  if (decimals) {
    for (const dec of decimals) {
      const value = parseFloat(dec);
      if (value >= 0 && value <= 10) {
        sgpa = dec;
        console.log(`✅ SGPA found in bottom lines: ${sgpa}`);
        return sgpa;
      }
    }
  }
  
  // Method 4: Look for bracket pattern
  const bracketPattern = /\]\s*(\d+\.\d{2})\s*\|/;
  const bracketMatch = text.match(bracketPattern);
  if (bracketMatch && bracketMatch[1]) {
    const value = parseFloat(bracketMatch[1]);
    if (value >= 5.0 && value <= 10.0) {
      sgpa = bracketMatch[1];
      console.log(`✅ SGPA found in bracket pattern: ${sgpa}`);
      return sgpa;
    }
  }
  
  // Method 5: Look for table row pattern
  const tablePattern = /\|\s*[\d.]+\s*\|\s*[\d.]+\s*\]?\s*(\d+\.\d{2})\s*\|\s*[\d.]+\s*\|/;
  const tableMatch = text.match(tablePattern);
  if (tableMatch && tableMatch[1]) {
    const value = parseFloat(tableMatch[1]);
    if (value >= 5.0 && value <= 10.0) {
      sgpa = tableMatch[1];
      console.log(`✅ SGPA found in table row: ${sgpa}`);
      return sgpa;
    }
  }
  
  console.log("❌ SGPA not found");
  return null;
}

// ========== NAME EXTRACTION FUNCTION (ONLY FOR MARKSHEET) ==========
function extractNameFromText(text: string): string | null {
  const namePatterns = [
    /Student Name\s*:\s*([A-Z][A-Za-z\s]+?)(?=\s+Roll|\s+Mother|\n|$)/i,
    /Name of Student\s*:\s*([A-Z][A-Za-z\s]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,4})\s+(?:Roll No|\d{6,})/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let name = match[1].trim().replace(/\s+/g, ' ');
      name = name.replace(/Roll.*$/, '').trim();
      name = name.replace(/Mother.*$/, '').trim();
      
      // Fix common OCR mistakes
      const nameCorrections: Record<string, string> = {
        "GATKWAD": "GAIKWAD",
        "GATK WAD": "GAIKWAD",
        "GAITKWAD": "GAIKWAD",
      };
      for (const [wrong, correct] of Object.entries(nameCorrections)) {
        if (name.includes(wrong)) {
          name = name.replace(wrong, correct);
          break;
        }
      }
      return name;
    }
  }
  return null;
}

export function DocumentUpload({
  type,
  label,
  description,
  required = false,
  value,
  onChange,
  onOCRComplete,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState<OCRProgress | null>(null)
  const [ocrComplete, setOcrComplete] = useState(false)
  const [error, setError] = useState<string>("")
  const [extractedInfo, setExtractedInfo] = useState<{ name?: string; sgpa?: string; value?: string; extra?: string }>({})

  const processFile = async (file: File) => {
    setError("")
    setOcrComplete(false)
    setExtractedInfo({})
    setIsProcessing(true)

    try {
      console.log(`📸 Processing ${type}...`);
      const compressedDataUrl = await compressFile(file, 800, 0.7);
      onChange(compressedDataUrl);
      console.log(`✅ ${type} compressed and saved`);

      if (onOCRComplete) {
        console.log(`🔍 Running OCR for ${type}...`);
        
        // Extract ALL text from the document
        const text = await extractFullTextWithModes(file, (progress) => {
          setOcrProgress(progress);
        });

        console.log(`📝 Extracted ${text.length} characters from ${type}`);

        const extractedData: Partial<OCRData> = {};
        let displayInfo: { name?: string; sgpa?: string; value?: string; extra?: string } = {};

        // ========== ONLY MARKSHEET GETS PARSED HERE ==========
        if (type === 'marksheet') {
          // Extract Name
          const name = extractNameFromText(text);
          if (name) {
            extractedData.extractedName = name;
            displayInfo.name = name;
            console.log(`📝 Extracted name: ${name}`);
          }
          
          // Extract SGPA
          const sgpa = extractSGPAFromText(text);
          if (sgpa) {
            const sgpaValue = parseFloat(sgpa);
            extractedData.extractedSGPA = sgpaValue;
            displayInfo.sgpa = sgpa;
            console.log(`📊 Extracted SGPA: ${sgpa}`);
          }
          
          // Extract Roll Number (optional)
          const rollMatch = text.match(/Roll No\.?\s*:\s*(\d+)/i);
          if (rollMatch) {
            extractedData.extractedRollNo = rollMatch[1];
            displayInfo.extra = `Roll: ${rollMatch[1]}`;
          }
        }
        
        // ========== OTHER DOCUMENTS: ONLY SEND RAW TEXT, NO PARSING ==========
        // Aadhaar and Category will be parsed by validation.ts, not here
        
        setExtractedInfo(displayInfo);
        
        // Send extracted data (only name+sgpa for marksheet, empty for others) AND raw text
        // Validation will parse Aadhaar and Category from raw text
        onOCRComplete(extractedData, text);
        setOcrComplete(true);
      }
      
    } catch (error: any) {
      console.error(`❌ Error processing ${type}:`, error);
      setError(error.message || "Failed to process image");
    } finally {
      setIsProcessing(false);
      setOcrProgress(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) processFile(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleRemove = () => {
    onChange("")
    setOcrComplete(false)
    setError("")
    setExtractedInfo({})
  }

  const needsOCR = type === 'marksheet' || type === 'aadhaarCard' || type === 'categoryProof';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {label}
          {required && <span className="text-destructive">*</span>}
          {needsOCR && ocrComplete && !isProcessing && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✓ Extracted
            </span>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {value ? (
          <div className="relative space-y-3">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img src={value} alt={label} className="w-full h-full object-contain" />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm font-medium">{ocrProgress?.status || "Processing..."}</p>
                  {ocrProgress && ocrProgress.progress > 0 && (
                    <Progress value={ocrProgress.progress * 100} className="w-32 mt-2" />
                  )}
                </div>
              )}
            </div>

            <Button variant="destructive" size="icon" className="absolute top-2 left-2 h-8 w-8" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>

            {/* Show extracted information - only for marksheet */}
            {(extractedInfo.name || extractedInfo.sgpa) && !isProcessing && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800 mb-2">✓ Extracted from Marksheet</p>
                {extractedInfo.name && <p className="text-sm"><span className="font-semibold">Name:</span> {extractedInfo.name}</p>}
                {extractedInfo.sgpa && <p className="text-sm mt-1"><span className="font-semibold text-blue-600">SGPA:</span> {extractedInfo.sgpa}</p>}
                {extractedInfo.extra && <p className="text-sm mt-1 text-muted-foreground">{extractedInfo.extra}</p>}
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                ❌ {error}
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById(`file-${type}`)?.click()}
          >
            <input type="file" id={`file-${type}`} accept="image/*" className="hidden" onChange={handleFileSelect} />
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Drop your {label.toLowerCase()} here or click to upload</p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
            {needsOCR && <p className="text-xs text-blue-500 mt-2">✨ Document text will be extracted automatically</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}