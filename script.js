const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const textoDetectado = document.getElementById('textoDetectado');
const precioDetectado = document.getElementById('precioDetectado');
const precioManual = document.getElementById('precioManual');
const btnConvertir = document.getElementById('btnConvertir');
const resultadoConversion = document.getElementById('resultadoConversion');

let precioEncontrado = null;

// Cuando el usuario selecciona una imagen
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vista previa
    const reader = new FileReader();
    reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="Vista previa">`;
    };
    reader.readAsDataURL(file);

    textoDetectado.textContent = "Leyendo imagen... espera un momento";
    precioDetectado.textContent = "-";
    precioManual.value = "";
    resultadoConversion.textContent = "";
    precioEncontrado = null;

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'spa+eng', {
            logger: m => console.log(m)
        });

        textoDetectado.textContent = text || "No se pudo leer texto";

        // Buscar números (precios)
        const precios = text.match(/\d{1,8}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g);

        if (precios && precios.length > 0) {
            // Tomar el número más largo
            let precioTexto = precios.reduce((a, b) => a.length >= b.length ? a : b);
            let precioLimpio = precioTexto.replace(/[^\d]/g, '');
            precioEncontrado = parseFloat(precioLimpio);

            precioDetectado.textContent = precioEncontrado.toFixed(2);
            precioManual.value = precioEncontrado; // Rellenar el campo manual también
        } else {
            precioDetectado.textContent = "No se detectó ningún precio";
            precioEncontrado = null;
        }
    } catch (error) {
        textoDetectado.textContent = "Error al leer la imagen";
        console.error(error);
    }
});

// Convertir
btnConvertir.addEventListener('click', async () => {
    // Prioridad: si hay precio manual, usar ese
    const manual = parseFloat(precioManual.value);
    if (!isNaN(manual) && manual > 0) {
        precioEncontrado = manual;
    }

    if (!precioEncontrado || precioEncontrado <= 0) {
        alert("Escribe un precio válido o sube una imagen clara");
        return;
    }

    const origen = document.getElementById('monedaOrigen').value;
    const destino = document.getElementById('monedaDestino').value;

    if (origen === destino) {
        resultadoConversion.textContent = `${precioEncontrado.toFixed(2)} ${origen}`;
        return;
    }

    resultadoConversion.textContent = "Convirtiendo...";

    try {
        const respuesta = await fetch(`https://api.exchangerate-api.com/v4/latest/${origen}`);
        const datos = await respuesta.json();
        const tasa = datos.rates[destino];
        const convertido = (precioEncontrado * tasa).toFixed(2);

        resultadoConversion.textContent = `${precioEncontrado} ${origen} = ${convertido} ${destino}`;
    } catch (error) {
        resultadoConversion.textContent = "Error al obtener las tasas de cambio";
        console.error(error);
    }
});
