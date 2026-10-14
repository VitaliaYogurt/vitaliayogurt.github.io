"use strict";

var config = window.VITALIA;
var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
var saturdays = [];
var current = 0;
var map = null;
var marker = null;
var geocodeToken = 0;
var sending = false;
var locationState = { mode: "idle", lat: null, lng: null, address: "", note: "" };

document.addEventListener("DOMContentLoaded", init);

function init() {
  if (!config) return;
  mountCardImages();
  applyPrices();
  initCarousel();
  initOrder();
}

function money(amount) {
  var n = Number(amount);
  var symbol = config.currency || "$";
  if (Number.isInteger(n)) return symbol + n;
  return symbol + n.toFixed(2);
}

function jarsWord(n) {
  return Number(n) === 1 ? "1 frasco" : n + " frascos";
}

function packsLabel(n) {
  return Number(n) === 1 ? "1 paquete" : n + " paquetes";
}

function applyPrices() {
  var price = money(config.pricePerPack);
  var caption = "por paquete de " + jarsWord(config.jarsPerPack);
  var free = "Envío gratis comprando " + config.freeDeliveryFromPacks + " paquetes";
  var fee = "Envío " + money(config.deliveryFee) + " en otros pedidos";
  document.getElementById("price-amount").textContent = price;
  document.getElementById("price-caption").textContent = caption;
  document.getElementById("ship-free").textContent = free;
  document.getElementById("ship-fee").textContent = fee;
  document.getElementById("unit-price").textContent = price + " " + caption;
  document.getElementById("rule-free").textContent = free;
  document.getElementById("rule-fee").textContent = fee;
  updateTotals();
}

function mountCardImages() {
  var images = config.cardImages || [];
  document.querySelectorAll("[data-card-image]").forEach(function (el) {
    var src = images[Number(el.dataset.cardImage)];
    if (!src) return;
    var img = document.createElement("img");
    img.src = src;
    img.alt = "";
    el.appendChild(img);
  });
}

function initCarousel() {
  var track = document.getElementById("track");
  var cards = Array.prototype.slice.call(track.querySelectorAll(".card"));
  var dots = document.getElementById("dots");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var status = document.getElementById("carousel-status");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var drag = null;
  var wheelLock = false;

  cards.forEach(function (card, index) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.setAttribute("aria-label", "Ver tarjeta " + (index + 1) + ": " + card.dataset.title);
    dot.addEventListener("click", function () { go(index); });
    dots.appendChild(dot);
  });

  function setCurrent(index, announce) {
    index = Math.max(0, Math.min(cards.length - 1, index));
    var changed = index !== current;
    current = index;
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    prev.disabled = index === 0;
    next.disabled = index === cards.length - 1;
    if (announce && changed) {
      status.textContent = "Tarjeta " + (index + 1) + " de " + cards.length + ": " + cards[index].dataset.title;
    }
  }

  function go(index) {
    index = Math.max(0, Math.min(cards.length - 1, index));
    track.scrollTo({
      left: cards[index].offsetLeft,
      behavior: reduced ? "auto" : "smooth"
    });
    setCurrent(index, true);
  }

  prev.addEventListener("click", function () { go(current - 1); });
  next.addEventListener("click", function () { go(current + 1); });

  track.addEventListener("scroll", function () {
    var width = track.clientWidth || 1;
    setCurrent(Math.round(track.scrollLeft / width), true);
  }, { passive: true });

  track.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(current + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(current - 1); }
  });

  track.addEventListener("wheel", function (event) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    if (wheelLock) return;
    wheelLock = true;
    go(current + (event.deltaY > 0 ? 1 : -1));
    setTimeout(function () { wheelLock = false; }, 450);
  }, { passive: false });

  track.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "touch" || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false };
  });

  track.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      track.classList.add("is-dragging");
      track.style.scrollSnapType = "none";
      track.setPointerCapture(event.pointerId);
    }
    track.scrollLeft = drag.left - dx;
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    var moved = drag.moved;
    var width = track.clientWidth || 1;
    var index = Math.round(track.scrollLeft / width);
    drag = null;
    track.classList.remove("is-dragging");
    track.style.scrollSnapType = "";
    if (!moved) return;
    go(index);
  }

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  setCurrent(0, false);
}

