import React from 'react';
import { Message } from '../types';
import VisibilityToggle from './VisibilityToggle';

interface MessageBubbleProps {
  msg: Message;
  messageMap: Record<number, Message>;
  onReply: (msg: Message) => void;
  onVisibilityChange: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ msg, messageMap, onReply, onVisibilityChange }) => {
  const parentMsg = msg.parentMessageId != null ? messageMap[msg.parentMessageId] : null;
  const isExternal = msg.senderType === 'EXTERNAL';
  const formattedTime = new Date(msg.createdAt).toLocaleString();

  return (
    <div className={`message-wrapper ${isExternal ? 'external' : 'internal'}`}>

      {/* Left/main column — reply reference + bubble */}
      <div className="message-content">
        {parentMsg && (
          <div className="reply-reference">
            <small>
              Replying to <strong>{parentMsg.senderName ?? 'Unknown'}</strong>:{' '}
              {parentMsg.messageText.substring(0, 60)}{parentMsg.messageText.length > 60 ? '…' : ''}
            </small>
          </div>
        )}
        <div className={`message-bubble${parentMsg ? ' is-reply' : ''}`}>
          <div className="bubble-header">
            <span className="sender-name">{msg.senderName ?? msg.senderType}</span>
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
          </div>
        </div>
      </div>

      {/* Right column — visibility toggle, always at the far right */}
      <div className="message-toggle-col">
        <VisibilityToggle
          active={msg.visibleToInvestigator}
          messageId={msg.id}
          onToggled={onVisibilityChange}
        />
      </div>

    </div>
  );
};

export default MessageBubble;
