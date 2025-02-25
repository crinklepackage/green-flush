import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSession } from '../lib/supabase'

export default function withAuth(WrappedComponent: React.ComponentType<any>) {
  return function WithAuth(props: any) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        const session = await getSession()
        
        if (!session) {
          // User is not authenticated, redirect to login
          router.replace('/auth/login')
        } else {
          // User is authenticated, stop loading
          setIsLoading(false)
        }
      }
      
      checkAuth()
    }, [router])

    if (isLoading) {
      // You could show a loading spinner or message here
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      )
    }

    // If we get here, the user is authenticated
    return <WrappedComponent {...props} />
  }
} 