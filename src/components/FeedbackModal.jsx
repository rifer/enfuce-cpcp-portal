import React, { useState } from 'react';

const FeedbackModal = ({ isOpen, onClose, onSubmit, wizardVariant, configurationData }) => {
  const [formData, setFormData] = useState({
    satisfactionRating: 0,
    easeOfUseRating: 0,
    wouldRecommend: null,
    mostHelpfulFeature: '',
    issuesEncountered: [],
    comments: ''
  });

  const [hoveredStars, setHoveredStars] = useState({
    satisfaction: 0,
    easeOfUse: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const issueOptions = [
    { id: 'confusing_steps', label: 'Confusing steps' },
    { id: 'missing_information', label: 'Missing information' },
    { id: 'technical_errors', label: 'Technical errors' },
    { id: 'slow_performance', label: 'Slow performance' },
    { id: 'unclear_labels', label: 'Unclear labels or instructions' }
  ];

  const helpfulFeatureOptions = [
    { id: 'step_navigation', label: 'Step-by-step navigation' },
    { id: 'clear_instructions', label: 'Clear instructions' },
    { id: 'validation_feedback', label: 'Real-time validation' },
    { id: 'summary_preview', label: 'Configuration summary' },
    { id: 'chat_assistance', label: 'Chat assistant (if applicable)' }
  ];

  const handleStarClick = (field, rating) => {
    setFormData(prev => ({
      ...prev,
      [`${field}Rating`]: rating
    }));
  };

  const handleIssueToggle = (issueId) => {
    setFormData(prev => ({
      ...prev,
      issuesEncountered: prev.issuesEncountered.includes(issueId)
        ? prev.issuesEncountered.filter(id => id !== issueId)
        : [...prev.issuesEncountered, issueId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.satisfactionRating === 0) {
      alert('Please provide a satisfaction rating');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        wizardVariant,
        programType: configurationData?.programType,
        fundingModel: configurationData?.fundingModel,
        cardCount: configurationData?.cardCount
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const StarRating = ({ field, label, value, hovered }) => (
    <div className="feedback-rating-group">
      <label className="feedback-label">{label} *</label>
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= (hovered || value) ? 'active' : ''}`}
            onClick={() => handleStarClick(field, star)}
            onMouseEnter={() => setHoveredStars(prev => ({ ...prev, [field]: star }))}
            onMouseLeave={() => setHoveredStars(prev => ({ ...prev, [field]: 0 }))}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="feedback-modal-backdrop" onClick={handleSkip}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2>How was your experience?</h2>
          <p className="feedback-subtitle">Help us improve the card configuration process</p>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          {/* Satisfaction Rating */}
          <StarRating
            field="satisfaction"
            label="Overall Satisfaction"
            value={formData.satisfactionRating}
            hovered={hoveredStars.satisfaction}
          />

          {/* Ease of Use Rating */}
          <StarRating
            field="easeOfUse"
            label="Ease of Use"
            value={formData.easeOfUseRating}
            hovered={hoveredStars.easeOfUse}
          />

          {/* Would Recommend */}
          <div className="feedback-rating-group">
            <label className="feedback-label">Would you recommend this tool?</label>
            <div className="recommendation-buttons">
              <button
                type="button"
                className={`rec-button ${formData.wouldRecommend === true ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, wouldRecommend: true }))}
              >
                Yes
              </button>
              <button
                type="button"
                className={`rec-button ${formData.wouldRecommend === false ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, wouldRecommend: false }))}
              >
                No
              </button>
            </div>
          </div>

          {/* Most Helpful Feature */}
          <div className="feedback-rating-group">
            <label className="feedback-label">What was most helpful?</label>
            <div className="radio-group">
              {helpfulFeatureOptions.map(option => (
                <label key={option.id} className="radio-option">
                  <input
                    type="radio"
                    name="mostHelpfulFeature"
                    value={option.id}
                    checked={formData.mostHelpfulFeature === option.id}
                    onChange={(e) => setFormData(prev => ({ ...prev, mostHelpfulFeature: e.target.value }))}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Issues Encountered */}
          <div className="feedback-rating-group">
            <label className="feedback-label">Did you encounter any issues?</label>
            <div className="checkbox-group">
              {issueOptions.map(option => (
                <label key={option.id} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={formData.issuesEncountered.includes(option.id)}
                    onChange={() => handleIssueToggle(option.id)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="feedback-rating-group">
            <label className="feedback-label">Additional comments (optional)</label>
            <textarea
              className="feedback-textarea"
              rows="3"
              placeholder="Tell us more about your experience..."
              value={formData.comments}
              onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
              maxLength={500}
            />
            <div className="char-count">{formData.comments.length}/500</div>
          </div>

          {/* Action Buttons */}
          <div className="feedback-actions">
            <button
              type="button"
              className="feedback-btn feedback-btn-skip"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip for now
            </button>
            <button
              type="submit"
              className="feedback-btn feedback-btn-submit"
              disabled={isSubmitting || formData.satisfactionRating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .feedback-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.2s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .feedback-modal {
          background: #1a1a1a;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.3s ease-out;
          border: 1px solid #2a2a2a;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .feedback-modal-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid #2a2a2a;
        }

        .feedback-modal-header h2 {
          margin: 0;
          color: #00d4aa;
          font-size: 24px;
          font-weight: 600;
        }

        .feedback-subtitle {
          margin: 8px 0 0;
          color: #888;
          font-size: 14px;
        }

        .feedback-form {
          padding: 24px;
        }

        .feedback-rating-group {
          margin-bottom: 24px;
        }

        .feedback-label {
          display: block;
          margin-bottom: 8px;
          color: #e0e0e0;
          font-size: 14px;
          font-weight: 500;
        }

        .star-rating {
          display: flex;
          gap: 8px;
        }

        .star {
          background: none;
          border: none;
          font-size: 32px;
          color: #444;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
          line-height: 1;
        }

        .star:hover,
        .star.active {
          color: #ffc107;
          transform: scale(1.1);
        }

        .recommendation-buttons {
          display: flex;
          gap: 12px;
        }

        .rec-button {
          flex: 1;
          padding: 12px;
          background: #2a2a2a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          color: #e0e0e0;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rec-button:hover {
          border-color: #00d4aa;
        }

        .rec-button.active {
          background: #00d4aa;
          border-color: #00d4aa;
          color: #000;
        }

        .radio-group,
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .radio-option,
        .checkbox-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .radio-option:hover,
        .checkbox-option:hover {
          background: #2a2a2a;
        }

        .radio-option input,
        .checkbox-option input {
          cursor: pointer;
        }

        .radio-option span,
        .checkbox-option span {
          color: #e0e0e0;
          font-size: 14px;
        }

        .feedback-textarea {
          width: 100%;
          padding: 12px;
          background: #2a2a2a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #e0e0e0;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .feedback-textarea:focus {
          outline: none;
          border-color: #00d4aa;
        }

        .char-count {
          text-align: right;
          color: #666;
          font-size: 12px;
          margin-top: 4px;
        }

        .feedback-actions {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }

        .feedback-btn {
          flex: 1;
          padding: 14px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .feedback-btn-skip {
          background: transparent;
          color: #888;
          border: 1px solid #444;
        }

        .feedback-btn-skip:hover:not(:disabled) {
          background: #2a2a2a;
          color: #e0e0e0;
        }

        .feedback-btn-submit {
          background: #00d4aa;
          color: #000;
        }

        .feedback-btn-submit:hover:not(:disabled) {
          background: #00ecc0;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        }

        .feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .feedback-modal {
            width: 95%;
            max-height: 95vh;
          }

          .feedback-modal-header h2 {
            font-size: 20px;
          }

          .star {
            font-size: 28px;
          }

          .feedback-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default FeedbackModal;
