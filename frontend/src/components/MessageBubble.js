import React from 'react';
import PropTypes from 'prop-types';
import VisibilityToggle from './VisibilityToggle';

const MessageBubble = ({ msg, messageMap, onReply, onVisibilityChange }) => {
  const parentMsg = msg.parentMessageId ? messageMap[msg.parentMessageId] : null;
  const isExternal = msg.senderType === 'EXTERNAL';
  const formattedTime = new Date(msg.createdAt).toLocaleString();

  return (
    <div className={`message-wrapper ${isExternal ? 'external' : 'internal'}`}>
      {parentMsg && (
        <div className="reply-reference">
          <small>
            Replying to <strong>{parentMsg.senderName || 'Unknown'}</strong>:{' '}
            {parentMsg.messageText.substring(0, 60)}{parentMsg.messageText.length > 60 ? '…' : ''}
          </small>
        </div>
      )}
      <div className={`message-bubble${parentMsg ? ' is-reply' : ''}`}>
        <div className="bubble-header">
          <span className="sender-name">{msg.senderName || msg.senderType}</span>
          <span className={`sender-badge ${isExternal ? 'badge-external' : 'badge-internal'}`}>
            {msg.senderType}
          </span>
          <span className="timestamp">{formattedTime}</span>
        </div>
        <p className="bubble-text">{msg.messageText}</p>
        <div className="bubble-actions">
          <button className="reply-btn" onClick={() => onReply(msg)}>
            Reply
          </button>
          <VisibilityToggle
            active={msg.visibleToInvestigator}
            messageId={msg.id}
            onToggled={onVisibilityChange}
          />
        </div>
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  msg: PropTypes.shape({
    id:                    PropTypes.number.isRequired,
    messageText:           PropTypes.string.isRequired,
    senderType:            PropTypes.oneOf(['INTERNAL', 'EXTERNAL']).isRequired,
    senderName:            PropTypes.string,
    parentMessageId:       PropTypes.number,
    visibleToInvestigator: PropTypes.bool.isRequired,
    createdAt:             PropTypes.string.isRequired,
  }).isRequired,
  messageMap:         PropTypes.object.isRequired,
  onReply:            PropTypes.func.isRequired,
  onVisibilityChange: PropTypes.func.isRequired,
};

export default MessageBubble;
