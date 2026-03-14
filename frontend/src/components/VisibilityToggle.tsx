import React, { useState } from 'react';

interface VisibilityToggleProps {
  active: boolean;
  messageId: number;
  onToggled: () => void;
}

const VisibilityToggle: React.FC<VisibilityToggleProps> = ({ active, messageId, onToggled }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleToggle = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/communications/${messageId}/visibility`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ visible: !active }),
      });
      if (!res.ok) throw new Error('Failed to update visibility');
      onToggled();
    } catch (err) {
      console.error('Visibility toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <label className={`visibility-toggle-label${loading ? ' visibility-toggle-label--loading' : ''}`}>
      <span className="toggle-switch">
        <input
          type="checkbox"
          checked={active}
          onChange={handleToggle}
          disabled={loading}
        />
        <span className="toggle-slider" />
      </span>
      <span className="toggle-text">Visible to Investigator</span>
    </label>
  );
};

export default VisibilityToggle;
