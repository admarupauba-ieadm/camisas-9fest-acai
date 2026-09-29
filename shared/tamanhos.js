// Fonte unica das listas de tamanhos — importado pelo backend (api/) e pelo frontend (client/).
// NAO duplicar essas listas em outros arquivos.

export const TAMANHOS_ADULTO = ['PP', 'P', 'M', 'G', 'GG'];
export const TAMANHOS_INFANTIL = ['2', '4', '6', '8', '10'];

export const TODOS_TAMANHOS = [...TAMANHOS_ADULTO, ...TAMANHOS_INFANTIL];

export function ehInfantil(tamanho) {
  return TAMANHOS_INFANTIL.includes(tamanho);
}
