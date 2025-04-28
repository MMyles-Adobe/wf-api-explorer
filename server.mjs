import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: `${__dirname}/.env` });

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add JSON body parsing
app.use(express.json());

// Update the server port handling
const PORT = process.env.PORT || 3002;
const WORKFRONT_API_BASE = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const API_KEY = process.env.VITE_WORKFRONT_API_KEY;

// Helper function to fetch data from Workfront
async function fetchWorkfrontData(objectType, fields, page = 1, pageSize = 1000, sort = 'ID:asc') {
  try {
    // Convert sort parameter format
    let sortParam = sort;
    if (sortParam) {
      // Remove any whitespace and convert to lowercase
      sortParam = sortParam.replace(/\s+/g, '').toLowerCase();
      // Convert ascending/descending to asc/desc
      sortParam = sortParam.replace(':ascending', ':asc').replace(':descending', ':desc');
    }

    // Build the request parameters according to Workfront API v15.0
    const requestParams = {
      apiKey: API_KEY,
      fields: fields,
      method: 'GET',
      page: page,
      pageSize: pageSize
    };

    // Only add sort if it's provided and not empty
    if (sortParam) {
      requestParams.sort = sortParam;
    }

    console.log('Making Workfront API request with full details:', {
      url: `${WORKFRONT_API_BASE}/${objectType}/search`,
      params: requestParams
    });

    const response = await axios.get(`${WORKFRONT_API_BASE}/${objectType}/search`, {
      params: requestParams,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.data) {
      console.log(`Successfully fetched ${response.data.data.length} items`);
      return {
        data: response.data.data,
        pagination: {
          totalCount: response.data.metadata?.totalCount || response.data.data.length,
          page: page,
          pageSize: pageSize,
          totalPages: Math.ceil((response.data.metadata?.totalCount || response.data.data.length) / pageSize)
        }
      };
    } else {
      console.error('Unexpected response format:', response.data);
      throw new Error('Unexpected response format from Workfront API');
    }
  } catch (error) {
    console.error(`Error fetching ${objectType} data:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      requestUrl: error.config?.url,
      requestParams: error.config?.params
    });
    throw new Error(`Failed to fetch ${objectType} data: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Define routes
app.get('/api/:objectType/search', async (req, res) => {
  try {
    const { objectType } = req.params;
    const { page = 1, pageSize = 200, fields, sort } = req.query;

    console.log(`Fetching ${objectType} with params:`, { page, pageSize, fields, sort });

    const result = await fetchWorkfrontData(
      objectType,
      fields,
      parseInt(page),
      parseInt(pageSize),
      sort
    );

    res.json(result);
  } catch (error) {
    console.error(`Error handling request:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Start server with error handling
let currentPort = PORT;
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    currentPort = port;
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
};

startServer(PORT);

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
}); 