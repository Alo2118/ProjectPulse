import { z } from 'zod'

export const milestoneValidationParamsSchema = z.object({
  id: z.string().uuid(),
})
