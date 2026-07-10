/**
 * Calcula la distancia de Levenshtein entre dos cadenas de texto.
 * Mide el número mínimo de operaciones requeridas para transformar una cadena en otra.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp: number[][] = [];
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;

  for (let i = 0; i <= alen; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= blen; j++) {
    tmp[0][j] = j;
  }

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // eliminación
        tmp[i][j - 1] + 1, // inserción
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // sustitución
      );
    }
  }
  return tmp[alen][blen];
}

/**
 * Normaliza la distancia de Levenshtein para obtener un porcentaje de similitud entre 0.0 y 1.0.
 */
export function getStringSimilarity(a: string, b: string): number {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA === cleanB) return 1.0;

  const distance = getLevenshteinDistance(cleanA, cleanB);
  const maxLength = Math.max(cleanA.length, cleanB.length);
  return 1.0 - distance / maxLength;
}

/**
 * Calcula el coeficiente de Sorensen-Dice entre dos cadenas.
 * Es excelente para identificar similitud basada en la combinación de letras (bigramas).
 * Ayuda a detectar palabras con el orden invertido (ej. "Carlos Sanchez" vs "Sanchez Carlos").
 */
export function getDiceCoefficient(a: string, b: string): number {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();
  if (cleanA === cleanB) return 1.0;
  if (cleanA.length < 2 || cleanB.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(cleanA);
  const bigramsB = getBigrams(cleanB);

  let intersection = 0;
  bigramsA.forEach((bigram) => {
    if (bigramsB.has(bigram)) {
      intersection++;
    }
  });

  return (2.0 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Normaliza una cadena de texto eliminando acentos/diacríticos, caracteres especiales
 * y espacios múltiples para poder comparar nombres de forma limpia.
 */
export const normalizeName = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '') // Conserva letras, números y espacios
    .replace(/\s+/g, ' ') // Reemplaza múltiples espacios por uno solo
    .trim();
};

/**
 * Devuelve el porcentaje máximo de similitud entre dos nombres (0.0 a 1.0)
 * combinando Levenshtein y Sorensen-Dice.
 */
export function checkSimilarity(name1: string, name2: string): number {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0.0;

  const simLev = getStringSimilarity(n1, n2);
  const simDice = getDiceCoefficient(n1, n2);

  return Math.max(simLev, simDice);
}

/**
 * Verifica si un nombre de cliente es genérico y repetitivo.
 */
export function isGenericClientName(name: string): boolean {
  const normalized = normalizeName(name);
  const genericTerms = [
    'cliente',
    'clientes',
    'cliente contado',
    'contado',
    'mostrador',
    'publico general',
    'publico',
    'consumidor final',
    'consumidor',
    'sin nombre',
    'anonimo',
    'generico',
    'factura',
    'venta',
    'ventas'
  ];

  return genericTerms.some((term) => normalized === term || normalized.startsWith(term + ' '));
}
