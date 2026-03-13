/**
 * codeGenerator unit tests
 *
 * Each generator queries Prisma for the last code to determine the next number.
 * We mock the Prisma client (already mocked in setup.ts) and control the return values.
 *
 * Functions under test:
 * - generateProjectCode(client?) → PRJ-YYYY-NNN
 * - generateDocumentCode(client?) → DOC-YYYY-NNN
 * - generateTaskCode(projectCode, projectId, taskType, client?) → CODE-TNNN / CODE-MNNN
 * - generateRiskCode(projectCode, projectId, client?) → CODE-RNNN
 * - generateInputCode(client?) → INPUT-YYYY-NNN
 */

import { prisma } from '../../src/models/prismaClient.js'
import {
  generateProjectCode,
  generateDocumentCode,
  generateTaskCode,
  generateRiskCode,
  generateInputCode,
} from '../../src/utils/codeGenerator.js'

const mockedPrisma = prisma as jest.Mocked<typeof prisma>

describe('generateProjectCode', () => {
  const year = new Date().getFullYear()

  it('should return PRJ-YYYY-001 when no projects exist', async () => {
    (mockedPrisma.project.findFirst as jest.Mock).mockResolvedValue(null)

    const code = await generateProjectCode(mockedPrisma)
    expect(code).toBe(`PRJ-${year}-001`)
  })

  it('should increment the last project number', async () => {
    (mockedPrisma.project.findFirst as jest.Mock).mockResolvedValue({
      code: `PRJ-${year}-005`,
    })

    const code = await generateProjectCode(mockedPrisma)
    expect(code).toBe(`PRJ-${year}-006`)
  })

  it('should pad numbers to 3 digits', async () => {
    (mockedPrisma.project.findFirst as jest.Mock).mockResolvedValue({
      code: `PRJ-${year}-099`,
    })

    const code = await generateProjectCode(mockedPrisma)
    expect(code).toBe(`PRJ-${year}-100`)
  })
})

describe('generateDocumentCode', () => {
  const year = new Date().getFullYear()

  it('should return DOC-YYYY-001 when no documents exist', async () => {
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue(null)

    const code = await generateDocumentCode(mockedPrisma)
    expect(code).toBe(`DOC-${year}-001`)
  })

  it('should increment the last document number', async () => {
    (mockedPrisma.document.findFirst as jest.Mock).mockResolvedValue({
      code: `DOC-${year}-012`,
    })

    const code = await generateDocumentCode(mockedPrisma)
    expect(code).toBe(`DOC-${year}-013`)
  })
})

describe('generateTaskCode', () => {
  it('should generate task code with T prefix for task type', async () => {
    (mockedPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null)

    const code = await generateTaskCode('PRJ-2026-001', 'proj-id', 'task', mockedPrisma)
    expect(code).toBe('PRJ-2026-001-T001')
  })

  it('should generate milestone code with M prefix', async () => {
    (mockedPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null)

    const code = await generateTaskCode('PRJ-2026-001', 'proj-id', 'milestone', mockedPrisma)
    expect(code).toBe('PRJ-2026-001-M001')
  })

  it('should increment from last task code', async () => {
    (mockedPrisma.task.findFirst as jest.Mock).mockResolvedValue({
      code: 'PRJ-2026-001-T003',
    });
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null)

    const code = await generateTaskCode('PRJ-2026-001', 'proj-id', 'task', mockedPrisma)
    expect(code).toBe('PRJ-2026-001-T004')
  })

  it('should use STD prefix when projectCode is null', async () => {
    (mockedPrisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(null)

    const code = await generateTaskCode(null, null, 'task', mockedPrisma)
    expect(code).toBe('STD-T001')
  })
})

describe('generateRiskCode', () => {
  it('should return PROJECTCODE-R001 when no risks exist', async () => {
    (mockedPrisma.risk.findFirst as jest.Mock).mockResolvedValue(null)

    const code = await generateRiskCode('PRJ-2026-001', 'proj-id', mockedPrisma)
    expect(code).toBe('PRJ-2026-001-R001')
  })

  it('should increment the last risk number', async () => {
    (mockedPrisma.risk.findFirst as jest.Mock).mockResolvedValue({
      code: 'PRJ-2026-001-R007',
    })

    const code = await generateRiskCode('PRJ-2026-001', 'proj-id', mockedPrisma)
    expect(code).toBe('PRJ-2026-001-R008')
  })
})

describe('generateInputCode', () => {
  const year = new Date().getFullYear()

  it('should return INPUT-YYYY-001 when no inputs exist', async () => {
    (mockedPrisma.userInput.findFirst as jest.Mock).mockResolvedValue(null)

    const code = await generateInputCode(mockedPrisma)
    expect(code).toBe(`INPUT-${year}-001`)
  })

  it('should increment the last input number', async () => {
    (mockedPrisma.userInput.findFirst as jest.Mock).mockResolvedValue({
      code: `INPUT-${year}-042`,
    })

    const code = await generateInputCode(mockedPrisma)
    expect(code).toBe(`INPUT-${year}-043`)
  })
})
