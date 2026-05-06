const { execFileSync, spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const root = process.env.CAMPUSWIRE_ROOT || __dirname;
const logDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "Campuswire");
const logFile = path.join(logDir, `watcher-node-${process.pid}.log`);
fs.mkdirSync(logDir, { recursive: true });

const host = process.env.CAMPUSWIRE_HOST || "10.253.0.237";
const intervalMs = Number(process.env.CAMPUSWIRE_INTERVAL_MS || 3000);
const cooldownMs = Number(process.env.CAMPUSWIRE_RECOVERY_COOLDOWN_MS || 5000);
let lastRecoveryAt = 0;
let runningRecovery = false;
let runningTick = false;

function log(message) {
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  fs.appendFileSync(logFile, `[${stamp}] ${message}\n`, "utf8");
}

process.on("beforeExit", (code) => {
  log(`process beforeExit code=${code}`);
});

process.on("exit", (code) => {
  log(`process exit code=${code}`);
});

process.on("uncaughtException", (err) => {
  log(`uncaughtException ${err.stack || err.message || err}`);
});

process.on("unhandledRejection", (reason) => {
  log(`unhandledRejection ${reason && reason.stack ? reason.stack : reason}`);
});

function jsonpBody(text) {
  const match = text.match(/^[^(]*\((.*)\)\s*$/s);
  if (!match) throw new Error(`Invalid JSONP: ${text.slice(0, 160)}`);
  return JSON.parse(match[1]);
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      windowsHide: true,
      shell: false,
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (err) => {
      resolve({ code: -1, stdout, stderr: String(err.message || err) });
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
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

async function checkOnline() {
  const now = Date.now();
  const url = `http://${host}/cgi-bin/rad_user_info?callback=jQuery${now}&_=${now}`;
  log(`status probe ${url}`);

  const localAddress = getCampusLocalAddress();
  try {
    if (localAddress) log(`status localAddress=${localAddress}`);
    const text = await httpGetText(url, localAddress);
    const data = jsonpBody(text);
    const ok = data.error === "ok" && Boolean(data.user_name);
    log(`status response error=${data.error || ""} user=${data.user_name || ""} ip=${data.online_ip || ""} ok=${ok}`);
    return ok;
  } catch (err) {
    log(`status probe failed ${err.message || err}`);
    return false;
  }
}

async function ensureAuthRoute() {
  const guardPath = path.join(root, "network-guard.ps1");
  if (!fs.existsSync(guardPath)) return;

  const guard = await run("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    guardPath,
    "-AuthHost",
    host,
    "-Quiet",
  ]);

  if (guard.code !== 0) {
    log(`network guard exit=${guard.code} stdout=${guard.stdout.trim().slice(0, 300)} stderr=${guard.stderr.trim().slice(0, 300)}`);
  }
}

async function recover() {
  if (runningRecovery) {
    log("recovery skipped already_running=true");
    return;
  }

  const elapsed = Date.now() - lastRecoveryAt;
  if (elapsed < cooldownMs) {
    log(`recovery cooldown remaining=${Math.ceil((cooldownMs - elapsed) / 1000)}s`);
    return;
  }

  runningRecovery = true;
  lastRecoveryAt = Date.now();
  log("invoke recovery");

  const resetPath = path.join(root, "network-reset.ps1");
  if (fs.existsSync(resetPath)) {
    const reset = await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", resetPath]);
    log(`network reset before auth exit=${reset.code} stdout=${reset.stdout.trim().slice(0, 300)} stderr=${reset.stderr.trim().slice(0, 300)}`);
  }

  const authPath = path.join(root, "direct-auth.js");
  if (fs.existsSync(authPath)) {
    await ensureAuthRoute();
    const auth = await run(process.execPath, [authPath]);
    log(`direct auth after reset exit=${auth.code} stdout=${auth.stdout.trim().slice(0, 500)} stderr=${auth.stderr.trim().slice(0, 500)}`);
    if (auth.code === 0) {
      await restoreNetworkApps();
      runningRecovery = false;
      return;
    }
  }

  if (fs.existsSync(authPath)) {
    await ensureAuthRoute();
    const auth = await run(process.execPath, [authPath]);
    log(`direct auth retry exit=${auth.code} stdout=${auth.stdout.trim().slice(0, 500)} stderr=${auth.stderr.trim().slice(0, 500)}`);
    if (auth.code === 0) {
      await restoreNetworkApps();
    }
  }

  runningRecovery = false;
}

async function restoreNetworkApps() {
  const restorePath = path.join(root, "restore-network-apps.ps1");
  if (!fs.existsSync(restorePath)) return;
  const restore = await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", restorePath]);
  log(`restore network apps exit=${restore.code} stdout=${restore.stdout.trim().slice(0, 300)} stderr=${restore.stderr.trim().slice(0, 300)}`);
}

async function tick() {
  if (runningTick) {
    log("tick skipped already_running=true");
    return;
  }
  runningTick = true;
  try {
    const online = await checkOnline();
    if (!online) await recover();
  } catch (err) {
    log(`tick fatal ${err.stack || err.message || err}`);
  } finally {
    runningTick = false;
  }
}

log(`watcher started host=${host} intervalMs=${intervalMs} cooldownMs=${cooldownMs}`);
tick();
setInterval(tick, intervalMs);
