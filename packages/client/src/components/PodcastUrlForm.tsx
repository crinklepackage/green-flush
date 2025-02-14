// packages/client/src/components/PodcastUrlForm.tsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { ProcessingStatus } from '@wavenotes/shared'

export function PodcastUrlForm() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!url.trim()) return

    try {
      setIsSubmitting(true)

      // 1. Create initial summary record
      const { data: summary, error: summaryError } = await supabase
        .from('summaries')
        .insert([{
          status: ProcessingStatus.IN_QUEUE
        }])
        .select()
        .single()

      if (summaryError) throw summaryError

      // 2. Submit to our API for processing
      const response = await fetch('/api/podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          summaryId: summary.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to submit podcast')
      }

      // 3. Redirect to summary page
      router.push(`/app/${summary.id}`)
      
    } catch (error) {
      console.error('Error submitting URL:', error)
      // TODO: Add toast notification
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label 
          htmlFor="podcast-url" 
          className="block text-sm font-medium text-gray-700"
        >
          Podcast URL
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <input
            type="url"
            name="url"
            id="podcast-url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
            className="flex-1 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter YouTube or Spotify URL"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isSubmitting ? 'Processing...' : 'Summarize'}
          </button>
        </div>
      </div>
    </form>
  )
}