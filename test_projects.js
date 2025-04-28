import axios from 'axios';

const WORKFRONT_API_URL = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const WORKFRONT_API_KEY = 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0';
const USERNAME = 'mmyles@adobe.com';

async function testProjects() {
  try {
    console.log('Testing Workfront Projects API...');
    
    // First get the session
    const loginResponse = await axios.get(`${WORKFRONT_API_URL}/login`, {
      params: {
        username: USERNAME,
        apiKey: WORKFRONT_API_KEY
      }
    });

    const sessionID = loginResponse.data.data.sessionID;
    console.log('Got session ID:', sessionID);

    // Now try to get projects
    const response = await axios.get(`${WORKFRONT_API_URL}/project/search`, {
      params: {
        sessionID,
        fields: 'name,status,percentComplete,plannedCompletionDate'
      }
    });

    console.log('Projects response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testProjects(); 