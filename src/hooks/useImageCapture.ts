import { useCallback, useRef } from 'react';

interface UseImageCaptureReturn {
  captureFromCamera: () => Promise<{ base64: string; mimeType: string } | null>;
  selectFromGallery: () => Promise<{ base64: string; mimeType: string } | null>;
}

export const useImageCapture = (): UseImageCaptureReturn => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = (file: File): Promise<{ base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        const base64Data = base64.split(',')[1];
        resolve({
          base64: base64Data,
          mimeType: file.type || 'image/jpeg',
        });
      };
      reader.onerror = () => {
        console.error('Error reading image file');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const createFileInput = (accept: string, capture?: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) {
      input.setAttribute('capture', capture);
    }
    return input;
  };

  const captureFromCamera = useCallback(async (): Promise<{ base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const input = createFileInput('image/*', 'environment');
      cameraInputRef.current = input;

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const result = await processFile(file);
          resolve(result);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }, []);

  const selectFromGallery = useCallback(async (): Promise<{ base64: string; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const input = createFileInput('image/*');
      galleryInputRef.current = input;

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const result = await processFile(file);
          resolve(result);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }, []);

  return {
    captureFromCamera,
    selectFromGallery,
  };
};
