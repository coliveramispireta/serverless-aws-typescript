/**
 * Banco de mensajes para notificaciones automáticas KetoFlow.
 * Tono cercano del coach: breve, directo, emocional y alentador.
 *
 * Los momentos del día eligen aleatoriamente entre varios "enfoques"
 * para mantener variedad (motivación, tentaciones, reflexión, fe…).
 */

export interface PushMessage {
  title: string;
  body: string;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ---------------------------------------------------------
// 🎉 Bienvenida (se envía al activar notificaciones, 1ra vez)
// ---------------------------------------------------------
const WELCOME: PushMessage = {
  title: "🎉 ¡Bienvenido/a a KetoFlow!",
  body: "Notificaciones activadas. Aquí recibirás ánimo, recordatorios y cariño de tu coach.",
};

// ---------------------------------------------------------
// 💚 Bienvenida de vuelta (inicio de sesión posterior)
// ---------------------------------------------------------
const BIENVENIDA_DE_VUELTA: PushMessage[] = [
  {
    title: "💚 ¡Qué alegría verte!",
    body: "Tu progreso te esperaba. Retoma donde lo dejaste.",
  },
  { title: "👋 Hola de nuevo", body: "Un nuevo día para cuidarte. ¡Vamos con todo!" },
  { title: "✨ Nos alegra verte", body: "Cada visita cuenta. Hoy también puedes elegir bien." },
  {
    title: "🤗 Bienvenido/a de vuelta",
    body: "Tu coach y tu comunidad siguen aquí contigo. ¡Adelante!",
  },
  { title: "🔥 De regreso al plan", body: "Registra tu peso o tus comidas y sigue sumando." },
];

// ---------------------------------------------------------
// 😢 Re-encuentro (usuario inactivo varios días)
// ---------------------------------------------------------
const REENCUENTRO: PushMessage[] = [
  { title: "😢 Te extrañamos", body: "Días sin saber de ti. Tu progreso sigue aquí, esperándote." },
  { title: "💬 Sin culpas", body: "Retoma hoy con un solo paso: regístrate en la báscula. Y ya." },
  { title: "🙋 Tu coach pregunta por ti", body: "Vuelve, registra cómo vas y seguimos juntos este camino." },
  { title: "🌱 Nunca es tarde", body: "Lo bueno de empezar otra vez: ya sabes que puedes lograrlo." },
];

// ---------------------------------------------------------
// 💪 Motivación y disciplina
// ---------------------------------------------------------
const ANIMO: PushMessage[] = [
  { title: "💪 ¡Tú puedes!", body: "Lo estás haciendo genial. Un día a la vez." },
  { title: "🔥 No te rindas", body: "Un mal día no borra todo tu esfuerzo. Hoy seguimos." },
  { title: "⚡ Disciplina", body: "La motivación te enciende; la disciplina te mantiene." },
  { title: "🌅 Nuevo día", body: "Hoy es otra oportunidad de cuidarte. Úsala." },
  { title: "🦁 Más fuerte", body: "Eres más fuerte que tus excusas. Demuéstralo hoy." },
  { title: "🚶 Paso a paso", body: "No necesitas ser perfecto/a. Necesitas no parar." },
  { title: "🚀 Arranca", body: "El mejor momento para empezar es ahora mismo." },
  { title: "🧱 Ladrillo a ladrillo", body: "Hoy construyes el cuerpo del mañana." },
  { title: "😤 Cuando cueste", body: "Ahí es justo donde se progresa. No pares." },
  { title: "☀️ Decisión", body: "Hoy no dependes de las ganas: dependes de ti." },
];

// ---------------------------------------------------------
// ❤️ Amor propio y compromiso
// ---------------------------------------------------------
const AMORPROPIO: PushMessage[] = [
  { title: "❤️ Cuídate", body: "No te castigues. Trátate como tratas a quien amas." },
  { title: "🫶 Por ti", body: "Come bien porque te amas, no porque te odies." },
  { title: "💛 Mereces", body: "Mereces sentirte con energía, salud y orgullo." },
  { title: "🌸 Paciencia", body: "Los cambios toman tiempo. Sé amable contigo hoy." },
  { title: "🪞 Mírate", body: "Llevas mucho esfuerzo encima. Eso también cuenta." },
  { title: "✨ Promesa", body: "Renueva hoy tu promesa: yo sí cumplo conmigo." },
  { title: "🤍 Sin culpa", body: "Si fallaste ayer, hoy empiezas de nuevo. Así se aprende." },
  { title: "🌷 Cuidarte es amor", body: "Cada comida sana es un abrazo para tu cuerpo." },
  { title: "🫂 Constante > perfecto", body: "No tienes que ser perfecto/a, solo no rendirte." },
  { title: "💗 Tu valor", body: "No depende de un número en la báscula. Nunca lo olvides." },
];

// ---------------------------------------------------------
// 🧠 Reflexión y cuestionamiento
// ---------------------------------------------------------
const REFLEXION: PushMessage[] = [
  { title: "🧠 Pregunta del día", body: "¿Quién quieres ser dentro de 1 año?" },
  { title: "💭 Visualiza", body: "¿Cómo te ves en 6 meses si sigues así?" },
  { title: "🤔 Piénsalo", body: "¿Cuánto le costó tu meta ese «solo un poquito»?" },
  { title: "⚖️ Todo está en tu mente", body: "Tu voluntad demuestra lo fuerte que eres." },
  { title: "🔍 Sé honesto/a", body: "¿Comes de hambre o de ansiedad? Aprende a distinguirlo." },
  { title: "🕰️ El futuro", body: "En un año agradecerás lo que elijas HOY." },
  { title: "🪞 Pregunta honesta", body: "¿Estás esperando ganas… o construyendo hábitos?" },
  { title: "🔁 Repite conmigo", body: "«Un antojo no controla mi vida». ¿Cierto o cierto?" },
  { title: "🧭 Brújula", body: "Cuando dudes: ¿esto me acerca o me aleja?" },
  { title: "📖 Tu historia", body: "¿Qué quieres contar de estos meses dentro de un año?" },
];

// ---------------------------------------------------------
// 🎯 Metas y futuro
// ---------------------------------------------------------
const METAS: PushMessage[] = [
  { title: "🎯 Tu meta", body: "Está más cerca de lo que crees. No la sueltes." },
  { title: "🏁 Un paso más", body: "Cada comida correcta te acerca a tu meta." },
  { title: "📈 Lo que se mide", body: "Registra tu peso hoy: lo que se mide, mejora." },
  { title: "🗺️ Rumbo claro", body: "¿Recuerdas cuál era tu meta? Léela y decide bien hoy." },
  { title: "⏳ Día contable", body: "Los kilos no bajaron en un día, pero cada día cuenta." },
  { title: "🏆 Imagínalo", body: "El día de tu meta se construye con días como hoy." },
  { title: "✂️ En pedacitos", body: "Las metas grandes se comen en bocados pequeños. Empieza por el almuerzo." },
  { title: "📅 Hoy vale doble", body: "Seguir sin ánimo es nivel pro. Y eso acabas de hacer." },
  { title: "🧮 Matemática simple", body: "Buenas decisiones diarias = meta cumplida. Sin magia." },
  { title: "🚩 Mini-meta", body: "Ponte UNA meta pequeña para hoy y cúmplela sin falta." },
];

// ---------------------------------------------------------
// 🚨 Alerta ante tentaciones
// ---------------------------------------------------------
const ALERTA: PushMessage[] = [
  { title: "🚨 ¡Altooo!", body: "No lo hagas. ¡No pierdas tu avance!" },
  { title: "⛔ Detente", body: "Ese dulce dura 2 minutos; rendirse cuesta semanas." },
  { title: "⚠️ Zona de riesgo", body: "¿Hambre de verdad… o estrés o aburrimiento? Respira primero." },
  { title: "🛑 Regla de oro", body: "Vaso de agua y 10 minutos de espera. Después decides." },
  { title: "🚩 Cuidado ahí", body: "Las salidas del plan se esconden donde menos las buscas." },
  { title: "📢 Prioridades", body: "¡Tu avance vale más que un capricho de 5 minutos!" },
  { title: "🚧 Pare ahí", body: "Esa golosina no te ama. Tu meta sí. Piénsalo." },
  { title: "📵 Trampa invisible", body: "Picar «solo mientras cocinas» también suma carbohidratos." },
  { title: "🌪️ Momento crítico", body: "Estrés = vulnerabilidad. Respira hondo antes de abrir la alacena." },
  { title: "🥤 Azúcar líquida", body: "Jugos y refrescos sabotean igual. Agua, siempre agua." },
];

// ---------------------------------------------------------
// 🛡️ Resistencia ante antojos
// ---------------------------------------------------------
const ANTOJOS: PushMessage[] = [
  { title: "🛡️ Resiste", body: "El antojo pasa en minutos. Tu fuerza se queda para siempre." },
  { title: "🌊 Respira", body: "Agua + respiración + 10 min: el antojo casi siempre se rinde primero." },
  { title: "🍫 ¿Antojo dulce?", body: "Prueba algo keto-salado: queso, nueces o un huevo. Se va igual." },
  { title: "🌙 Hora crítica", body: "Las 8 pm no mandan en tu dieta. Mandas tú." },
  { title: "🥊 Cada vez más fuerte", body: "Cada antojo que vences debilita al siguiente." },
  { title: "🧊 Frío en la cabeza", body: "No es hambre, es hábito. Y los hábitos se rompen." },
  { title: "⏰ Reloj a tu favor", body: "Dale 15 minutos al antojo. Se apaga solo, verás." },
  { title: "🚿 Truco viejo", body: "Cepíllate los dientes o ducha rápida fría: matagotos infalible." },
  { title: "🍗 Proteína y adiós", body: "Un snack proteico calma el antojo sin sabotear tu avance." },
  { title: "🎭 Disfraz", body: "El antojo se disfraza de hambre. No compres la entrada." },
];

// ---------------------------------------------------------
// 💧 Hidratación y hábitos
// ---------------------------------------------------------
const HIDRATACION: PushMessage[] = [
  { title: "💧 ¡Ahora!", body: "¡No lo dejes para después! Hidrátate ahora mismo." },
  { title: "🚰 Primero agua", body: "A veces tu cuerpo pide agua y tú crees que es comida." },
  { title: "🥤 Vaso ya", body: "Uno grande ahora: menos antojos, más energía." },
  { title: "🍋 Con sabor", body: "Agua mineral con limón cuenta igual y sabe a premio." },
  { title: "💙 Meta azul", body: "Apunta a tus 2 litros de hoy. Tu piel y tu báscula lo agradecen." },
  { title: "🔋 Recarga", body: "Fatiga o dolor de cabeza casi siempre son falta de agua." },
  { title: "⏰ Hora del agua", body: "Levántate, ve por un vaso y tómalo AHORA. Va en serio." },
  { title: "🫗 Antes de comer", body: "Un vaso antes de cada comida: sacia y ayuda a bajar." },
  { title: "🌡️ Señal oculta", body: "Boca seca o cabeza pesada = tu cuerpo pide agua a gritos." },
  { title: "🧊 Fría y rica", body: "Hielo + limón + sorbos seguidos. Misión: 2 litros hoy." },
];

// ---------------------------------------------------------
// 🔥 Orgullo por el avance
// ---------------------------------------------------------
const ORGULLO: PushMessage[] = [
  { title: "🔥 Orgullo", body: "Mira cuánto ya lograste. Eso es esfuerzo REAL." },
  { title: "👏 Bien hecho", body: "Muchos ya abandonaron. Tú sigues aquí. Eso lo dice todo." },
  { title: "🌟 Suma y sigue", body: "Ningún paso pequeño cuenta poco. Todos suman." },
  { title: "💪 Así se hace", body: "Tu versión de ayer estaría orgullosa/o de la de hoy." },
  { title: "🎉 Celébrate", body: "Registra tu progreso de hoy y reconoce tu esfuerzo." },
  { title: "🥇 Nivel nuevo", body: "Ya no eres quien empezó. Semana a semana, más fuerte." },
  { title: "📸 Foto futura", body: "El «antes y después» que sueñas se está filmando HOY." },
  { title: "🎖️ Batallas invisibles", body: "Nadie ve tu esfuerzo diario, pero está forjando tu cambio." },
  { title: "💥 Inspiración", body: "Tu constancia ya motiva a alguien más sin que lo sepas." },
  { title: "🚀 Imbatible", body: "Otra semana aguantando. Eso no lo logra cualquiera." },
];

// ---------------------------------------------------------
// 🙏 Fe y espiritualidad
// ---------------------------------------------------------
const FE: PushMessage[] = [
  { title: "🙏 El mejor equipo", body: "Pídele a Dios fuerzas. Tú y Él son el mejor equipo." },
  { title: "🕊️ Confía", body: "Este proceso también te está haciendo bien por dentro." },
  { title: "🙌 Gratitud", body: "Agradece tu cuerpo cuidándolo. Es un acto de fe." },
  { title: "✝️ Fortaleza", body: "Lo que hoy pesa, con fe se vuelve ligero. Adelante." },
  { title: "🌌 Con propósito", body: "No estás solo/a en esto: pide ayuda y camina." },
  { title: "🕊️ Paz", body: "Respira. Entrega tus ansiedades y elige bien hoy." },
  { title: "🙏 Fuerza de arriba", body: "Cuando ya no puedas, Él te sostiene. No estás solo/a." },
  { title: "🌅 Segunda oportunidad", body: "Cada amanecer llega con misericordia nueva. Úsala." },
  { title: "🕯️ Un minuto", body: "Una oración corta antes de comer cambia tu decisión." },
  { title: "💚 Tu templo", body: "Cuidar tu cuerpo también es honrar la vida que te dieron." },
];

// ---------------------------------------------------------
// 🌱 Reflexiones sobre transformación
// ---------------------------------------------------------
const TRANSFORMACION: PushMessage[] = [
  { title: "🌱 Ya cambiaste", body: "Cada decisión te construye. Ya no eres quien empezó." },
  { title: "🦋 Proceso", body: "La transformación aprieta antes de brillar. Aguanta." },
  { title: "🌿 Riega tu planta", body: "Lo que plantas hoy, mañana se nota. Sigue cuidándolo." },
  { title: "🧗 Ahí se crece", body: "Fuera de tu zona de confort es donde ocurre el cambio." },
  { title: "✨ Nueva versión", body: "No persigues otro cuerpo: persigues otra vida. Vas bien." },
  { title: "🍃 Efecto acumulado", body: "Pequeños cambios diarios = una vida entera distinta." },
  { title: "🐛➡️🦋", body: "Los grandes cambios incomodan primero. Ya vas en camino." },
  { title: "💧 Gota a gota", body: "Así se talla la piedra y así se construye tu nueva vida." },
  { title: "🔀 Punto de quiebre", body: "Un día mirarás atrás y agradecerás este momento exacto." },
  { title: "🌾 Cosecha", body: "Lo que siembras en la cocina lo cosechas en la báscula." },
];

// ---------------------------------------------------------
// 🛡️ Guardia de fin de semana (viernes)
// ---------------------------------------------------------
const WEEKEND: PushMessage[] = [
  {
    title: "🛡️ Fin de semana a la vista",
    body: "Disfruta sin arrepentirte: proteína primero, postre después (si cabe).",
  },
  {
    title: "⚠️ Plan de reunión",
    body: "LLega con hambre controlada y llena el plato de proteína primero.",
  },
  {
    title: "🍋 Anticipo de antojo",
    body: "Si algo dulce va a tentarte: agua con limón ANTES de decidir.",
  },
  {
    title: "🧭 Norte claro",
    body: "Un fin de semana consciente vale más que una semana perfecta.",
  },
  {
    title: "🎉 Disfruta distinto",
    body: "Brinda con agua con gas, muévete, come bien. El lunes te lo agradecerá.",
  },
  { title: "🍔 Parrilla amiga", body: "Carne, pollo, asado: el fin de semana keto se disfruta. El pan, no." },
  { title: "🍿 Movie night", body: "Queso y nueces entran al sofá. Las palomitas, quedan fuera." },
  { title: "🍷 Si brindas", body: "Seco y con moderación: el alcohol abre la puerta al antojo." },
  { title: "😴 Descansa, no abandones", body: "Rutina flexible sí; tirar todo por la borda, no." },
  { title: "🛒 Compra inteligente", body: "Lo que no entra al carrito, no entra a tu boca. Lista keto, lista." },
];

// ---------------------------------------------------------
// Enfoques disponibles y selección
// ---------------------------------------------------------

export type MomentKinds =
  | "animo"
  | "amorpropio"
  | "reflexion"
  | "metas"
  | "alerta"
  | "antojos"
  | "hidratacion"
  | "orgullo"
  | "fe"
  | "transformacion"
  | "weekend";

const POOLS: Record<MomentKinds, PushMessage[]> = {
  animo: ANIMO,
  amorpropio: AMORPROPIO,
  reflexion: REFLEXION,
  metas: METAS,
  alerta: ALERTA,
  antojos: ANTOJOS,
  hidratacion: HIDRATACION,
  orgullo: ORGULLO,
  fe: FE,
  transformacion: TRANSFORMACION,
  weekend: WEEKEND,
};

/** Mensaje de bienvenida original (fijo, solo 1ª vez) */
export function welcomeMessage(): PushMessage {
  return WELCOME;
}

/** Saludo de re-encuentro al iniciar sesión (no es la primera vez) */
export function randomBienvenidaDeVuelta(): PushMessage {
  return pickRandom(BIENVENIDA_DE_VUELTA);
}

/** Mensaje para usuarios inactivos varios días (≥4 días sin registrar) */
export function randomReencuentro(): PushMessage {
  return pickRandom(REENCUENTRO);
}

/**
 * Mensaje del momento actual: elige aleatoriamente uno de los enfoques
 * candidatos del horario y luego un mensaje de ese banco.
 */
export function pickMessageForKinds(kinds: MomentKinds[]): PushMessage {
  const kind = pickRandom(kinds);
  return pickRandom(POOLS[kind]);
}
