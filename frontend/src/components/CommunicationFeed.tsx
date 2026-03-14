import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Message } from '../types';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const POLL_INTERVAL_MS = 15_000;

interface CommunicationFeedProps {
  caseId: string;
}

const CommunicationFeed: React.FC<CommunicationFeedProps> = ({ caseId }) => {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [loading, setLoading]       = useState<boolean>(true);
  const [error, setError]           = useState<string | null>(null);

  const fetchMessages = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/v1/communications?caseId=${encodeURIComponent(caseId)}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Message[] = await res.json();
      setMessages(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
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
  const messageMap = useMemo<Record<number, Message>>(
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

export default CommunicationFeed;
