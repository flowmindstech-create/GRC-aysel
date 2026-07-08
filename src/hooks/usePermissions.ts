'use client'

import { useState, useEffect } from 'react'
import { getCurrentProfile } from '@/lib/db'
import type { UserProfile, UserRole } from '@/types'
import { can as canFn, atLeast as atLeastFn, isSuperAdmin as isSuperAdminFn, roleLevel, type Capability } from '@/lib/permissions'

// Cari istifadəçinin profilini bir dəfə yükləyir və icazə helperlərini qaytarır.
// İstifadə: const { can, isSuperAdmin, loading } = usePermissions()
export function usePermissions() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getCurrentProfile()
      .then(p => { if (active) setProfile(p) })
      .catch(() => { /* profil yüklənmədi — icazələr default olaraq bağlı qalır */ })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return {
    profile,
    loading,
    level: roleLevel(profile?.role),
    can: (action: Capability) => canFn(profile, action),
    atLeast: (role: UserRole) => atLeastFn(profile, role),
    isSuperAdmin: isSuperAdminFn(profile),
  }
}
