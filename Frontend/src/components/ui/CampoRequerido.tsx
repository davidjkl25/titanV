import React from 'react';
export const CampoRequerido: React.FC<{ label: string; htmlFor?: string; className?: string; style?: React.CSSProperties }> = ({ label, htmlFor, className = '', style }) => (
  <label htmlFor={htmlFor} className={className} style={style}>
    {label} <span className="required-mark" aria-hidden="true">*</span><span className="sr-only">(obligatorio)</span>
  </label>
);
export default CampoRequerido;
