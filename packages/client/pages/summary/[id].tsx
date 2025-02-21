import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function SummaryDetailsPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState('Waiting for summary...')
  const [error, setError] = useState('')

  // Use the NEXT_PUBLIC_API_URL, fallback to localhost:3001 if not defined
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('API URL:', apiUrl);

  useEffect(() => {
    if (!id) return;

    console.log('Fetching summary from API URL:', apiUrl);
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${apiUrl}/summary/${id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch summary details');
        }
        const data = await res.json();
        setSummary(data.message || 'No details available');
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError(err instanceof Error ? err.message : 'Error fetching summary');
      }
    };

    fetchSummary();
  }, [id, apiUrl]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Summary Details for {id}</h1>
      {error && <p className="text-red-600">{error}</p>}
      <div className="bg-gray-100 p-4 rounded-md">
        <p>{summary}</p>
      </div>
    </div>
  )
}
