# Supabase Authentication Setup

This project uses Supabase for authentication with dedicated API routes, so the frontend never needs to access Supabase directly.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

2. **Configure environment variables**:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase project URL and anon key:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project or select an existing one
   - Go to Settings > API
   - Copy the Project URL and anon/public key

## API Routes

All authentication is handled through API routes:

### POST `/api/auth/signup`
Sign up a new user.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response (201):**
```json
{
  "user": { ... },
  "session": { ... },
  "message": "User created successfully"
}
```

### POST `/api/auth/login`
Log in an existing user.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": { ... },
  "session": { ... },
  "message": "Login successful"
}
```

### POST `/api/auth/logout`
Log out the current user.

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

### GET `/api/auth/user`
Get the current authenticated user.

**Response (200):**
```json
{
  "user": { ... }
}
```

### GET `/api/auth/session`
Get the current session.

**Response (200):**
```json
{
  "session": { ... }
}
```

## Frontend Usage

Use the `useAuth()` hook from the Auth Context:

```typescript
import { useAuth } from '@/app/contexts/AuthContext'

export function MyComponent() {
  const { user, session, login, logout, signUp, isLoading } = useAuth()

  // Login
  const handleLogin = async () => {
    const success = await login('user@example.com', 'password123')
    if (success) {
      // User is now authenticated and redirected to dashboard
    }
  }

  // Logout
  const handleLogout = async () => {
    await logout()
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      {user ? (
        <>
          <p>Logged in as: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  )
}
```

## Session Management

- Sessions are managed via `AuthProvider` at the root layout
- Authentication state is persisted in the browser using Supabase
- The middleware automatically refreshes expired sessions
- Cookies are set for server-side verification

## Troubleshooting

### "Login successful but not authenticated"

1. **Check environment variables**:
   - Verify `.env.local` has been created (copy from `.env.local.example`)
   - Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
   - Restart the development server after changing env vars

2. **Check browser console**:
   - Open DevTools > Console
   - Look for error messages starting with "Missing Supabase environment variables"
   - Look for "Auth state changed" logs to verify state changes

3. **Verify Supabase project**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Confirm the project exists and has auth enabled
   - Check that the credentials you copied are correct (not service role key)

4. **Check network requests**:
   - Open DevTools > Network tab
   - Attempt login
   - You should see requests to Supabase auth endpoint
   - Check for 401/403 errors - these indicate auth issues

5. **Clear browser storage**:
   - The session data is stored in browser memory and cookies
   - Try clearing cookies and localStorage: `localStorage.clear()`, then reload
   - Try signing up with a new account to test

6. **Middleware validation**:
   - Middleware runs on every request to refresh expired sessions
   - If cookies are not persisting, check if your browser accepts third-party cookies
   - Check browser DevTools > Application > Cookies

### "Environment variables missing"

If you see "Missing Supabase environment variables" in the console:

1. Create `.env.local` file in the root directory:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials:
   - Visit [Supabase Dashboard](https://app.supabase.com)
   - Click your project
   - Go to Settings > API
   - Copy the Project URL and Anon Key (not the Service Role Key)

3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   ```

4. Restart your development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
app/
├── contexts/
│   └── AuthContext.tsx        # Auth provider and useAuth hook
├── api/
│   └── auth/
│       ├── signup/route.ts    # User registration
│       ├── login/route.ts     # User login
│       ├── logout/route.ts    # User logout
│       ├── user/route.ts      # Get current user
│       └── session/route.ts   # Get current session
├── login/page.tsx             # Login page with auto-redirect
└── dashboard/page.tsx         # Protected route
lib/
├── supabase/
│   ├── client.ts              # Browser-side Supabase client
│   ├── server.ts              # Server-side Supabase client
│   └── middleware.ts          # Session refresh utilities
└── auth-utils.ts              # Auth utility functions
middleware.ts                  # Next.js middleware for session management
```

## Security Features

- ✅ All Supabase API keys are server-side only
- ✅ Frontend never directly accesses Supabase
- ✅ Sessions are automatically refreshed via middleware
- ✅ HTTP-only cookies for session storage
- ✅ Proper error handling and validation

## Next Steps

1. Set up your Supabase project
2. Configure email templates in Supabase dashboard
3. Enable email confirmation (optional)
4. Add password reset functionality (optional)
5. Implement social auth providers (optional)
