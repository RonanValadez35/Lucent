import React, { useState, useEffect } from 'react';
import { FaStar, FaStarHalfAlt } from 'react-icons/fa';

/**
 * Star rating component that can be used for both display and interactive rating
 * 
 * @param {Object} props
 * @param {number} props.value - Current rating value (1-5)
 * @param {function} props.onChange - Callback when rating changes (for interactive mode)
 * @param {boolean} props.readOnly - If true, rating is display-only
 * @param {string} props.size - Size of stars ('sm', 'md', 'lg')
 * @param {string} props.color - Color of filled stars
 * @param {string} props.label - Optional label to display alongside stars
 * @param {boolean} props.labelAbove - If true, display label above stars instead of to the left
 */
const RatingStars = ({ 
  value = 0, 
  onChange = null, 
  readOnly = false, 
  size = 'md', 
  color = '#FFD700', 
  label = null,
  labelAbove = false
}) => {
  const [rating, setRating] = useState(value);
  const [hover, setHover] = useState(null);
  
  // Update internal state when external value changes
  useEffect(() => {
    setRating(value);
  }, [value]);
  
  // Determine star size based on size prop
  const getSizeStyle = () => {
    switch(size) {
      case 'sm': return { fontSize: '14px', marginRight: '2px', display: 'inline-block' };
      case 'lg': return { fontSize: '24px', marginRight: '4px', display: 'inline-block' };
      default: return { fontSize: '18px', marginRight: '3px', display: 'inline-block' }; // 'md'
    }
  };
  
  const handleClick = (newValue) => {
    if (readOnly) return;
    
    setRating(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  const sizeStyle = getSizeStyle();
  
  // Function to render each star with decimal support
  const renderStar = (index) => {
    const starValue = index + 1;
    const displayValue = hover || rating;
    
    // For read-only mode with decimal values
    if (readOnly) {
      if (displayValue >= starValue) {
        // Full star
        return (
          <FaStar
            key={index}
            className="cursor-default transition-colors duration-200"
            color={color}
            style={sizeStyle}
          />
        );
      } else if (displayValue >= starValue - 0.5) {
        // Half star
        return (
          <FaStarHalfAlt
            key={index}
            className="cursor-default transition-colors duration-200"
            color={color}
            style={sizeStyle}
          />
        );
      } else {
        // Empty star
        return (
          <FaStar
            key={index}
            className="cursor-default transition-colors duration-200"
            color="#e4e5e9"
            style={sizeStyle}
          />
        );
      }
    }
    
    // For interactive mode - always use full stars
    return (
      <FaStar
        key={index}
        className="cursor-pointer transition-colors duration-200"
        color={displayValue >= starValue ? color : '#e4e5e9'}
        style={sizeStyle}
        onClick={() => handleClick(starValue)}
        onMouseEnter={() => !readOnly && setHover(starValue)}
        onMouseLeave={() => !readOnly && setHover(null)}
      />
    );
  };
  
  const starsElement = (
    <div style={{ display: 'inline-flex', flexDirection: 'row', flexWrap: 'nowrap' }}>
      {[...Array(5)].map((_, index) => renderStar(index))}
    </div>
  );
  
  // If no label, just return stars
  if (!label) {
    return (
      <div style={{ display: 'inline-block' }}>
        {starsElement}
        {!readOnly && (
          <span className="ml-2 text-sm text-gray-600">
            {hover || rating || ''}
          </span>
        )}
      </div>
    );
  }
  
  // Label above stars
  if (labelAbove) {
    return (
      <div style={{ display: 'block' }}>
        <span className="block mb-1 text-gray-700 text-sm font-medium">{label}</span>
        {starsElement}
        {!readOnly && (
          <span className="ml-2 text-sm text-gray-600">
            {hover || rating || ''}
          </span>
        )}
      </div>
    );
  }
  
  // Label to the left of stars
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span className="mr-2 text-gray-700 whitespace-nowrap">{label}</span>
      {starsElement}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-600">
          {hover || rating || ''}
        </span>
      )}
    </div>
  );
};

export default RatingStars; 