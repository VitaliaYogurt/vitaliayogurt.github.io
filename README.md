# Vitalia

Página para pedir el yogur de colágeno de Vitalia desde el celular. Está en español, no tiene servidor de pago y se puede publicar gratis.

El cliente ve cuatro tarjetas, un botón para ordenar y un botón de WhatsApp. El pedido pide sabor, cantidad, un sábado, una hora entre 9:00 y 14:00, nombre, celular y dirección. Si el navegador deja, el cliente marca la puerta en un mapa.

Una cajita de 4 frascos cuesta $9. El envío es $5. Con 2 cajitas o más, el envío es gratis.

## Verla en tu computadora

Abre una terminal en esta carpeta y escribe:

```bash
python3 -m http.server 8741
```

Después abre [http://127.0.0.1:8741](http://127.0.0.1:8741) en el navegador. No abras `index.html` con doble clic: el mapa y el envío del pedido necesitan una dirección de verdad.

## Lo único que tienes que editar

Abre `js/config.js`.

- `whatsappNumber`: ya está el celular de Vitalia, `50768384321`.
- `endpointUrl`: el enlace de Google. Déjalo como `""` hasta completar el paso de más abajo. Mientras esté vacío, la página igual muestra la confirmación y arma el mensaje de WhatsApp.
- `pricePerPack`: precio de una cajita. Hoy es `9`.
- `jarsPerPack`: frascos en cada cajita. Hoy es `4`.
- `deliveryFee`: envío de una sola cajita. Hoy es `5`.
- `freeDeliveryFromPacks`: desde cuántas cajitas el envío es gratis. Hoy es `2`.
- `flavors`: Natural se puede pedir. Mango y Vainilla dicen «Próximamente». Para activar uno, cambia su `available` a `true`.
- `colors`: los colores de la página.
- `cardImages`: déjalo en `null`. Cuando tengas fotos, pon la ruta de cada una, por ejemplo `"assets/cards/colageno.jpg"`.

Si cambias un precio aquí, cambia en las tarjetas y en el formulario. Después vuelve a publicar la página.

## Publicar gratis

Sube toda la carpeta: `index.html`, `css`, `js`, `assets` y `.nojekyll`. El archivo `apps-script/Codigo.gs` no es la página; se pega en Google, en el paso de abajo. Si también lo subes, no estorba.

### La forma más fácil: Netlify Drop

1. Entra a [https://app.netlify.com/drop](https://app.netlify.com/drop).
2. Crea una cuenta si te la pide. Puedes usar tu cuenta de Google.
3. Arrastra la carpeta del sitio a esa página.
4. Espera un momento. Netlify te da un enlace. Ese enlace es tu página.
5. Ábrelo en el celular y desliza las tarjetas.

Para actualizar: entra a tu sitio en Netlify, ve a Deploys y arrastra la carpeta otra vez.

### GitHub Pages

1. Crea una cuenta en [https://github.com](https://github.com).
2. Crea un repositorio nuevo. Puede llamarse `vitalia` y ser público.
3. Sube los archivos con Add file → Upload files. `index.html` tiene que quedar en la primera lista, no dentro de otra carpeta.
4. Settings → Pages → Branch: `main` y carpeta `/` (root) → Save.
5. Espera uno o dos minutos. El enlace se parece a `https://tuusuario.github.io/vitalia/`.

### Vercel

1. Entra a [https://vercel.com](https://vercel.com) y crea una cuenta.
2. Add New → Project y sube esta carpeta, o conéctala si ya está en GitHub.
3. No cambies ningún ajuste de build. Deploy.

## Recibir los pedidos en una hoja y por correo

Esto también es gratis. Usa la misma cuenta de Google con la que lees el correo.

1. Abre [https://sheets.new](https://sheets.new). Se crea una hoja en blanco.
2. Ponle de nombre `Pedidos Vitalia`.
3. Arriba, abre Extensiones → Apps Script.
4. Borra el código que aparece y pega todo el contenido de `apps-script/Codigo.gs`.
5. Guarda (el ícono del disco, o Ctrl+S).
6. Arriba a la derecha, pulsa Implementar → Nueva implementación.
7. Junto a «Seleccionar tipo», abre el engranaje y elige Aplicación web.
8. Ejecutar como: Yo.
9. Quién tiene acceso: Cualquier persona.
10. Pulsa Implementar.
11. Google pide permiso. Es tu propio script. Si dice que la app no está verificada, abre Configuración avanzada y luego «Ir a Pedidos Vitalia (no seguro)». Después, Permitir.
12. Copia el enlace de la aplicación web. Termina en `/exec`.
13. Ábrelo en el navegador. Tienes que ver esta frase: `Vitalia: el registro de pedidos está activo.` Si te pide iniciar sesión, el acceso no quedó en «Cualquier persona». Repite el paso 9.
14. Pega ese enlace en `js/config.js`, entre las comillas de `endpointUrl`:

```javascript
endpointUrl: "https://script.google.com/macros/s/el-enlace-largo/exec",
```

15. Guarda y vuelve a publicar la página (arrastra la carpeta otra vez, o sube de nuevo los archivos).

`CORREO_DESTINO` puede quedarse vacío. El correo llega a la cuenta que publicó el script. Si quieres otra bandeja, escribe el correo entre las comillas de esa línea y vuelve a publicar una versión nueva del script (abajo).

### Probar

Haz un pedido de prueba con tu celular. En la hoja debe aparecer una fila con nombre, sabor, sábado, hora, dirección, el punto del mapa y el total. También debe llegar un correo. Si no está en la bandeja, mira el spam. La fila de la hoja es el registro que manda.

### Si cambias el script más adelante

Implementar → Administrar implementaciones → el lápiz → Versión: Nueva versión → Implementar. El enlace sigue igual. No hace falta cambiar `endpointUrl`.

## Qué anota cada pedido

Fecha y hora de Panamá, nombre, celular, sabor, cajitas, frascos, sábado, hora, dirección, latitud, longitud, un enlace para abrir el mapa, comentarios, subtotal, envío y total.

## Horario de entrega

Solo sábados, hora de Panamá. La página ofrece los próximos 8. Las horas van de 9:00 a 14:00, cada 30 minutos: 9:00, 9:30, 10:00 y así hasta las 14:00. Si hoy es sábado y una hora ya pasó, esa hora no aparece.

## Si algo no sale

- El pedido no llega a la hoja: el enlace tiene que terminar en `/exec`, el acceso tiene que ser «Cualquier persona» y, si cambiaste el script, tienes que publicar una versión nueva.
- El mapa no aparece: el navegador bloqueó la ubicación. La página pide la dirección escrita. También puedes pulsar «Usar mi ubicación» y aceptar el permiso.
- WhatsApp no abre el chat: revisa `whatsappNumber` en `js/config.js`.
- Cambiaste el precio en la computadora y la página pública sigue igual: hay que volver a subir la carpeta.
