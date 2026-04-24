// lib/utils/image-compression.ts
export async function compressImage(
  base64String: string, 
  maxWidth = 600, 
  quality = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with lower quality
      const compressed = canvas.toDataURL('image/jpeg', quality);
      
      // Check if compressed size is reasonable
      const compressedSize = Math.round((compressed.length * 3) / 4);
      if (compressedSize > 50000) { // If still > 50KB
        // Compress further
        const furtherCompressed = canvas.toDataURL('image/jpeg', quality * 0.7);
        resolve(furtherCompressed);
      } else {
        resolve(compressed);
      }
    };
    img.onerror = reject;
    img.src = base64String;
  });
}

// Compress all documents before saving
export async function compressAllDocuments(documents: {
  marksheet: string;
  aadhaarCard: string;
  categoryProof: string;
  profilePhoto: string;
  signature: string;
}): Promise<typeof documents> {
  const compressed: any = {};
  
  for (const [key, value] of Object.entries(documents)) {
    if (value) {
      compressed[key] = await compressImage(value, 500, 0.4);
    } else {
      compressed[key] = value;
    }
  }
  
  return compressed;
}