import { scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

/**
 * Let the user pick one or more photos/screenshots and read QR codes from them on-device.
 * Returns the decoded texts and how many images had no readable QR. `null` = user cancelled.
 */
export async function pickQrImages(
  multiple: boolean,
): Promise<{ texts: string[]; skipped: number } | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 1,
  });
  if (res.canceled) return null;
  const texts: string[] = [];
  let skipped = 0;
  for (const asset of res.assets) {
    try {
      const found = await scanFromURLAsync(asset.uri, ['qr']);
      if (found.length === 0) skipped++;
      for (const f of found) if (!texts.includes(f.data)) texts.push(f.data);
    } catch {
      skipped++;
    }
  }
  return { texts, skipped };
}

export const NO_QR_MESSAGE =
  'We couldn’t find a QR code in that image. Try a sharper, uncropped screenshot.';
