import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { FamilyMember, Family } from '../lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  myMember: FamilyMember | null
  myFamily: Family | null
  refreshFamily: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  myMember: null,
  myFamily: null,
  refreshFamily: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [myMember, setMyMember] = useState<FamilyMember | null>(null)
  const [myFamily, setMyFamily] = useState<Family | null>(null)

  const fetchFamily = async (userId: string) => {
    const { data: member } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (member) {
      setMyMember(member)
      const { data: family } = await supabase
        .from('families')
        .select('*')
        .eq('id', member.family_id)
        .single()
      setMyFamily(family)
    } else {
      setMyMember(null)
      setMyFamily(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchFamily(session.user.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchFamily(session.user.id)
      else { setMyMember(null); setMyFamily(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setMyMember(null)
    setMyFamily(null)
  }

  return (
    <AuthContext.Provider value={{
      user, session, loading, myMember, myFamily,
      refreshFamily: () => user ? fetchFamily(user.id) : Promise.resolve(),
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
