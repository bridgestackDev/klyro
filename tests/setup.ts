import "@testing-library/jest-dom";

// jsdom's localStorage is sometimes inaccessible (security origin restrictions).
// Provide a real in-memory implementation so any test that touches it works correctly.
const store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  key: (index: number) => Object.keys(store)[index] ?? null,
  get length() {
    return Object.keys(store).length;
  },
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
