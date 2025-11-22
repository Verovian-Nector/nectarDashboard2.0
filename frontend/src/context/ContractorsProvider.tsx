import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useLocalStorage } from '@mantine/hooks'

type ContractorsContextValue = {
  contractors: string[]
  setContractors: (list: string[]) => void
  addContractor: (name: string) => void
  removeContractor: (index: number) => void
  moveUp: (index: number) => void
}

const DEFAULT_CONTRACTORS = ['FixIt Co.', 'Rapid Repairs Ltd', 'Premier Plumbing', 'Bright Sparks Electrical', 'HeatFlow Services']

const ContractorsContext = createContext<ContractorsContextValue | undefined>(undefined)

export function useContractors() {
  const ctx = useContext(ContractorsContext)
  if (!ctx) throw new Error('useContractors must be used within ContractorsProvider')
  return ctx
}

export default function ContractorsProvider({ children }: { children: ReactNode }) {
  const [contractors, setContractors] = useLocalStorage<string[]>({
    key: 'contractors',
    defaultValue: DEFAULT_CONTRACTORS,
  })

  const addContractor = (name: string) => {
    const v = name.trim()
    if (!v) return
    setContractors((prev) => (prev.includes(v) ? prev : [...prev, v]))
  }

  const removeContractor = (index: number) => {
    setContractors((prev) => prev.filter((_, i) => i !== index))
  }

  const moveUp = (index: number) => {
    setContractors((prev) => {
      const arr = [...prev]
      if (index > 0) {
        const tmp = arr[index - 1]
        arr[index - 1] = arr[index]
        arr[index] = tmp
      }
      return arr
    })
  }

  return (
    <ContractorsContext.Provider value={{ contractors, setContractors, addContractor, removeContractor, moveUp }}>
      {children}
    </ContractorsContext.Provider>
  )
}