function initOrder() {
  var dialog = document.getElementById("order-dialog");
  var form = document.getElementById("order-form");
  var confirmPanel = document.getElementById("confirm");
  var title = document.getElementById("order-title");
  var openBtn = document.getElementById("order-open");

  document.getElementById("wa-bar").href = waLink(config.whatsappGreeting);
  renderFlavors();
  fillDates();
  updateTotals();

  document.getElementById("qty-minus").addEventListener("click", function () {
    setQty(readQty() - 1);
  });
  document.getElementById("qty-plus").addEventListener("click", function () {
    setQty(readQty() + 1);
  });
  document.getElementById("qty").addEventListener("input", updateTotals);
  document.getElementById("qty").addEventListener("blur", function () {
    setQty(readQty());
  });
  document.getElementById("fecha").addEventListener("change", fillTimes);
  document.getElementById("celular").addEventListener("blur", function (event) {
    var national = parsePhone(event.target.value);
    if (national) event.target.value = formatPhone(national);
  });
  document.getElementById("loc-alt").addEventListener("click", function () {
    if (locationState.mode === "manual") startLocate();
    else useManual("Escribe calle, edificio y barrio.");
  });

  form.addEventListener("input", function (event) {
    var field = event.target.closest(".field");
    if (!field) return;
    var err = field.querySelector(".error");
    if (err) {
      err.hidden = true;
      err.textContent = "";
    }
    event.target.removeAttribute("aria-invalid");
  });

  openBtn.addEventListener("click", function () {
    confirmPanel.hidden = true;
    form.hidden = false;
    title.textContent = "Tu pedido";
    dialog.showModal();
    if (locationState.mode === "idle") startLocate();
    else if (locationState.mode === "map") setTimeout(function () { if (map) map.invalidateSize(); }, 180);
  });

  document.getElementById("order-close").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", function () {
    if (!confirmPanel.hidden) resetOrder();
    openBtn.focus();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    submitOrder();
  });

  document.getElementById("confirm-reset").addEventListener("click", function () {
    resetOrder();
    title.textContent = "Tu pedido";
  });
}

function renderFlavors() {
  var box = document.getElementById("flavors");
  var selected = false;
  box.replaceChildren();
  (config.flavors || []).forEach(function (flavor) {
    var label = document.createElement("label");
    label.className = "flavor" + (flavor.available ? "" : " is-soon");
    var input = document.createElement("input");
    input.type = "radio";
    input.name = "sabor";
    input.value = flavor.name;
    if (!flavor.available) input.disabled = true;
    else if (!selected) {
      input.checked = true;
      selected = true;
    }
    var name = document.createElement("span");
    name.className = "flavor-name";
    name.textContent = flavor.name;
    label.append(input, name);
    if (!flavor.available) {
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Próximamente";
      label.append(badge);
    }
    box.append(label);
  });
}

function readQty() {
  var raw = document.getElementById("qty").value.trim();
  if (raw === "") return 1;
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 1;
  return n;
}

function clampQty(n) {
  var max = Number(config.maxPacks) || 20;
  return Math.min(max, Math.max(1, n));
}

function setQty(n) {
  document.getElementById("qty").value = String(clampQty(n));
  updateTotals();
}

function updateTotals() {
  var packs = clampQty(readQty());
  var sub = packs * Number(config.pricePerPack);
  var ship = packs >= Number(config.freeDeliveryFromPacks) ? 0 : Number(config.deliveryFee);
  document.getElementById("sum-sub").textContent = money(sub);
  document.getElementById("sum-ship").textContent = ship === 0 ? "Gratis" : money(ship);
  document.getElementById("sum-total").textContent = money(sub + ship);
  document.getElementById("jar-count").textContent = packsLabel(packs) + " · " + jarsWord(packs * config.jarsPerPack);
  document.getElementById("qty-minus").disabled = packs <= 1;
  document.getElementById("qty-plus").disabled = packs >= Number(config.maxPacks || 20);
}

