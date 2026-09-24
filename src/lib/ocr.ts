/**
 * On-device OCR for a statement screenshot. Nothing is uploaded: Tesseract runs
 * in a worker in the browser, so the image never leaves the phone.
 *
 * Upscaling is the whole ballgame. Measured on a real SoFi screenshot:
 *   native  — decimals dropped entirely ("-$84.99" -> "$8499"). Unusable.
 *   3x      — every digit and decimal correct.
 *   4x      — no better, and started losing minus signs.
 * So aim for roughly 3x, but only up to a canvas a phone can actually allocate.
 */

const TARGET_WIDTH = 1600;
const MAX_SCALE = 3;
const MAX_PIXELS = 12_000_000;

function scaleFor(width: number, height: number): number {
  const wanted = Math.min(MAX_SCALE, Math.max(1, TARGET_WIDTH / width));
  const pixels = width * height * wanted * wanted;
  return pixels <= MAX_PIXELS ? wanted : Math.sqrt(MAX_PIXELS / (width * height));
}

async function upscale(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = scaleFor(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't read the image on this device.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

export async function readStatementImage(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const canvas = await upscale(file);
  // Loaded on demand — several MB of wasm and language data that nobody should
  // pay for on first open of the app.
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
