import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pgspcoclplcifigbtval.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnc3Bjb2NscGxjaWZpZ2J0dmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjkzMzUsImV4cCI6MjA4OTkwNTMzNX0.pnRnjhgi5MscAc90AKhoP-b_c91VDdK8yRO-1khq4vE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)