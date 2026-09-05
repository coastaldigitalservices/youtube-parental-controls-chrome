import test from "node:test";
import assert from "node:assert/strict";
import { enrollPin, PIN_ITERATIONS, validPin, verifyPin } from "../src/shared/pin.js";

test("enrolls and verifies a PIN without retaining raw input", async () => {
  const verifier = await enrollPin("2468");
  assert.equal(verifier.version, 1); assert.equal(verifier.iterations, PIN_ITERATIONS);
  assert.equal(await verifyPin("2468", verifier), true); assert.equal(await verifyPin("1357", verifier), false);
  assert.equal(JSON.stringify(verifier).includes("2468"), false);
});

test("only 4–8 digit PINs are accepted", async () => {
  assert.equal(validPin("1234"), true); assert.equal(validPin("12345678"), true);
  assert.equal(validPin("123"), false); assert.equal(validPin("12a4"), false);
  let rejected = false;
  try { await enrollPin("123456789"); } catch { rejected = true; }
  assert.equal(rejected, true);
});
