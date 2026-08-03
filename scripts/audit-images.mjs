import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const allowRaw = new Set([
  // Browser blob/object URL preview; Next optimizer cannot serve these.
  'src/components/upload/upload-item-card.tsx',
])
const violations = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(tsx|jsx)$/.test(entry.name)) inspect(full)
  }
}

function inspect(file) {
  const relative = path.relative(process.cwd(), file)
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes('<img') && !allowRaw.has(relative)) {
    violations.push(`${relative}: raw <img>; migrate to next/image`)
  }
  for (const match of source.matchAll(/<Image\b([\s\S]*?)\/>/g)) {
    const props = match[1]
    if (!/\balt=/.test(props)) violations.push(`${relative}: <Image> missing alt`)
    if (/\bfill\b/.test(props) && !/\bsizes=/.test(props)) {
      violations.push(`${relative}: fill <Image> missing sizes`)
    }
  }
}

walk(root)
if (violations.length) {
  console.error(violations.join('\n'))
  process.exit(1)
}
console.log('Image audit passed.')
