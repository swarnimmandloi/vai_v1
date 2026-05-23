import { toJpeg } from 'html-to-image';

export async function captureCanvas(): Promise<string | null> {
  try {
    const el = document.querySelector('.react-flow') as HTMLElement;
    if (!el) return null;
    const dataUrl = await toJpeg(el, {
      quality: 0.5,
      pixelRatio: 0.5,
      skipFonts: true,
    });
    return dataUrl.split(',')[1];
  } catch {
    return null;
  }
}
