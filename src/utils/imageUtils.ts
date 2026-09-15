/**
 * Utilities for encoding photos to Base64 ("hash64") and reconstructing them faithfully
 */

export interface Base64Result {
  dataUrl: string; // The reconstructed base64 data URI
  sizeKb: number;
  fileName: string;
  type: string;
}

export async function convertFileToBase64(
  file: File,
  maxWidth = 1600,
  maxHeight = 1200,
  quality = 0.85
): Promise<Base64Result> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const originalDataUrl = event.target?.result as string;
      if (!originalDataUrl) {
        return reject(new Error('No se pudo leer el archivo'));
      }

      // Optimize and resize via canvas to ensure smooth base64 reconstruction
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const sizeKb = Math.round(originalDataUrl.length / 1024);
          return resolve({
            dataUrl: originalDataUrl,
            sizeKb,
            fileName: file.name,
            type: file.type,
          });
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedDataUrl = canvas.toDataURL(outputFormat, quality);
        const sizeKb = Math.round(compressedDataUrl.length / 1024);

        resolve({
          dataUrl: compressedDataUrl,
          sizeKb,
          fileName: file.name,
          type: outputFormat,
        });
      };

      img.onerror = () => {
        // Fallback to original base64
        const sizeKb = Math.round(originalDataUrl.length / 1024);
        resolve({
          dataUrl: originalDataUrl,
          sizeKb,
          fileName: file.name,
          type: file.type,
        });
      };

      img.src = originalDataUrl;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
