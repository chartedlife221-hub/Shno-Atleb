// Minimal type shims so `tsc` can check the test files without @types/bun or @types/node.
declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): {
    toBe(v: unknown): void;
    toEqual(v: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(v: unknown): void;
    toMatch(v: RegExp | string): void;
    toBeGreaterThan(n: number): void;
    toBeLessThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThanOrEqual(n: number): void;
    toHaveLength(n: number): void;
    toBeNull(): void;
    not: {
      toBe(v: unknown): void;
      toEqual(v: unknown): void;
      toContain(v: unknown): void;
      toMatch(v: RegExp | string): void;
    };
  };
}
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string, opts: { recursive: true }): string[];
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
}