function panamaParts(date) {
  var fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timeZone || "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23"
  });
  var bag = {};
  fmt.formatToParts(date).forEach(function (part) { bag[part.type] = part.value; });
  var hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: hour,
    minute: Number(bag.minute),
    weekday: bag.weekday,
    iso: bag.year + "-" + bag.month + "-" + bag.day
  };
}

function addDays(iso, days) {
  var bits = iso.split("-").map(Number);
  return panamaParts(new Date(Date.UTC(bits[0], bits[1] - 1, bits[2] + days, 17, 0, 0)));
}

function parseClock(value) {
  var bits = String(value).split(":").map(Number);
  return bits[0] * 60 + (bits[1] || 0);
}

function formatSlot(mins) {
  var h = Math.floor(mins / 60);
  var m = mins % 60;
  return h + ":" + String(m).padStart(2, "0");
}

function timeSlots(nowMinutes) {
  var start = parseClock(config.slotStart);
  var end = parseClock(config.slotEnd);
  var step = Number(config.slotMinutes) || 30;
  var slots = [];
  for (var t = start; t <= end; t += step) {
    if (nowMinutes != null && t <= nowMinutes) continue;
    slots.push(formatSlot(t));
  }
  return slots;
}

function formatSaturday(part) {
  var label = "sábado " + part.day + " de " + MONTHS[part.month - 1];
  if (part.year !== panamaParts(new Date()).year) label += " de " + part.year;
  return label;
}

function upcomingSaturdays(count) {
  var now = panamaParts(new Date());
  var out = [];
  for (var i = 0; i < 90 && out.length < count; i += 1) {
    var part = addDays(now.iso, i);
    if (part.weekday !== "Sat") continue;
    var slots = timeSlots(part.iso === now.iso ? now.hour * 60 + now.minute : null);
    if (!slots.length) continue;
    out.push({ iso: part.iso, label: formatSaturday(part), slots: slots });
  }
  return out;
}

function fillDates() {
  saturdays = upcomingSaturdays(Number(config.saturdayCount) || 8);
  var select = document.getElementById("fecha");
  select.replaceChildren();
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Elige el sábado";
  select.appendChild(placeholder);
  saturdays.forEach(function (day) {
    var option = document.createElement("option");
    option.value = day.iso;
    option.textContent = day.label;
    select.appendChild(option);
  });
  fillTimes();
}

function fillTimes() {
  var select = document.getElementById("hora");
  var day = saturdays.filter(function (item) { return item.iso === document.getElementById("fecha").value; })[0];
  var slots = day ? day.slots : timeSlots(null);
  select.replaceChildren();
  var placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "Elige la hora";
  select.appendChild(placeholder);
  slots.forEach(function (slot) {
    var option = document.createElement("option");
    option.value = slot;
    option.textContent = slot;
    select.appendChild(option);
  });
}

function parsePhone(raw) {
  var digits = String(raw || "").replace(/\D/g, "");
  if (digits.indexOf("00") === 0) digits = digits.slice(2);
  if (digits.indexOf("507") === 0 && (digits.length === 10 || digits.length === 11)) digits = digits.slice(3);
  if ((digits.length === 8 || digits.length === 7) && digits.charAt(0) !== "0") return digits;
  return null;
}

function formatPhone(national) {
  if (!national) return "";
  if (national.length === 8) return "+507 " + national.slice(0, 4) + " " + national.slice(4);
  return "+507 " + national.slice(0, 3) + " " + national.slice(3);
}

