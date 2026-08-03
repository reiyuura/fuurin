import fs from 'node:fs'
import path from 'node:path'

const roots = ['src/app', 'src/components', 'src/hooks']
const violations = []
const forbidden = [
  { re: /\bfetch\s*\(/g, label: 'direct fetch() outside ApiClient' },
  { re: /from ['"]@\/lib\/repositories\/mock-/g, label: 'mock repository import outside registry' },
  { re: /from ['"]@\/lib\/repositories\/mock-api-client/g, label: 'mock ApiClient import outside provider' },
]

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(ts|tsx)$/.test(entry.name)) inspect(full)
  }
}

function inspect(file) {
  const source = fs.readFileSync(file, 'utf8')
  for (const rule of forbidden) {
    if (rule.re.test(source)) violations.push(`${file}: ${rule.label}`)
    rule.re.lastIndex = 0
  }
}

for (const root of roots) walk(root)
if (violations.length) {
  console.error(violations.join('\n'))
  process.exit(1)
}
console.log('Repository boundary audit passed.')
