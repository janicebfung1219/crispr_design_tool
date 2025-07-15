// client/src/components/InputPane.js
import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

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

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
  }
`;

const Button = styled.button`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  &:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const FileInput = styled.input`
  margin-bottom: 1rem;
`;

const TabContainer = styled.div`
  margin-bottom: 1rem;
`;

const Tab = styled.button`
  background: ${props => props.active ? '#667eea' : '#f5f5f5'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  cursor: pointer;
  
  &:first-child {
    border-radius: 4px 0 0 4px;
  }
  
  &:last-child {
    border-radius: 0 4px 4px 0;
  }
`;

const InputPane = ({ onResults, onLoading }) => {
  const [pamType, setPamType] = useState('SpCas9');
  const [sequence, setSequence] = useState('');
  const [sequenceName, setSequenceName] = useState('Target_Sequence');
  const [inputMethod, setInputMethod] = useState('manual');
  const [accession, setAccession] = useState('');

  const handleSubmit = async () => {
    if (!sequence.trim()) {
      alert('Please enter a sequence');
      return;
    }

    onLoading(true);
    try {
      const response = await axios.post('/api/design', {
        sequence: sequence.trim(),
        pamType,
        sequenceName
      });
      
      onResults(response.data);
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      onLoading(false);
    }
  };

  const handleNCBIFetch = async () => {
    if (!accession.trim()) {
      alert('Please enter an accession number');
      return;
    }

    onLoading(true);
    try {
      const response = await axios.get(`/api/ncbi/${accession}`);
      setSequence(response.data.sequence);
      setSequenceName(response.data.accession);
    } catch (error) {
      alert('Error fetching from NCBI: ' + error.message);
    } finally {
      onLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('fasta', file);

    onLoading(true);
    try {
      const response = await axios.post('/api/upload-fasta', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSequence(response.data.sequence);
      setSequenceName(response.data.header.replace('>', '').split(' ')[0]);
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      onLoading(false);
    }
  };

  return (
    <PaneWrapper>
      <Title>Input Parameters</Title>
      
      <FormGroup>
        <Label>PAM Site Type</Label>
        <Select value={pamType} onChange={(e) => setPamType(e.target.value)}>
          <option value="SpCas9">SpCas9 (NGG)</option>
          <option value="SpCas9-VRQR">SpCas9-VRQR (NGA)</option>
          <option value="xCas9">xCas9 (NG)</option>
          <option value="Cas12a">Cas12a (TTTV)</option>
          <option value="Cas12f">Cas12f (TTTN)</option>
        </Select>
      </FormGroup>

      <FormGroup>
        <Label>Sequence Name</Label>
        <Input
          type="text"
          value={sequenceName}
          onChange={(e) => setSequenceName(e.target.value)}
          placeholder="Enter sequence name"
        />
      </FormGroup>

      <FormGroup>
        <Label>Input Method</Label>
        <TabContainer>
          <Tab 
            active={inputMethod === 'manual'} 
            onClick={() => setInputMethod('manual')}
          >
            Manual Entry
          </Tab>
          <Tab 
            active={inputMethod === 'ncbi'} 
            onClick={() => setInputMethod('ncbi')}
          >
            NCBI Fetch
          </Tab>
          <Tab 
            active={inputMethod === 'file'} 
            onClick={() => setInputMethod('file')}
          >
            File Upload
          </Tab>
        </TabContainer>
      </FormGroup>

      {inputMethod === 'manual' && (
        <FormGroup>
          <Label>DNA Sequence</Label>
          <TextArea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="Enter DNA sequence (FASTA format or raw sequence)"
          />
        </FormGroup>
      )}

      {inputMethod === 'ncbi' && (
        <FormGroup>
          <Label>NCBI Accession</Label>
          <Input
            type="text"
            value={accession}
            onChange={(e) => setAccession(e.target.value)}
            placeholder="Enter accession number (e.g., NM_001301717.2)"
          />
          <Button onClick={handleNCBIFetch} style={{ marginTop: '1rem' }}>
            Fetch from NCBI
          </Button>
        </FormGroup>
      )}

      {inputMethod === 'file' && (
        <FormGroup>
          <Label>Upload FASTA File</Label>
          <FileInput
            type="file"
            accept=".fasta,.fa,.fas,.txt"
            onChange={handleFileUpload}
          />
        </FormGroup>
      )}

      {sequence && (
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          Sequence length: {sequence.length} bp
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!sequence.trim()}>
        Design gRNAs
      </Button>
    </PaneWrapper>
  );
};

export default InputPane;


 