function validName(value) {
  var name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return false;
  return /^[\p{L}][\p{L}\s'.-]*$/u.test(name);
}

function selectedFlavor() {
  var el = document.querySelector('input[name="sabor"]:checked:not(:disabled)');
  return el ? el.value : "";
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(function (el) {
    el.hidden = true;
    el.textContent = "";
  });
  document.querySelectorAll("[aria-invalid]").forEach(function (el) {
    el.removeAttribute("aria-invalid");
  });
  var alert = document.getElementById("form-alert");
  alert.hidden = true;
  alert.textContent = "";
}

function showErrors(errors) {
  clearErrors();
  var alert = document.getElementById("form-alert");
  alert.hidden = false;
  alert.textContent = "Revisa los campos marcados.";
  errors.forEach(function (item) {
    var err = document.getElementById("err-" + item[0]);
    if (err) {
      err.hidden = false;
      err.textContent = item[1];
    }
    var field = document.getElementById("field-" + item[0]);
    var control = field && field.querySelector("input, select, textarea");
    if (control) control.setAttribute("aria-invalid", "true");
  });
  alert.scrollIntoView({ block: "nearest" });
  focusField(errors[0][0]);
}

function focusField(id) {
  if (id === "sabor") {
    var radio = document.querySelector('#field-sabor input:not(:disabled)');
    if (radio) radio.focus();
    return;
  }
  if (id === "direccion" && locationState.mode !== "manual") {
    document.getElementById("loc-alt").focus();
    return;
  }
  var el = document.getElementById(id);
  if (el) el.focus();
}

function validate() {
  var errors = [];
  var packs = readQty();
  if (!Number.isFinite(packs) || packs < 1 || packs > Number(config.maxPacks || 20)) {
    errors.push(["qty", "Elige entre 1 y " + (config.maxPacks || 20) + " paquetes."]);
  }
  var flavor = selectedFlavor();
  var known = (config.flavors || []).some(function (item) { return item.available && item.name === flavor; });
  if (!known) errors.push(["sabor", "Elige un sabor disponible."]);
  var day = saturdays.filter(function (item) { return item.iso === document.getElementById("fecha").value; })[0];
  if (!day) errors.push(["fecha", "Elige un sábado."]);
  var hora = document.getElementById("hora").value;
  if (!day || day.slots.indexOf(hora) === -1) errors.push(["hora", "Elige un horario entre 9:00 y 14:00."]);
  if (!validName(document.getElementById("nombre").value)) errors.push(["nombre", "Escribe tu nombre."]);
  if (!parsePhone(document.getElementById("celular").value)) errors.push(["celular", "Escribe un celular de Panamá, por ejemplo 6838 4321."]);
  if (locationState.mode === "map") {
    if (!Number.isFinite(locationState.lat) || !Number.isFinite(locationState.lng)) {
      errors.push(["direccion", "Arrastra el pin hasta el punto de entrega."]);
    }
  } else if (locationState.mode === "manual") {
    if (document.getElementById("direccion").value.trim().length < 8) {
      errors.push(["direccion", "Escribe la dirección de entrega."]);
    }
  } else {
    errors.push(["direccion", "Espera la ubicación o escribe la dirección."]);
  }
  return errors;
}

function buildOrder() {
  var packs = clampQty(readQty());
  var subtotal = packs * Number(config.pricePerPack);
  var envio = packs >= Number(config.freeDeliveryFromPacks) ? 0 : Number(config.deliveryFee);
  var day = saturdays.filter(function (item) { return item.iso === document.getElementById("fecha").value; })[0];
  var manual = locationState.mode === "manual";
  var direccion = manual
    ? document.getElementById("direccion").value.trim().replace(/\s+/g, " ")
    : (locationState.address || ("Pin en el mapa (" + locationState.lat.toFixed(5) + ", " + locationState.lng.toFixed(5) + ")"));
  return {
    nombre: document.getElementById("nombre").value.trim().replace(/\s+/g, " "),
    celular: formatPhone(parsePhone(document.getElementById("celular").value)),
    sabor: selectedFlavor(),
    paquetes: packs,
    frascos: packs * Number(config.jarsPerPack),
    fecha: day ? day.label : "",
    fechaISO: day ? day.iso : "",
    hora: document.getElementById("hora").value,
    direccion: direccion,
    latitud: manual ? null : round6(locationState.lat),
    longitud: manual ? null : round6(locationState.lng),
    maps: manual ? "" : mapsLink(locationState.lat, locationState.lng),
    comentarios: document.getElementById("comentarios").value.trim(),
    subtotal: subtotal,
    envio: envio,
    total: subtotal + envio
  };
}

function round6(n) {
  return Math.round(Number(n) * 1e6) / 1e6;
}

function mapsLink(lat, lng) {
  return "https://www.google.com/maps?q=" + Number(lat).toFixed(6) + "," + Number(lng).toFixed(6);
}

function waLink(text) {
  var number = String(config.whatsappNumber || "").replace(/\D/g, "");
  if (!text) return "https://wa.me/" + number;
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(text);
}

function orderMessage(order) {
  var lines = [
    "Hola Vitalia, quiero confirmar este pedido:",
    "",
    "Sabor: " + order.sabor,
    "Cantidad: " + packsLabel(order.paquetes) + " (" + jarsWord(order.frascos) + ")",
    "Entrega: " + order.fecha + ", " + order.hora,
    "Nombre: " + order.nombre,
    "Celular: " + order.celular,
    "Dirección: " + order.direccion
  ];
  if (order.maps) lines.push("Mapa: " + order.maps);
  if (order.comentarios) lines.push("Comentarios: " + order.comentarios);
  lines.push(
    "",
    "Yogur: " + money(order.subtotal),
    "Envío: " + (order.envio === 0 ? "gratis" : money(order.envio)),
    "Total: " + money(order.total)
  );
  return lines.join("\n");
}

async function postOrder(order) {
  var url = String(config.endpointUrl || "").trim();
  if (!url) {
    console.warn("Vitalia: endpointUrl está vacío en js/config.js. El pedido no se envió a la hoja. La confirmación se muestra igual y WhatsApp lleva el pedido.");
    return "unconfigured";
  }
  try {
    var res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(order),
      redirect: "follow",
      signal: AbortSignal.timeout(15000)
    });
    var text = await res.text();
    var data = null;
    try { data = JSON.parse(text); } catch (e) { data = null; }
    if (res.ok && data && data.ok) return "sent";
    console.warn("Vitalia: el registro no confirmó el pedido.", String(text).slice(0, 180));
    return "error";
  } catch (err) {
    console.warn("Vitalia: no se pudo enviar el pedido al registro.", err);
    return "error";
  }
}

