// packages/client/src/pages/app/index.tsx
//TO-DO:
// Add the StatusBadge component
// Set up the real-time status hook
// Create the summary card component
// Each of these can be added incrementally as we build out the functionality. Which would you like to tackle first?
// Also, I notice the old code uses React Router, but since we're using Next.js now, we'll use its built-in routing. Should I show you how to adapt the routing parts?




import { useState } from 'react'
//import { ProcessingStatus } from '@wavenotes/shared'

export default function AppDashboard() {
  const [url, setUrl] = useState('')

  // URL submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: API call to submit URL
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">WaveNotes</h1>
            {/* Auth section will go here */}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              Podcast URL
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="url"
                name="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Paste a Spotify or YouTube URL"
              />
              <button
                type="submit"
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Summarize
              </button>
            </div>
          </div>
        </form>

        {/* Summaries Sections */}
        <div className="mt-8 space-y-8">
          {/* In Progress Section */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">In Progress</h2>
            {/* Summary cards will go here */}
          </section>

          {/* Completed Section */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Completed</h2>
            {/* Summary cards will go here */}
          </section>
        </div>
      </main>
    </div>
  )
}