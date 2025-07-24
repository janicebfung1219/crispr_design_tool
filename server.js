const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

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
  }
});

// Serve LWGV files statically
app.use('/lwgv', express.static(lwgvDir));

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

// Basic API Routes
app.post('/api/design', (req, res) => {
  try {
    const { sequence, pamType, sequenceName } = req.body;
    
    if (!sequence || !pamType) {
      return res.status(400).json({ error: 'Sequence and PAM type are required' });
    }

    // Validate sequence
    const cleanSequence = sequence.toUpperCase().replace(/[^ATCGN]/g, '');
    if (cleanSequence.length === 0) {
      return res.status(400).json({ error: 'No valid DNA sequence found' });
    }

    const sites = crisprDesigner.findPAMSites(cleanSequence, pamType);
    const lwgvAnnotation = crisprDesigner.generateLWGVAnnotation(cleanSequence, sites, sequenceName);

    // Generate unique filename based on timestamp and sequence hash
    const timestamp = Date.now();
    const sequenceHash = require('crypto').createHash('md5').update(cleanSequence).digest('hex').substring(0, 8);
    const filename = `crispr_${timestamp}_${sequenceHash}`;
    
    // Write annotation file to LWGV data directory
    const annotationPath = path.join(lwgvDataDir, `${filename}.ann`);
    fs.writeFileSync(annotationPath, lwgvAnnotation);
    
    // Also write sequence file for LWGV
    const sequenceData = `>${sequenceName}\n${cleanSequence}`;
    const sequencePath = path.join(lwgvDataDir, `${filename}.fasta`);
    fs.writeFileSync(sequencePath, sequenceData);

    res.json({
      sites,
      lwgvAnnotation,
      sequenceLength: cleanSequence.length,
      pamType,
      lwgvFilename: filename,
      lwgvUrl: `/lwgv-viewer?file=${filename}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncbi/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    
    // Validate accession format
    if (!accession || accession.length < 3) {
      throw new Error('Invalid accession format');
    }
    
    // Try NCBI fetch
    const response = await axios.get('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi', {
      params: {
        db: 'nucleotide',
        id: accession,
        rettype: 'fasta',
        retmode: 'text'
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'CRISPR-Design-Tool/1.0'
      }
    });
    
    const fastaData = response.data;
    
    // Check if we got valid FASTA
    if (fastaData.includes('>') && fastaData.length > 50) {
      const lines = fastaData.split('\n');
      const header = lines[0];
      const sequence = lines.slice(1).join('').replace(/\s/g, '').replace(/[^ATCGN]/gi, '');
      
      if (sequence.length > 0) {
        return res.json({
          accession,
          header,
          sequence,
          length: sequence.length,
          source: 'ncbi_fasta'
        });
      }
    }
    
    throw new Error('Invalid FASTA data received from NCBI');
    
  } catch (error) {
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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
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

// LWGV viewer route
app.get('/lwgv-viewer', (req, res) => {
  const filename = req.query.file;
  if (!filename) {
    return res.status(400).send('Missing file parameter');
  }
  
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
    </div>
    
    <div class="viewer-container">
        <iframe src="/cgi-bin/lwgv.cgi?file=${filename}.ann" 
                title="LWGV Genome Viewer"
                allowfullscreen>
            <p>Your browser does not support iframes. Please <a href="/cgi-bin/lwgv.cgi?file=${filename}.ann">click here</a> to view the visualization.</p>
        </iframe>
    </div>
</body>
</html>`;
  
  res.send(html);
});

// Simple config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    ui: {
      layout: 'vertical',
      show_debug_panel: false
    },
    debug: {
      enabled: false
    }
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`LWGV data directory: ${lwgvDataDir}`);
});
