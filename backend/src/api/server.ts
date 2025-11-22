
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import simulationRoutes from './routes/simulation';
import validateRoutes from './routes/validate';
import sealRoutes from './routes/seal';
import workflowsRoutes from './routes/workflows';
import buildRoutes from './routes/build';

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api', simulationRoutes);
app.use('/api', validateRoutes);
app.use('/api', sealRoutes);
app.use('/api', workflowsRoutes);
app.use('/api', buildRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get Supported Tokens (Testnet for now)
import { TESTNET_ADDRESSES, PoolConfig } from '../config/addresses';

app.get('/api/tokens', (req, res) => {
  const tokens: Record<string, string> = {};
  
  // Extract tokens from NAVI Pools config
  Object.entries(TESTNET_ADDRESSES.NAVI.POOLS).forEach(([address, pool]) => {
    const poolConfig = pool as PoolConfig;
    tokens[poolConfig.name] = address;
  });

  console.log(`[API] Returning ${Object.keys(tokens).length} tokens:`, Object.keys(tokens));
  res.json(tokens);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

