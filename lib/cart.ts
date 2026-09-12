export type CartItem = {
  id: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
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

export function addToCart(input: {
  productName: string;
  sizeId: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
}) {
  const items = readCart();
  const existing = items.find(
    (item) => item.productName === input.productName && item.sizeId === input.sizeId
  );
  if (existing) {
    existing.quantity += input.quantity;
  } else {
    items.push({
      id: `${input.productName}-${input.sizeId}-${Date.now()}`,
      productName: input.productName,
      sizeId: input.sizeId,
      sizeLabel: input.sizeLabel,
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      addedAt: Date.now(),
    });
  }
  writeCart(items);
}

export function updateCartQuantity(id: string, quantity: number) {
  const items = readCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  writeCart(items);
}

export function removeFromCart(id: string) {
  const items = readCart().filter((item) => item.id !== id);
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
