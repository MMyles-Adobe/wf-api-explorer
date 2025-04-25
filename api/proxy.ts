import { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const WORKFRONT_API_URL = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const WORKFRONT_API_KEY = process.env.WORKFRONT_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { method, query, body } = req;
    const endpoint = req.url?.split('/')[1];
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Missing endpoint' });
    }

    if (!WORKFRONT_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await axios({
      method,
      url: `${WORKFRONT_API_URL}/${endpoint}`,
      params: {
        ...query,
        apiKey: WORKFRONT_API_KEY
      },
      data: body,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 