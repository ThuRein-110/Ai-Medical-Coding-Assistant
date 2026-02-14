/**
 * Auth API Client
 * Use these functions in your frontend to interact with auth API routes
 */

interface SignUpData {
  email: string
  password: string
  metadata?: Record<string, any>
}

interface LoginData {
  email: string
  password: string
}

export const authApi = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignUpData) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  /**
   * Log in an existing user
   */
  login: async (data: LoginData) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  /**
   * Log out the current user
   */
  logout: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    })
    return response.json()
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const response = await fetch('/api/auth/user')
    return response.json()
  },

  /**
   * Get the current session
   */
  getSession: async () => {
    const response = await fetch('/api/auth/session')
    return response.json()
  },
}
