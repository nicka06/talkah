import { createBrowserClient } from '@supabase/ssr'

// Client-side Supabase client configuration
export const createClient = () => {
  const supabaseUrl = 'https://kfzowoyrnjajkgezxijq.supabase.co'
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtmem93b3lybmphamtnZXp4aWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwOTE1ODIsImV4cCI6MjA2NDY2NzU4Mn0.DfZ2wWRgxdMnsRaoNF0t7reDiW2D3ttmzbFsg26slYs'
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
} 