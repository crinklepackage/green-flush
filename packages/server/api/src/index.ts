//written by o3…needs qa

import express from 'express';
import podcastsRouter from './routes/podcasts';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use('/api/podcasts', podcastsRouter);

app.listen(PORT, () => {
  console.log(`API server is running on port ${PORT}`);
});
