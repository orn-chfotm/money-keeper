// Text helpers count Unicode code points ([...text]) so emoji and other surrogate pairs are never split.

export type CountCodePointsRequestDto = { text: string };

export type CountCodePointsResponseDto = { length: number };

export function countCodePoints({ text }: CountCodePointsRequestDto): CountCodePointsResponseDto {
  return { length: [...text].length };
}
