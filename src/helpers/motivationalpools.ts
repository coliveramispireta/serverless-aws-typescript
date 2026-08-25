/**
 * Banco de mensajes para notificaciones automáticas KetoFlow.
 * Tono cercano del coach: ánimo, resistencia, hidratación y re-encuentro.
 */

export interface PushMessage {
  title: string;
  body: string;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// ---------------------------------------------------------
// 🎉 Bienvenida (se envía al activar notificaciones)
// ---------------------------------------------------------
const WELCOME: PushMessage = {
  title: "🎉 ¡Bienvenido/a a KetoFlow!",
  body: "Notificaciones activadas. Aquí recibirás ánimo, recordatorios y cariño de tu coach.",
};

// ---------------------------------------------------------
// 💪 Motivación diaria (mañanas)
// ---------------------------------------------------------
const MOTIVACION: PushMessage[] = [
  { title: "💪 Buenos días", body: "Tu constancia de hoy es tu resultado de mañana. ¡Vamos!" },
  { title: "☀️ Nuevo día", body: "Desayuna proteína, bebe agua y sal a conquistar el día." },
  { title: "🔥 Sigue así", body: "Cada comida keto que eliges le resta poder al antojo." },
  { title: "💚 Recuerda", body: "No busques perfección: busca no dejar de avanzar." },
  { title: "🎯 Meta de hoy", body: "Registra tus comidas y tu peso. Lo que se mide, mejora." },
  { title: "🌱 Pequeños pasos", body: "Elegir bien HOY es el secreto de la transformación." },
  {
    title: "🧠 Dato keto",
    body: "Las cetonas alimentan tu cerebro con energía estable todo el día.",
  },
];

// ---------------------------------------------------------
// 💧 Hidratación (tardes)
// ---------------------------------------------------------
const HIDRATACION: PushMessage[] = [
  { title: "💧 Hidrátate bien", body: "Vaso de agua ahora: menos antojos, mejor energía." },
  {
    title: "🚰 ¿Ya tomaste agua?",
    body: "Apunta a 2 litros hoy. Tu piel y tu báscula lo agradecen.",
  },
  {
    title: "💧 Agua + sal",
    body: "Un pellizco de sal bajo la lengua y sorbos despacio si sientes fatiga.",
  },
  { title: "🥤 Truco", body: "Agua mineral con limón cuenta igual y sabe a premio." },
  {
    title: "🌊 Recordatorio azul",
    body: "Tu cerebro rendirá más esta tarde si te hidratas ahora.",
  },
];

// ---------------------------------------------------------
// 🛡️ Fin de semana / no te excedas (viernes)
// ---------------------------------------------------------
const NO_EXCEDAS: PushMessage[] = [
  {
    title: "🛡️ Fin de semana a la vista",
    body: "Disfruta sin excederte: carne asada > postre. Tú decides.",
  },
  {
    title: "⚠️ Zona de riesgo",
    body: "En la reunión: llena el plato de proteína primero, postre después (si cabe).",
  },
  {
    title: "🍋 Anticipo de antojo",
    body: "Si va a tentarte algo dulce, agua con limón antes de decidir.",
  },
  {
    title: "🧭 Norte claro",
    body: "Un fin de semana consciente vale más que una semana perfecta.",
  },
];

// ---------------------------------------------------------
// 😢 Re-encuentro (usuario inactivo varios días)
// ---------------------------------------------------------
const REENCUENTRO: PushMessage[] = [
  {
    title: "😢 Estoy triste…",
    body: "Ya hace días sin saber de ti. Tu progreso sigue aquí, esperándote.",
  },
  {
    title: "💔 Te extrañamos",
    body: "Retoma hoy con un solo paso: regístrate en la báscula. Sin culpas.",
  },
  {
    title: "💬 Tu coach pregunta por ti",
    body: "Vuelve, registra cómo vas y sigamos juntos este camino.",
  },
  {
    title: "🌱 Nunca es tarde",
    body: "Lo bueno de empezar otra vez: ya sabes que puedes lograrlo.",
  },
];

// ---------------------------------------------------------
// Envío
// ---------------------------------------------------------

/** Mensaje de bienvenida (fijo) */
export function welcomeMessage(): PushMessage {
  return WELCOME;
}

/** Mensaje motivacional aleatorio de la mañana */
export function randomMotivation(): PushMessage {
  return pickRandom(MOTIVACION);
}

/** Recordatorio de hidratación aleatorio */
export function randomHydration(): PushMessage {
  return pickRandom(HIDRATACION);
}

/** Aviso de fin de semana / no te excedas */
export function randomWeekend(): PushMessage {
  return pickRandom(NO_EXCEDAS);
}

/**
 * Mensaje de re-encuentro para usuarios inactivos.
 * Se usa en lugar de los genéricos cuando lleva ≥4 días sin registrar.
 */
export function randomReencuentro(): PushMessage {
  return pickRandom(REENCUENTRO);
}
