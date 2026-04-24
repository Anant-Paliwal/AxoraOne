import requests

# Test if trash endpoint exists
try:
    response = requests.get("http://localhost:8000/api/v1/trash", params={"workspace_id": "test"})
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

# Test health endpoint
try:
    response = requests.get("http://localhost:8000/health")
    print(f"\nHealth Status: {response.status_code}")
    print(f"Health Response: {response.json()}")
except Exception as e:
    print(f"Health Error: {e}")

# List all available routes
try:
    response = requests.get("http://localhost:8000/openapi.json")
    if response.status_code == 200:
        openapi = response.json()
        print("\nAvailable routes:")
        for path in openapi.get("paths", {}).keys():
            if "trash" in path.lower():
                print(f"  {path}")
except Exception as e:
    print(f"OpenAPI Error: {e}")
