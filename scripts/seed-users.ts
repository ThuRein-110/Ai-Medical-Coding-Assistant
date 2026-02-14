import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load environment variables from .env file manually
function loadEnv() {
  try {
    // Try multiple possible locations for the .env file
    const possiblePaths = [
      resolve(process.cwd(), '.env.local'),
      resolve(process.cwd(), '.env'),
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local'),
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env'),
    ]
    
    let envContent = ''
    for (const envPath of possiblePaths) {
      try {
        envContent = readFileSync(envPath, 'utf-8')
        console.log(`Loaded .env from: ${envPath}`)
        break
      } catch {
        // Try next path
      }
    }
    
    if (!envContent) {
      console.error('Could not find .env file')
      return
    }
    
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim()
          const value = trimmed.slice(eqIndex + 1).trim()
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
    })
  } catch (e) {
    console.error('Could not load .env file:', e)
  }
}

loadEnv()

// Demo users to seed
const demoUsers = [
  { email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'coder1@example.com', password: 'coder123', role: 'coder' },
  { email: 'auditor1@example.com', password: 'auditor123', role: 'auditor' },
]

async function seedUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:')
    console.error('- NEXT_PUBLIC_SUPABASE_URL')
    console.error('- SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard > Settings > API)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('Seeding demo users...\n')

  for (const user of demoUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { role: user.role },
      })

      if (error) {
        if (error.message.includes('already been registered')) {
          console.log(`✓ ${user.email} already exists`)
        } else {
          console.error(`✗ ${user.email}: ${error.message}`)
        }
      } else {
        console.log(`✓ Created ${user.email} (${user.role})`)
      }
    } catch (err) {
      console.error(`✗ ${user.email}: ${err}`)
    }
  }

  console.log('\nDone! You can now log in with the demo credentials.')
}

seedUsers()
