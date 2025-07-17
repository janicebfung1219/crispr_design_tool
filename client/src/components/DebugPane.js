import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const DebugContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
`;

const DebugHeader = styled.div`
  background: #343a40;
  color: white;
  padding: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DebugControls = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const DebugButton = styled.button`
  background: ${props => props.variant === 'danger' ? '#dc3545' : '#007bff'};
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  cursor: pointer;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DebugMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.3;
`;

const DebugMessage = styled.div`
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  border-left: 3px solid ${props => {
    switch(props.level) {
      case 'error': return '#dc3545';
      case 'info': return '#007bff';
      case 'verbose': return '#28a745';
      default: return '#6c757d';
    }
  }};
  background: ${props => {
    switch(props.level) {
      case 'error': return '#f8d7da';
      case 'info': return '#d1ecf1';
      case 'verbose': return '#d4edda';
      default: return '#e2e3e5';
    }
  }};
`;

const MessageHeader = styled.div`
  font-weight: 600;
  color: ${props => {
    switch(props.level) {
      case 'error': return '#721c24';
      case 'info': return '#0c5460';
      case 'verbose': return '#155724';
      default: return '#383d41';
    }
  }};
`;

const MessageContent = styled.div`
  color: #495057;
  margin-top: 0.25rem;
`;

const MessageData = styled.pre`
  background: #f8f9fa;
  padding: 0.25rem;
  border-radius: 2px;
  font-size: 0.7rem;
  overflow-x: auto;
  margin-top: 0.25rem;
  max-height: 100px;
  overflow-y: auto;
`;

const StatusIndicator = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected ? '#28a745' : '#dc3545'};
  margin-right: 0.5rem;
`;

const DisabledMessage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6c757d;
  text-align: center;
  padding: 2rem;
`;

const DebugPane = ({ enabled }) => {
  const [messages, setMessages] = useState([]);
  const [config, setConfig] = useState({});
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef(null);
  const intervalRef = useRef(null);

  const scrollToBottom = () => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchMessages = async () => {
    if (!enabled) return;
    
    try {
      const response = await axios.get('/api/debug/messages');
      setMessages(response.data.messages || []);
      setConfig(response.data.config || {});
      setConnected(true);
    } catch (error) {
      setConnected(false);
      console.error('Failed to fetch debug messages:', error);
    }
  };

  const clearMessages = async () => {
    if (!enabled) return;
    
    try {
      await axios.post('/api/debug/clear');
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear debug messages:', error);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchMessages();
      intervalRef.current = setInterval(fetchMessages, 2000); // Poll every 2 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!enabled) {
    return (
      <DebugContainer>
        <DebugHeader>
          <span>🐛 Debug Panel</span>
          <StatusIndicator connected={false} />
        </DebugHeader>
        <DisabledMessage>
          <div>
            <div>Debug mode is disabled</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Enable in config.ini to see debug messages
            </div>
          </div>
        </DisabledMessage>
      </DebugContainer>
    );
  }

  return (
    <DebugContainer>
      <DebugHeader>
        <span>
          <StatusIndicator connected={connected} />
          🐛 Debug Panel
        </span>
        <DebugControls>
          <DebugButton 
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
          >
            {autoScroll ? '📜' : '⏸️'}
          </DebugButton>
          <DebugButton onClick={fetchMessages} title="Refresh">
            🔄
          </DebugButton>
          <DebugButton onClick={clearMessages} variant="danger" title="Clear messages">
            🗑️
          </DebugButton>
        </DebugControls>
      </DebugHeader>
      
      <DebugMessages>
        {messages.length === 0 ? (
          <div style={{ color: '#6c757d', textAlign: 'center', marginTop: '2rem' }}>
            No debug messages yet...
          </div>
        ) : (
          messages.map((msg) => (
            <DebugMessage key={msg.id} level={msg.level}>
              <MessageHeader level={msg.level}>
                [{new Date(msg.timestamp).toLocaleTimeString()}] 
                [{msg.section.toUpperCase()}] 
                [{msg.level.toUpperCase()}]
              </MessageHeader>
              <MessageContent>{msg.message}</MessageContent>
              {msg.data && (
                <MessageData>{msg.data}</MessageData>
              )}
            </DebugMessage>
          ))
        )}
        <div ref={messagesEndRef} />
      </DebugMessages>
    </DebugContainer>
  );
};

export default DebugPane;

