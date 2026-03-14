import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';

interface MessageComposerProps {
  caseId: string;
  replyingTo: Message | null;
  onClearReply: () => void;
  onMessageSent: () => void;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ caseId, replyingTo, onClearReply, onMessageSent }) => {
  const [text, setText]       = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError]     = useState<string | null>(null);
  const textareaRef           = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when a reply is initiated
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = async (): Promise<void> => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/communications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          messageText:     text.trim(),
          parentMessageId: replyingTo ? replyingTo.id : null,
        }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      setText('');
      onClearReply();
      onMessageSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSend();
    }
  };

  // Auto-expand textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="message-composer">
      {replyingTo && (
        <div className="replying-to-badge">
          <span>
            Replying to <strong>{replyingTo.senderName ?? replyingTo.senderType}</strong>:{' '}
            {replyingTo.messageText.substring(0, 40)}{replyingTo.messageText.length > 40 ? '…' : ''}
          </span>
          <button className="clear-reply-btn" onClick={onClearReply} title="Cancel reply">✕</button>
        </div>
      )}
      <div className="composer-input-row">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Ctrl+Enter to send)"
          rows={3}
          className="composer-textarea"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={sending || !text.trim()}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && <div className="composer-error">{error}</div>}
    </div>
  );
};

export default MessageComposer;
