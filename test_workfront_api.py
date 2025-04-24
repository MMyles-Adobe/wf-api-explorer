import requests
import json

# Workfront API configuration
API_KEY = 'q9ios5o0rbu6lpe2vwjka9je4b00dgt0'
BASE_URL = 'https://productmgmtaemaebeta.my.workfront.com/attask/api/v15.0'

def test_api_connection():
    # Test endpoint - get projects
    endpoint = f"{BASE_URL}/project/search"
    
    params = {
        'apiKey': API_KEY,
        'fields': 'name,status',
        'method': 'GET'
    }
    
    try:
        response = requests.get(endpoint, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes
        
        data = response.json()
        print("API Connection Successful!")
        print("Response:", json.dumps(data, indent=2))
        
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Workfront API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Status Code: {e.response.status_code}")
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    test_api_connection() 