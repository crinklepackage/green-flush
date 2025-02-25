export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-indigo-600">Welcome to WaveNotes</h1>
      </header>
      <main className="text-center">
        <p className="text-xl text-gray-700 mb-6">This is our marketing homepage. More content coming soon!</p>
        <a href="/app" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
          Go to App
        </a>
      </main>
    </div>
  )
}
