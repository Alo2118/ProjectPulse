/**
 * Search Service - Business logic for global search
 * @module services/searchService
 */

import { prisma } from '../models/prismaClient.js'

export interface TaskSearchResult {
  id: string
  code: string
  title: string
  status: string
  priority: string
  projectName?: string
}

export interface ProjectSearchResult {
  id: string
  code: string
  name: string
  status: string
}

export interface UserSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export interface RiskSearchResult {
  id: string
  code: string
  title: string
  status: string
}

export interface DocumentSearchResult {
  id: string
  code: string
  title: string
  status: string
}

export interface SearchResults {
  tasks: TaskSearchResult[]
  projects: ProjectSearchResult[]
  users: UserSearchResult[]
  risks: RiskSearchResult[]
  documents: DocumentSearchResult[]
}

export type SearchDomain = 'all' | 'tasks' | 'projects' | 'users' | 'risks' | 'documents'

export async function globalSearch(query: string, limit: number = 5, domain: SearchDomain = 'all'): Promise<SearchResults> {
  const searchAll = domain === 'all'

  const [tasks, projects, users, risks, documents] = await Promise.all([
    searchAll || domain === 'tasks'
      ? prisma.task.findMany({
          where: {
            isDeleted: false,
            OR: [
              { title: { contains: query } },
              { code: { contains: query } },
            ],
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
            priority: true,
            project: {
              select: { name: true },
            },
          },
          take: limit,
        })
      : Promise.resolve([]),

    searchAll || domain === 'projects'
      ? prisma.project.findMany({
          where: {
            isDeleted: false,
            OR: [
              { name: { contains: query } },
              { code: { contains: query } },
            ],
          },
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
          take: limit,
        })
      : Promise.resolve([]),

    searchAll || domain === 'users'
      ? prisma.user.findMany({
          where: {
            isDeleted: false,
            isActive: true,
            OR: [
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
            ],
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
          take: limit,
        })
      : Promise.resolve([]),

    searchAll || domain === 'risks'
      ? prisma.risk.findMany({
          where: {
            isDeleted: false,
            OR: [
              { title: { contains: query } },
              { code: { contains: query } },
            ],
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
          },
          take: limit,
        })
      : Promise.resolve([]),

    searchAll || domain === 'documents'
      ? prisma.document.findMany({
          where: {
            isDeleted: false,
            OR: [
              { title: { contains: query } },
              { code: { contains: query } },
            ],
          },
          select: {
            id: true,
            code: true,
            title: true,
            status: true,
          },
          take: limit,
        })
      : Promise.resolve([]),
  ])

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      code: t.code,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectName: t.project?.name,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
    })),
    users: users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
    })),
    risks: risks.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      status: r.status,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      code: d.code,
      title: d.title,
      status: d.status,
    })),
  }
}
