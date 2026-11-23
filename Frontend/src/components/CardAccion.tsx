import React, { useState } from 'react';
export interface CardAccionProps {
  label: string;
  tipo?: string;
  placeholder?: string;
  valor: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  error?: string;
  id?: string;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
}

const iconoOjo = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const iconoOjoCerrado = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const CardAccion: React.FC<CardAccionProps> = ({ label, tipo = 'text', placeholder, valor, onChange, required, error, id, name, autoComplete, disabled, minLength, maxLength }) => {
  const esContrasena = tipo === 'password';
  const [visible, setVisible] = useState(false);
  const inputId = id || name || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column' }}>
      <label htmlFor={inputId} style={{ color: '#e5e7eb', fontSize: '14px', marginBottom: '5px' }}>
        {label}{required && <span className="required-mark" aria-hidden="true"> *</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          name={name}
          type={esContrasena && visible ? 'text' : tipo}
          placeholder={placeholder}
          value={valor}
          onChange={onChange}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          autoComplete={autoComplete}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          style={{
            padding: '10px',
            paddingRight: esContrasena ? '40px' : '10px',
            borderRadius: '6px',
            border: error ? '1px solid #ef4444' : '1px solid #555',
            backgroundColor: disabled ? '#1a1a1a' : '#222',
            color: '#fff',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#d1d5db',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {visible ? iconoOjoCerrado : iconoOjo}
          </button>
        )}
      </div>
      {error && <span id={`${inputId}-error`} className="field-error" role="alert">{error}</span>}
    </div>
  );
};
