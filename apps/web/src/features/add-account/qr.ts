import jsQR from 'jsqr';

/** Read a QR code from an uploaded image, entirely in the browser (the image never leaves the device). */
export async function readQrFromFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(data, width, height);
  if (!result) throw new Error('No QR code found in that image');
  return result.data;
}
