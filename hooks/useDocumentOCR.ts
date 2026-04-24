// hooks/useDocumentOCR.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { getOCRService, type ExtractedDocumentData } from '@/lib/ocr/advancedOCR';
import { parseMarksheetOCR, parseAadhaarOCR, parseCategoryProofOCR, type ParsedMarksheet, type ParsedAadhaar, type ParsedCategoryCertificate } from '@/lib/ocr/documentParsers';

interface OCRState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  result: ExtractedDocumentData | null;
  parsedData: any | null;
}

interface UseDocumentOCROptions {
  documentType: 'marksheet' | 'aadhaar' | 'category';
  autoInitialize?: boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useDocumentOCR(options: UseDocumentOCROptions) {
  const { documentType, autoInitialize = true, onProgress, onComplete, onError } = options;
  
  const [state, setState] = useState<OCRState>({
    isProcessing: false,
    progress: 0,
    error: null,
    result: null,
    parsedData: null
  });
  
  const isInitialized = useRef(false);
  const ocrService = getOCRService();

  // Initialize OCR engine
  const initialize = useCallback(async () => {
    if (isInitialized.current) return;
    
    try {
      const language = documentType === 'aadhaar' ? 'hi' : 'en';
      await ocrService.initialize(language);
      isInitialized.current = true;
      console.log(`✅ OCR initialized for ${documentType}`);
    } catch (error) {
      console.error('OCR initialization failed:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize OCR engine' }));
      throw error;
    }
  }, [documentType]);

  // Process image
  const processImage = useCallback(async (imageFile: File) => {
    if (!isInitialized.current && autoInitialize) {
      await initialize();
    }

    setState({
      isProcessing: true,
      progress: 0,
      error: null,
      result: null,
      parsedData: null
    });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({ ...prev, progress: Math.min(prev.progress + 10, 90) }));
      }, 200);

      let ocrResult: ExtractedDocumentData;
      
      // Process based on document type
      if (documentType === 'aadhaar') {
        ocrResult = await ocrService.processAadhaarDocument(imageFile, (progress) => {
          setState(prev => ({ ...prev, progress }));
          onProgress?.(progress);
        });
      } else {
        ocrResult = await ocrService.processDocument(imageFile, documentType, (progress) => {
          setState(prev => ({ ...prev, progress }));
          onProgress?.(progress);
        });
      }

      clearInterval(progressInterval);
      
      // Parse based on document type
      let parsedData: any;
      switch (documentType) {
        case 'marksheet':
          parsedData = parseMarksheetOCR(ocrResult);
          break;
        case 'aadhaar':
          parsedData = parseAadhaarOCR(ocrResult);
          break;
        case 'category':
          parsedData = parseCategoryProofOCR(ocrResult);
          break;
      }

      const finalState = {
        isProcessing: false,
        progress: 100,
        error: null,
        result: ocrResult,
        parsedData
      };
      
      setState(finalState);
      onComplete?.(parsedData);
      
      return { ocrResult, parsedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [documentType, autoInitialize, initialize, onProgress, onComplete, onError]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      error: null,
      result: null,
      parsedData: null
    });
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize().catch(console.error);
    }
    
    return () => {
      // Optional: cleanup if needed
    };
  }, [autoInitialize, initialize]);

  return {
    ...state,
    processImage,
    reset,
    initialize
  };
}