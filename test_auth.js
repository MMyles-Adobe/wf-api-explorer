import axios from 'axios';

const WORKFRONT_API_URL = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0';
const WORKFRONT_API_KEY = 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0';
const USERNAME = 'mmyles@adobe.com';

async function testAuth() {
  try {
    console.log('Testing Workfront API authentication...');
    console.log('Using API URL:', WORKFRONT_API_URL);
    
    const response = await axios.get(`${WORKFRONT_API_URL}/login`, {
      params: {
        username: USERNAME,
        apiKey: WORKFRONT_API_KEY
      }
    });
    
    console.log('Authentication successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Authentication failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testAuth(); 