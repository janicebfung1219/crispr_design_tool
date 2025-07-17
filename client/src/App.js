import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import InputPane from './components/InputPane';
import ResultsPane from './components/ResultsPane';
import ResourcesPane from './components/ResourcesPane';
import DebugPane from './components/DebugPane';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const AppHeader = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex-shrink: 0;
`;

const MainContent = styled.main`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const PaneContainer = styled.div`
  border-bottom: 1px solid #e0e0e0;
  overflow: auto;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.input-pane {
    flex: 0 0 300px;
  }
  
  &.results-pane {
    flex: 1;
    min-height: 400px;
  }
  
  &.resources-pane {
    flex: 0 0 250px;
  }
`;

const RightColumn = styled.div`
  width: 350px;
  border-left: 1px solid #e0e0e0;
  background: #f8f9fa;
  flex-shrink: 0;
`;

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ 
    ui: { show_debug_panel: true }, 
    debug: { enabled: false } 
  });

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config:', err));
  }, []);

  const handleResults = (data) => {
    setResults(data);
  };

  const handleLoading = (isLoading) => {
    setLoading(isLoading);
  };

  return (
    <AppContainer>
      <AppHeader>
        <h1>CRISPR Design Tool</h1>
        <p>Design guide RNAs for CRISPR-Cas systems</p>
      </AppHeader>
      
      <MainContent>
        <LeftColumn>
          <PaneContainer className="input-pane">
            <InputPane onResults={handleResults} onLoading={handleLoading} />
          </PaneContainer>
          
          <PaneContainer className="results-pane">
            <ResultsPane results={results} loading={loading} />
          </PaneContainer>
          
          <PaneContainer className="resources-pane">
            <ResourcesPane />
          </PaneContainer>
        </LeftColumn>
        
        {config.ui.show_debug_panel && (
          <RightColumn>
            <DebugPane enabled={config.debug.enabled} />
          </RightColumn>
        )}
      </MainContent>
    </AppContainer>
  );
}

export default App;