// lib/ocr/advancedOCR.ts
import { createOCREngine, type OCRResult, type RapidOCREngine } from 'client-side-ocr';

export interface DocumentOCRConfig {
  language: string[];
  enableTableDetection: boolean;
  enhanceContrast: boolean;
  deskew: boolean;
}

export interface ExtractedDocumentData {
  rawText: string;
  confidence: number;
  lines: Array<{ text: string; confidence: number; bbox?: number[] }>;
  processingTime: number;
}

// Document-specific configurations [citation:3]
const DOCUMENT_CONFIGS: Record<string, DocumentOCRConfig> = {
  marksheet: {
    language: ['en'],
    enableTableDetection: true,
    enhanceContrast: true,
    deskew: true
  },
  aadhaar: {
    language: ['en', 'hi'],  // Aadhaar has Hindi text
    enableTableDetection: false,
    enhanceContrast: true,
    deskew: false
  },
  category: {
    language: ['en'],
    enableTableDetection: false,
    enhanceContrast: true,
    deskew: true
  }
};

class AdvancedOCRService {
  private engine: RapidOCREngine | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  async initialize(language: string = 'en'): Promise<void> {
    if (this.engine) return;
    
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initializeEngine(language);
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _initializeEngine(language: string): Promise<void> {
    try {
      // Create engine with PP-OCRv4 model for best accuracy [citation:3]
      this.engine = createOCREngine({
        language: language,
        modelVersion: 'PP-OCRv4',  // State-of-the-art accuracy
        modelType: 'mobile'         // Optimized for browser
      });
      
      await this.engine.initialize();
      console.log(`✅ OCR Engine initialized for language: ${language}`);
    } catch (error) {
      console.error('Failed to initialize OCR engine:', error);
      throw new Error(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processDocument(
    imageFile: File,
    documentType: 'marksheet' | 'aadhaar' | 'category',
    onProgress?: (progress: number) => void
  ): Promise<ExtractedDocumentData> {
    if (!this.engine) {
      throw new Error('OCR Engine not initialized. Call initialize() first.');
    }

    const config = DOCUMENT_CONFIGS[documentType];
    
    // For Aadhaar, we need Hindi support
    if (documentType === 'aadhaar' && config.language.includes('hi')) {
      // Re-initialize with Hindi support if needed
      await this.initialize('hi');
    }

    try {
      const startTime = performance.now();
      
      // Process with document-specific optimizations [citation:3]
      const result = await this.engine.processImage(imageFile, {
        enableTextClassification: true,    // Handles rotated text
        enableWordSegmentation: true,      // Word-level accuracy
        preprocessConfig: {
          detectImageNetNorm: true,        // Better detection
          recStandardNorm: true            // Better recognition
        },
        postprocessConfig: {
          unclipRatio: 2.0,               // Expands text regions
          boxThresh: 0.7                   // Confidence threshold
        }
      });

      const processingTime = performance.now() - startTime;

      // Log processing details for debugging
      console.log(`📄 ${documentType.toUpperCase()} OCR completed in ${processingTime.toFixed(0)}ms`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Lines detected: ${result.lines?.length || 0}`);

      return {
        rawText: result.text,
        confidence: result.confidence,
        lines: result.lines || [],
        processingTime
      };
    } catch (error) {
      console.error(`OCR processing failed for ${documentType}:`, error);
      throw new Error(`Failed to process ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Specialized method for Aadhaar (handles Hindi + English mixed text)
  async processAadhaarDocument(
    imageFile: File,
    onProgress?: (progress: number) => void
  ): Promise<ExtractedDocumentData> {
    // Ensure Hindi support is loaded
    await this.initialize('hi');
    
    const result = await this.processDocument(imageFile, 'aadhaar', onProgress);
    
    // Post-process Aadhaar text to handle Hindi/English mixing
    result.rawText = this.postProcessAadhaarText(result.rawText);
    
    return result;
  }

  private postProcessAadhaarText(text: string): string {
    // Clean up common OCR issues in Aadhaar cards
    let cleaned = text;
    
    // Fix common number confusions
    cleaned = cleaned.replace(/O/g, '0')
                     .replace(/[I|]/g, '1')
                     .replace(/S/g, '5');
    
    // Fix Aadhaar number pattern (12 digits with spaces)
    const aadhaarPattern = /\b(\d{4})\s*(\d{4})\s*(\d{4})\b/;
    const match = cleaned.match(aadhaarPattern);
    if (match) {
      cleaned = cleaned.replace(aadhaarPattern, `${match[1]} ${match[2]} ${match[3]}`);
    }
    
    return cleaned;
  }

  async terminate(): Promise<void> {
    if (this.engine) {
      // Clean up resources
      this.engine = null;
    }
  }
}

// Singleton instance
let ocrServiceInstance: AdvancedOCRService | null = null;

export function getOCRService(): AdvancedOCRService {
  if (!ocrServiceInstance) {
    ocrServiceInstance = new AdvancedOCRService();
  }
  return ocrServiceInstance;
}