#!/usr/bin/env python3
"""
Test script for demonstrating the ImageAnalyzer functionality.
This script shows how to use the utility for analyzing images.
"""

import os
import sys
import json
import numpy as np
from pathlib import Path

# Add the root directory to Python path for imports
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from app.utils.image_analyzer import ImageAnalyzer

# Custom JSON encoder to handle numpy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super(NumpyEncoder, self).default(obj)

def display_results(results):
    """Print results in a readable format"""
    print(json.dumps(results, indent=2, cls=NumpyEncoder))

def main():
    """Main function to test the image analyzer"""
    # Create an instance of the image analyzer
    analyzer = ImageAnalyzer(load_nsfw_model=True)
    
    # Get image path from command line or use default
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        print("No image path provided. Please provide a path to an image as a command line argument.")
        print("Usage: python test_image_analyzer.py path/to/image.jpg")
        return
    
    # Ensure the image exists
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return
    
    print(f"Analyzing image: {image_path}")
    print("-" * 80)
    
    # Analyze the image
    results = analyzer.analyze_image(
        image_path,
        analyze_quality=True,
        suggest_crops=True,
        detect_inappropriate=True
    )
    
    # Display the results
    display_results(results)
    
    # Print recommendations based on results
    print("\nSummary and Recommendations:")
    print("-" * 30)
    
    # Quality recommendations
    if "quality" in results:
        quality = results["quality"]
        if quality["quality_score"] < 0.5:
            print("❌ Low image quality detected. Consider using a higher resolution image.")
        else:
            print("✅ Image quality is acceptable.")
            
        if quality["sharpness"] < 2.0:
            print("❌ Image appears to be blurry. Consider using a sharper image.")
        else:
            print("✅ Image sharpness is good.")
    
    # Crop recommendations
    if "suggested_crops" in results:
        print(f"\nRecommended crops available for {len(results['suggested_crops'])} formats:")
        for crop_name, crop_info in results["suggested_crops"].items():
            print(f"  • {crop_name}: {crop_info['message']}")
    
    # Inappropriate content warnings
    if "inappropriate_content" in results:
        inappropriate = results["inappropriate_content"]
        if inappropriate["is_inappropriate"]:
            print("\n⚠️ Warning: This image may contain inappropriate content!")
        else:
            print("\n✅ No inappropriate content detected.")

if __name__ == "__main__":
    main() 