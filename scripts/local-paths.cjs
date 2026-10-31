// local-paths.cjs — локал замууд (кодын репо, аппын репо, e2e орчин) нийтийн репод бичигдэхгүй.
// Дараалал: орчны хувьсагч → одоогийн хавтаснаас дээш «.claude/agent-ops/help_local_paths.json» ({ "codeRepo", "appRepo", "e2e" }).
const fs = require("fs");
const path = require("path");

function findUp(rel, from = process.cwd()) {
  let d = from;
  for (let i = 0; i < 8; i++) {
    const f = path.join(d, rel);
    if (fs.existsSync(f)) return f;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return "";
}

const file = findUp(path.join(".claude", "agent-ops", "help_local_paths.json")) || findUp(path.join(".claude", "agent-ops", "help_local_paths.json"), __dirname);
const cfg = file ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
const ENV = { codeRepo: "HELP_CODE_REPO", appRepo: "HELP_APP_REPO", e2e: "SPACEHUB_E2E" };

// localPath("e2e") — олдохгүй бол "" (дуудагч нь шалгана)
module.exports = (key) => process.env[ENV[key]] || cfg[key] || "";
