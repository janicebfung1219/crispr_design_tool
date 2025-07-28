// Installation and Setup Instructions (README.md)
# CRISPR Design Tool

A comprehensive web-based CRISPR design tool built with React and Node.js.

## Features


npm install
cd client && npm install

npm run dev 


- **Multiple PAM Types**: Support for SpCas9, SpCas9-VRQR, xCas9, Cas12a, and Cas12f
- **Flexible Input**: Manual entry, NCBI sequence fetch, or FASTA file upload
- **Intelligent Scoring**: Built-in algorithm for gRNA quality assessment
- **LWGV Integration**: Generates annotation files for Lightweight Genome Viewer
- **Export Options**: CSV and LWGV annotation file downloads
- **Three-Pane Interface**: Input, Results, and Resources sections

## Installation

1. **Clone or download** this code to your server
2. **Install dependencies**:
   ```bash
   npm install
   cd client && npm install
   ```

3. **Build the React app**:
   ```bash
   npm run build
   ```

4. **For Apache deployment**:
   - Copy the `.htaccess` file to your web directory
   - Ensure mod_rewrite is enabled
   - Set up a reverse proxy to your Node.js server on port 5000

## Configuration

### Apache Virtual Host Example:
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/your/app/client/build
    
    # Proxy API requests to Node.js server
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
    
    # Serve static files
    <Directory "/path/to/your/app/client/build">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### Process Manager (PM2) Setup:
```bash
npm install -g pm2
pm2 start server.js --name crispr-tool
pm2 startup
pm2 save
```

## Usage

1. **Select PAM Type**: Choose from available CRISPR systems
2. **Input Sequence**: 
   - Manual entry: Paste DNA sequence directly
   - NCBI Fetch: Enter accession number (e.g., NM_001301717.2)
   - File Upload: Upload FASTA file
3. **Design gRNAs**: Click to analyze and find CRISPR sites
4. **View Results**: Browse scored gRNA candidates
5. **Export Data**: Download CSV or LWGV annotation files

## API Endpoints

- `POST /api/design` - Design gRNAs for a sequence
- `GET /api/ncbi/:accession` - Fetch sequence from NCBI
- `POST /api/upload-fasta` - Upload and parse FASTA file

## LWGV Integration

The tool generates annotation files compatible with your existing Lightweight Genome Viewer (LWGV). The output includes:

- PAM site positions as tracks
- gRNA locations as tracks  
- Scoring information as graphs
- Proper genome annotation format

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Security Notes

- File uploads are temporarily stored and cleaned up
- NCBI API calls are server-side only
- No persistent data storage (stateless design)

## Troubleshooting

1. **NCBI fetch fails**: Check accession format and network connectivity
2. **File upload issues**: Ensure FASTA format and file size limits
3. **Apache proxy errors**: Verify mod_proxy and mod_proxy_http are enabled
4. **Node.js crashes**: Check PM2 logs with `pm2 logs crispr-tool`

## Customization

- Modify PAM patterns in `CRISPRDesigner` class
- Adjust scoring algorithm in `calculateScore` method
- Update LWGV output format in `generateLWGVAnnotation` method
- Customize UI styling in styled-components
