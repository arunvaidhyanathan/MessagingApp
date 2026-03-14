import React, { useState } from 'react';
import CommunicationFeed from './components/CommunicationFeed';
import MultiLevelSelect, { SelectionConfig } from './components/MultiLevelSelect';
import useGeoData from './components/MultiLevelSelect/hooks/useGeoData';
import './styles/messaging.css';

const DEMO_CASES: string[] = ['IMS-2025-000223', 'IMS-2025-000224', 'IMS-2025-000225'];
type Tab = 'messaging' | 'geo-select';

const geoConfig: SelectionConfig = {
  mandatoryLevel: 3,
  maxLevels: 4,
  allowSelectionAtAnyLevel: false,
  searchable: true,
  placeholder: 'Search region, country, state, city…',
  levelLabels: { 1: 'Region', 2: 'Country', 3: 'State', 4: 'City' },
};

function GeoDemo(): JSX.Element {
  const { data, loading, error } = useGeoData();

  return (
    <div className="geo-demo">
      <div className="geo-demo-header">
        <h2>Multi-Level Select — Geo Hierarchy Demo</h2>
        <p className="geo-demo-desc">
          Click a label to <strong>select</strong>. Click the chevron <strong>›</strong> to drill into children.
          Type to search across all levels.
        </p>
      </div>
      <div className="geo-demo-body">
        <MultiLevelSelect
          data={data}
          config={geoConfig}
          loading={loading}
          error={error}
          onConfirm={() => {}}
        />
      </div>
    </div>
  );
}

function App(): JSX.Element {
  const [activeCaseId, setActiveCaseId] = useState<string>(DEMO_CASES[0]);
  const [activeTab, setActiveTab]       = useState<Tab>('messaging');

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Case Messaging</h1>
        <nav className="app-tabs">
          <button
            className={`app-tab${activeTab === 'messaging' ? ' app-tab--active' : ''}`}
            onClick={() => setActiveTab('messaging')}
          >
            Messaging
          </button>
          <button
            className={`app-tab${activeTab === 'geo-select' ? ' app-tab--active' : ''}`}
            onClick={() => setActiveTab('geo-select')}
          >
            Geo Select
          </button>
        </nav>
        {activeTab === 'messaging' && (
          <div className="case-selector">
            <label htmlFor="case-select">Case: </label>
            <select
              id="case-select"
              value={activeCaseId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setActiveCaseId(e.target.value)}
            >
              {DEMO_CASES.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>
        )}
      </header>
      <main className="app-main">
        {activeTab === 'messaging' ? (
          <CommunicationFeed caseId={activeCaseId} />
        ) : (
          <GeoDemo />
        )}
      </main>
    </div>
  );
}

export default App;
