import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function SummaryDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState('Waiting for summary...')

  useEffect(() => {
    if (!id) return

    const interval = setInterval(() => {
      setSummary((prev) => prev + ' [chunk]')
    }, 1000)

    return () => clearInterval(interval)
  }, [id])

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Summary Details for {id}</h1>
      <div className="bg-gray-100 p-4 rounded-md">
        <p>{summary}</p>
      </div>
    </div>
  )
}
