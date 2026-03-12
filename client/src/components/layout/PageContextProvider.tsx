import { useState } from 'react'
import { PageContext, PageContextSetterContext } from '@/hooks/ui/usePageContext'
import type { PageContextValue } from '@/hooks/ui/usePageContext'

interface PageContextProviderProps {
  children: React.ReactNode
}

export function PageContextProvider({ children }: PageContextProviderProps) {
  const [context, setContext] = useState<PageContextValue | null>(null)

  return (
    <PageContext.Provider value={context}>
      <PageContextSetterContext.Provider value={setContext}>
        {children}
      </PageContextSetterContext.Provider>
    </PageContext.Provider>
  )
}
