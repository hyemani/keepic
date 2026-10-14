// 사진 칸의 "사진 올리기"로 고른 파일들을 나누는 규칙이에요(42차).
// - 이미지가 아닌 파일은 버려요.
// - 첫 번째 이미지는 지금 선택한 칸에 들어가고, 나머지는 사진 목록에만 추가돼요(다른 칸은 건드리지 않아요).
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;

export function isImageFile(f: { type?: string; name?: string }): boolean {
  if (f.type) return f.type.startsWith("image/");
  return IMAGE_EXT.test(f.name ?? "");
}

export function splitUploadFiles<T extends { type?: string; name?: string }>(files: ArrayLike<T>): { first: T | null; rest: T[] } {
  const images = Array.from(files).filter(isImageFile);
  return { first: images[0] ?? null, rest: images.slice(1) };
}
