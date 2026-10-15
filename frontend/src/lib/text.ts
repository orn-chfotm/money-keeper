// Text helpers count Unicode code points ([...text]) so emoji and other surrogate pairs are never split.

export type TruncateTextRequestDto = { text: string; maxLength: number };

export type TruncateTextResponseDto = { text: string; isTruncated: boolean };

const ELLIPSIS = "…";

// Keeps the first maxLength code points and appends "…" when the text is longer.
export function truncateText({ text, maxLength }: TruncateTextRequestDto): TruncateTextResponseDto {
  const codePoints = [...text];
  if (codePoints.length <= maxLength) return { text, isTruncated: false };
  return { text: codePoints.slice(0, maxLength).join("") + ELLIPSIS, isTruncated: true };
}

export type CountCodePointsRequestDto = { text: string };

export type CountCodePointsResponseDto = { length: number };

export function countCodePoints({ text }: CountCodePointsRequestDto): CountCodePointsResponseDto {
  return { length: [...text].length };
}
