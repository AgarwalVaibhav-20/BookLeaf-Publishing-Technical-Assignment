import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "fallback-secret";
if (!SECRET_KEY) {
  throw new Error("jwt seceret key is missing");
}
export function signToken(
  payload: object,
  expiresIn: SignOptions["expiresIn"] = "1d",
): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

export function verifyToken(token: string): string | JwtPayload | null {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
}
