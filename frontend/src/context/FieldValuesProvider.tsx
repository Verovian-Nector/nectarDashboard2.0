import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type FieldValuesContextType = {
  fieldValues: Record<string, string[]>
  locations: string[]
  setFieldValues: (values: Record<string, string[]>) => void
  setLocations: (values: string[]) => void
  getOptions: (key: string) => string[]
}

const DEFAULTS: Record<string, string[]> = {
  conditions: ['Good', 'Poor', 'Out Of Service', 'Disposed', 'Missing'],
  doc_types: ['EICR', 'EPC', 'Right To Rent', 'Gas Station', 'Tenancy Agreement', 'Depost Protection Document'],
  employment_status: ['Employment', 'Self Employment', 'Unemployment'],
  furnish_status: ['Furnished', 'Unfurnished', 'Semi Furnished'],
  marketing_status: ['Featured', 'Discount', 'Hot Deal', 'Urgent'],
  owner: ['Nectar', 'Landlord'],
  payee: ['Tenants', 'Landlord', 'Nectar'],
  payment_frequency: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'],
  payment_method: ['BACS', 'Standing Order', 'Cash'],
  payment_status: ['PAID', 'LATE', 'PENDING'],
  payment_type: ['Rent', 'Charge'],
  property_type: ['Detached', 'Warehouse', 'Semidetached', 'Terraced', 'Maisonette', 'Flat', 'Apartment', 'Bungalow', 'Townhouse', 'TwoLandings', 'Office', 'Restuarant', 'Retail'],
  category: ['Commercial', 'Lettings', 'Sales', 'Short Lets'],
  role: ['propertymanager', 'propertyowner', 'propertyadmin', 'tenant'],
}

const FieldValuesContext = createContext<FieldValuesContextType | null>(null)

export function useFieldValues(): FieldValuesContextType {
  const ctx = useContext(FieldValuesContext)
  if (!ctx) throw new Error('useFieldValues must be used within FieldValuesProvider')
  return ctx
}

export default function FieldValuesProvider({ children }: { children: ReactNode }) {
  const [fieldValues, setFieldValuesState] = useState<Record<string, string[]>>(DEFAULTS)
  const [locations, setLocationsState] = useState<string[]>([])

  useEffect(() => {
    try {
      const fvRaw = localStorage.getItem('field-values')
      const locRaw = localStorage.getItem('location-options')
      if (fvRaw) {
        const fv = JSON.parse(fvRaw)
        if (fv && typeof fv === 'object') {
          const merged: Record<string, string[]> = { ...DEFAULTS }
          for (const k of Object.keys(DEFAULTS)) {
            const arr = fv[k]
            if (Array.isArray(arr)) merged[k] = arr
          }
          setFieldValuesState(merged)
        }
      }
      if (locRaw) {
        const loc = JSON.parse(locRaw)
        if (Array.isArray(loc)) setLocationsState(loc)
      }
    } catch {}
  }, [])

  function setFieldValues(values: Record<string, string[]>) {
    setFieldValuesState(values)
    try { localStorage.setItem('field-values', JSON.stringify(values)) } catch {}
  }

  function setLocations(values: string[]) {
    setLocationsState(values)
    try { localStorage.setItem('location-options', JSON.stringify(values)) } catch {}
  }

  function getOptions(key: string) {
    return key === 'locations' ? locations : (fieldValues[key] || [])
  }

  return (
    <FieldValuesContext.Provider value={{ fieldValues, locations, setFieldValues, setLocations, getOptions }}>
      {children}
    </FieldValuesContext.Provider>
  )
}