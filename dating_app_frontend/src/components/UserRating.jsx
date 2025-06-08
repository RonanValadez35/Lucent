import React, { useState, useEffect } from 'react';
import RatingStars from './RatingStars';
import { FaStar } from 'react-icons/fa';
import { profilesAPI, ratingsAPI } from '../services/api';

/**
 * Component for displaying and submitting user ratings
 * 
 * @param {Object} props
 * @param {string} props.userId - ID of the user being rated
 * @param {boolean} props.readOnly - If true, ratings are display-only
 * @param {boolean} props.showDetails - If true, shows detailed ratings
 * @param {boolean} props.compact - If true, shows a more compact version
 * @param {function} props.onRatingUpdated - Callback when rating is updated
 * @param {Object} props.preloadedRating - Optional pre-loaded rating data to avoid API call
 */
const UserRating = ({ 
  userId, 
  readOnly = false, 
  showDetails = true, 
  compact = false,
  onRatingUpdated = null,
  preloadedRating = null
}) => {
  const [userRatings, setUserRatings] = useState(preloadedRating || {
    overall: 0,
    personality: 0,
    reliability: 0,
    communication: 0,
    authenticity: 0,
    rating_count: 0
  });
  
  const [myRating, setMyRating] = useState({
    overall: 0,
    personality: 0,
    reliability: 0,
    communication: 0,
    authenticity: 0,
    comment: ''
  });
  
  const [existingRatingId, setExistingRatingId] = useState(null);
  const [loading, setLoading] = useState(!preloadedRating);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Fetch user's average ratings and my rating if not in readOnly mode
  useEffect(() => {
    // If we have preloaded ratings data, skip the API call
    if (preloadedRating) {
      setLoading(false);
      return;
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile with ratings
        try {
          const profileResponse = await profilesAPI.getUserProfile(userId);
          if (profileResponse.data.average_rating) {
            setUserRatings(profileResponse.data.average_rating);
          }
        } catch (profileErr) {
          console.error('Error fetching profile ratings:', profileErr);
          // Continue even if profile fetch fails
        }
        
        // If we're not in readOnly mode, fetch my rating for this user
        if (!readOnly) {
          try {
            const myRatingResponse = await ratingsAPI.getMyRating(userId);
            
            if (myRatingResponse.data.exists) {
              setMyRating(myRatingResponse.data.rating);
              setExistingRatingId(myRatingResponse.data.rating.id);
              setIsEditing(false);
            } else {
              setIsEditing(true);
            }
          } catch (err) {
            // If there's no rating yet, we're in editing mode by default
            setIsEditing(true);
          }
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load rating data');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, readOnly, preloadedRating]);
  
  const handleRatingChange = (category, value) => {
    setMyRating(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  const handleCommentChange = (e) => {
    setMyRating(prev => ({
      ...prev,
      comment: e.target.value
    }));
  };
  
  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      const payload = {
        rated_uid: userId,
        overall: myRating.overall,
        personality: myRating.personality,
        reliability: myRating.reliability,
        communication: myRating.communication,
        authenticity: myRating.authenticity,
        comment: myRating.comment
      };
      
      let response;
      
      if (existingRatingId) {
        // Update existing rating
        response = await ratingsAPI.updateRating(existingRatingId, payload);
      } else {
        // Create new rating
        response = await ratingsAPI.submitRating(payload);
        
        if (response.data.rating_id) {
          setExistingRatingId(response.data.rating_id);
        }
      }
      
      // Instead of fetching the profile again, manually calculate an updated rating
      // This is an approximation, but it avoids additional API calls
      const updatedRatings = { ...userRatings };
      updatedRatings.overall = userRatings.rating_count > 0 
        ? ((userRatings.overall * userRatings.rating_count) + payload.overall) / (userRatings.rating_count + 1)
        : payload.overall;
      updatedRatings.rating_count = (userRatings.rating_count || 0) + 1;
      
      setUserRatings(updatedRatings);
      
      setSuccessMessage('Rating submitted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsEditing(false);
      setIsSaving(false);
      
      if (onRatingUpdated) {
        onRatingUpdated(payload);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit rating');
      setIsSaving(false);
    }
  };
  
  // Compact view for display on cards - just show a single star icon with rating
  if (compact) {
    return (
      <div className="flex items-center space-x-1 text-sm">
        <FaStar color="#FFD700" />
        <span className="text-gray-600">
          {userRatings.overall > 0 
            ? Number(userRatings.overall).toFixed(1) 
            : "Unrated"}
          {userRatings.rating_count > 0 && ` (${userRatings.rating_count})`}
        </span>
      </div>
    );
  }
  
  // Full view for profiles and detailed display
  return (
    <div>
      {loading ? (
        <div className="flex justify-center">
          <span className="text-gray-500">Loading ratings...</span>
        </div>
      ) : (
        <>
          {/* Display average ratings */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <RatingStars 
                  value={Number(userRatings.overall)} 
                  readOnly={true} 
                  size="lg" 
                  label={null} 
                />
                <span className="ml-2 text-lg font-medium">
                  {userRatings.overall > 0 ? Number(userRatings.overall).toFixed(1) : "Unrated"}
                </span>
              </div>
              <span className="text-gray-500 text-sm whitespace-nowrap">
                {userRatings.rating_count || 0} {userRatings.rating_count === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
            
            {showDetails && userRatings.rating_count > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 mb-1">Personality</span>
                  <div className="flex items-center">
                    <div className="w-24 inline-block"></div>
                    <RatingStars 
                      value={Number(userRatings.personality)} 
                      readOnly={true} 
                      size="sm" 
                      label={null}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 mb-1">Reliability</span>
                  <div className="flex items-center">
                    <div className="w-24 inline-block"></div>
                    <RatingStars 
                      value={Number(userRatings.reliability)} 
                      readOnly={true} 
                      size="sm" 
                      label={null}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 mb-1">Communication</span>
                  <div className="flex items-center">
                    <div className="w-24 inline-block"></div>
                    <RatingStars 
                      value={Number(userRatings.communication)} 
                      readOnly={true} 
                      size="sm" 
                      label={null}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 mb-1">Authenticity</span>
                  <div className="flex items-center">
                    <div className="w-24 inline-block"></div>
                    <RatingStars 
                      value={Number(userRatings.authenticity)} 
                      readOnly={true} 
                      size="sm" 
                      label={null}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Submit ratings if not in readOnly mode */}
          {!readOnly && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between">
                <h4 className="text-md font-semibold mb-3">
                  {existingRatingId ? 'Your Rating' : 'Rate This User'}
                </h4>
                {existingRatingId && !isEditing && (
                  <button 
                    type="button"
                    className="text-blue-500 text-sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overall
                      </label>
                      <div className="flex items-center">
                        <RatingStars 
                          value={myRating.overall} 
                          onChange={(val) => handleRatingChange('overall', val)} 
                          label={null}
                          size="lg"
                        />
                        <span className="ml-2 text-lg">
                          {myRating.overall > 0 ? myRating.overall : ""}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Personality
                        </label>
                        <div className="flex items-center">
                          <div className="w-24 inline-block"></div>
                          <RatingStars 
                            value={myRating.personality} 
                            onChange={(val) => handleRatingChange('personality', val)} 
                            label={null}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reliability
                        </label>
                        <div className="flex items-center">
                          <div className="w-24 inline-block"></div>
                          <RatingStars 
                            value={myRating.reliability} 
                            onChange={(val) => handleRatingChange('reliability', val)} 
                            label={null}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Communication
                        </label>
                        <div className="flex items-center">
                          <div className="w-24 inline-block"></div>
                          <RatingStars 
                            value={myRating.communication} 
                            onChange={(val) => handleRatingChange('communication', val)} 
                            label={null}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Authenticity
                        </label>
                        <div className="flex items-center">
                          <div className="w-24 inline-block"></div>
                          <RatingStars 
                            value={myRating.authenticity} 
                            onChange={(val) => handleRatingChange('authenticity', val)} 
                            label={null}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment (optional)
                    </label>
                    <textarea
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      rows="2"
                      value={myRating.comment}
                      onChange={handleCommentChange}
                      placeholder="Share your experience with this person..."
                    />
                  </div>
                  
                  {error && (
                    <div className="mt-2 text-red-500 text-sm">
                      {error}
                    </div>
                  )}
                  
                  {successMessage && (
                    <div className="mt-2 text-green-500 text-sm">
                      {successMessage}
                    </div>
                  )}
                  
                  <div className="mt-4 flex space-x-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                      onClick={handleSubmit}
                      disabled={isSaving || myRating.overall === 0}
                    >
                      {isSaving ? 'Saving...' : existingRatingId ? 'Update Rating' : 'Submit Rating'}
                    </button>
                    
                    {existingRatingId && (
                      <button
                        type="button"
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {existingRatingId && (
                    <div>
                      <div className="flex items-center mb-2">
                        <RatingStars 
                          value={myRating.overall} 
                          readOnly={true} 
                          label={null}
                          size="md"
                        />
                        <span className="ml-2 font-medium">
                          {Number(myRating.overall).toFixed(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 mb-1">Personality</span>
                          <div className="flex items-center">
                            <div className="w-24 inline-block"></div>
                            <RatingStars 
                              value={myRating.personality} 
                              readOnly={true}
                              size="sm" 
                              label={null}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 mb-1">Reliability</span>
                          <div className="flex items-center">
                            <div className="w-24 inline-block"></div>
                            <RatingStars 
                              value={myRating.reliability} 
                              readOnly={true}
                              size="sm" 
                              label={null}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 mb-1">Communication</span>
                          <div className="flex items-center">
                            <div className="w-24 inline-block"></div>
                            <RatingStars 
                              value={myRating.communication} 
                              readOnly={true}
                              size="sm" 
                              label={null}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-600 mb-1">Authenticity</span>
                          <div className="flex items-center">
                            <div className="w-24 inline-block"></div>
                            <RatingStars 
                              value={myRating.authenticity} 
                              readOnly={true}
                              size="sm" 
                              label={null}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {myRating.comment && (
                        <div className="mt-2 text-gray-600 text-sm italic">
                          "{myRating.comment}"
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserRating; 