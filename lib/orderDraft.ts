import { supabase } from "@/lib/supabase";
import { GoodsPhoto } from "@/lib/photoUtils";

async function uploadGoodsPhotoToStorage(photo: GoodsPhoto): Promise<string> {
  const blob = await fetch(photo.url).then((res) => res.blob());
  const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("order-photos").upload(path, blob);
  if (error) throw error;

  const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
  return data.publicUrl;
}

// 굿즈 옵션 선택 화면에서 "제작 신청하기"를 누르면 사진을 업로드하고
// 배송정보 입력(체크아웃) 화면으로 바로 넘어가게 해줘요. (별도의 /upload 단계를 거치지 않아요.)
export async function saveGoodsDraftAndGoToCheckout({
  router,
  productName,
  sizeId,
  sizeLabel,
  sizeDetail,
  quantity,
  unitPrice,
  photos,
  note,
  colorNote,
}: {
  router: { push: (url: string) => void };
  productName: string;
  sizeId: string;
  sizeLabel: string;
  sizeDetail: string;
  quantity: number;
  unitPrice: number;
  photos: GoodsPhoto[];
  note?: string;
  // 폰케이스 배경색상처럼, 고객이 이 단계에서 고칠 수 없게 자동으로 붙는 메모예요.
  colorNote?: string;
}): Promise<{ ok: true } | { ok: false }> {
  try {
    const uploadedPhotos = await Promise.all(
      photos.map(async (p) => ({ ...p, url: await uploadGoodsPhotoToStorage(p) }))
    );

    // 텀블러 각인 요청사항이나 하드케이스 배경색상처럼 사진이 아닌 메모는
    // 실제 이미지 업로드 없이 photos 배열 맨 뒤에 { url: "", note } 형태로 함께 담아요.
    const notePhotos = [note, colorNote]
      .filter((n): n is string => !!n && n.trim() !== "")
      .map((n) => ({ url: "", caption: "", note: n.trim() }));

    const draft = {
      productName,
      sizeId,
      sizeLabel,
      sizeDetail,
      quantity: String(quantity),
      unitPrice,
      templateId: null,
      photos: [...uploadedPhotos, ...notePhotos],
    };

    sessionStorage.setItem("keepic_draft_order", JSON.stringify(draft));
    router.push("/checkout");
    return { ok: true };
  } catch (err) {
    console.error(err);
    alert("사진을 올리는 중 문제가 발생했어요. 다시 시도해주세요.");
    return { ok: false };
  }
}
