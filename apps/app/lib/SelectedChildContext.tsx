import { createContext, useContext, useState, type ReactNode } from 'react'

type SelectedChildContextType = {
  selectedChildId: string | null
  setSelectedChildId: (id: string | null) => void
}

const SelectedChildContext = createContext<SelectedChildContextType>({
  selectedChildId: null,
  setSelectedChildId: () => {},
})

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  return (
    <SelectedChildContext.Provider value={{ selectedChildId, setSelectedChildId }}>
      {children}
    </SelectedChildContext.Provider>
  )
}

export function useSelectedChild() {
  return useContext(SelectedChildContext)
}
