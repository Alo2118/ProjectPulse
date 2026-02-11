const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanDuplicates() {
  try {
    console.log('Checking for duplicate standalone tasks...')
    
    const standaloneTasks = await prisma.task.findMany({
      where: {
        projectId: null,
        code: {
          startsWith: 'STD-'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`Found ${standaloneTasks.length} standalone tasks`)
    standaloneTasks.forEach(task => {
      console.log(`- ${task.code}: ${task.title} (created: ${task.createdAt})`)
    })

    if (standaloneTasks.length > 0) {
      console.log('\nDeleting all standalone tasks to reset...')
      const result = await prisma.task.deleteMany({
        where: {
          projectId: null,
          code: {
            startsWith: 'STD-'
          }
        }
      })
      console.log(`Deleted ${result.count} tasks`)
    }

    console.log('Cleanup complete!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanDuplicates()
