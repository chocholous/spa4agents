import { validateFile } from "./validate.ts";
import { build, write } from "./generate.ts";
import { DIST } from "./catalog.ts";

const [cmd, ...flags] = process.argv.slice(2);
const strict = flags.includes("--strict");

function runValidate(): boolean {
  const r = validateFile(strict);
  for (const e of r.errors) console.error(`ERROR ${e}`);
  for (const w of r.warnings) console.warn(`WARN ${w}`);
  if (r.todos.length) console.warn(`NOTE ${r.todos.length} owner decisions pending (TODO_OWNER); see OPEN_QUESTIONS.md`);
  console.log(r.errors.length ? `catalog INVALID (${r.errors.length} errors)` : `catalog valid${r.warnings.length ? ` (${r.warnings.length} warnings)` : ""}`);
  return r.errors.length === 0;
}

if (cmd === "validate") {
  process.exit(runValidate() ? 0 : 1);
} else if (cmd === "generate") {
  if (!runValidate()) process.exit(1);
  const files = build();
  write(files);
  console.log(`generated ${files.size} files into ${DIST}`);
} else {
  console.error("usage: cli.ts validate [--strict] | generate");
  process.exit(2);
}
