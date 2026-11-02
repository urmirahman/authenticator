/** Copy a code, then wipe the clipboard after `clearAfterSeconds` (only if it still holds our code). */
export async function copyCode(code: string, clearAfterSeconds: number) {
  await navigator.clipboard.writeText(code);
  if (clearAfterSeconds <= 0) return;
  setTimeout(async () => {
    try {
      if ((await navigator.clipboard.readText()) === code) await navigator.clipboard.writeText('');
    } catch {
      // Reading the clipboard needs permission/focus; fall back to clearing blindly.
      await navigator.clipboard.writeText('').catch(() => undefined);
    }
  }, clearAfterSeconds * 1000);
}
