# app/__init__.py

from flask import Flask
from flask_cors import CORS
from app.config.firebase import db

def create_app(config_name='development'):
    """Create Flask application with the specified configuration."""
    app = Flask(__name__)
    
    # Enable Cross-Origin Resource Sharing with credentials support
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})
    
    # Configure app based on environment
    if config_name == 'development':
        app.config.from_object('app.config.development')
    elif config_name == 'production':
        app.config.from_object('app.config.production')
    elif config_name == 'testing':
        app.config.from_object('app.config.testing')
    
    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.profiles import profiles_bp
    from app.api.matches import matches_bp
    from app.api.messages import messages_bp
    from app.api.ratings import ratings_bp
    from app.api.images import images_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profiles_bp, url_prefix='/api/profiles')
    app.register_blueprint(matches_bp, url_prefix='/api/matches')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(ratings_bp)
    app.register_blueprint(images_bp, url_prefix='/api/images')
    
    # Check Firebase connection
    if not db:
        print("Warning: Firebase not initialized correctly")
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Simple health check endpoint."""
        return {"status": "healthy", "message": "Dating app API is running"}
    
    return app