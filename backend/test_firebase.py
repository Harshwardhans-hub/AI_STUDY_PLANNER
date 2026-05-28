import firebase_admin
from firebase_admin import auth

try:
    # Initialize without credentials, just projectId
    app = firebase_admin.initialize_app(options={"projectId": "mlh-project-aistudyplanner"})
    print("App initialized successfully!")
    
    # Try accessing auth module
    print("Auth module accessible.")
except Exception as e:
    print(f"Failed: {e}")
