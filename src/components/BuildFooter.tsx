import { useState } from 'react';
import buildInfoData from '../build-info.json';
import './BuildFooter.css';

interface BuildInfo { version: string; commit?: string; branch?: string; timestamp?: string; }

export const BuildFooter = () => {
  const [info] = useState<BuildInfo>(buildInfoData as BuildInfo);
  const year = new Date().getFullYear();
  // Time display removed per request.
  return (
    <div className="build-footer" aria-label="Build information">
      <span className="build-footer-version">v{info.version}</span>
      {info.commit && <span className="build-footer-sep" />}
      {info.commit && <span title={`Commit ${info.commit}${info.branch? ' on '+info.branch:''}`}>{info.commit}</span>}
  {/* Timestamp intentionally omitted */}
      <span className="build-footer-copy">© CalWin Solution {year}</span>
    </div>
  );
};

export default BuildFooter;