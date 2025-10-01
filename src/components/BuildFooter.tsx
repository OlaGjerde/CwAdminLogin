import { useEffect, useState } from 'react';
import buildInfoData from '../build-info.json';
import './BuildFooter.css';

interface BuildInfo { version: string; commit?: string; branch?: string; timestamp?: string; }

export const BuildFooter = () => {
  const [info] = useState<BuildInfo>(buildInfoData as BuildInfo);
  const year = new Date().getFullYear();
  // Provide a short relative time for convenience
  const [rel, setRel] = useState('');
  useEffect(() => {
    if (!info.timestamp) return;
    const built = new Date(info.timestamp).getTime();
    const diffMs = Date.now() - built;
    const mins = Math.floor(diffMs/60000);
    if (mins < 60) setRel(mins + 'm siden'); else setRel(Math.floor(mins/60)+'t siden');
  }, [info.timestamp]);
  return (
    <div className="build-footer" aria-label="Build information">
      <span className="build-footer-version">v{info.version}</span>
      {info.commit && <span className="build-footer-sep" />}
      {info.commit && <span title={`Commit ${info.commit}${info.branch? ' on '+info.branch:''}`}>{info.commit}</span>}
      {info.timestamp && <span className="build-footer-time" title={info.timestamp}>{rel}</span>}
      <span className="build-footer-copy">© CalWin Solution {year}</span>
    </div>
  );
};

export default BuildFooter;