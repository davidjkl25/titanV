/** Señales visuales reutilizables para campos obligatorios y acciones bloqueadas. */

export const Obligatorio = () => (
  <span className="required-mark" title="Campo obligatorio" aria-hidden="true"> *</span>
);

export const Opcional = () => (
  <span style={{ color: '#94a3b8', fontWeight: 400 }} title="Campo opcional"> (opcional)</span>
);

interface BadgeBloqueadoProps {
  texto?: string;
  titulo?: string;
}

export const BadgeBloqueado = ({
  texto = 'Sin permiso',
  titulo = 'Acción no disponible para tu rol en este proyecto',
}: BadgeBloqueadoProps) => (
  <span className="badge-bloqueado" title={titulo}>
    <i className="fas fa-lock"></i> {texto}
  </span>
);

interface AvisoSoloLecturaProps {
  texto?: string;
}

export const AvisoSoloLectura = ({
  texto = 'Tu rol solo permite lectura. No puedes crear, editar ni eliminar registros en este módulo.',
}: AvisoSoloLecturaProps) => (
  <div className="aviso-solo-lectura" role="status">
    <i className="fas fa-lock"></i>
    <span>{texto}</span>
  </div>
);
