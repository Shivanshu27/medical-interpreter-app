import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleRole } from '../redux/conversationSlice';

const RoleToggle = () => {
  const dispatch = useDispatch();
  const { role, isRecording } = useSelector((state) => state.conversation);

  return (
    <div className="role-toggle-container">
      <div className="current-role">
        <h3>Current Speaker</h3>
        <div className="role-info">
          <div className="role-name">{role}</div>
          <div className="language-indicator">
            Speaking in {role === 'Doctor' ? 'English' : 'Spanish'}
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => dispatch(toggleRole())}
        disabled={isRecording}
        className="toggle-button"
      >
        Switch to {role === 'Doctor' ? 'Patient (Spanish)' : 'Doctor (English)'}
      </button>
      
      {isRecording && (
        <div className="warning-message">
          Stop recording before switching roles
        </div>
      )}
    </div>
  );
};

export default RoleToggle;