const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const ini = require('ini');

const app = express();

// Load configuration
let config = {
  debug: { enabled: true, level: 2, sections: 'entrez,crispr,file,lwgv' },
  server: { port: 5000, ncbi_timeout: 30000, cleanup_interval: 24 },
  ui: { layout: 'vertical', show_debug_panel: true }
};

try {
  const configFile = fs.readFileSync('config.ini', 'utf-8');
  config = { ...config, ...ini.parse(configFile) };
} catch (error) {
  console.log('No config.ini found, using defaults');
}

const PORT = process.env.PORT || config.server.port;
const DEBUG_MODE = config.debug.enabled;
const DEBUG_LEVEL = parseInt(config.debug.level);
const DEBUG_SECTIONS = config.debug.sections.split(',').map(s => s.trim());

console.log('=== CONFIG DEBUG ===');
console.log('Config loaded:', JSON.stringify(config, null, 2));
console.log('DEBUG_MODE:', DEBUG_MODE);
console.log('DEBUG_LEVEL:', DEBUG_LEVEL);
console.log('DEBUG_SECTIONS:', DEBUG_SECTIONS);
console.log('==================');

// Debug logging function with sections and levels
const debugLog = (section, level, message, data = null) => {
  if (!DEBUG_MODE || level > DEBUG_LEVEL) return;
  if (!DEBUG_SECTIONS.includes('all') && !DEBUG_SECTIONS.includes(section)) return;
  
  const timestamp = new Date().toISOString();
  const levelNames = ['', 'ERROR', 'INFO', 'VERBOSE'];
  const levelName = levelNames[level] || 'DEBUG';
  
  console.log(`[${levelName}] ${timestamp} [${section.toUpperCase()}] - ${message}`);
  if (data && level >= 3) {
    console.log(`[${levelName}] Data:`, JSON.stringify(data, null, 2));
  }
};

