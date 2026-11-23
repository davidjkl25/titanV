import React from 'react';

interface Props { texto?: string; className?: string; as?: 'p' | 'span' | 'div'; }
export const NotaCamposObligatorios: React.FC<Props> = ({ texto = 'Los campos marcados con * son obligatorios.', className = '', as = 'p' }) => {
  const Tag = as as any;
  return <Tag className={`form-note ${className}`.trim()}><span className="required-mark" aria-hidden="true">*</span> {texto.replace(/^\*\s*/, '')}</Tag>;
};
export default NotaCamposObligatorios;
