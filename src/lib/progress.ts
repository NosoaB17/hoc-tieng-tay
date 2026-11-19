export type Progress = {
  lessonId: string;
  listened: boolean;
  spoke: boolean;
  review: string[];
  done: string[];
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const storageKey = (lessonId: string) => `tieng-tay:progress:${lessonId}`;

export const createProgress = (lessonId: string): Progress => ({
  lessonId,
  listened: false,
  spoke: false,
  review: [],
  done: [],
});

// Sai thì xếp vào hàng ôn đúng một lần; đúng thì rút khỏi hàng ôn và ghi nhận đã xong.
export function answer(p: Progress, exerciseId: string, correct: boolean): Progress {
  const review = p.review.filter((id) => id !== exerciseId);
  if (!correct) return { ...p, review: [...review, exerciseId] };
  const done = p.done.includes(exerciseId) ? p.done : [...p.done, exerciseId];
  return { ...p, review, done };
}

// Chỉ nghe xong audio mới tính là đã nghe.
export const markListened = (p: Progress): Progress => ({ ...p, listened: true });

// Đã luyện nói, độc lập với nghe.
export const markSpoken = (p: Progress): Progress => ({ ...p, spoke: true });

// Đọc bản chép không thay đổi trạng thái nghe.
export const readTranscript = (p: Progress): Progress => p;

const isIdList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

function parse(raw: string | null, lessonId: string): Progress | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw);
    // Dữ liệu cũ không có `spoke` vẫn hợp lệ và mặc định false.
    const spoke = v?.spoke === undefined ? false : v.spoke;
    if (v && v.lessonId === lessonId && typeof v.listened === 'boolean' && typeof spoke === 'boolean' && isIdList(v.review) && isIdList(v.done)) {
      return { lessonId, listened: v.listened, spoke, review: v.review, done: v.done };
    }
  } catch {
    // dữ liệu hỏng: bỏ qua
  }
  return null;
}

// Bộ nhớ phiên luôn được ghi; storage lỗi hoặc không có thì vẫn dùng được trong phiên.
// Mỗi store có bộ nhớ phiên riêng.
export function createProgressStore(getStorage: () => StorageLike | undefined) {
  const session = new Map<string, Progress>();
  const storage = () => {
    try {
      return getStorage();
    } catch {
      return undefined;
    }
  };
  return {
    // Bản trong phiên luôn mới hơn storage nên được ưu tiên.
    load(lessonId: string): Progress {
      const current = session.get(lessonId);
      if (current) return current;
      try {
        return parse(storage()?.getItem(storageKey(lessonId)) ?? null, lessonId) ?? createProgress(lessonId);
      } catch {
        return createProgress(lessonId);
      }
    },
    // Trả về false nếu không ghi được vào storage để UI báo không lưu lâu dài.
    save(p: Progress): boolean {
      session.set(p.lessonId, p);
      try {
        const s = storage();
        if (!s) return false;
        s.setItem(storageKey(p.lessonId), JSON.stringify(p));
        return true;
      } catch {
        return false;
      }
    },
  };
}
