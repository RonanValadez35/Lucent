# app/api/images.py

from flask import Blueprint, request, jsonify
import requests
from PIL import Image
import io
import logging
from app.utils.image_analyzer import ImageAnalyzer

# Set up logging
logger = logging.getLogger(__name__)

# Create blueprint
images_bp = Blueprint('images', __name__)

# Initialize the image analyzer (this will load the OpenNSFW2 model)
analyzer = ImageAnalyzer(nsfw_detection_threshold=0.7, load_nsfw_model=True)

@images_bp.route('/analyze', methods=['POST'])
def analyze_image():
    """
    Analyze an image for quality, crop suggestions, and inappropriate content
    
    Expected JSON payload:
    {
        "image_url": "https://example.com/image.jpg"
    }
    
    Returns:
    {
        "success": true,
        "analysis": {
            "original_size": [width, height],
            "quality": {...},
            "suggested_crops": {...},
            "inappropriate_content": {...}
        }
    }
    """
    try:
        # Get the request data
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'image_url' in request body"
            }), 400
        
        image_url = data['image_url']
        
        # Download the image
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Load image from bytes
            image = Image.open(io.BytesIO(response.content))
            
        except requests.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Failed to download image: {str(e)}"
            }), 400
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to load image: {str(e)}"
            }), 400
        
        # Analyze the image
        analysis_result = analyzer.analyze_image(
            image,
            analyze_quality=True,
            suggest_crops=True,
            detect_inappropriate=True
        )
        
        # Check if there was an error in analysis
        if "error" in analysis_result:
            return jsonify({
                "success": False,
                "error": analysis_result["error"]
            }), 500
        
        return jsonify({
            "success": True,
            "analysis": analysis_result,
            "nsfw_model_status": {
                "available": analyzer.nsfw_model_available,
                "model_used": analysis_result.get("inappropriate_content", {}).get("model_used", "none")
            }
        })
        
    except Exception as e:
        logger.error(f"Error in image analysis: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@images_bp.route('/nsfw-check', methods=['POST'])
def nsfw_check():
    """
    Quick NSFW content check for an image
    
    Expected JSON payload:
    {
        "image_url": "https://example.com/image.jpg"
    }
    
    Returns:
    {
        "success": true,
        "is_inappropriate": false,
        "nsfw_score": 0.05,
        "confidence": "high",
        "model_used": "OpenNSFW2"
    }
    """
    try:
        # Get the request data
        data = request.get_json()
        
        if not data or 'image_url' not in data:
            return jsonify({
                "success": False,
                "error": "Missing 'image_url' in request body"
            }), 400
        
        image_url = data['image_url']
        
        # Download the image
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Load image from bytes
            image = Image.open(io.BytesIO(response.content))
            
        except requests.RequestException as e:
            return jsonify({
                "success": False,
                "error": f"Failed to download image: {str(e)}"
            }), 400
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to load image: {str(e)}"
            }), 400
        
        # Perform NSFW detection only
        nsfw_result = analyzer.detect_inappropriate_content(image)
        
        return jsonify({
            "success": True,
            **nsfw_result
        })
        
    except Exception as e:
        logger.error(f"Error in NSFW check: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@images_bp.route('/nsfw-check-upload', methods=['POST'])
def nsfw_check_upload():
    """
    Quick NSFW content check for an uploaded image file
    
    Expected form data:
    - image: file upload
    
    Returns:
    {
        "success": true,
        "is_inappropriate": false,
        "nsfw_probability": 0.05,
        "sfw_probability": 0.95,
        "confidence": 0.95,
        "model_used": "opennsfw2"
    }
    """
    try:
        # Check if image file is in request
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        file = request.files['image']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No image file selected"
            }), 400
        
        # Check file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}
        file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_extension not in allowed_extensions:
            return jsonify({
                "success": False,
                "error": f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            }), 400
        
        try:
            # Load image from uploaded file
            image = Image.open(file.stream)
            
            # Convert to RGB if necessary (for PNG with transparency, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to load image: {str(e)}"
            }), 400
        
        # Perform NSFW detection
        nsfw_result = analyzer.detect_inappropriate_content(image)
        
        return jsonify({
            "success": True,
            **nsfw_result
        })
        
    except Exception as e:
        logger.error(f"Error in NSFW check upload: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

@images_bp.route('/health', methods=['GET'])
def images_health():
    """Health check for the images API"""
    return jsonify({
        "status": "healthy",
        "nsfw_model_available": analyzer.nsfw_model_available,
        "message": "Images API is running"
    }) 