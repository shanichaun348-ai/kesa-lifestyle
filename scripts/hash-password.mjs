#!/usr/bin/env node
/**
 * Generate an ADMIN_BOOTSTRAP_PASSWORD_HASH value.
 * Usage: node scripts/hash-password.mjs <password>
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
console.log(`scrypt:${salt}:${hash}`);
