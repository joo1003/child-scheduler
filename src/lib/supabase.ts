import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Family = {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export type FamilyMember = {
  id: string
  family_id: string
  user_id: string
  display_name: string
  role: 'parent' | 'child'
  joined_at: string
}

export type Child = {
  id: string
  family_id: string
  name: string
  birth_date?: string
  school?: string
  grade?: string
  avatar_url?: string
  interests?: string[]
  created_at: string
}

export type TimetableVersion = {
  id: string
  child_id: string
  title: string
  is_active: boolean
  created_at: string
}

export type TimetableSlot = {
  id: string
  child_id: string
  version_id: string | null
  day_of_week: number
  start_time: string   // "HH:MM"
  end_time: string     // "HH:MM"
  subject: string
  teacher?: string
  location?: string
  color: string
  type: 'school' | 'academy' | 'activity' | 'other'
  memo?: string
  created_at: string
}

export type Notice = {
  id: string
  child_id: string
  family_id: string
  title: string
  content?: string
  notice_date: string
  is_done: boolean
  ai_analysis?: {
    materials: string[]
    books: string[]
    todos: string[]
    summary: string
  }
  created_at: string
}

export type Photo = {
  id: string
  child_id: string
  family_id: string
  title?: string
  url: string
  source: 'local' | 'google_drive'
  taken_at?: string
  tags: string[]
  created_at: string
}

export type Academy = {
  id: string
  child_id: string
  family_id: string
  name: string
  type: 'academy' | 'activity'
  phone?: string
  address?: string
  teacher?: string
  monthly_fee?: number
  payment_day?: number
  color: string
  is_active: boolean
  memo?: string
  schedule: { day_of_week: number; start_time: string; end_time: string }[]
  created_at: string
}

export type AcademyPayment = {
  id: string
  academy_id: string
  child_id: string
  family_id: string
  year_month: string   // 'YYYY-MM'
  amount?: number
  paid_at?: string
  memo?: string
  created_at: string
}

export type FamilyMessage = {
  id: string
  family_id: string
  user_id: string
  display_name: string
  role: string
  content: string
  created_at: string
}
