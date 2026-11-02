import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function useSupabaseSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [recoveryRequired, setRecoveryRequired] = useState(false)

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryRequired(true)
      if (event === 'SIGNED_OUT') setRecoveryRequired(false)
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading, recoveryRequired, setRecoveryRequired }
}