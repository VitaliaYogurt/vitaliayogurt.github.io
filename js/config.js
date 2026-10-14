/* Vitalia — este es el único archivo que hay que editar.
   Precios, WhatsApp, colores y el enlace de Google.
   endpointUrl se queda vacío hasta el paso de la guía (README). */
window.VITALIA = {
  whatsappNumber: "50768384321",
  whatsappGreeting: "Hola Vitalia, quiero hacer un pedido.",

  // Pega aquí el enlace de la aplicación web de Google Apps Script.
  // Mientras esté vacío, la página igual confirma el pedido y ofrece WhatsApp.
  endpointUrl: "",

  currency: "$",
  pricePerPack: 9,
  jarsPerPack: 4,
  deliveryFee: 5,
  freeDeliveryFromPacks: 2,
  maxPacks: 20,

  saturdayCount: 8,
  timeZone: "America/Panama",
  slotStart: "9:00",
  slotEnd: "14:00",
  slotMinutes: 30,

  flavors: [
    { name: "Natural", available: true },
    { name: "Mango", available: false },
    { name: "Vainilla", available: false },
  ],

  // Opcional. Pon una ruta para mostrar una foto en esa tarjeta.
  // Ejemplo: "assets/cards/colageno.jpg"
  cardImages: [null, null, null, null],

  colors: {
    canvas: "#FFF3EE",
    frame: "#FFD0D8",
    background: "#FFF7F4",
    surface: "#FFFFFF",
    ink: "#1C1220",
    muted: "#5E4450",
    strawberry: "#FF4D6D",
    butter: "#FFE14A",
    mint: "#5EE6C2",
    berry: "#D0124A",
    blush: "#FFE1EA",
    line: "#F0D4DC",
    whatsapp: "#0F7A3A",
    danger: "#9C1C38",
  },
};

(function applyVitaliaColors() {
  var colors = window.VITALIA.colors;
  var root = document.documentElement;
  var map = {
    "--canvas": colors.canvas,
    "--frame": colors.frame,
    "--bg": colors.background,
    "--surface": colors.surface,
    "--ink": colors.ink,
    "--muted": colors.muted,
    "--strawberry": colors.strawberry,
    "--butter": colors.butter,
    "--mint": colors.mint,
    "--berry": colors.berry,
    "--blush": colors.blush,
    "--line": colors.line,
    "--whatsapp": colors.whatsapp,
    "--danger": colors.danger,
  };
  Object.keys(map).forEach(function (key) {
    root.style.setProperty(key, map[key]);
  });
})();
