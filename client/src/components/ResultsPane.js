// client/src/components/ResultsPane.js
import React from 'react';
import styled from 'styled-components';

const PaneWrapper = styled.div`
  padding: 2rem;
  height: 100%;
  overflow-y: auto;
`;

const Title = styled.h2`
  color: #333;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.5rem;
`;

const LoadingDiv = styled.div`
  text-align: center;
  padding: 2rem;
  color: #666;
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  font-size: 0.9rem;
`;

const Th = styled.th`
  background: #f8f9fa;
  padding: 0.75rem;
  text-align: left;
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
`;

const Td = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #dee2e6;
  vertical-align: top;
`;

const SequenceSpan = styled.span`
  font-family: 'Courier New', monospace;
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.85rem;
`;

const ScoreSpan = styled.span`
  background: ${props => props.score >= 80 ? '#28a745' : props.score >= 60 ? '#ffc107' : '#dc3545'};
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
`;

const SummaryCard = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border-left: 4px solid #667eea;
`;

const ResultsPane = ({ results, loading }) => {
  const downloadCSV = () => {
    if (!results || !results.sites) return;
    
    const headers = ['Position', 'Strand', 'PAM Site', 'gRNA Sequence', 'Score', 'gRNA Start', 'gRNA End'];
    const csvContent = [
      headers.join(','),
      ...results.sites.map(site => [
        site.position,
        site.strand,
        site.pamSite,
        site.grnaSequence,
        site.score,
        site.grnaStart,
        site.grnaEnd
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crispr_sites.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadLWGV = () => {
    if (!results || !results.lwgvAnnotation) return;
    
    const blob = new Blob([results.lwgvAnnotation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crispr_annotation.ann';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <PaneWrapper>
        <Title>Results</Title>
        <LoadingDiv>
          <div>🧬 Analyzing sequence...</div>
          <div>Please wait while we find CRISPR sites</div>
        </LoadingDiv>
      </PaneWrapper>
    );
  }

  if (!results) {
    return (
      <PaneWrapper>
        <Title>Results</Title>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div>🔬 No results yet</div>
          <div>Enter a sequence and click "Design gRNAs" to get started</div>
        </div>
      </PaneWrapper>
    );
  }

  return (
    <PaneWrapper>
      <Title>Results</Title>
      
      <SummaryCard>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>Analysis Summary</h3>
        <div><strong>PAM Type:</strong> {results.pamType}</div>
        <div><strong>Sequence Length:</strong> {results.sequenceLength} bp</div>
        <div><strong>Sites Found:</strong> {results.sites.length}</div>
        <div><strong>High Quality Sites:</strong> {results.sites.filter(s => s.score >= 80).length}</div>
      </SummaryCard>

      <div style={{ marginBottom: '1rem' }}>
        <Button onClick={downloadCSV}>Download CSV</Button>
        <Button onClick={downloadLWGV}>Download LWGV Annotation</Button>
      </div>

      {results.sites.length > 0 ? (
        <ResultsTable>
          <thead>
            <tr>
              <Th>Position</Th>
              <Th>Strand</Th>
              <Th>PAM Site</Th>
              <Th>gRNA Sequence</Th>
              <Th>Score</Th>
              <Th>gRNA Range</Th>
            </tr>
          </thead>
          <tbody>
            {results.sites.map((site, index) => (
              <tr key={index}>
                <Td>{site.position}</Td>
                <Td>{site.strand}</Td>
                <Td><SequenceSpan>{site.pamSite}</SequenceSpan></Td>
                <Td><SequenceSpan>{site.grnaSequence}</SequenceSpan></Td>
                <Td><ScoreSpan score={site.score}>{site.score}</ScoreSpan></Td>
                <Td>{site.grnaStart}-{site.grnaEnd}</Td>
              </tr>
            ))}
          </tbody>
        </ResultsTable>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div>❌ No CRISPR sites found</div>
          <div>Try a different PAM type or check your sequence</div>
        </div>
      )}
    </PaneWrapper>
  );
};

export default ResultsPane;
