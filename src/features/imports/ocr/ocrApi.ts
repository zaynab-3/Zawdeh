import type { SelectedScreenshot } from '@/features/imports/importTypes';

export type OcrResult = {
  text: string;
};

export async function extractTextFromScreenshots(_screenshots: SelectedScreenshot[]): Promise<OcrResult> {
  throw new Error('OCR is coming next. For now, paste the text manually.');
}
