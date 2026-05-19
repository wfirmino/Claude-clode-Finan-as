import type { User } from '@supabase/supabase-js'
import { Navigate, Outlet } from 'react-router-dom'

interface Props {
  user: User | null
}

export default function ProtectedRoute({ user }: Props) {
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
