const crypto = require("node:crypto");
const { isIP } = require("node:net");
const { db } = require("../_db");
const { settings, configurationStatus, valid, cookie, sign, authenticate, trustedOrigin } = require("../_auth");

const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 900;
let limitsReady;

async function consumeAttempt(req, secret) {
  if(process.env.VERCEL_ENV==="preview"){
    limitsReady ??= db().query("SELECT to_regclass('public.natal_admin_auth_limits') IS NOT NULL AS ready")
      .then(({rows})=>{
        if(!rows[0]?.ready){
          const error=new Error("ADMIN_AUTH_LIMITS_SCHEMA_NOT_READY");
          error.code="ADMIN_AUTH_LIMITS_SCHEMA_NOT_READY";
          throw error;
        }
      }).catch(error=>{
        limitsReady=undefined;
        throw error;
      });
  }else{
    limitsReady ??= db().query(`
      CREATE TABLE IF NOT EXISTS natal_admin_auth_limits (
        ip_hash text PRIMARY KEY,
        attempts integer NOT NULL,
        window_start timestamptz NOT NULL
      )
    `).catch(error => {
      limitsReady = undefined;
      throw error;
    });
  }
  await limitsReady;

  const forwarded = String(req.headers["x-vercel-forwarded-for"] || "").split(",")[0].trim();
  const ip = isIP(forwarded) ? forwarded : req.socket?.remoteAddress || "unknown";
  const key = crypto.createHmac("sha256", secret).update("admin-login:" + ip).digest("hex");

  const { rowCount } = await db().query(`
    INSERT INTO natal_admin_auth_limits (ip_hash, attempts, window_start)
    VALUES ($1, 1, now())
    ON CONFLICT (ip_hash) DO UPDATE SET
      attempts = CASE WHEN natal_admin_auth_limits.window_start <= now() - interval '15 minutes'
        THEN 1 ELSE natal_admin_auth_limits.attempts + 1 END,
      window_start = CASE WHEN natal_admin_auth_limits.window_start <= now() - interval '15 minutes'
        THEN now() ELSE natal_admin_auth_limits.window_start END
    WHERE natal_admin_auth_limits.attempts < $2
      OR natal_admin_auth_limits.window_start <= now() - interval '15 minutes'
    RETURNING ip_hash
  `, [key, MAX_ATTEMPTS]);

  return rowCount ? key : null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    const authenticated = valid(req);
    return res.json(authenticated ? { authenticated, ...configurationStatus() } :
      { authenticated, configured: configurationStatus().configured });
  }
  if (!["POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Método não permitido" });
  }
  if (!trustedOrigin(req)) return res.status(403).json({ error: "Origem não autorizada" });
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", cookie("", 0));
    return res.json({ ok: true });
  }

  const cfg = settings();
  if (!cfg) return res.status(503).json({ error: "Acesso administrativo indisponível" });

  const { username, password } = req.body || {};
  if (typeof username !== "string" || username.length > 200 ||
      typeof password !== "string" || password.length > 200) {
    return res.status(400).json({ error: "Credenciais inválidas" });
  }

  try {
    const key = await consumeAttempt(req, cfg.secret);
    if (!key) {
      res.setHeader("Retry-After", String(WINDOW_SECONDS));
      return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos." });
    }

    const supplied = crypto.createHash("sha256").update(username).digest();
    const expected = crypto.createHash("sha256").update(cfg.user).digest();
    const sameName = crypto.timingSafeEqual(supplied, expected);
    const samePassword = authenticate(password, cfg.hash, cfg.password);
    if (!sameName || !samePassword) {
      return res.status(401).json({ error: "Usuário ou senha incorretos" });
    }

    await db().query("DELETE FROM natal_admin_auth_limits WHERE ip_hash=$1", [key]);
    const body = Buffer.from(JSON.stringify({ sub: cfg.user, exp: Date.now() + 28800000 })).toString("base64url");
    res.setHeader("Set-Cookie", cookie(body + "." + sign(body, cfg.secret), 28800));
    return res.json({ authenticated: true });
  } catch (error) {
    console.error("Admin authentication unavailable", error.code || error.message);
    return res.status(503).json({ error: "Acesso administrativo temporariamente indisponível" });
  }
};
