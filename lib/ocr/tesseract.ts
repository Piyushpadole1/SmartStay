import Tesseract from "tesseract.js";

export interface OCRProgress {
  status: string;
  progress: number;
}

// Simple image preprocessing for better OCR
async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Resize if too large (but preserve quality)
      let width = img.width;
      let height = img.height;
      const maxDim = 2000;
      
      if (width > height && width > maxDim) {
        height = (height * maxDim) / width;
        width = maxDim;
      } else if (height > maxDim) {
        width = (width * maxDim) / height;
        height = maxDim;
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Simple grayscale for better contrast
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob(blob => resolve(blob!), 'image/png', 1.0);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Main OCR function - extracts ALL text from image
export async function extractTextFromImage(
  imageFile: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> {
  try {
    onProgress?.({ status: "Preprocessing image...", progress: 0.2 });
    
    const processedFile = await preprocessImage(imageFile);
    
    onProgress?.({ status: "Initializing OCR engine...", progress: 0.4 });
    
    const worker = await Tesseract.createWorker('eng');
    
    // Optimize for maximum text extraction
    await worker.setParameters({
      tessedit_pageseg_mode: '6',  // Treat as single uniform text block
      tessedit_ocr_engine_mode: '1', // LSTM engine only
      preserve_interword_spaces: '1',
      tessedit_char_whitelist: '', // Allow ALL characters
    });
    
    onProgress?.({ status: "Extracting text...", progress: 0.6 });
    
    const result = await worker.recognize(processedFile);
    
    onProgress?.({ status: "Finalizing...", progress: 0.9 });
    
    let fullText = result.data.text;
    
    // Also get lines if available (often more complete)
    if (result.data.lines && result.data.lines.length > 0) {
      const lineText = result.data.lines.map((line: any) => line.text).join('\n');
      if (lineText.length > fullText.length) {
        fullText = lineText;
      }
    }
    
    await worker.terminate();
    
    onProgress?.({ status: "Complete!", progress: 1 });
    
    console.log(`✅ Extracted ${fullText.length} characters`);
    return fullText;
    
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}

// Alternative function that tries multiple modes for better extraction
export async function extractFullTextWithModes(
  imageFile: File,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> {
  try {
    onProgress?.({ status: "Preprocessing...", progress: 0.1 });
    
    const processedFile = await preprocessImage(imageFile);
    
    const modes = [
      { mode: '3', name: 'Auto column' },
      { mode: '4', name: 'Single column' },
      { mode: '6', name: 'Uniform block' },
      { mode: '11', name: 'Sparse text' },
      { mode: '12', name: 'Sparse text with OSD' }
    ];
    
    let bestText = '';
    let bestLength = 0;
    
    for (let i = 0; i < modes.length; i++) {
      const { mode, name } = modes[i];
      onProgress?.({ 
        status: `Trying ${name} mode (${i + 1}/${modes.length})...`, 
        progress: 0.2 + (i * 0.15) 
      });
      
      try {
        const worker = await Tesseract.createWorker('eng');
        
        await worker.setParameters({
          tessedit_pageseg_mode: mode,
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '',
        });
        
        const result = await worker.recognize(processedFile);
        let text = result.data.text;
        
        // Get lines for more complete text
        if (result.data.lines && result.data.lines.length > 0) {
          const lineText = result.data.lines.map((line: any) => line.text).join('\n');
          if (lineText.length > text.length) {
            text = lineText;
          }
        }
        
        console.log(`Mode ${mode} (${name}): ${text.length} chars`);
        
        if (text.length > bestLength) {
          bestLength = text.length;
          bestText = text;
        }
        
        await worker.terminate();
        
      } catch (err) {
        console.warn(`Mode ${mode} failed:`, err);
      }
    }
    
    // Also try original image without preprocessing
    onProgress?.({ status: "Trying original image...", progress: 0.85 });
    
    try {
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
      });
      const result = await worker.recognize(imageFile);
      const originalText = result.data.text;
      
      if (originalText.length > bestLength) {
        bestLength = originalText.length;
        bestText = originalText;
      }
      
      await worker.terminate();
    } catch (err) {
      console.warn("Original image failed:", err);
    }
    
    onProgress?.({ status: "Complete!", progress: 1 });
    
    console.log(`✅ Best extraction: ${bestLength} characters`);
    return bestText;
    
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
}