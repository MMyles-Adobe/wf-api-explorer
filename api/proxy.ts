import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const { path, ...query } = req.query;
    const apiUrl = `https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0/${path}`;
    
    const response = await axios.get(apiUrl, {
      params: {
        ...query,
        apiKey: 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0'
      }
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://mmyles-adobe.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(error.response?.status || 500).json({
      error: error.message
    });
  }
} 