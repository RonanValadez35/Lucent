# run.py

import os
from app import create_app

# Create app instance with the appropriate configuration
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.getenv('PORT', 5001))
    
    # Run the app
    app.run(host='0.0.0.0', port=port)