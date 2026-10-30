const imageInput = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const textoDetectado = document.getElementById('textoDetectado');
const precioDetectado = document.getElementById('precioDetectado');
const btnConvertir = document.getElementById('btnConvertir');
const resultadoConversion = document.getElementById('resultadoConversion');

let precioEncontrado = null;

// Cuando el usuario selecciona una imagen
imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = () => {
        preview.innerHTML = `<img src="${reader.result}" alt="Vista previa">`;
    };
    reader.readAsDataURL(file);

    // Leer texto de la imagen con Tesseract
    textoDetectado.textContent = "Leyendo imagen... por favor espera";
    precioDetectado.textContent = "-";
    resultadoConversion.textContent = "";

    try {
        const { data: { text } } = await Tesseract.recognize(file, 'spa+eng', {
            logger: m => console.log(m)
        });

        textoDetectado.textContent = text;

        // Buscar números que parezcan precios (más robusto)
        const precios = text.match(/\d{1,7}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g);

        if (precios && precios.length > 0) {
            // Tomamos el número más largo encontrado (normalmente es el precio)
            let precioTexto = precios.reduce((a, b) => a.length >= b.length ? a : b);
    
            // Limpiamos: quitamos todo lo que no sea número
            let precioLimpio = precioTexto.replace(/[^\d]/g, '');
    
            precioEncontrado = parseFloat(precioLimpio);
            precioDetectado.textContent = precioEncontrado.toFixed(2);
        } else {
             precioDetectado.textContent = "No se detectó ningún precio";
            precioEncontrado = null;
        }
    } catch (error) {
        textoDetectado.textContent = "Error al leer la imagen";
        console.error(error);
    }
});

// Convertir el precio
btnConvertir.addEventListener('click', async ent => {
    if (!precioEncontrado) {
        alert("Primero sube una imagen con un precio válido");
        return;
    }

    const origen = document.getElementById('monedaOrigen').value;
    const destino = document.getElementById('monedaDestino').value;

    if (origen === destino) {
        resultadoConversion.textContent = `Mismo valor: ${precioEncontrado.toFixed(2)} ${destino}`;
        return;
    }

    resultadoConversion.textContent = "Convirtiendo...";

    try {
        // API gratuita de tasas de cambio
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