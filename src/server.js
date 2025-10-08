import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import routes from './routes/index.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Routes
app.use('/api/v1', routes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Mail Campaign Backend API', 
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/api/v1/growmeorganic/webhook',
      health: '/api/v1/growmeorganic/webhook/health',
      data: '/api/v1/infolist/data',
      statistics: '/api/v1/infolist/statistics',
      baseUrl: '/api/v1/baseurl'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
