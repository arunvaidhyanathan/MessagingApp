import React, { useState } from 'react';
import CommunicationFeed from './components/CommunicationFeed';
import './styles/messaging.css';

const DEMO_CASES = ['IMS-2025-000223', 'IMS-2025-000224', 'IMS-2025-000225'];

function App() {
  const [activeCaseId, setActiveCaseId] = useState(DEMO_CASES[0]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Case Messaging</h1>
        <div className="case-selector">
          <label htmlFor="case-select">Case: </label>
          <select
            id="case-select"
            value={activeCaseId}
            onChange={e => setActiveCaseId(e.target.value)}
          >
            {DEMO_CASES.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </header>
      <main className="app-main">
        <CommunicationFeed caseId={activeCaseId} />
      </main>
    </div>
  );
}

export default App;