// Store debug messages for UI
let debugMessages = [];
const addDebugMessage = (section, level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const levelNames = ['', 'error', 'info', 'verbose'];
  const levelName = levelNames[level] || 'debug';
  
  const debugMsg = {
    id: Date.now() + Math.random(),
    timestamp,
    section,
    level: levelName,
    message,
    data: data ? JSON.stringify(data, null, 2) : null
  };
  
  debugMessages.unshift(debugMsg);
  if (debugMessages.length > 100) debugMessages.pop(); // Keep last 100 messages
  
  debugLog(section, level, message, data);
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Debug middleware
if (DEBUG_MODE) {
  app.use((req, res, next) => {
    addDebugMessage('server', 2, `${req.method} ${req.url}`, { 
      body: req.body, 
      query: req.query 
    });
    next();
  });
}

// API endpoint to get debug messages
app.get('/api/debug/messages', (req, res) => {
  if (!DEBUG_MODE) {
    return res.status(404).json({ error: 'Debug mode disabled' });
  }
  res.json({
    messages: debugMessages,
    config: {
      enabled: DEBUG_MODE,
      level: DEBUG_LEVEL,
      sections: DEBUG_SECTIONS
    }
  });
});

// API endpoint to clear debug messages
app.post('/api/debug/clear', (req, res) => {
  if (!DEBUG_MODE) {
    return res.status(404).json({ error: 'Debug mode disabled' });
  }
  debugMessages = [];
  addDebugMessage('server', 2, 'Debug messages cleared');
  res.json({ message: 'Debug messages cleared' });
});

// API endpoint to get config
app.get('/api/config', (req, res) => {
  res.json({
    ui: config.ui,
    debug: DEBUG_MODE ? {
      enabled: DEBUG_MODE,
      level: DEBUG_LEVEL,
      sections: DEBUG_SECTIONS
    } : { enabled: false }
  });
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Create directories for LWGV files
const lwgvDir = path.join(__dirname, 'public', 'lwgv');
const lwgvDataDir = path.join(lwgvDir, 'data');
const lwgvOutputDir = path.join(lwgvDir, 'output');

// Ensure directories exist
[lwgvDir, lwgvDataDir, lwgvOutputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    addDebugMessage('server', 2, `Created directory: ${dir}`);
  }
});

// Serve LWGV files statically
app.use('/lwgv', express.static(lwgvDir));

// Test endpoints for debugging
if (DEBUG_MODE) {
  app.get('/api/test/health', (req, res) => {
    addDebugMessage('server', 2, 'Health check requested');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      config: config,
      directories: {
        lwgvDir: fs.existsSync(lwgvDir),
        lwgvDataDir: fs.existsSync(lwgvDataDir),
        lwgvOutputDir: fs.existsSync(lwgvOutputDir)
      }
    });
  });

  app.get('/api/test/ncbi-raw/:accession', async (req, res) => {
    try {
      const { accession } = req.params;
      addDebugMessage('entrez', 2, `Testing NCBI fetch for: ${accession}`);
      
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`;
      const params = {
        db: 'nucleotide',
        id: accession,
        rettype: 'fasta',
        retmode: 'text'
      };
      
      addDebugMessage('entrez', 3, `NCBI URL: ${url}`, params);
      
      const response = await axios.get(url, { params, timeout: config.server.ncbi_timeout });
      
      addDebugMessage('entrez', 2, `NCBI Response Status: ${response.status}`);
      addDebugMessage('entrez', 3, `NCBI Response Data (first 500 chars)`, response.data.substring(0, 500));
      
      res.json({
        status: 'success',
        url: `${url}?${new URLSearchParams(params)}`,
        statusCode: response.status,
        headers: response.headers,
        dataLength: response.data.length,
        dataPreview: response.data.substring(0, 500),
        fullData: response.data
      });
    } catch (error) {
      addDebugMessage('entrez', 1, `NCBI Test Error: ${error.message}`, {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
      res.status(500).json({ 
        error: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  });

  app.post('/api/test/crispr-design', (req, res) => {
    try {
      const { sequence, pamType } = req.body;
      addDebugMessage('crispr', 2, `Testing CRISPR design`, { sequenceLength: sequence?.length, pamType });
      
      if (!sequence || !pamType) {
        return res.status(400).json({ error: 'Missing sequence or pamType' });
      }
      
      const sites = crisprDesigner.findPAMSites(sequence.toUpperCase(), pamType);
      addDebugMessage('crispr', 2, `Found ${sites.length} sites`);
      
      res.json({
        status: 'success',
        sitesFound: sites.length,
        sites: sites.slice(0, 5), // First 5 sites only
        sequenceLength: sequence.length,
        pamType
      });
    } catch (error) {
      addDebugMessage('crispr', 1, `CRISPR Design Test Error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
}

// CRISPR Design Logic
class CRISPRDesigner {
  constructor() {
    this.pamSites = {
      'SpCas9': 'NGG',
      'SpCas9-VRQR': 'NGA',
      'xCas9': 'NG',
      'Cas12a': 'TTTV',
      'Cas12f': 'TTTN'
    };
  }

  findPAMSites(sequence, pamType) {
    const pamPattern = this.pamSites[pamType];
    const sites = [];
    
    // Convert PAM pattern to regex
    let regexPattern = pamPattern
      .replace(/N/g, '[ATCG]')
      .replace(/V/g, '[ACG]')
      .replace(/H/g, '[ACT]')
      .replace(/D/g, '[AGT]')
      .replace(/B/g, '[CGT]')
      .replace(/K/g, '[GT]')
      .replace(/M/g, '[AC]')
      .replace(/R/g, '[AG]')
      .replace(/S/g, '[CG]')
      .replace(/W/g, '[AT]')
      .replace(/Y/g, '[CT]');

    const regex = new RegExp(regexPattern, 'gi');
    let match;
    
    while ((match = regex.exec(sequence)) !== null) {
      const position = match.index;
      const pamSite = match[0];
      
      // Calculate gRNA position (typically 20bp upstream of PAM for SpCas9)
      const grnaLength = pamType === 'Cas12a' || pamType === 'Cas12f' ? 23 : 20;
      const grnaStart = pamType.includes('Cas12') ? position + pamPattern.length : position - grnaLength;
      
      if (grnaStart >= 0 && grnaStart + grnaLength <= sequence.length) {
        const grnaSequence = sequence.substring(grnaStart, grnaStart + grnaLength);
        
        sites.push({
          position: position + 1, // 1-based indexing
          pamSite: pamSite,
          grnaSequence: grnaSequence,
          grnaStart: grnaStart + 1,
          grnaEnd: grnaStart + grnaLength,
          strand: '+',
          score: this.calculateScore(grnaSequence)
        });
      }
    }
    
    // Also search reverse complement
    const reverseComplement = this.reverseComplement(sequence);
    const reverseRegex = new RegExp(regexPattern, 'gi');
    
    while ((match = reverseRegex.exec(reverseComplement)) !== null) {
      const position = sequence.length - match.index - pamPattern.length;
      const pamSite = this.reverseComplement(match[0]);
      
      const grnaLength = pamType === 'Cas12a' || pamType === 'Cas12f' ? 23 : 20;
      const grnaStart = pamType.includes('Cas12') ? position - grnaLength : position + pamPattern.length;
      
      if (grnaStart >= 0 && grnaStart + grnaLength <= sequence.length) {
        const grnaSequence = this.reverseComplement(
          reverseComplement.substring(match.index - grnaLength, match.index)
        );
        
        sites.push({
          position: position + 1,
          pamSite: pamSite,
          grnaSequence: grnaSequence,
          grnaStart: grnaStart + 1,
          grnaEnd: grnaStart + grnaLength,
          strand: '-',
          score: this.calculateScore(grnaSequence)
        });
      }
    }
    
    return sites.sort((a, b) => b.score - a.score);
  }

  reverseComplement(sequence) {
    const complement = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
    return sequence.split('').reverse().map(base => complement[base] || base).join('');
  }

  calculateScore(grnaSequence) {
    // Simple scoring algorithm (can be enhanced)
    let score = 100;
    
    // Penalize for GC content outside 40-60%
    const gcContent = (grnaSequence.match(/[GC]/g) || []).length / grnaSequence.length;
    if (gcContent < 0.4 || gcContent > 0.6) {
      score -= 20;
    }
    
    // Penalize for poly-T sequences (transcription termination)
    if (grnaSequence.includes('TTTT')) {
      score -= 30;
    }
    
    // Penalize for repetitive sequences
    for (let i = 0; i < grnaSequence.length - 2; i++) {
      if (grnaSequence[i] === grnaSequence[i + 1] && grnaSequence[i] === grnaSequence[i + 2]) {
        score -= 10;
      }
    }
    
    return Math.max(0, score);
  }

  generateLWGVAnnotation(sequence, sites, sequenceName = 'CRISPR_Target') {
    let annotation = `%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%                                                                      %
% CRISPR Design Tool - LWGV Annotation File                           %
%                                                                      %
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

begin genome ${sequenceName}
`;

    // Add PAM sites as tracks
    sites.forEach((site, index) => {
      annotation += `        track PAM_${index + 1}_${site.strand} addPairs(${site.position}:${site.position + site.pamSite.length - 1})\n`;
      annotation += `        track gRNA_${index + 1}_${site.strand} addPairs(${site.grnaStart}:${site.grnaEnd})\n`;
    });

    // Add score graph
    if (sites.length > 0) {
      annotation += `        graph CRISPR_Scores addPoints(`;
      const scorePoints = sites.map(site => `${site.position}:${site.score}`).join(', ');
      annotation += scorePoints + ')\n';
    }

    annotation += `end genome

% create the webpage and image for the genome
showGenome(${sequenceName})
`;

    return annotation;
  }
}

const crisprDesigner = new CRISPRDesigner();

app.post('/api/design', (req, res) => {
  try {
    const { sequence, pamType, sequenceName } = req.body;
    debugLog(`Design request received`, { sequenceLength: sequence?.length, pamType, sequenceName });
    
    if (!sequence || !pamType) {
      return res.status(400).json({ error: 'Sequence and PAM type are required' });
    }

    // Validate sequence
    const cleanSequence = sequence.toUpperCase().replace(/[^ATCGN]/g, '');
    if (cleanSequence.length === 0) {
      return res.status(400).json({ error: 'No valid DNA sequence found' });
    }
    
    if (cleanSequence.length !== sequence.length) {
      debugLog(`Sequence cleaned: ${sequence.length} -> ${cleanSequence.length} characters`);
    }

    const sites = crisprDesigner.findPAMSites(cleanSequence, pamType);
    debugLog(`Found ${sites.length} CRISPR sites`);
    
    const lwgvAnnotation = crisprDesigner.generateLWGVAnnotation(cleanSequence, sites, sequenceName);
    debugLog(`Generated LWGV annotation (${lwgvAnnotation.length} characters)`);

    // Generate unique filename based on timestamp and sequence hash
    const timestamp = Date.now();
    const sequenceHash = require('crypto').createHash('md5').update(cleanSequence).digest('hex').substring(0, 8);
    const filename = `crispr_${timestamp}_${sequenceHash}`;
    
    debugLog(`Generated filename: ${filename}`);
    
    // Write annotation file to LWGV data directory
    const annotationPath = path.join(lwgvDataDir, `${filename}.ann`);
    fs.writeFileSync(annotationPath, lwgvAnnotation);
    debugLog(`Wrote annotation file: ${annotationPath}`);
    
    // Also write sequence file for LWGV
    const sequenceData = `>${sequenceName}\n${cleanSequence}`;
    const sequencePath = path.join(lwgvDataDir, `${filename}.fasta`);
    fs.writeFileSync(sequencePath, sequenceData);
    debugLog(`Wrote sequence file: ${sequencePath}`);

    res.json({
      sites,
      lwgvAnnotation,
      sequenceLength: cleanSequence.length,
      pamType,
      lwgvFilename: filename,
      lwgvUrl: `/lwgv-viewer?file=${filename}`,
      debug: DEBUG_MODE ? {
        originalSequenceLength: sequence.length,
        cleanSequenceLength: cleanSequence.length,
        sitesFound: sites.length,
        annotationLength: lwgvAnnotation.length,
        filesCreated: [annotationPath, sequencePath]
      } : undefined
    });
  } catch (error) {
    debugLog(`Design error:`, error.message);
    res.status(500).json({ 
      error: error.message,
      stack: DEBUG_MODE ? error.stack : undefined
    });
  }
});

app.get('/api/ncbi/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    addDebugMessage('entrez', 2, `NCBI fetch requested for: ${accession}`);
    
    // Validate accession format
    if (!accession || accession.length < 3) {
      throw new Error('Invalid accession format');
    }
    
    // Try multiple NCBI endpoints and strategies
    const strategies = [
      {
        name: 'nucleotide_fasta',
        url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
        params: {
          db: 'nucleotide',
          id: accession,
          rettype: 'fasta',
          retmode: 'text'
        }
      },
      {
        name: 'nucleotide_xml',
        url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
        params: {
          db: 'nucleotide',
          id: accession,
          rettype: 'gb',
          retmode: 'xml'
        }
      },
      {
        name: 'esearch_first',
        url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
        params: {
          db: 'nucleotide',
          term: accession,
          retmode: 'json'
        }
      }
    ];

    let lastError = null;
    
    for (const strategy of strategies) {
      try {
        addDebugMessage('entrez', 3, `Trying strategy: ${strategy.name}`);
        
        const response = await axios.get(strategy.url, { 
          params: strategy.params,
          timeout: config.server.ncbi_timeout,
          headers: {
            'User-Agent': 'CRISPR-Design-Tool/1.0 (your-email@domain.com)'
          }
        });
        
        addDebugMessage('entrez', 3, `Strategy ${strategy.name} - Status: ${response.status}, Data length: ${response.data.length}`);
        
        if (strategy.name === 'nucleotide_fasta') {
          const fastaData = response.data;
          
          // Check if we got valid FASTA
          if (fastaData.includes('>') && fastaData.length > 50) {
            const lines = fastaData.split('\n');
            const header = lines[0];
            const sequence = lines.slice(1).join('').replace(/\s/g, '').replace(/[^ATCGN]/gi, '');
            
            if (sequence.length > 0) {
              addDebugMessage('entrez', 2, `Successfully parsed FASTA - sequence length: ${sequence.length}`);
              return res.json({
                accession,
                header,
                sequence,
                length: sequence.length,
                source: 'ncbi_fasta'
              });
            }
          }
        } else if (strategy.name === 'esearch_first') {
          // Use esearch to find the correct ID, then fetch
          const searchData = response.data;
          if (searchData.esearchresult && searchData.esearchresult.idlist && searchData.esearchresult.idlist.length > 0) {
            const id = searchData.esearchresult.idlist[0];
            addDebugMessage('entrez', 3, `Found ID from esearch: ${id}`);
            
            // Now fetch with the found ID
            const fetchResponse = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi', {
              params: {
                db: 'nucleotide',
                id: id,
                rettype: 'fasta',
                retmode: 'text'
              },
              timeout: config.server.ncbi_timeout
            });
            
            const fastaData = fetchResponse.data;
            if (fastaData.includes('>')) {
              const lines = fastaData.split('\n');
              const header = lines[0];
              const sequence = lines.slice(1).join('').replace(/\s/g, '').replace(/[^ATCGN]/gi, '');
              
              if (sequence.length > 0) {
                addDebugMessage('entrez', 2, `Successfully parsed FASTA via esearch - sequence length: ${sequence.length}`);
                return res.json({
                  accession,
                  header,
                  sequence,
                  length: sequence.length,
                  source: 'ncbi_esearch'
                });
              }
            }
          }
        }
        
      } catch (error) {
        addDebugMessage('entrez', 3, `Strategy ${strategy.name} failed: ${error.message}`);
        lastError = error;
        continue;
      }
    }
    
    // If all strategies failed
    throw new Error(`All NCBI fetch strategies failed. Last error: ${lastError?.message || 'Unknown error'}`);
    
  } catch (error) {
    addDebugMessage('entrez', 1, `NCBI fetch error for ${req.params.accession}: ${error.message}`, {
      accession: req.params.accession,
      error: error.message
    });
    res.status(500).json({ 
      error: 'Failed to fetch sequence from NCBI',
      details: error.message,
      accession: req.params.accession,
      suggestions: [
        'Check if the accession number is correct',
        'Try a different accession format (e.g., with or without version number)',
        'Check if NCBI servers are accessible',
        'Try again in a few minutes'
      ]
    });
  }
});

