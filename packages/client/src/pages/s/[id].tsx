import React from 'react';
import { useRouter } from 'next/router';

export default function PublicSummaryPage() {
  const router = useRouter();
  const { id } = router.query;
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Public Summary Page</h1>
        <p>This page is under development. Summary ID: {id}</p>
      </div>
    </div>
  );
}
