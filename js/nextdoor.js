// Nextdoor: perfiles, banco de publicaciones y respuestas rápidas. Nextdoor no tiene API pública para publicar,
// así que el panel prepara todo (texto, foto, ubicación, encuesta/evento) y tú lo publicas en 30 segundos.
// Reglas de marca: sin precios, sin guiones largos, sin política, sin competidores, sin urgencia falsa.

export const PROFILES = {
  mooveto: { label: 'Mooveto', page: 'Mooveto', color: '#1f5bff', sig: 'Mooveto, careful crew and a van. Free quotes, no obligation.', defaultArea: 'Mill Hill' },
  keen: { label: 'Keen Clean', page: 'Keen Resources', color: '#0f9d75', sig: 'Keen Clean, professional cleaning. Free quote, no obligation.', defaultArea: 'Mill Hill' },
};

// Tipos de contenido de Nextdoor que el compositor ofrece: publicación, encuesta, evento.
export const KINDS = { post: 'Publicación', poll: 'Encuesta', event: 'Evento' };

const m = (id, cat, title, text, image, extra = null) => ({ id, profile: 'mooveto', cat, title, text, image, extra });
const k = (id, cat, title, text, image, extra = null) => ({ id, profile: 'keen', cat, title, text, image, extra });

export const BANK = [
  // ---------- Mooveto ----------
  m('m01', 'education', 'Checklist piso', "Moving flat in {area} this month? A quick checklist 📋\n\n• Book parking or a loading bay early\n• Measure big furniture and doorways\n• Label boxes by room\n• Keep keys, chargers and medication in one bag\n\nA little planning makes moving day calm.\n\nMooveto, careful crew and a van. Free quotes, no obligation. Message us any time.", 'Cajas etiquetadas por habitación en un salón vacío, luz natural'),
  m('m02', 'education', 'Error común', "The most common moving day mistake we see? Packing too late.\n\nStart with rooms you rarely use, like the spare room and the loft. Leave daily items until the last two days.\n\nYou will feel far less rushed on the day.\n\nNeed a hand in {area}? Mooveto are fully insured, friendly and punctual. Message us for a free quote.", 'Persona cerrando una caja con cinta, cajas apiladas al fondo'),
  m('m03', 'behind', 'Protección de muebles', "How we protect your furniture on a move 🛋️\n\nBlankets and straps for every large item. Corners wrapped. Wardrobes and beds dismantled and rebuilt carefully.\n\nYour belongings are treated as if they were ours.\n\nMoving soon around {area}? Ask Mooveto for a free, no obligation quote.", 'Sofá envuelto en mantas dentro de la furgoneta, foto real del equipo'),
  m('m03p', 'proof', 'Encuesta: qué retrasa', "Quick question for {area} neighbours: what do you find hardest about moving home?\n\nWe plan every job around the answer, so thank you for sharing.", 'Foto real de la furgoneta cargada', { type: 'poll', q: 'What is the hardest part of moving home?', options: ['Packing everything', 'Parking on the day', 'Moving heavy furniture', 'Finding a reliable company'] }),
  m('m04', 'education', 'Aviso a vecinos', "A small tip if you have a move coming up.\n\nLet the neighbours know the day and time. A friendly heads up helps with parking and access, and everything runs smoother.\n\nIf you are the one moving in {area}, Mooveto can help with the rest. Careful crew, a van and clear communication. Message us for a quote.", 'Calle residencial tranquila con la furgoneta aparcada'),
  m('m05', 'offer', 'Man and van', "Small move? You do not need a huge removals job.\n\nA few boxes, a sofa or a studio flat is exactly what our man and van service is for. You only pay for the time used, in fair 30-minute steps.\n\nRated 4.9 out of 5 by customers. Message Mooveto for a free quote.", 'Furgoneta con puertas abiertas y pocas cajas'),
  m('m06', 'offer', 'Oficinas', "Running a small office near {area}? Moving it does not have to disrupt your week.\n\nWe plan around your working hours, label everything by desk and set up quickly so your team can get back to work.\n\nMooveto, professionals you can rely on. Get in touch for a free quote.", 'Oficina con cajas etiquetadas por escritorio'),
  m('m07', 'behind', 'Antes y después', "Before: stacked boxes, a long to do list and a lot of stress.\nAfter: a calm move and a home ready to settle into 🏡\n\nThat is what we aim for on every job. Fully insured, friendly and punctual.\n\nPlanning a move in {area}? Message Mooveto for a free, no obligation quote.", 'Collage antes (cajas) y después (casa montada)'),
  m('m08', 'behind', 'Cómo es el día', "What does moving day with Mooveto look like? 🚚\n\n1. We arrive on time and walk through the job with you\n2. Furniture is wrapped and loaded with care\n3. Everything is unloaded and placed where you want it\n4. Beds and wardrobes are rebuilt if needed\n\nMoving around {area}? Message us for a free quote, no obligation.", 'Foto real del equipo cargando la furgoneta'),
  m('m09', 'education', 'Qué no meter', "Things we recommend you move yourself:\n\n• Passports and important documents\n• Jewellery and cash\n• Laptops and chargers\n• Medication\n\nWe take care of the rest. Planning a move in {area}? Mooveto, fully insured and friendly. Message us for a free quote.", 'Bolsa pequeña con documentos y cargadores sobre una mesa'),
  m('m10', 'offer', 'Cambio de alquiler', "Moving between rentals? Timing matters.\n\nWe work around your key handover, protect floors and walls, and keep to the time we agree. Fair 30-minute billing, so you only pay for the time used.\n\nMessage Mooveto for a free quote in {area}.", 'Llaves y caja de cartón en el suelo de un piso vacío'),
  m('m11', 'behind', 'Equipo', "Meet the crew 👋\n\nFriendly, punctual and careful. They wear protective gear, wrap your furniture and treat your home with respect.\n\nIf you are planning a move around {area}, we would love to help. Free quotes, no obligation.", 'Foto real del equipo sonriendo junto a la furgoneta'),
  m('m12', 'education', 'Evento: consejos', "Free moving day tips for {area} neighbours.\n\nWe will share our best packing and planning advice. Bring your questions, no obligation.", 'Gráfico sencillo con el logo de Mooveto', { type: 'event', title: 'Moving day tips with Mooveto', desc: 'A relaxed Q&A on packing, parking and planning a calm move. Free, no obligation.', note: 'Solo usa el evento si de verdad lo vas a hacer (online o en persona). Sin urgencia falsa.' }),
  // ---------- Keen Clean (Keen Resources) ----------
  k('k01', 'education', 'Checklist cocina', "A quick weekly kitchen reset for {area} homes 🧽\n\n• Wipe worktops and the hob\n• Clean the fridge shelves\n• Descale the kettle\n• Empty and wipe the bin\n\nShort on time? Keen Clean can take it off your list. Free quote, no obligation.", 'Cocina brillante, encimera despejada, luz natural'),
  k('k02', 'offer', 'Limpieza profunda', "Spring cleaning in autumn? A deep clean is a great reset 🏡\n\nOven, bathroom limescale, skirting boards, inside windows. Done properly by a professional, friendly team.\n\nKeen Clean serves {area}. Ask for a free quote, no obligation.", 'Baño reluciente con grifos cromados'),
  k('k03', 'offer', 'Fin de alquiler', "Moving out of a rental near {area}? A thorough end of tenancy clean helps you hand the keys back with confidence.\n\nWe work through a clear checklist so nothing is missed.\n\nKeen Clean, professional cleaning. Message us for a free quote.", 'Cocina vacía y limpia lista para entregar'),
  k('k04', 'education', 'Moho en baño', "Black spots in the bathroom? Here is a simple routine 🚿\n\n• Ventilate after every shower\n• Wipe sealant and grout weekly\n• Use a suitable mould cleaner, and always follow the label\n\nIf it keeps coming back, a professional deep clean can help. Keen Clean, free quote.", 'Primer plano de azulejos y junta limpia'),
  k('k05', 'proof', 'Encuesta: frecuencia', "Neighbours in {area}, how often do you wish your home was professionally cleaned?\n\nYour answers help us plan our service around what people need.", 'Foto real de un producto de limpieza y paño', { type: 'poll', q: 'How often would you want a professional clean?', options: ['Weekly', 'Every two weeks', 'Once a month', 'Only for deep cleans'] }),
  k('k06', 'offer', 'Limpieza regular', "A regular cleaner you can trust, in {area}.\n\nA friendly, consistent service at times that suit you. You get your weekends back.\n\nKeen Clean, professional cleaning. Message us for a free quote, no obligation.", 'Equipo uniformado entrando a una casa, foto real'),
  k('k07', 'behind', 'Cómo trabajamos', "How we clean 🧼\n\nWe work room by room with a checklist and leave the place tidy. You will always know what is included before we start.\n\nCurious? Keen Clean offers a free quote in {area}.", 'Carro de limpieza ordenado con productos y paños'),
  k('k08', 'education', 'Alérgenos', "Allergies at home? A few simple habits help 🤧\n\n• Wash bedding weekly\n• Vacuum with a good filter\n• Dust with a damp cloth\n• Open windows when the weather allows\n\nNeed a hand? Keen Clean can help with regular cleans around {area}.", 'Cama recién hecha con ropa blanca, ventana abierta'),
  k('k09', 'offer', 'Oficinas', "A clean office makes a good impression and a better working day.\n\nKeen Clean cleans small offices and shared spaces around {area}.\n\nMessage us for a free quote, no obligation.", 'Escritorio ordenado y suelo limpio en una oficina'),
  k('k10', 'behind', 'Antes y después', "Before: a busy week and a long list.\nAfter: a fresh, clean home ✨\n\nThat feeling is why we do this. Keen Clean, professional and friendly.\n\nWant it for your home in {area}? Free quote, no obligation.", 'Collage antes y después de una cocina (foto real y permiso del cliente)'),
  k('k11', 'education', 'Después de obras', "Had building work done? The dust gets everywhere 🔨\n\nA post-build clean covers surfaces, windows and floors so you can enjoy the finished result.\n\nKeen Clean serves {area}. Ask for a free quote.", 'Habitación recién reformada, suelo y ventanas limpios'),
  k('k12', 'proof', 'Presentación', "Hello {area}! We are Keen Clean, a professional cleaning company 💚\n\nHomes, end of tenancy, deep cleans and offices. Friendly, reliable and clear about what is included.\n\nNeed a cleaner you can rely on? Message us for a free quote, no obligation.", 'Foto real del equipo o el logo de Keen Clean'),
];

