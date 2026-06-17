import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Child } from '../lib/supabase'
import { useAuth } from './AuthContext'

type ChildContextType = {
  children: Child[]
  selectedChild: Child | null
  selectChild: (child: Child) => void
  refreshChildren: () => Promise<void>
}

const ChildContext = createContext<ChildContextType>({
  children: [],
  selectedChild: null,
  selectChild: () => {},
  refreshChildren: async () => {},
})

export function ChildProvider({ children: reactChildren }: { children: ReactNode }) {
  const { myFamily } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  const fetchChildren = async () => {
    if (!myFamily) return
    const { data } = await supabase
      .from('children')
      .select('*')
      .eq('family_id', myFamily.id)
      .order('created_at')
    if (data) {
      setChildren(data)
      if (data.length > 0 && !selectedChild) setSelectedChild(data[0])
    }
  }

  useEffect(() => { fetchChildren() }, [myFamily])

  return (
    <ChildContext.Provider value={{
      children,
      selectedChild,
      selectChild: setSelectedChild,
      refreshChildren: fetchChildren,
    }}>
      {reactChildren}
    </ChildContext.Provider>
  )
}

export const useChild = () => useContext(ChildContext)
