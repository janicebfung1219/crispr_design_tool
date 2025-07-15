// client/src/App.js
import React, { useState } from 'react';
import styled from 'styled-components';
import InputPane from './components/InputPane';
import ResultsPane from './components/ResultsPane';
import ResourcesPane from './components/ResourcesPane';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const MainContent = styled.main`
  display: flex;
  flex: 1;
  min-height: 0;
`;

const PaneContainer = styled.div`
  flex: 1;
  border-right: 1px solid #e0e0e0;
  overflow: auto;
  
  &:last-child {
    border-right: none;
  }
`;

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleResults = (data) => {
    setResults(data);
  };

  const handleLoading = (isLoading) => {
    setLoading(isLoading);
  };

  return (
    <AppContainer>
      <Header>
        <h1>CRISPR Design Tool</h1>
        <p>Design guide RNAs for CRISPR-Cas systems</p>
      </Header>
      
      <MainContent>
        <PaneContainer>
          <InputPane onResults={handleResults} onLoading={handleLoading} />
        </PaneContainer>
        
        <PaneContainer>
          <ResultsPane results={results} loading={loading} />
        </PaneContainer>
        
        <PaneContainer>
          <ResourcesPane />
        </PaneContainer>
      </MainContent>
    </AppContainer>
  );
}

export default App;
