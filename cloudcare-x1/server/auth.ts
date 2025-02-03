import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);
const PostgresSessionStore = connectPg(session);

export function setupAuth(app: Express) {
  const store = new PostgresSessionStore({
    pool,
    tableName: 'sessions'
  });

  app.use(
    session({
      store,
      secret: process.env.REPL_ID!,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === 'production' }
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication routes will be added here later
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });
}
