const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const textoDetectado = document.getElementById('textoDetectado');
const precioDetectado = document.getElementById('precioDetectado');
const precioManual = document.getElementById('precioManual');
const btnConvertir = document.getElementById('btnConvertir');
const resultadoConversion = document.getElementById('resultadoConversion');

let precioEncontrado = null;

// Función para preprocesar la imagen
function preprocessImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const maxWidth = 1200;
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const value = avg > 140 ? 255 : 0;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas);
            };
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Cuando seleccionan una imagen
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="Vista previa">`;
    };
    reader.readAsDataURL(file);

    textoDetectado.textContent = "Procesando imagen... espera un momento";
    precioDetectado.textContent = "-";
    precioManual.value = "";
    resultadoConversion.textContent = "";
    precioEncontrado = null;

    try {
        const processedCanvas = await preprocessImage(file);

        const { data: { text } } = await Tesseract.recognize(processedCanvas, 'spa+eng', {
            logger: m => console.log(m),
            tessedit_pageseg_mode: 6
        });

        textoDetectado.textContent = text || "No se pudo leer texto";

        // Buscar números
        const precios = text.match(/\d{1,8}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+/g);

        if (precios && precios.length > 0) {
            // Tomar el número más largo
            let precioTexto = precios.reduce((a, b) => a.length >= b.length ? a : b);

            // Limpiar el número de forma más segura
            let precioLimpio = precioTexto;

            // Quitar puntos de miles y dejar solo el decimal si existe
            if (precioLimpio.includes(',') && precioLimpio.includes('.')) {
                // Tiene ambos: el último es el decimal
                if (precioLimpio.lastIndexOf(',') > precioLimpio.lastIndexOf('.')) {
                    precioLimpio = precioLimpio.replace(/\./g, '').replace(',', '.');
                } else {
                    precioLimpio = precioLimpio.replace(/,/g, '');
                }
            } else if (precioLimpio.includes(',')) {
                const partes = precioLimpio.split(',');
                if (partes[1] && partes[1].length <= 2) {
                    // Es decimal (ej: 2,68)
                    precioLimpio = precioLimpio.replace(',', '.');
                } else {
                    // Es separador de miles (ej: 19,900)
                    precioLimpio = precioLimpio.replace(/,/g, '');
                }
            } else {
                // Solo tiene puntos o nada
                const partes = precioLimpio.split('.');
                if (partes.length > 1 && partes[partes.length - 1].length > 2) {
                    // Puntos de miles
                    precioLimpio = precioLimpio.replace(/\./g, '');
                }
            }

            // Dejar solo números y punto decimal
            precioLimpio = precioLimpio.replace(/[^\d.]/g, '');

            precioEncontrado = parseFloat(precioLimpio);

            if (!isNaN(precioEncontrado) && precioEncontrado > 0) {
                precioDetectado.textContent = precioEncontrado.toFixed(2);
                precioManual.value = precioEncontrado;
            } else {
                precioDetectado.textContent = "No se detectó ningún precio";
                precioEncontrado = null;
            }
        } else {
            precioDetectado.textContent = "No se detectó ningún precio";
            precioEncontrado = null;
        }
    } catch (error) {
        textoDetectado.textContent = "Error al leer la imagen";
        console.error(error);
    }
});

// Botón convertir
btnConvertir.addEventListener('click', async () => {
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
