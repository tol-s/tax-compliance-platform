#!/usr/bin/env node
/**
 * Vendors shadcn (radix base, "nova" style) primitives and ReUI components
 * from a local checkout of https://github.com/keenthemes/reui into this app.
 *
 * Why this exists: the shadcn/ReUI registry hosts are not reachable from every
 * build environment, but the copy-and-own model only needs the source. This
 * script reproduces what `shadcn add @reui/<name>` does at install time:
 *   1. rewrites registry import paths to this app's aliases
 *   2. inlines `cn-*` style tokens using registry/styles/style-nova.css
 *   3. resolves `style-nova:` source variants and drops other styles
 *   4. replaces <IconPlaceholder lucide="X" .../> with lucide-react imports
 *
 * Usage: node scripts/vendor-reui.mjs /path/to/reui [--force]
 * Vendored files are owned by this repo afterwards; re-running without
 * --force never overwrites files that already exist.
 */
import fs from "node:fs"
import path from "node:path"

const STYLE = "nova"
const reuiRoot = process.argv[2]
const force = process.argv.includes("--force")
if (!reuiRoot || !fs.existsSync(reuiRoot)) {
  console.error("Usage: node scripts/vendor-reui.mjs /path/to/reui [--force]")
  process.exit(1)
}
const appRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")

// shadcn primitives (radix base) -> components/ui
const UI = [
  "accordion",
  "alert",
  "alert-dialog",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "button-group",
  "calendar",
  "card",
  "chart",
  "checkbox",
  "collapsible",
  "command",
  "dialog",
  "drawer",
  "dropdown-menu",
  "empty",
  "field",
  "hover-card",
  "input",
  "input-group",
  "item",
  "kbd",
  "label",
  "native-select",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "sonner",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
]
// ReUI components -> components/reui
const REUI = [
  "alert.tsx",
  "badge.tsx",
  "date-selector.tsx",
  "frame.tsx",
  "number-field.tsx",
  "stepper.tsx",
  "timeline.tsx",
  "cascader",
  "data-grid",
  "filters",
]
const HOOKS = [
  ["registry/bases/radix/hooks/use-mobile.ts", "hooks/use-mobile.ts"],
  ["registry-reui/bases/radix/hooks/use-file-upload.ts", "hooks/use-file-upload.ts"],
  ["registry-reui/bases/radix/hooks/use-copy-to-clipboard.ts", "hooks/use-copy-to-clipboard.ts"],
]

// --- style token map -------------------------------------------------------
const css = fs.readFileSync(path.join(reuiRoot, `registry/styles/style-${STYLE}.css`), "utf8")
const tokenMap = new Map()
for (const m of css.matchAll(/\.(cn-[a-z0-9-]+)\s*\{\s*@apply\s+([^;]+);\s*\}/g)) {
  tokenMap.set(m[1], m[2].trim())
}

const STYLE_VARIANT_RE = /\bstyle-(vega|nova|maia|lyra|mira|luma|sera|rhea):([^\s"'`{}]+)/g

function transformClasses(code) {
  // Only touch string literals that contain cn-* or style-* tokens.
  return code.replace(/(["'`])((?:(?!\1)[^\n\\]|\\.)*)\1/g, (full, q, inner) => {
    if (!/\bcn-[a-z]|\bstyle-(vega|nova|maia|lyra|mira|luma|sera|rhea):/.test(inner)) return full
    const out = inner
      .replace(STYLE_VARIANT_RE, (_m, style, token) => (style === STYLE ? token : ""))
      .split(/\s+/)
      .map((cls) => (/^cn-[a-z0-9-]+$/.test(cls) ? (tokenMap.get(cls) ?? "") : cls))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
    return `${q}${out}${q}`
  })
}

function transformImports(code) {
  return code
    .replace(/from "cn"/g, 'from "@/lib/utils"')
    .replace(/@\/registry(?:-reui)?\/bases\/radix\/reui\//g, "@/components/reui/")
    .replace(/@\/registry(?:-reui)?\/bases\/radix\/ui\//g, "@/components/ui/")
    .replace(/@\/registry(?:-reui)?\/bases\/radix\/hooks\//g, "@/hooks/")
    .replace(/@\/registry(?:-reui)?\/bases\/radix\/lib\//g, "@/lib/")
}

function transformIcons(code) {
  const icons = new Set()
  code = code.replace(/<IconPlaceholder\b([\s\S]*?)\/>/g, (_m, attrs) => {
    const lucide = attrs.match(/lucide="([A-Za-z0-9]+)"/)?.[1]
    if (!lucide) throw new Error("IconPlaceholder without lucide name")
    icons.add(lucide)
    const rest = attrs.replace(/\s(lucide|tabler|hugeicons|phosphor|remixicon)="[^"]*"/g, "").trim()
    return `<${lucide}${rest ? " " + rest : ""} />`
  })
  code = code.replace(/^import \{ IconPlaceholder \} from "[^"]+"\n/m, "")
  if (icons.size) {
    const imp = `import { ${[...icons].sort().join(", ")} } from "lucide-react"\n`
    // insert after the last top-level import statement
    const lines = code.split("\n")
    let last = -1
    let inImport = false
    lines.forEach((line, i) => {
      if (/^import\b/.test(line)) inImport = true
      if (inImport && /from ["'][^"']+["']\s*;?$|^import ["'][^"']+["']/.test(line)) {
        last = i
        inImport = false
      }
    })
    lines.splice(last + 1, 0, imp.trimEnd())
    code = lines.join("\n")
  }
  return code
}

function write(rel, content) {
  const dest = path.join(appRoot, rel)
  if (fs.existsSync(dest) && !force) return console.log(`skip   ${rel}`)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, content)
  console.log(`write  ${rel}`)
}

function vendor(src, rel) {
  let code = fs.readFileSync(src, "utf8")
  code = transformIcons(transformClasses(transformImports(code)))
  write(rel, code.trimStart())
}

for (const name of UI) {
  vendor(path.join(reuiRoot, "registry/bases/radix/ui", `${name}.tsx`), `components/ui/${name}.tsx`)
}
for (const entry of REUI) {
  const src = path.join(reuiRoot, "registry-reui/bases/radix/reui", entry)
  if (fs.statSync(src).isDirectory()) {
    for (const f of fs.readdirSync(src)) vendor(path.join(src, f), `components/reui/${entry}/${f}`)
  } else {
    vendor(src, `components/reui/${entry}`)
  }
}
for (const [src, rel] of HOOKS) vendor(path.join(reuiRoot, src), rel)
