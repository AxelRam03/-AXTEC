/**
 * AXTEC Knowledge Base
 * -------------------------------------------------------------------------
 * Single source of truth for anything AXTEC AI is allowed to state as fact.
 * If a fact is not in here, the AI must say it isn't confirmed instead of
 * inventing it (see aiProvider.js system prompt).
 *
 * Bilingual: "es" and "en". Keep both in sync when you edit this file.
 * -------------------------------------------------------------------------
 */

const knowledge = {
  company: {
    name: 'AXTEC Technologies',
    brand: 'AXTEC',
    slogan: 'Technology that moves your business.',
    founded_by: 'two developers',
    contact: {
      email: 'hello@axtec.tech',       // placeholder — replace with the real inbox
      whatsapp: '+52 [NUMERO]',        // placeholder — replace with the real number
    },
  },

  services: {
    es: [
      { id: 'web',         name: 'Desarrollo Web',         summary: 'Sitios y aplicaciones a medida: landing pages, sitios corporativos, portales.' },
      { id: 'ecommerce',   name: 'E-commerce',              summary: 'Tiendas en línea: catálogo, carrito, pagos e inventario.' },
      { id: 'software',    name: 'Software Empresarial',    summary: 'Sistemas internos, paneles de administración y herramientas a medida.' },
      { id: 'automation',  name: 'Automatización',          summary: 'Conectar herramientas y eliminar procesos manuales repetitivos.' },
      { id: 'ai',          name: 'Inteligencia Artificial', summary: 'Chatbots, asistentes y modelos aplicados a problemas reales del negocio.' },
      { id: 'cloud',       name: 'Cloud',                   summary: 'Infraestructura en Google Cloud, AWS o Azure.' },
      { id: 'data',        name: 'Data',                    summary: 'Dashboards y reportes para tomar decisiones con datos reales.' },
      { id: 'security',    name: 'Ciberseguridad',          summary: 'Buenas prácticas y controles de seguridad para tu sitio y tus datos.' },
    ],
    en: [
      { id: 'web',         name: 'Web Development',    summary: 'Custom sites and apps: landing pages, corporate sites, portals.' },
      { id: 'ecommerce',   name: 'E-commerce',         summary: 'Online stores: catalog, cart, payments and inventory.' },
      { id: 'software',    name: 'Business Software',  summary: 'Internal systems, admin panels and custom tools.' },
      { id: 'automation',  name: 'Automation',         summary: 'Connecting tools and removing repetitive manual work.' },
      { id: 'ai',          name: 'Artificial Intelligence', summary: 'Chatbots, assistants and models applied to real business problems.' },
      { id: 'cloud',       name: 'Cloud',              summary: 'Infrastructure on Google Cloud, AWS or Azure.' },
      { id: 'data',        name: 'Data',               summary: 'Dashboards and reports to make decisions with real data.' },
      { id: 'security',    name: 'Cybersecurity',      summary: 'Security best practices and controls for your site and data.' },
    ],
  },

  technologies: {
    frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Angular'],
    backend: ['PHP', 'Laravel', 'Java', 'Spring Boot'],
    database: ['PostgreSQL', 'MySQL'],
    cloud: ['Google Cloud', 'AWS', 'Azure'],
    devops: ['Docker', 'Nginx', 'Git', 'GitHub'],
    data: ['Power BI'],
  },

  process: {
    es: [
      'Conversación inicial para entender el proyecto (aquí es donde ayuda AXTEC AI).',
      'Estimación preliminar de rango de inversión y tiempo.',
      'Revisión humana del alcance y cotización formal.',
      'Diseño y desarrollo.',
      'Entrega, mantenimiento y soporte.',
    ],
    en: [
      'Initial conversation to understand the project (this is where AXTEC AI helps).',
      'Preliminary estimate of investment range and timeline.',
      'Human review of scope and formal quote.',
      'Design and development.',
      'Delivery, maintenance and support.',
    ],
  },

  policies: {
    es: [
      'AXTEC AI solo genera estimaciones preliminares, nunca cotizaciones formales, contratos ni facturas.',
      'Los precios visibles en el sitio y en el chat son rangos orientativos, no precios cerrados.',
      'AXTEC no comparte los datos de contacto de un lead con terceros.',
    ],
    en: [
      'AXTEC AI only produces preliminary estimates, never formal quotes, contracts or invoices.',
      'Prices shown on the site and in the chat are indicative ranges, not closed prices.',
      'AXTEC does not share a lead\'s contact details with third parties.',
    ],
  },

  faq: {
    es: [
      { q: '¿Cuánto cuesta una página web?', a: 'Depende del alcance. Una página base parte de un rango orientativo; usa la calculadora o cuéntame qué necesitas y te doy un rango.' },
      { q: '¿Cuánto tardan?', a: 'Un sitio base suele tomar entre 1 y 2 semanas; proyectos con más funciones toman más tiempo. Te doy un rango según tu proyecto.' },
      { q: '¿Trabajan con tiendas en línea?', a: 'Sí, hacemos e-commerce completo: catálogo, carrito, pagos e inventario.' },
      { q: '¿Pueden conectar WhatsApp?', a: 'Sí, es una de las integraciones más comunes que agregamos.' },
      { q: '¿Pueden hacer sistemas?', a: 'Sí, desarrollamos software empresarial y sistemas internos a la medida.' },
      { q: '¿Trabajan con empresas?', a: 'Sí, trabajamos tanto con negocios pequeños como con empresas con procesos más grandes.' },
      { q: '¿Pueden mantener mi página?', a: 'Sí, ofrecemos mantenimiento y soporte continuo.' },
      { q: '¿Pueden crear una aplicación?', a: 'Sí, según el alcance puede ser una web app o una aplicación a la medida; cuéntame más para orientarte.' },
      { q: '¿Trabajan con Google Cloud?', a: 'Sí, nuestra infraestructura está preparada para Google Cloud (Cloud Run, Cloud SQL), además de AWS y Azure.' },
      { q: '¿Hacen SEO?', a: 'Sí, SEO on-page viene incluido en el desarrollo web.' },
      { q: '¿Pueden automatizar procesos?', a: 'Sí, conectamos herramientas y automatizamos tareas repetitivas.' },
    ],
    en: [
      { q: 'How much does a website cost?', a: 'It depends on scope. A base site starts at an indicative range; use the calculator or tell me what you need and I\'ll give you a range.' },
      { q: 'How long does it take?', a: 'A base site usually takes 1–2 weeks; projects with more features take longer. I\'ll give you a range based on your project.' },
      { q: 'Do you build online stores?', a: 'Yes, full e-commerce: catalog, cart, payments and inventory.' },
      { q: 'Can you connect WhatsApp?', a: 'Yes, it\'s one of the most common integrations we add.' },
      { q: 'Can you build systems?', a: 'Yes, we build custom business software and internal systems.' },
      { q: 'Do you work with companies?', a: 'Yes, we work with small businesses and companies with larger processes alike.' },
      { q: 'Can you maintain my site?', a: 'Yes, we offer ongoing maintenance and support.' },
      { q: 'Can you build an app?', a: 'Yes — depending on scope it could be a web app or a custom application; tell me more so I can point you in the right direction.' },
      { q: 'Do you work with Google Cloud?', a: 'Yes, our infrastructure is built for Google Cloud (Cloud Run, Cloud SQL), plus AWS and Azure.' },
      { q: 'Do you do SEO?', a: 'Yes, on-page SEO is included in web development.' },
      { q: 'Can you automate processes?', a: 'Yes, we connect tools and automate repetitive tasks.' },
    ],
  },

  fallback_unknown: {
    es: 'No tengo esa información confirmada. Si quieres, puedo registrar tu pregunta para que el equipo de AXTEC la revise.',
    en: 'I don\'t have that confirmed. If you\'d like, I can log your question so the AXTEC team can follow up.',
  },

  ai_unavailable: {
    es: 'En este momento AXTEC AI no está disponible. Puedes solicitar una cotización mediante el formulario de contacto y te responderemos directamente.',
    en: 'AXTEC AI isn\'t available right now. You can request a quote using the contact form and we\'ll get back to you directly.',
  },
};

module.exports = knowledge;
