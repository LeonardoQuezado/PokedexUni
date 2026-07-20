const TYPE_COLORS = {
  normal: '#A8A878',
  fogo: '#F08030',
  agua: '#6890F0',
  planta: '#78C850',
  eletrico: '#F8D030',
  gelo: '#98D8D8',
  lutador: '#C03028',
  veneno: '#A040A0',
  terra: '#E0C068',
  voador: '#A890F0',
  psiquico: '#F85888',
  inseto: '#A8B820',
  pedra: '#B8A038',
  fantasma: '#705898',
  dragao: '#7038F8',
  sombrio: '#705848',
  aco: '#B8B8D0',
  fada: '#EE99AC',
  ogro: '#8D6E63',
  dumb: '#9E9D24',
  ar: '#4FA8D8',
};

const ACCENTS = {
  á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  í: 'i', ì: 'i', î: 'i', ï: 'i',
  ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ç: 'c',
};

function normalize(type) {
  return (type || '')
    .toLowerCase()
    .split('')
    .map((ch) => ACCENTS[ch] || ch)
    .join('');
}

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function colorForType(type) {
  const key = normalize(type);
  return TYPE_COLORS[key] || hashColor(key);
}
