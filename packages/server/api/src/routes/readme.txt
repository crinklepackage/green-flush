#podcasts.ts

Purpose:
- GET/POST, Submission/Status endpoints



// packages/server/api/src/routes/podcasts.ts
router.post('/summary', async (req, res) => {
  // Creation flow:
  // 1. Create podcast record
  // 2. Create summary record
  // 3. Enqueue job
})

router.get('/summaries', async (req, res) => {
  // Retrieval flow for dashboard
})

router.get('/summary/:id', async (req, res) => {
  // Single summary details
})


#log 
12:56pm made change based on o3's feedback