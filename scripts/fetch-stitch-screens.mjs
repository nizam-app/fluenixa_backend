/**
 * Lists screens from a Google Stitch project (mobile or web).
 * Requires STITCH_API_KEY — https://github.com/google-labs-code/stitch-sdk
 *
 * Usage:
 *   STITCH_API_KEY=... node scripts/fetch-stitch-screens.mjs
 *   STITCH_API_KEY=... node scripts/fetch-stitch-screens.mjs 902928306854417353
 */
import { config } from 'dotenv'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { stitch } from '@google/stitch-sdk'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '..', '.env') })
const DEFAULT_PROJECT_ID = '9971131479177624563'

const projectId = process.argv[2] ?? process.env.STITCH_PROJECT_ID ?? DEFAULT_PROJECT_ID

async function main() {
  if (!process.env.STITCH_API_KEY) {
    console.error('Set STITCH_API_KEY (from Stitch → Settings → API key)')
    process.exit(1)
  }

  const project = stitch.project(projectId)
  const screens = await project.screens()
  const inventory = []

  console.log(`Project ${projectId}: ${screens.length} screen(s)\n`)

  for (const screen of screens) {
    const id = screen.screenId ?? screen.id
    let html = ''
    let image = ''
    try {
      html = await screen.getHtml()
      image = await screen.getImage()
    } catch (error) {
      console.warn(`  ! could not fetch assets for ${id}:`, error.message)
    }

    inventory.push({ id, html, image })
    console.log(`- ${id}`)
    if (image) console.log(`  image: ${image}`)
  }

  const outDir = join(__dirname, '..', 'docs')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `stitch-${projectId}-screens.json`)
  writeFileSync(outFile, JSON.stringify({ projectId, screenCount: inventory.length, screens: inventory }, null, 2))
  console.log(`\nWrote ${outFile}`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
