// server.js - Node.js Backend
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const xml2js = require('xml2js');
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

// API Routes
app.post('/api/design', (req, res) => {
  try {
    const { sequence, pamType, sequenceName } = req.body;
    
    if (!sequence || !pamType) {
      return res.status(400).json({ error: 'Sequence and PAM type are required' });
    }

    const sites = crisprDesigner.findPAMSites(sequence.toUpperCase(), pamType);
    const lwgvAnnotation = crisprDesigner.generateLWGVAnnotation(sequence, sites, sequenceName);

    res.json({
      sites,
      lwgvAnnotation,
      sequenceLength: sequence.length,
      pamType
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ncbi/:accession', async (req, res) => {
  try {
    const { accession } = req.params;
    
    // Fetch sequence from NCBI
    const response = await axios.get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`, {
      params: {
        db: 'nucleotide',
        id: accession,
        rettype: 'fasta',
        retmode: 'text'
      }
    });

    const fastaData = response.data;
    const lines = fastaData.split('\n');
    const header = lines[0];
    const sequence = lines.slice(1).join('').replace(/\s/g, '');

    res.json({
      accession,
      header,
      sequence,
      length: sequence.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sequence from NCBI' });
  }
});

app.post('/api/upload-fasta', upload.single('fasta'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const lines = fileContent.split('\n');
    const header = lines[0];
    const sequence = lines.slice(1).join('').replace(/\s/g, '');

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      header,
      sequence,
      length: sequence.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process FASTA file' });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

