"use client";

import { useEffect, useRef, useState } from "react";
import { GoodsPhoto, createGoodsPhotoFromFile, isLowRes } from "@/lib/photoUtils";

// 사진 위치를 손가락/마우스로 끌어서 옮기고, 아래 슬라이더로 확대할 수 있는 미리보기 칸이에요.
function PhotoCropCell({
  photo,
  requiredMinPx,
  onChange,
}: {
  photo: GoodsPhoto;
  requiredMinPx: number;
  onChange: (changes: Partial<GoodsPhoto>) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, photoX: 0, photoY: 0 });

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      photoX: photo.x,
      photoY: photo.y,
    };
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      onChange({
        x: dragStart.current.photoX + dx,
        y: dragStart.current.photoY + dy,
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="group relative h-full w-full overflow-hidden bg-[var(--color-ivory)]">
      <img
        src={photo.url}
        onMouseDown={handleMouseDown}
        draggable={false}
        style={{ transform: `translate(${photo.x}px, ${photo.y}px) scale(${photo.scale})` }}
        className="h-full w-full cursor-grab select-none object-cover active:cursor-grabbing"
        alt=""
      />
      {isLowRes(photo, requiredMinPx) && (
        <span
          title="인쇄 기준 화질이 낮아요"
          className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          저해상도
        </span>
      )}
      <input
        type="range"
        min={1}
        max={2.5}
        step={0.05}
        value={photo.scale}
        onChange={(e) => onChange({ scale: Number(e.target.value) })}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute inset-x-1 bottom-1 opacity-0 transition group-hover:opacity-100"
      />
    </div>
  );
}

// 굿즈 옵션 선택 화면에 바로 넣는 사진 선택 칸이에요.
// maxPhotos가 1이면 자리를 끌어서 옮기는 미리보기 칸 1개(폰케이스·머그·텀블러·에코백·패브릭포스터),
// 1보다 크면 여러 장을 고르는 썸네일 그리드(캘린더)로 보여줘요.
export default function PhotoPickerField({
  photos,
  onPhotosChange,
  minPhotos,
  maxPhotos,
  requiredMinPx,
  aspect = "aspect-square",
  hint,
  optional = false,
}: {
  photos: GoodsPhoto[];
  onPhotosChange: (photos: GoodsPhoto[]) => void;
  minPhotos: number;
  maxPhotos: number;
  requiredMinPx: number;
  aspect?: string;
  hint?: string;
  optional?: boolean;
}) {
  const isSingle = maxPhotos <= 1;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newPhotos = await Promise.all(Array.from(files).map(createGoodsPhotoFromFile));
    if (isSingle) {
      onPhotosChange([newPhotos[0]]);
    } else {
      onPhotosChange([...photos, ...newPhotos].slice(0, maxPhotos));
    }
    e.target.value = "";
  }

  function handleRemove(index: number) {
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  function handleTransform(index: number, changes: Partial<GoodsPhoto>) {
    onPhotosChange(photos.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  return (
    <div>
      <h2 className="text-sm font-medium">
        사진{optional && <span className="ml-1 text-xs font-normal text-[var(--color-charcoal)]/40">(선택)</span>}
      </h2>
      {hint && (
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">{hint}</p>
      )}

      {isSingle ? (
        <div className="mt-3">
          {photos[0] ? (
            <div
              className={`${aspect} w-full max-w-[220px] overflow-hidden border border-[var(--color-hairline)]`}
            >
              <PhotoCropCell
                photo={photos[0]}
                requiredMinPx={requiredMinPx}
                onChange={(c) => handleTransform(0, c)}
              />
            </div>
          ) : (
            <div
              className={`${aspect} flex w-full max-w-[220px] items-center justify-center border border-dashed border-[var(--color-hairline)] text-center text-xs text-[var(--color-charcoal)]/40`}
            >
              사진을 선택해주세요
            </div>
          )}
          <label className="mt-3 inline-block cursor-pointer rounded-full border border-[var(--color-charcoal)]/30 px-5 py-2.5 text-xs font-medium transition hover:bg-[var(--color-hairline)]/20">
            {photos[0] ? "사진 바꾸기" : "사진 선택하기"}
            <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </label>
          <p className="mt-2 break-keep text-[11px] text-[var(--color-charcoal)]/40">
            사진을 끌어서 위치를 옮기고, 칸 위에 마우스를 올리면 나오는 슬라이더로 확대할 수 있어요.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <label className="inline-block cursor-pointer rounded-full border border-[var(--color-charcoal)]/30 px-5 py-2.5 text-xs font-medium transition hover:bg-[var(--color-hairline)]/20">
            사진 선택하기 ({photos.length}/{maxPhotos}장)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden border border-[var(--color-hairline)]"
                >
                  <img
                    src={photo.url}
                    alt={`선택한 사진 ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {isLowRes(photo, requiredMinPx) && (
                    <span className="absolute left-1 top-1 rounded bg-red-500/90 px-1 py-0.5 text-[9px] font-medium text-white">
                      저해상도
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isSingle && photos[0] && isLowRes(photos[0], requiredMinPx) && (
        <p className="mt-2 break-keep text-xs text-red-500">
          이 사진은 인쇄 기준으로 해상도가 낮아요. 흐릿하게 나올 수 있으니 가능하면 더 큰 사진으로 교체해주세요.
        </p>
      )}
      {!isSingle && photos.length > 0 && photos.length < minPhotos && (
        <p className="mt-2 break-keep text-xs text-red-500">
          사진이 {minPhotos - photos.length}장 더 필요해요.
        </p>
      )}
    </div>
  );
}
