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
const API_KEY = process.env.VITE_WORKFRONT_API_KEY;

// Helper function to fetch data from Workfront
async function fetchWorkfrontData(objectType, fields, page = 1, pageSize = 1000) {
  try {
    console.log(`Making Workfront API request with params:`, {
      objectType,
      fields,
      page,
      pageSize
    });

    // First, get the total count
    const countResponse = await axios.get(`${WORKFRONT_API_BASE}/${objectType}/search`, {
      params: {
        apiKey: API_KEY,
        fields: 'ID',
        method: 'GET',
        $$ALL: true,
        $$TOTAL_COUNT: true
      }
    });

    const totalCount = countResponse.data.metadata?.totalCount || 0;
    console.log(`Total count: ${totalCount}`);

    // Calculate how many pages we need
    const totalPages = Math.ceil(totalCount / pageSize);
    console.log(`Total pages: ${totalPages}`);

    // Fetch all pages
    const allData = [];
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      console.log(`Fetching page ${currentPage} of ${totalPages}`);

      const response = await axios.get(`${WORKFRONT_API_BASE}/${objectType}/search`, {
        params: {
          apiKey: API_KEY,
          fields: fields,
          method: 'GET',
          $$LIMIT: pageSize,
          $$FIRST: (currentPage - 1) * pageSize,
          ID_Sort: 'asc'
        }
      });

      const pageData = response.data.data || [];
      console.log(`Fetched ${pageData.length} items for page ${currentPage}`);
      allData.push(...pageData);
    }

    console.log(`Total items fetched: ${allData.length}`);
    
    return {
      data: allData,
      pagination: {
        totalCount,
        page: 1,
        pageSize: totalCount,
        totalPages: 1
      }
    };
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
    const { page = 1, pageSize = 200 } = req.query;
    const config = objectTypes[objectType.toLowerCase()];
    
    if (!config) {
      return res.status(400).json({ error: 'Invalid object type' });
    }

    console.log(`Fetching ${objectType} from Workfront with page ${page} and pageSize ${pageSize}...`);
    const result = await fetchWorkfrontData(
      config.endpoint, 
      config.fields,
      parseInt(page),
      parseInt(pageSize)
    );
    
    // Ensure the response has the correct structure
    const response = {
      data: result.data,
      pagination: {
        totalCount: result.pagination.totalCount,
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalPages: result.pagination.totalPages
      }
    };
    
    console.log(`Workfront response: ${response.data.length} items, total count: ${response.pagination.totalCount}`);
    res.json(response);
  } catch (error) {
    console.error(`Error fetching ${req.params.objectType} data:`, error.message);
    res.status(500).json({ 
      error: `Failed to fetch ${req.params.objectType}`,
      details: error.message
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

// Add a new endpoint to get total count
app.get('/api/projects/count', async (req, res) => {
  try {
    const response = await axios.get(`${WORKFRONT_API_BASE}/project/search`, {
      params: {
        apiKey: API_KEY,
        fields: 'ID',  // Only request ID field to minimize response size
        method: 'GET',
        $$ALL: true,  // This ensures we get the total count
        $$TOTAL_COUNT: true  // Explicitly request total count
      }
    });

    const totalCount = response.data.metadata?.totalCount || 0;
    console.log(`Total projects count: ${totalCount}`);
    
    res.json({ totalCount });
  } catch (error) {
    console.error('Error getting project count:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get project count',
      details: error.response?.data?.error?.message || error.message
    });
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