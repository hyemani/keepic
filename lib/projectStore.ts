// 내 작업(포토북 편집 중인 프로젝트) 저장소예요.
//
// 지금 이 앱엔 로그인/계정도, 작업을 저장하는 서버(API·DB)도 없어요(Supabase는 주문을 넣을 때만
// 써요). 그래서 우선 "이 브라우저 안(IndexedDB)"에 저장해요. 같은 컴퓨터·같은 브라우저에서만
// 다시 열 수 있고, 브라우저 사이트 데이터를 지우면 같이 지워져요.
//
// 나중에 서버 저장으로 바꿀 때는 아래 ProjectStore 인터페이스(save/load/list/remove/rename)를
// 구현한 새 저장소로 `projectStore`만 바꿔 끼우면 편집기·내 작업 화면은 그대로 써요.

export const PROJECT_SCHEMA_VERSION = 1;

export type ProjectMeta = {
  id: string;
  name: string;
  nameCustom: boolean; // 사용자가 직접 이름을 바꿨는지(true면 표지 제목으로 자동 갱신하지 않아요)
  search: string; // 편집기를 열 때의 옵션 쿼리(product/size/pages/cover… , project 제외)
  productName: string;
  photoCount: number;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
};

export type ProjectRecord = ProjectMeta & {
  docJson: string; // 문서 전체(JSON). 사진 주소는 "keepic-blob:<id>" 자리표시로 바꿔서 담아요.
  blobIds: string[];
  thumb: Blob | null;
};

export type ProjectSaveInput = {
  id: string;
  autoName: string;
  search: string;
  productName: string;
  photoCount: number;
  docJson: string;
  blobs: Map<string, Blob>; // blobId -> 원본 파일
  thumb: Blob | null;
};

export interface ProjectStore {
  save(input: ProjectSaveInput): Promise<ProjectMeta>;
  load(id: string): Promise<{ record: ProjectRecord; blobs: Map<string, Blob> } | null>;
  list(): Promise<(ProjectMeta & { thumb: Blob | null })[]>;
  remove(id: string): Promise<void>;
  rename(id: string, name: string): Promise<void>;
}

const DB_NAME = "keepic-projects";
const DB_VERSION = 1;
const PROJECTS = "projects";
const BLOBS = "blobs";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("이 브라우저에서는 작업을 저장할 수 없어요(IndexedDB 사용 불가)."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(BLOBS)) {
        const s = db.createObjectStore(BLOBS, { keyPath: "key" });
        s.createIndex("projectId", "projectId", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("저장소를 열지 못했어요."));
    req.onblocked = () => reject(new Error("저장소가 다른 탭에서 사용 중이에요."));
  }).catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("저장 중 오류가 났어요."));
    tx.onabort = () => reject(tx.error ?? new Error("저장이 취소됐어요."));
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function toMeta(r: ProjectRecord): ProjectMeta {
  return {
    id: r.id,
    name: r.name,
    nameCustom: r.nameCustom,
    search: r.search,
    productName: r.productName,
    photoCount: r.photoCount,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    schemaVersion: r.schemaVersion,
  };
}

const idbProjectStore: ProjectStore = {
  async save(input) {
    const db = await openDb();
    const tx = db.transaction([PROJECTS, BLOBS], "readwrite");
    const done = txDone(tx);
    const projects = tx.objectStore(PROJECTS);
    const blobs = tx.objectStore(BLOBS);
    let saved: ProjectMeta | null = null;
    const getReq = projects.get(input.id);
    getReq.onsuccess = () => {
      const prev = getReq.result as ProjectRecord | undefined;
      const now = Date.now();
      const record: ProjectRecord = {
        id: input.id,
        name: prev?.nameCustom ? prev.name : input.autoName,
        nameCustom: prev?.nameCustom ?? false,
        search: input.search,
        productName: input.productName,
        photoCount: input.photoCount,
        createdAt: prev?.createdAt ?? now,
        updatedAt: now,
        schemaVersion: PROJECT_SCHEMA_VERSION,
        docJson: input.docJson,
        blobIds: Array.from(input.blobs.keys()),
        // 새 썸네일이 없으면(사진이 안 바뀌었으면) 예전 썸네일을 그대로 둬요.
        thumb: input.thumb ?? prev?.thumb ?? null,
      };
      projects.put(record);
      saved = toMeta(record);
      for (const [blobId, blob] of input.blobs) {
        blobs.put({ key: `${input.id}/${blobId}`, projectId: input.id, blobId, blob });
      }
      // 더 이상 문서에서 안 쓰는 사진(지워졌거나 교체돼서 사라진 것)은 같이 정리해요.
      const keep = new Set(input.blobs.keys());
      const keysReq = blobs.index("projectId").getAllKeys(IDBKeyRange.only(input.id));
      keysReq.onsuccess = () => {
        for (const k of keysReq.result as string[]) {
          const blobId = String(k).slice(input.id.length + 1);
          if (!keep.has(blobId)) blobs.delete(k);
        }
      };
    };
    await done; // 쓰기 트랜잭션이 정말 끝난 뒤에만 "저장 완료"
    if (!saved) throw new Error("저장 결과를 확인하지 못했어요.");
    return saved;
  },

  async load(id) {
    const db = await openDb();
    const tx = db.transaction([PROJECTS, BLOBS], "readonly");
    const record = (await reqToPromise(tx.objectStore(PROJECTS).get(id))) as ProjectRecord | undefined;
    if (!record) return null;
    const rows = (await reqToPromise(tx.objectStore(BLOBS).index("projectId").getAll(IDBKeyRange.only(id)))) as {
      blobId: string;
      blob: Blob;
    }[];
    const blobs = new Map<string, Blob>();
    for (const r of rows) blobs.set(r.blobId, r.blob);
    return { record, blobs };
  },

  async list() {
    const db = await openDb();
    const tx = db.transaction(PROJECTS, "readonly");
    const all = (await reqToPromise(tx.objectStore(PROJECTS).getAll())) as ProjectRecord[];
    return all
      .map((r) => ({ ...toMeta(r), thumb: r.thumb ?? null }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async remove(id) {
    const db = await openDb();
    const tx = db.transaction([PROJECTS, BLOBS], "readwrite");
    const done = txDone(tx);
    tx.objectStore(PROJECTS).delete(id);
    const blobs = tx.objectStore(BLOBS);
    const keysReq = blobs.index("projectId").getAllKeys(IDBKeyRange.only(id));
    keysReq.onsuccess = () => {
      for (const k of keysReq.result) blobs.delete(k);
    };
    await done;
  },

  async rename(id, name) {
    const db = await openDb();
    const tx = db.transaction(PROJECTS, "readwrite");
    const done = txDone(tx);
    const store = tx.objectStore(PROJECTS);
    const req = store.get(id);
    req.onsuccess = () => {
      const r = req.result as ProjectRecord | undefined;
      if (r) store.put({ ...r, name, nameCustom: true });
    };
    await done;
  },
};

// 서버 저장으로 바꿀 때 여기만 바꿔 끼우면 돼요.
export const projectStore: ProjectStore = idbProjectStore;

export function newProjectId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
