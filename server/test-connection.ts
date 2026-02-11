import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('🔧 Testing SQL Server Connection...')
    
    // Test connessione
    await prisma.$executeRawUnsafe('SELECT 1')
    console.log('✅ Connessione SQL Server OK!')
    
    // Test esecuzione query
    const result = await prisma.$queryRaw`SELECT GETDATE() as current_time`
    console.log('✅ Query eseguita OK!')
    console.log('   Current time:', result)
    
    // Conta tabelle (se schema esiste)
    try {
      const tables = await prisma.$queryRaw`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo'
      `
      console.log('✅ Tabelle nel database:', tables?.length || 0)
    } catch (e) {
      console.log('⚠️  Schema non inizializzato (first run - è normale)')
    }
    
  } catch (error) {
    console.error('❌ ERRORE CONNESSIONE:')
    if (error instanceof Error) {
      console.error('   Messaggio:', error.message)
      console.error('   Code:', (error as any).code)
    } else {
      console.error('   ', error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