app.post('/api/upload-fasta', upload.single('fasta'), (req, res) => {
  try {
    debugLog(`File upload attempt`);
    
    if (!req.file) {
      debugLog(`No file uploaded`);
      return res.status(400).json({ error: 'No file uploaded' });
    }

    debugLog(`File uploaded:`, {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    debugLog(`File content length: ${fileContent.length}`);
    debugLog(`File content preview:`, fileContent.substring(0, 200));
    
    // Parse FASTA more robustly
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      throw new Error('Empty file');
    }
    
    let header = '';
    let sequence = '';
    
    // Find header line
    const headerIndex = lines.findIndex(line => line.startsWith('>'));
    if (headerIndex !== -1) {
      header = lines[headerIndex];
      sequence = lines.slice(headerIndex + 1).join('').replace(/\s/g, '').replace(/[^ATCGN]/gi, '');
    } else {
      // No header found, treat as raw sequence
      header = `>Uploaded_Sequence`;
      sequence = lines.join('').replace(/\s/g, '').replace(/[^ATCGN]/gi, '');
    }
    
    debugLog(`Parsed sequence length: ${sequence.length}`);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    if (sequence.length === 0) {
      throw new Error('No valid DNA sequence found in file');
    }

    res.json({
      header,
      sequence,
      length: sequence.length,
      originalFilename: req.file.originalname
    });
  } catch (error) {
    debugLog(`File upload error:`, error.message);
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process FASTA file',
      details: error.message
    });
  }
});

