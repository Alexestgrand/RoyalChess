import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

const memoryStore = new Map<string, string>();

class LocalStorageMock implements Storage {
  get length(): number {
    return memoryStore.size;
  }

  clear(): void {
    memoryStore.clear();
  }

  getItem(key: string): string | null {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = [...memoryStore.keys()];
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    memoryStore.delete(key);
  }

  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new LocalStorageMock(),
  writable: true,
});

afterEach(() => {
  memoryStore.clear();
});
