declare module "node:test" { export default function test(name: string, callback: () => void | Promise<void>): void; }
declare module "node:assert/strict" {
  interface Assert { equal(actual: unknown, expected: unknown): void; deepEqual(actual: unknown, expected: unknown): void; ok(value: unknown): void; }
  const assert: Assert; export default assert;
}