async function submitOrder() {
  if (sending) return;
  var errors = validate();
  if (errors.length) {
    showErrors(errors);
    return;
  }
  clearErrors();
  var order = buildOrder();
  var button = document.getElementById("submit-order");
  sending = true;
  button.disabled = true;
  button.textContent = "Enviando…";
  var status = "error";
  try {
    status = await postOrder(order);
  } finally {
    sending = false;
    button.disabled = false;
    button.textContent = "Confirmar pedido";
  }
  showConfirmation(order, status);
}

function showConfirmation(order, status) {
  var leads = {
    sent: "Recibimos tu pedido. Te escribimos para confirmar la entrega.",
    unconfigured: "Tu pedido está listo. Envíalo por WhatsApp para que lo anotemos.",
    error: "No se pudo anotar solo. Envíalo por WhatsApp y lo preparamos igual."
  };
  document.getElementById("order-title").textContent = "Pedido listo";
  document.getElementById("order-form").hidden = true;
  var panel = document.getElementById("confirm");
  panel.hidden = false;
  document.getElementById("confirm-lead").textContent = leads[status] || leads.error;
  var rows = [
    ["Sabor", order.sabor],
    ["Cantidad", packsLabel(order.paquetes) + " · " + jarsWord(order.frascos)],
    ["Entrega", order.fecha + ", " + order.hora],
    ["Nombre", order.nombre],
    ["Celular", order.celular],
    ["Dirección", order.direccion]
  ];
  if (order.comentarios) rows.push(["Comentarios", order.comentarios]);
  rows.push(["Envío", order.envio === 0 ? "Gratis" : money(order.envio)]);
  rows.push(["Total", money(order.total)]);
  var list = document.getElementById("confirm-list");
  list.replaceChildren();
  rows.forEach(function (row) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt");
    var dd = document.createElement("dd");
    dt.textContent = row[0];
    dd.textContent = row[1];
    wrap.append(dt, dd);
    list.append(wrap);
  });
  var link = document.getElementById("confirm-wa");
  link.href = waLink(orderMessage(order));
  document.querySelector(".sheet-body").scrollTop = 0;
  link.focus();
}

