import axios from 'axios';

const WORKFRONT_API_URL = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const WORKFRONT_API_KEY = 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0';
const USERNAME = 'mmyles@adobe.com';

async function testTasks() {
  try {
    console.log('Testing Workfront Tasks API...');
    
    // First get the session
    const loginResponse = await axios.get(`${WORKFRONT_API_URL}/login`, {
      params: {
        username: USERNAME,
        apiKey: WORKFRONT_API_KEY
      }
    });

    const sessionID = loginResponse.data.data.sessionID;
    console.log('Got session ID:', sessionID);

    // Try to get tasks with project-related fields
    const response = await axios.get(`${WORKFRONT_API_URL}/task/search`, {
      params: {
        sessionID,
        fields: 'name,status,percentComplete,plannedCompletionDate,project:name,projectID,project:status,project:description,project:owner:name,project:plannedCompletionDate'
      }
    });

    console.log('\nSample task with project details:');
    if (response.data.data && response.data.data.length > 0) {
      const sampleTask = response.data.data[0];
      console.log('Task Name:', sampleTask.name);
      console.log('Task Status:', sampleTask.status);
      console.log('Project Name:', sampleTask.project?.name);
      console.log('Project Status:', sampleTask.project?.status);
      console.log('Project Description:', sampleTask.project?.description);
      console.log('Project Owner:', sampleTask.project?.owner?.name);
      console.log('Project Planned Completion:', sampleTask.project?.plannedCompletionDate);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testTasks(); 