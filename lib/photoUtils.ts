// 굿즈(머그·폰케이스·텀블러·에코백·캘린더·패브릭포스터) 옵션 선택 화면에서
// 공통으로 쓰는 사진 타입과 해상도 체크 로직이에요. app/upload/page.tsx의 포토북 전용 타입과는
// 별개로, 굿즈 페이지에서 필요한 최소 필드만 가진 가벼운 버전입니다.

export type GoodsPhoto = {
  url: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
};

const PRINT_DPI = 200;

export function parseSizeCm(detail: string) {
  const match = detail.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
  if (!match) return { w: 15, h: 15 };
  return { w: parseFloat(match[1]), h: parseFloat(match[3]) };
}

export function calcRequiredMinPx(detail: string) {
  const { w, h } = parseSizeCm(detail);
  const shorterCm = Math.min(w, h);
  return Math.round((shorterCm / 2.54) * PRINT_DPI);
}

export function isLowRes(photo: GoodsPhoto, requiredMinPx: number) {
  return Math.min(photo.width, photo.height) < requiredMinPx;
}

export function createGoodsPhotoFromFile(file: File): Promise<GoodsPhoto> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({
        url,
        x: 0,
        y: 0,
        scale: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = url;
  });
}
