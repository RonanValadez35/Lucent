#!/usr/bin/env python3

from app.utils.image_analyzer import ImageAnalyzer
import json

def test_local_images():
    """Test the image analyzer with local test images"""
    
    # Initialize the analyzer
    print("Initializing ImageAnalyzer...")
    analyzer = ImageAnalyzer()
    
    # Test files
    test_files = ['app/test.png', 'app/test2.png']
    
    for test_file in test_files:
        print(f"\n{'='*50}")
        print(f"Testing: {test_file}")
        print('='*50)
        
        try:
            # Analyze the image
            result = analyzer.analyze_image(
                test_file,
                analyze_quality=True,
                suggest_crops=True,
                detect_inappropriate=True
            )
            
            # Pretty print the results
            print(json.dumps(result, indent=2))
            
            # Summary
            if 'error' not in result:
                print(f"\n📊 SUMMARY for {test_file}:")
                print(f"   Size: {result['original_size'][0]}x{result['original_size'][1]}")
                
                if 'quality' in result:
                    quality = result['quality']
                    print(f"   Quality Score: {quality['quality_score']:.3f}")
                    print(f"   High Quality: {quality['is_high_quality']}")
                
                if 'inappropriate_content' in result:
                    nsfw = result['inappropriate_content']
                    print(f"   NSFW Probability: {nsfw['nsfw_probability']:.4f}")
                    print(f"   Is Inappropriate: {nsfw['is_inappropriate']}")
                    print(f"   Model Used: {nsfw['model_used']}")
            
        except Exception as e:
            print(f"❌ Error analyzing {test_file}: {str(e)}")

if __name__ == "__main__":
    test_local_images() 