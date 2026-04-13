import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(hex, "hex")
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: base64(iv):base64(tag):base64(ciphertext)
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decrypt(stored: string): string {
  // Handle plaintext values stored before encryption was added
  if (!stored.includes(":")) return stored

  const parts = stored.split(":")
  if (parts.length !== 3) return stored

  const key = getKey()
  const iv = Buffer.from(parts[0], "base64")
  const tag = Buffer.from(parts[1], "base64")
  const encrypted = Buffer.from(parts[2], "base64")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
}
