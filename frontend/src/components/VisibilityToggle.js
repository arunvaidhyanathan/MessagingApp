import React, { useState } from 'react';
import PropTypes from 'prop-types';

const VisibilityToggle = ({ active, messageId, onToggled }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
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
    <button
      className={`visibility-toggle ${active ? 'active' : ''}`}
      onClick={handleToggle}
      disabled={loading}
      title={active ? 'Hide from investigator' : 'Show to investigator'}
    >
      {loading ? '…' : active ? 'Visible' : 'Hidden'}
    </button>
  );
};

VisibilityToggle.propTypes = {
  active:    PropTypes.bool.isRequired,
  messageId: PropTypes.number.isRequired,
  onToggled: PropTypes.func.isRequired,
};

export default VisibilityToggle;
