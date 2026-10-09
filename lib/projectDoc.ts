// 편집 문서(JSON)를 저장용으로 포장/풀기 위한 도우미예요.
//
// 편집기에서 사진 주소는 `blob:http://…/uuid` 형태의 임시 주소예요(브라우저를 닫으면 사라져요).
// 저장할 땐 문서 안의 모든 blob: 주소를 찾아 그 원본 파일(Blob)을 따로 저장하고, 문서에는
// `keepic-blob:<id>` 자리표시만 남겨요. 불러올 땐 원본 파일로 새 blob: 주소를 만들어 되돌려요.
// 문서 구조(어느 필드에 사진이 들어있든)를 몰라도 되도록 문자열 단위로 바꿔서, 표지 사진·
// 뒤표지·소개 페이지용 복사본(coverPhoto)·사진 라이브러리 등이 전부 같은 규칙으로 처리돼요.

const BLOB_URL_RE = /blob:[^"\\\s]+/g;
const PLACEHOLDER_RE = /keepic-blob:[0-9a-zA-Z-]+/g;

type CacheEntry = { id: string; blob: Blob };
// 이 페이지가 살아있는 동안 "blob 주소 → 이미 저장용으로 확보한 원본" 기억이에요.
const urlCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry | null>>();

function newBlobId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function resolveUrl(url: string): Promise<CacheEntry | null> {
  const hit = urlCache.get(url);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(url);
  if (running) return running;
  const p = fetch(url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("fetch failed"))))
    .then((blob) => {
      const entry = { id: newBlobId(), blob };
      urlCache.set(url, entry);
      return entry;
    })
    .catch(() => null)
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

/** 문서 안의 blob: 주소들의 원본을 미리 확보해둬요(저장 때 빨리 끝나도록, 실패해도 조용히 넘어가요). */
export function prefetchBlobUrls(text: string) {
  const urls = new Set(text.match(BLOB_URL_RE) ?? []);
  for (const u of urls) void resolveUrl(u);
}

export type PackedDoc = {
  json: string;
  blobs: Map<string, Blob>;
  unresolved: string[]; // 원본을 못 찾은 blob 주소(이미 해제된 임시 주소 등)
  urlToBlobId: Map<string, string>;
};

export async function packDoc(doc: unknown): Promise<PackedDoc> {
  const text = JSON.stringify(doc);
  const urls = Array.from(new Set(text.match(BLOB_URL_RE) ?? []));
  const entries = await Promise.all(urls.map(async (u) => [u, await resolveUrl(u)] as const));
  const map = new Map<string, string>();
  const blobs = new Map<string, Blob>();
  const unresolved: string[] = [];
  for (const [u, e] of entries) {
    if (e) {
      map.set(u, `keepic-blob:${e.id}`);
      blobs.set(e.id, e.blob);
    } else {
      unresolved.push(u);
    }
  }
  const json = text.replace(BLOB_URL_RE, (m) => map.get(m) ?? m);
  const urlToBlobId = new Map<string, string>();
  for (const [u, ph] of map) urlToBlobId.set(u, ph.slice("keepic-blob:".length));
  return { json, blobs, unresolved, urlToBlobId };
}

/** 저장된 JSON 문자열 + 원본 파일들로 문서를 되살려요(새 blob: 주소 생성). */
export function unpackDoc(json: string, blobs: Map<string, Blob>): { doc: unknown; missing: number } {
  const idToUrl = new Map<string, string>();
  let missing = 0;
  const text = json.replace(PLACEHOLDER_RE, (m) => {
    const id = m.slice("keepic-blob:".length);
    let url = idToUrl.get(id);
    if (url === undefined) {
      const blob = blobs.get(id);
      if (blob) {
        url = URL.createObjectURL(blob);
        urlCache.set(url, { id, blob }); // 다시 저장할 때 원본을 또 안 읽어도 되게 기억해요
      } else {
        url = "";
        missing += 1;
      }
      idToUrl.set(id, url);
    }
    return url;
  });
  return { doc: JSON.parse(text), missing };
}

/** 저장 목록용 작은 미리보기 이미지(JPEG)예요. 표지 사진을 가운데 기준으로 잘라 만들어요. */
export async function makeThumbnail(url: string | undefined | null, maxEdge = 360): Promise<Blob | null> {
  if (!url) return null;
  try {
    const entry = url.startsWith("blob:") ? await resolveUrl(url) : null;
    const blob = entry?.blob ?? (await (await fetch(url)).blob());
    const bmp = await createImageBitmap(blob);
    const w = 3;
    const h = 4;
    const cw = Math.round(maxEdge * (w / h));
    const ch = maxEdge;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f4f1ec";
    ctx.fillRect(0, 0, cw, ch);
    const s = Math.max(cw / bmp.width, ch / bmp.height);
    const dw = bmp.width * s;
    const dh = bmp.height * s;
    ctx.drawImage(bmp, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    bmp.close?.();
    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.8));
  } catch {
    return null;
  }
}
