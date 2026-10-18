<<<<<<< HEAD
const contenido = [
  {
    titulo: 'Misión',
    texto:
      'Transformar la gestión operativa de las empresas constructoras mediante una plataforma digital centralizada, que facilite el registro en tiempo real de información logística y técnica, optimizando la comunicación y la eficiencia en la ejecución de proyectos de infraestructura.',
  },
  {
    titulo: 'Visión',
    texto:
      'Convertirnos en la solución tecnológica líder para las pequeñas y medianas empresas de construcción en Latinoamérica, siendo el estándar de referencia en la organización, flexibilidad y transparencia en el seguimiento de obras.',
  },
  {
    titulo: 'Valores',
    texto: null,
    lista: [
      'Eficiencia: Simplificamos procesos complejos para obtener resultados rápidos y precisos.',
      'Transparencia: Mantenemos informadas a todas las partes interesadas mediante un registro constante y abierto.',
      'Innovación: Utilizamos tecnología digital para modernizar la documentación técnica y operativa en campo.',
      'Colaboración: Fomentamos el trabajo en equipo a través de herramientas de comunicación y contenido compartido.',
    ],
  },
];

=======
>>>>>>> test
const QuienesSomos = () => {
  return (
    <section
      id="quienes-somos"
      style={{ backgroundColor: '#0a0a0a', color: '#fff', padding: '70px 8%' }}
    >
      <h2
        style={{
          fontSize: '26px',
          borderLeft: '5px solid #ffd60a',
          paddingLeft: '16px',
          marginBottom: '40px',
        }}
<<<<<<< HEAD
      >
        Quiénes Somos
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}
      >
        {contenido.map((item) => (
          <div
            key={item.titulo}
            style={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '14px',
              padding: '30px 26px',
            }}
          >
            <h3
              style={{
                color: '#ffd60a',
                fontSize: '18px',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              {item.titulo}
            </h3>

            {item.texto && (
              <p style={{ color: '#b0b0b0', lineHeight: 1.7, fontSize: '14px', fontWeight: 300 }}>
                {item.texto}
              </p>
            )}

            {item.lista && (
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#b0b0b0', fontSize: '14px', lineHeight: 1.7 }}>
                {item.lista.map((valor) => (
                  <li key={valor} style={{ marginBottom: '8px' }}>
                    {valor}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
=======
        >
          ¿Qué ofrecemos?
        </h2>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '14px',
            padding: '40px 32px',
            maxWidth: 900,
          }}
        >
          <h3
            style={{
              color: '#ffd60a',
              fontSize: '18px',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            Plataforma web para la gestión de proyectos de construcción
          </h3>
          <p
            style={{
              color: '#b0b0b0',
              lineHeight: 1.7,
              fontSize: '14px',
              fontWeight: 300,
              margin: 0,
            }}
          >
            Titan V es una aplicación web que centraliza la información de cada obra: crea proyectos,
            asigna colaboradores con sus roles, controla los materiales y el inventario, registra tareas y turnos,
            guarda evidencias multimedia y lleva el kardex de insumos. Todo esto en un solo lugar, pensado
            para que contratistas y constructoras tengan visibilidad en tiempo real del avance de sus proyectos
            y eviten la dispersión de información entre hojas de cálculo, correos y mensajes.
          </p>
        </div>
>>>>>>> test
      </div>
    </section>
  );
};

<<<<<<< HEAD
=======

>>>>>>> test
export default QuienesSomos;