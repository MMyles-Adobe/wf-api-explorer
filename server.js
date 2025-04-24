const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add JSON body parsing
app.use(express.json());

const PORT = process.env.PORT || 3001;

const WORKFRONT_API_BASE = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const API_KEY = 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0';

// Helper function to fetch data from Workfront
async function fetchWorkfrontData(objectType, fields) {
  try {
    const response = await axios.get(`${WORKFRONT_API_BASE}/${objectType}/search`, {
      params: {
        apiKey: API_KEY,
        fields: fields,
        method: 'GET'
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${objectType} data:`, error.response?.data || error.message);
    throw error;
  }
}

// Define object type configurations
const objectTypes = {
  projects: {
    endpoint: 'project',
    fields: 'name,status,objCode,plannedCompletionDate,percentComplete'
  },
  tasks: {
    endpoint: 'task',
    fields: 'name,status,objCode,assignedToID,duration,percentComplete'
  },
  issues: {
    endpoint: 'issue',
    fields: 'name,status,objCode,priority,severity'
  },
  customers: {
    endpoint: 'customer',
    fields: 'name,objCode'
  },
  documents: {
    endpoint: 'document',
    fields: 'name,objCode,currentVersion,docObjCode'
  }
};

// Generic endpoint handler
app.get('/api/:objectType', async (req, res) => {
  try {
    const { objectType } = req.params;
    const config = objectTypes[objectType.toLowerCase()];
    
    if (!config) {
      return res.status(400).json({ error: 'Invalid object type' });
    }

    console.log(`Fetching ${objectType} from Workfront...`);
    const data = await fetchWorkfrontData(config.endpoint, config.fields);
    console.log('Workfront response:', data);
    res.json({ data });
  } catch (error) {
    console.error(`Error fetching ${req.params.objectType} data:`, error.response?.data || error.message);
    res.status(500).json({ 
      error: `Failed to fetch ${req.params.objectType}`,
      details: error.response?.data || error.message
    });
  }
});

// Report generation endpoint
app.post('/api/generate-report', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Fetch projects data
    const projects = await fetchWorkfrontData('project', 'name,status,objCode,plannedCompletionDate,percentComplete');
    
    // Generate report based on prompt
    const report = {
      text: `Analysis of projects based on prompt: ${prompt}`,
      charts: [
        {
          type: 'pie',
          data: {
            labels: ['Planned', 'Current', 'Completed'],
            datasets: [{
              data: [
                projects.filter(p => p.status === 'PLN').length,
                projects.filter(p => p.status === 'CUR').length,
                projects.filter(p => p.status === 'CPL').length
              ],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56']
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Project Status Distribution'
              }
            }
          }
        },
        {
          type: 'bar',
          data: {
            labels: ['0-25%', '26-50%', '51-75%', '76-100%'],
            datasets: [{
              label: 'Number of Projects',
              data: [
                projects.filter(p => (p.percentComplete || 0) <= 25).length,
                projects.filter(p => (p.percentComplete || 0) > 25 && (p.percentComplete || 0) <= 50).length,
                projects.filter(p => (p.percentComplete || 0) > 50 && (p.percentComplete || 0) <= 75).length,
                projects.filter(p => (p.percentComplete || 0) > 75).length
              ],
              backgroundColor: '#4BC0C0'
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Project Completion Distribution'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        }
      ]
    };

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

// Add instance info endpoint
app.get('/api/instance-info', async (req, res) => {
  try {
    const instanceName = 'productmgmtaemaebeta.my.workfront.com';
    res.json({ instanceName });
  } catch (error) {
    console.error('Error getting instance info:', error);
    res.status(500).json({ error: 'Failed to get instance info' });
  }
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is in use, trying port ${PORT + 1}`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', err);
  }
}); 