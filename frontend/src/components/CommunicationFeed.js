import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const POLL_INTERVAL_MS = 15_000;

const CommunicationFeed = ({ caseId }) => {
  const [messages, setMessages]     = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/communications?caseId=${encodeURIComponent(caseId)}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // O(1) parent lookup — avoids O(n²) find() inside each MessageBubble
  const messageMap = useMemo(
    () => Object.fromEntries(messages.map(m => [m.id, m])),
    [messages]
  );

  if (loading) return <div className="feed-status">Loading messages...</div>;
  if (error)   return <div className="feed-status feed-error">Error: {error}</div>;

  return (
    <div className="communication-feed">
      <div className="message-list">
        {messages.length === 0 ? (
          <div className="feed-status">No messages yet for this case.</div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              messageMap={messageMap}
              onReply={setReplyingTo}
              onVisibilityChange={fetchMessages}
            />
          ))
        )}
      </div>
      <MessageComposer
        caseId={caseId}
        replyingTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        onMessageSent={fetchMessages}
      />
    </div>
  );
};

CommunicationFeed.propTypes = {
  caseId: PropTypes.string.isRequired,
};

export default CommunicationFeed;
