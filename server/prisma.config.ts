import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from current directory (server root)
config({ path: path.join(__dirname, '.env') })

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: async () => {
      const { PrismaMssql } = await import('@prisma/adapter-mssql')
      return new PrismaMssql({
        connectionString: process.env.DATABASE_URL!,
      })
    },
  },
  seed: 'tsx ./prisma/seed.ts',
})