// Respuestas rápidas para cuando un vecino pregunta por recomendaciones (nunca precios, siempre invitar a mensaje).
export const REPLIES = {
  mooveto: [
    { label: 'Pide recomendaciones de mudanza', text: "Hi {name}, thanks for asking. Mooveto would be glad to help. We are a friendly, fully insured crew with a van. Could you send us the addresses, the date and roughly what you are moving? We will send you a free quote, no obligation." },
    { label: 'Pregunta por el precio', text: "Hi {name}, every move is different, so we quote once we know the details. Message us the addresses, date and what you are moving, and we will come back with a clear quote. You only pay for the time used, in fair 30-minute steps." },
    { label: 'Mudanza pequeña', text: "Hi {name}, for a smaller move our man and van service is ideal. Send us the details and we will confirm availability and a quote." },
  ],
  keen: [
    { label: 'Pide recomendaciones de limpieza', text: "Hi {name}, thanks for asking. Keen Clean would be glad to help. We are a professional, friendly team. Could you tell us the type of property, the number of bedrooms and bathrooms, and when you need us? We will send a free quote, no obligation." },
    { label: 'Pregunta por el precio', text: "Hi {name}, it depends on the size of the property and the type of clean, so we quote once we have the details. Message us and we will come back with a clear quote." },
    { label: 'Fin de alquiler', text: "Hi {name}, yes, we do end of tenancy cleans with a clear checklist. Tell us the property size and your handover date and we will send a free quote." },
  ],
};

export const fillArea = (text, area) => (text || '').replace(/\{area\}/g, area || 'London');
export const wordCount = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);
