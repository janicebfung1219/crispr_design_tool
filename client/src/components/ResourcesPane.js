// client/src/components/ResourcesPane.js
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

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #555;
  margin-bottom: 1rem;
  font-size: 1.1rem;
`;

const ResourceLink = styled.a`
  display: block;
  color: #667eea;
  text-decoration: none;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    color: #764ba2;
    text-decoration: underline;
  }
`;

const Description = styled.p`
  color: #666;
  font-size: 0.9rem;
  margin: 0.25rem 0 1rem 0;
  line-height: 1.4;
`;

const InfoCard = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border-left: 4px solid #667eea;
`;

const ResourcesPane = () => {
  return (
    <PaneWrapper>
      <Title>Resources & Information</Title>
      
      <InfoCard>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>About This Tool</h3>
        <p style={{ color: '#666', margin: 0, lineHeight: 1.4 }}>
          This CRISPR design tool helps you identify potential guide RNA (gRNA) sequences 
          for various CRISPR-Cas systems. It searches for PAM sites and generates scored 
          gRNA candidates based on established design principles.
        </p>
      </InfoCard>

      <Section>
        <SectionTitle>🧬 CRISPR Resources</SectionTitle>
        
        <ResourceLink href="https://crispr.mit.edu/" target="_blank" rel="noopener">
          CRISPR Design Tool (MIT)
        </ResourceLink>
        <Description>
          Comprehensive CRISPR design platform with off-target analysis and extensive database support.
        </Description>

        <ResourceLink href="https://chopchop.cbu.uib.no/" target="_blank" rel="noopener">
          CHOPCHOP
        </ResourceLink>
        <Description>
          Web tool for CRISPR/Cas9, CRISPR/Cpf1, and CRISPR/Cas13 target selection with genome-wide off-target analysis.
        </Description>

        <ResourceLink href="https://www.benchling.com/crispr/" target="_blank" rel="noopener">
          Benchling CRISPR
        </ResourceLink>
        <Description>
          Professional-grade CRISPR design platform with collaboration features and experimental tracking.
        </Description>

        <ResourceLink href="https://crisprfinder.org/" target="_blank" rel="noopener">
          CRISPRfinder
        </ResourceLink>
        <Description>
          Tool to find CRISPR arrays in bacterial and archaeal genomes.
        </Description>
      </Section>

      <Section>
        <SectionTitle>📚 Educational Resources</SectionTitle>
        
        <ResourceLink href="https://www.addgene.org/crispr/guide/" target="_blank" rel="noopener">
          Addgene CRISPR Guide
        </ResourceLink>
        <Description>
          Comprehensive guide to CRISPR technology, protocols, and best practices.
        </Description>

        <ResourceLink href="https://www.nature.com/articles/nprot.2013.143" target="_blank" rel="noopener">
          Nature Protocol: CRISPR-Cas9
        </ResourceLink>
        <Description>
          Detailed protocol for using CRISPR-Cas9 for genome editing in mammalian cells.
        </Description>

        <ResourceLink href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4718706/" target="_blank" rel="noopener">
          CRISPR Design Guidelines
        </ResourceLink>
        <Description>
          Scientific review of CRISPR design principles and optimization strategies.
        </Description>
      </Section>

      <Section>
        <SectionTitle>🔬 Databases & References</SectionTitle>
        
        <ResourceLink href="https://www.ncbi.nlm.nih.gov/nucleotide/" target="_blank" rel="noopener">
          NCBI Nucleotide Database
        </ResourceLink>
        <Description>
          Primary database for nucleotide sequences used by this tool's NCBI fetch feature.
        </Description>

        <ResourceLink href="https://www.uniprot.org/" target="_blank" rel="noopener">
          UniProt
        </ResourceLink>
        <Description>
          Comprehensive protein sequence and functional information database.
        </Description>

        <ResourceLink href="https://www.ensembl.org/" target="_blank" rel="noopener">
          Ensembl Genome Browser
        </ResourceLink>
        <Description>
          Genome browser for vertebrate genomes with extensive annotation.
        </Description>
      </Section>

      <Section>
        <SectionTitle>⚙️ Technical Information</SectionTitle>
        
        <InfoCard>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>PAM Site Information</h4>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            <strong>SpCas9:</strong> NGG (most common, high efficiency)<br/>
            <strong>SpCas9-VRQR:</strong> NGA (engineered variant)<br/>
            <strong>xCas9:</strong> NG (expanded PAM recognition)<br/>
            <strong>Cas12a:</strong> TTTV (5' PAM, longer spacer)<br/>
            <strong>Cas12f:</strong> TTTN (miniaturized system)
          </div>
        </InfoCard>

        <InfoCard>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Scoring Algorithm</h4>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            Our scoring system considers:<br/>
            • GC content (optimal: 40-60%)<br/>
            • Poly-T sequences (avoided for transcription)<br/>
            • Repetitive sequences (penalized)<br/>
            • Base composition balance
          </div>
        </InfoCard>

        <InfoCard>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>LWGV Output Format</h4>
          <div style={{ color: '#666', fontSize: '0.9rem' }}>
            The tool generates annotation files compatible with the Lightweight Genome Viewer (LWGV). 
            This format includes PAM site positions, gRNA locations, and scoring information 
            for visualization in your existing genome viewer.
          </div>
        </InfoCard>
      </Section>

      <Section>
        <SectionTitle>🔗 Related Tools</SectionTitle>
        
        <ResourceLink href="https://blast.ncbi.nlm.nih.gov/Blast.cgi" target="_blank" rel="noopener">
          NCBI BLAST
        </ResourceLink>
        <Description>
          Sequence similarity search tool for analyzing your target sequences.
        </Description>

        <ResourceLink href="https://www.snapgene.com/" target="_blank" rel="noopener">
          SnapGene
        </ResourceLink>
        <Description>
          Molecular biology software for sequence analysis and cloning design.
        </Description>

        <ResourceLink href="https://www.geneious.com/" target="_blank" rel="noopener">
          Geneious
        </ResourceLink>
        <Description>
          Comprehensive bioinformatics software suite for sequence analysis.
        </Description>
      </Section>

      <Section>
        <SectionTitle>📖 Citations & References</SectionTitle>
        
        <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.4 }}>
          <p><strong>Key Papers:</strong></p>
          <p>
            • Jinek et al. (2012). A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity. Science.<br/>
            • Cong et al. (2013). Multiplex genome engineering using CRISPR/Cas systems. Science.<br/>
            • Doench et al. (2014). Rational design of highly active sgRNAs for CRISPR-Cas9-mediated gene inactivation. Nature Biotechnology.<br/>
            • Zetsche et al. (2015). Cpf1 is a single RNA-guided endonuclease of a class 2 CRISPR-Cas system. Cell.
          </p>
        </div>
      </Section>
    </PaneWrapper>
  );
};

export default ResourcesPane;
