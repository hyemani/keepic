import { GoodsPhoto } from "@/lib/photoUtils";

export type CartItem = {
  id: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  sizeDetail: string;
  unitPrice: number;
  quantity: number;
  // 이미 Supabase Storage에 올라간 사진이에요. (장바구니는 새로고침 후에도 남아있어야 해서,
  // 임시 blob 주소가 아니라 실제 업로드된 주소만 저장해요.)
  photos: GoodsPhoto[];
  note?: string;
  colorNote?: string;
  addedAt: number;
};

const STORAGE_KEY = "keepic_cart";
const EVENT_NAME = "keepic:cart-updated";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function getCart(): CartItem[] {
  return readCart();
}

export function getCartCount(): number {
  return readCart().reduce((sum, item) => sum + item.quantity, 0);
}

// 담을 때마다 사진·요청사항이 다를 수 있어서, 같은 상품·옵션이어도 합치지 않고
// 항상 새 항목으로 담아요.
export function addToCart(input: {
  productName: string;
  sizeId: string;
  sizeLabel: string;
  sizeDetail: string;
  unitPrice: number;
  quantity: number;
  photos: GoodsPhoto[];
  note?: string;
  colorNote?: string;
}) {
  const items = readCart();
  items.push({
    id: `${input.productName}-${input.sizeId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    productName: input.productName,
    sizeId: input.sizeId,
    sizeLabel: input.sizeLabel,
    sizeDetail: input.sizeDetail,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    photos: input.photos,
    note: input.note,
    colorNote: input.colorNote,
    addedAt: Date.now(),
  });
  writeCart(items);
}

export function updateCartQuantity(id: string, quantity: number) {
  const items = readCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  writeCart(items);
}

export function updateCartItemPhotos(id: string, photos: GoodsPhoto[]) {
  const items = readCart().map((item) => (item.id === id ? { ...item, photos } : item));
  writeCart(items);
}

export function removeFromCart(id: string) {
  const items = readCart().filter((item) => item.id !== id);
  writeCart(items);
}

export function removeManyFromCart(ids: string[]) {
  const idSet = new Set(ids);
  const items = readCart().filter((item) => !idSet.has(item.id));
  writeCart(items);
}

export function clearCart() {
  writeCart([]);
}

export function subscribeToCart(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", callback);
  };
}