// Add LWGV viewer route
app.get('/lwgv-viewer', (req, res) => {
  const filename = req.query.file;
  if (!filename) {
    return res.status(400).send('Missing file parameter');
  }
  
  // Serve a simple HTML page that calls your LWGV CGI script
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>LWGV Viewer - ${filename}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .header { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .viewer-container { width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
        .controls { margin-bottom: 15px; }
        .btn { background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #764ba2; }
    </style>
</head>
<body>
    <div class="header">
        <h2>CRISPR Design Visualization</h2>
        <p>File: ${filename}.ann | Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="controls">
        <a href="/lwgv/data/${filename}.ann" class="btn" download>Download Annotation</a>
        <a href="/lwgv/data/${filename}.fasta" class="btn" download>Download Sequence</a>
        <button class="btn" onclick="window.parent.postMessage('refresh', '*')">Refresh</button>
    </div>
    
    <div class="viewer-container">
        <iframe src="/cgi-bin/lwgv.cgi?file=${filename}.ann" 
                title="LWGV Genome Viewer"
                allowfullscreen>
            <p>Your browser does not support iframes. Please <a href="/cgi-bin/lwgv.cgi?file=${filename}.ann">click here</a> to view the visualization.</p>
        </iframe>
    </div>
    
    <script>
        // Handle any messages from parent window
        window.addEventListener('message', function(event) {
            if (event.data === 'refresh') {
                document.querySelector('iframe').src = document.querySelector('iframe').src;
            }
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

// Add cleanup route to remove old files (optional)
app.post('/api/cleanup', (req, res) => {
  try {
    const files = fs.readdirSync(lwgvDataDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleaned = 0;
    files.forEach(file => {
      const filePath = path.join(lwgvDataDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
    
    res.json({ message: `Cleaned up ${cleaned} old files` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LWGV data directory: ${lwgvDataDir}`);
  console.log(`Debug mode: ${DEBUG_MODE ? 'ENABLED' : 'DISABLED'}`);
  
  if (DEBUG_MODE) {
    console.log('\n=== DEBUG MODE ENABLED ===');
    console.log('Available test endpoints:');
    console.log(`  GET  /api/test/health`);
    console.log(`  GET  /api/test/ncbi-raw/:accession`);
    console.log(`  POST /api/test/crispr-design`);
    console.log('\nTo disable debug mode, set DEBUG_MODE=false or remove it from environment');
    console.log('===========================\n');
  }
});