function resetOrder() {
  document.getElementById("order-form").reset();
  document.getElementById("order-form").hidden = false;
  document.getElementById("confirm").hidden = true;
  document.getElementById("qty").value = "1";
  clearErrors();
  fillDates();
  updateTotals();
  renderFlavors();
  if (locationState.mode === "manual") {
    locationState.note = "Escribe calle, edificio y barrio.";
    renderLocation();
  }
}

function renderLocation() {
  var mode = locationState.mode;
  document.getElementById("map").hidden = mode !== "map";
  document.getElementById("pin-coords").hidden = mode !== "map";
  document.getElementById("map-address").hidden = mode !== "map";
  document.getElementById("manual-wrap").hidden = mode !== "manual";
  var alt = document.getElementById("loc-alt");
  var status = document.getElementById("loc-status");
  if (mode === "map") {
    status.textContent = "Arrastra el pin hasta la puerta.";
    alt.textContent = "Escribir la dirección";
  } else if (mode === "manual") {
    status.textContent = locationState.note || "Escribe la dirección de entrega.";
    alt.textContent = "Usar mi ubicación";
  } else {
    status.textContent = "Buscando tu ubicación para poner el pin.";
    alt.textContent = "Escribir la dirección";
  }
}

function useManual(note) {
  locationState.mode = "manual";
  locationState.note = note || "";
  renderLocation();
}

function startLocate() {
  locationState.mode = "locating";
  renderLocation();
  if (!navigator.geolocation) {
    useManual("Tu navegador no comparte la ubicación. Escribe la dirección.");
    return;
  }
  navigator.geolocation.getCurrentPosition(function (pos) {
    if (locationState.mode === "manual") return;
    showMap(pos.coords.latitude, pos.coords.longitude);
  }, function () {
    if (locationState.mode === "manual") return;
    useManual("No pudimos usar tu ubicación. Escribe la dirección.");
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
}

function showMap(lat, lng) {
  if (!window.L) {
    useManual("El mapa no cargó. Escribe la dirección.");
    return;
  }
  locationState.mode = "map";
  renderLocation();
  ensureMap(lat, lng);
  setPin(lat, lng, true);
}

function ensureMap(lat, lng) {
  if (!map) {
    map = L.map("map", { zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    marker = L.marker([lat, lng], {
      draggable: true,
      autoPan: true,
      icon: L.divIcon({
        className: "pin-icon",
        html: '<span class="pin-shape"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 26]
      })
    }).addTo(map);
    marker.on("drag", function () {
      var point = marker.getLatLng();
      setPin(point.lat, point.lng, false);
    });
    marker.on("dragend", function () {
      var point = marker.getLatLng();
      setPin(point.lat, point.lng, true);
    });
  } else {
    marker.setLatLng([lat, lng]);
  }
  map.setView([lat, lng], 16);
  requestAnimationFrame(function () { map.invalidateSize(); });
  setTimeout(function () { map.invalidateSize(); }, 200);
}

function setPin(lat, lng, geocode) {
  locationState.mode = "map";
  locationState.lat = lat;
  locationState.lng = lng;
  var coords = document.getElementById("pin-coords");
  coords.hidden = false;
  coords.textContent = lat.toFixed(5) + ", " + lng.toFixed(5);
  if (geocode) reverseGeocode(lat, lng);
}

async function reverseGeocode(lat, lng) {
  var token = ++geocodeToken;
  var address = document.getElementById("map-address");
  address.hidden = false;
  address.textContent = "Buscando la calle…";
  try {
    var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng + "&accept-language=es";
    var res = await fetch(url);
    if (!res.ok) throw new Error("geo");
    var data = await res.json();
    if (token !== geocodeToken) return;
    locationState.address = data.display_name || "";
    address.textContent = locationState.address || "Arrastra el pin si hay que corregirlo.";
  } catch (e) {
    if (token !== geocodeToken) return;
    locationState.address = "";
    address.textContent = "Arrastra el pin hasta el punto de entrega.";
  }
}
