const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const logDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Campuswire");
const logFile = path.join(logDir, "direct-auth.log");
fs.mkdirSync(logDir, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ${msg}\n`;
  fs.appendFileSync(logFile, line, "utf8");
}

function toInt32(x) {
  return x & 0xffffffff;
}

function s(a, includeLength) {
  const c = a.length;
  const v = [];
  for (let i = 0; i < c; i += 4) {
    v[i >> 2] =
      (a.charCodeAt(i) || 0) |
      ((a.charCodeAt(i + 1) || 0) << 8) |
      ((a.charCodeAt(i + 2) || 0) << 16) |
      ((a.charCodeAt(i + 3) || 0) << 24);
  }
  if (includeLength) v[v.length] = c;
  return v;
}

function l(a, includeLength) {
  const d = a.length;
  let c = (d - 1) << 2;
  if (includeLength) {
    const m = a[d - 1];
    if (m < c - 3 || m > c) return null;
    c = m;
  }
  let out = "";
  for (let i = 0; i < d; i++) {
    out += String.fromCharCode(
      a[i] & 0xff,
      (a[i] >>> 8) & 0xff,
      (a[i] >>> 16) & 0xff,
      (a[i] >>> 24) & 0xff
    );
  }
  return includeLength ? out.substring(0, c) : out;
}

function xEncode(str, key) {
  if (str === "") return "";
  const v = s(str, true);
  const k = s(key, false);
  while (k.length < 4) k.push(0);

  const n = v.length - 1;
  let z = v[n];
  let y = v[0];
  const delta = 0x9e3779b9;
  let q = Math.floor(6 + 52 / (n + 1));
  let d = 0;

  while (q-- > 0) {
    d = toInt32(d + delta);
    const e = (d >>> 2) & 3;
    for (let p = 0; p < n; p++) {
      y = v[p + 1];
      let m = (z >>> 5) ^ (y << 2);
      m += ((y >>> 3) ^ (z << 4)) ^ (d ^ y);
      m += k[(p & 3) ^ e] ^ z;
      z = v[p] = toInt32(v[p] + m);
    }
    y = v[0];
    let m = (z >>> 5) ^ (y << 2);
    m += ((y >>> 3) ^ (z << 4)) ^ (d ^ y);
    m += k[(n & 3) ^ e] ^ z;
    z = v[n] = toInt32(v[n] + m);
  }

  return l(v, false);
}

function customBase64FromBinary(binaryStr) {
  const std = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const custom = "LVoJPiCN2R8G90yg+hmFHuacZ1OWMnrsSTXkYpUq/3dlbfKwv6xztjI7DeBE45QA";
  const mapped = Buffer.from(binaryStr, "binary").toString("base64");
  let out = "";
  for (const ch of mapped) {
    if (ch === "=") {
      out += ch;
      continue;
    }
    const idx = std.indexOf(ch);
    out += idx >= 0 ? custom[idx] : ch;
  }
  return out;
}

function md5Hex(input) {
  return crypto.createHash("md5").update(input, "utf8").digest("hex");
}

function hmacMd5Hex(data, key) {
  return crypto.createHmac("md5", key).update(data, "utf8").digest("hex");
}

function sha1Hex(input) {
  return crypto.createHash("sha1").update(input, "utf8").digest("hex");
}

function loadLocalConfig() {
  const configPath = path.join(__dirname, "campuswire-local.json");
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

async function getJsonp(url) {
  const text = await httpGetText(url, getCampusLocalAddress());
  const m = text.match(/^[^(]+\((.*)\)$/s);
  if (!m) throw new Error(`Invalid JSONP response: ${text}`);
  return JSON.parse(m[1]);
}

function isPrivateOrTunnelAddress(address) {
  return (
    address.startsWith("127.") ||
    address.startsWith("169.254.") ||
    address.startsWith("192.168.") ||
    address.startsWith("198.18.") ||
    address.startsWith("198.19.") ||
    address.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)
  );
}

function getCampusLocalAddress() {
  try {
    const output = execFileSync("route", ["print", "-4"], { encoding: "utf8", windowsHide: true });
    const candidates = [];
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^\s*0\.0\.0\.0\s+0\.0\.0\.0\s+(\S+)\s+(\S+)\s+(\d+)\s*$/);
      if (!match) continue;
      const gateway = match[1];
      const address = match[2];
      const metric = Number(match[3]);
      if (!isPrivateOrTunnelAddress(gateway) && !isPrivateOrTunnelAddress(address)) {
        candidates.push({ address, metric });
      }
    }
    candidates.sort((a, b) => a.metric - b.metric);
    return candidates[0]?.address || "";
  } catch {
    return "";
  }
}

function httpGetText(url, localAddress = "") {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { localAddress: localAddress || undefined, timeout: 5000 }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        text += chunk;
      });
      res.on("end", () => {
        resolve(text);
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", reject);
  });
}

function callbackName() {
  return `jQuery${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function buildChallengeUrl(host, username, ip) {
  const cb = callbackName();
  const qs = new URLSearchParams({
    callback: cb,
    username,
    ip: ip || "",
    _: String(Date.now()),
  });
  return `http://${host}/cgi-bin/get_challenge?${qs.toString()}`;
}

function buildLoginUrl(host, params) {
  const cb = callbackName();
  const qs = new URLSearchParams({
    callback: cb,
    action: "login",
    username: params.username,
    password: params.password,
    os: "Windows 10",
    name: "Windows",
    double_stack: "0",
    chksum: params.chksum,
    info: params.info,
    ac_id: params.ac_id,
    ip: params.ip,
    n: params.n,
    type: params.type,
    _: String(Date.now()),
  });
  return `http://${host}/cgi-bin/srun_portal?${qs.toString()}`;
}

async function main() {
  const localConfig = loadLocalConfig();
  const host = process.env.CAMPUSWIRE_HOST || localConfig.host || "10.253.0.237";
  const baseUsername = process.env.CAMPUSWIRE_USER || localConfig.username || "";
  const password = process.env.CAMPUSWIRE_PASS || localConfig.password || "";
  const acId = process.env.CAMPUSWIRE_ACID || localConfig.ac_id || "1";
  const n = "200";
  const type = "1";
  const encVer = "srun_bx1";

  if (!baseUsername || !password) {
    throw new Error("Missing campus auth credentials. Set CAMPUSWIRE_USER/CAMPUSWIRE_PASS or create campuswire-local.json.");
  }

  const usernames = [baseUsername, `${baseUsername}@dx-uestc`, `${baseUsername}@dx`];
  let lastResp = null;

  for (const username of usernames) {
    log(`start host=${host} user=${username} localAddress=${getCampusLocalAddress() || ""}`);
    const challenge1 = await getJsonp(buildChallengeUrl(host, username, ""));
    const ip = challenge1.online_ip || challenge1.client_ip || "";
    log(`challenge1 error=${challenge1.error} ip=${ip}`);

    const challenge2 = await getJsonp(buildChallengeUrl(host, username, ip));
    const token = challenge2.challenge;
    if (!token) {
      log(`challenge2 failed for ${username}`);
      continue;
    }
    log(`challenge2 ok token=${token.slice(0, 12)}... user=${username}`);

    const infoObj = { username, password, ip, acid: acId, enc_ver: encVer };
    const infoRaw = JSON.stringify(infoObj);
    const x = xEncode(infoRaw, token);
    const info = "{SRBX1}" + customBase64FromBinary(x);
    const hmd5 = hmacMd5Hex(password, token);
    const chkstr = token + username + token + hmd5 + token + acId + token + ip + token + n + token + type + token + info;
    const chksum = sha1Hex(chkstr);

    const loginUrl = buildLoginUrl(host, {
      username,
      password: "{MD5}" + hmd5,
      ac_id: acId,
      ip,
      n,
      type,
      info,
      chksum,
    });

    const loginResp = await getJsonp(loginUrl);
    lastResp = loginResp;
    log(`login response user=${username} body=${JSON.stringify(loginResp)}`);

    const ok = loginResp.error === "ok" || loginResp.res === "ok" || loginResp.suc_msg === "ip_already_online_error";
    if (ok) {
      process.stdout.write(JSON.stringify(loginResp));
      process.exitCode = 0;
      return;
    }
  }

  process.stdout.write(JSON.stringify(lastResp || { error: "direct_auth_failed" }));
  process.exitCode = 2;
}

main().catch((err) => {
  log(`fatal ${err.stack || err.message}`);
  process.stderr.write(String(err.stack || err.message));
  process.exitCode = 1;
});
