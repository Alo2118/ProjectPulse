import React, { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial entries for MemoryRouter */
  initialEntries?: MemoryRouterProps['initialEntries']
  /** Override the QueryClient (defaults to a fresh, no-retry client) */
  queryClient?: QueryClient
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function AllProviders({
  children,
  initialEntries = ['/'],
  queryClient,
}: {
  children: React.ReactNode
  initialEntries?: MemoryRouterProps['initialEntries']
  queryClient?: QueryClient
}) {
  const client = queryClient ?? createTestQueryClient()

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialEntries, queryClient, ...renderOptions } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialEntries={initialEntries} queryClient={queryClient}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react'

// Override render with our custom version
export { customRender as render }
