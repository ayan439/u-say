import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/*
  CLIENT MUST SEND:
  Authorization: Bearer <supabase_access_token>

  This middleware simply verifies the JWT signature & extracts user info.
  SUPABASE JWT SECRET = anon/public key (NOT service role key)
*/

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!SUPABASE_JWT_SECRET) {
  console.warn("⚠️  Missing SUPABASE_JWT_SECRET in .env");
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No auth token provided" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);

    // Attach decoded user to request
    req.user = decoded;

    next();
  } catch (err) {
    console.error("JWT error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
