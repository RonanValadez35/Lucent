"""
Image Analyzer Module

This module provides utilities for image analysis:
- Image quality assessment
- Optimal crop suggestions
- Inappropriate content detection

Dependencies:
- PIL for basic image processing
- numpy for numerical operations
- tensorflow for ML-based analysis
- opennsfw2 for NSFW content detection
"""

import os
import io
import logging
from typing import Dict, Tuple, List, Union, Any, Optional

# Import required libraries - these will need to be added to requirements.txt
try:
    import numpy as np
    from PIL import Image, ImageStat, ImageEnhance, ImageFilter
    import tensorflow as tf
    import opennsfw2 as n2
except ImportError as e:
    logging.error(f"Required dependencies not installed: {e}")
    logging.error("Run: pip install pillow numpy tensorflow opennsfw2")
    raise

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageAnalyzer:
    """Class for analyzing images and providing insights"""
    
    # Minimum dimensions for acceptable image quality
    MIN_WIDTH = 800
    MIN_HEIGHT = 800
    
    # Aspect ratios for common crops
    ASPECT_RATIOS = {
        "profile": 1.0,     # 1:1 square
        "cover": 1.91,      # 16:9 landscape
        "portrait": 0.75,   # 3:4 portrait
    }
    
    def __init__(self, 
                 nsfw_detection_threshold: float = 0.7,
                 load_nsfw_model: bool = True):
        """
        Initialize the image analyzer
        
        Args:
            nsfw_detection_threshold: Threshold for NSFW content detection (0.0-1.0)
            load_nsfw_model: Whether to load the NSFW detection model at init
        """
        self.nsfw_threshold = nsfw_detection_threshold
        self.nsfw_model = None
        self.nsfw_model_available = False
        
        if load_nsfw_model:
            self._load_nsfw_model()
    
    def _load_nsfw_model(self):
        """Load the NSFW detection model using opennsfw2"""
        try:
            # Test if opennsfw2 is working by creating a model
            logger.info("Loading OpenNSFW2 model...")
            self.nsfw_model = n2.make_open_nsfw_model()
            self.nsfw_model_available = True
            logger.info("OpenNSFW2 model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load OpenNSFW2 model: {str(e)}")
            logger.warning("Falling back to placeholder NSFW detection")
            self.nsfw_model = None
            self.nsfw_model_available = False
    
    def analyze_image(self, 
                      image_data: Union[str, bytes, Image.Image],
                      analyze_quality: bool = True,
                      suggest_crops: bool = True,
                      detect_inappropriate: bool = True) -> Dict[str, Any]:
        """
        Analyze an image and return insights
        
        Args:
            image_data: Path to image, bytes data, or PIL Image object
            analyze_quality: Whether to analyze image quality
            suggest_crops: Whether to suggest optimal crops
            detect_inappropriate: Whether to detect inappropriate content
            
        Returns:
            Dictionary with analysis results
        """
        # Load the image
        img = self._load_image(image_data)
        if img is None:
            return {"error": "Failed to load image"}
        
        results = {"original_size": img.size}
        
        # Perform requested analyses
        if analyze_quality:
            results["quality"] = self.assess_quality(img)
        
        if suggest_crops:
            results["suggested_crops"] = self.suggest_optimal_crops(img)
        
        if detect_inappropriate and self.nsfw_model_available:
            results["inappropriate_content"] = self.detect_inappropriate_content(img)
        
        return results
    
    def _load_image(self, image_data: Union[str, bytes, Image.Image]) -> Optional[Image.Image]:
        """Load image from various input types"""
        try:
            if isinstance(image_data, str):
                # Load from file path
                return Image.open(image_data)
            elif isinstance(image_data, bytes):
                # Load from bytes
                return Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                # Already a PIL Image
                return image_data
            else:
                logger.error(f"Unsupported image data type: {type(image_data)}")
                return None
        except Exception as e:
            logger.error(f"Error loading image: {str(e)}")
            return None
    
    def assess_quality(self, img: Image.Image) -> Dict[str, Any]:
        """
        Assess image quality based on resolution, blur, and exposure
        
        Args:
            img: PIL Image object
            
        Returns:
            Dictionary with quality metrics
        """
        width, height = img.size
        
        # Convert to grayscale for certain analyses
        gray_img = img.convert('L')
        
        # Calculate sharpness (higher value = sharper image)
        blurred = gray_img.filter(ImageFilter.GaussianBlur(radius=3))
        sharpness = np.std(np.array(gray_img)) / max(np.std(np.array(blurred)), 0.0001)
        
        # Calculate brightness
        stat = ImageStat.Stat(img)
        brightness = sum(stat.mean) / len(stat.mean)
        
        # Calculate contrast
        min_val = min(stat.extrema[0][0], stat.extrema[1][0], stat.extrema[2][0])
        max_val = max(stat.extrema[0][1], stat.extrema[1][1], stat.extrema[2][1])
        contrast = (max_val - min_val) / 255
        
        # Determine quality score (simplistic model)
        resolution_score = min(1.0, (width * height) / (self.MIN_WIDTH * self.MIN_HEIGHT))
        sharpness_score = min(1.0, sharpness / 5.0)  # Normalize sharpness
        exposure_score = 1.0 - abs((brightness / 255) - 0.5) * 2  # Penalize under/over exposure
        
        # Overall quality score (weighted average)
        quality_score = (resolution_score * 0.4 + 
                         sharpness_score * 0.4 + 
                         exposure_score * 0.2)
        
        return {
            "width": int(width),
            "height": int(height),
            "sharpness": float(sharpness),
            "brightness": float(brightness),
            "contrast": float(contrast),
            "quality_score": float(quality_score),
            "is_high_quality": bool(quality_score > 0.7)
        }
    
    def suggest_optimal_crops(self, img: Image.Image) -> Dict[str, Dict[str, Any]]:
        """
        Suggest optimal crops for different use cases
        
        Args:
            img: PIL Image object
            
        Returns:
            Dictionary with crop suggestions for different aspect ratios
        """
        width, height = img.size
        original_ratio = width / height
        
        # Simple saliency detection - for a real app, use a ML model to find focal points
        # For this demo, we'll assume the center is the focal point
        center_x, center_y = width // 2, height // 2
        
        crop_suggestions = {}
        
        for crop_name, target_ratio in self.ASPECT_RATIOS.items():
            if abs(original_ratio - target_ratio) < 0.1:
                # Image already close to target ratio
                crop_suggestions[crop_name] = {
                    "crop_coordinates": (0, 0, width, height),
                    "message": f"Image already has a good {crop_name} ratio"
                }
            else:
                # Calculate crop dimensions
                if original_ratio > target_ratio:
                    # Image is wider than needed
                    new_width = int(height * target_ratio)
                    new_height = height
                else:
                    # Image is taller than needed
                    new_width = width
                    new_height = int(width / target_ratio)
                
                # Calculate crop coordinates centered on the focal point
                left = max(0, min(center_x - new_width // 2, width - new_width))
                top = max(0, min(center_y - new_height // 2, height - new_height))
                right = left + new_width
                bottom = top + new_height
                
                crop_suggestions[crop_name] = {
                    "crop_coordinates": (left, top, right, bottom),
                    "dimensions": (new_width, new_height),
                    "message": f"Suggested crop for {crop_name} format"
                }
        
        return crop_suggestions
    
    def detect_inappropriate_content(self, img: Image.Image) -> Dict[str, Any]:
        """
        Detect inappropriate content using OpenNSFW2 model
        
        Args:
            img: PIL Image object
            
        Returns:
            Dictionary with NSFW detection results
        """
        try:
            if self.nsfw_model_available and self.nsfw_model is not None:
                # Use OpenNSFW2's predict_image function
                nsfw_probability = n2.predict_image(img)
                
                # OpenNSFW2 returns a single probability score (0.0 to 1.0)
                # where higher values indicate more likely NSFW content
                nsfw_prob = float(nsfw_probability)
                sfw_prob = float(1.0 - nsfw_probability)
                
                return {
                    "nsfw_probability": nsfw_prob,
                    "sfw_probability": sfw_prob,
                    "is_inappropriate": bool(nsfw_prob > 0.5),
                    "confidence": float(max(nsfw_prob, sfw_prob)),
                    "model_used": "opennsfw2"
                }
                
        except Exception as e:
            logger.error(f"Error during NSFW prediction: {str(e)}")
            # Fall back to placeholder logic
        
        # Fallback logic for demonstration
        import random
        nsfw_score = random.uniform(0.0, 0.3)  # Low random score for demo
        return {
            "nsfw_probability": float(nsfw_score),
            "sfw_probability": float(1.0 - nsfw_score),
            "is_inappropriate": bool(nsfw_score > 0.5),
            "confidence": float(0.5),
            "model_used": "fallback"
        }


# Usage example
if __name__ == "__main__":
    analyzer = ImageAnalyzer()
    
    # Example with local file
    # results = analyzer.analyze_image("path/to/image.jpg")
    # print(results) 