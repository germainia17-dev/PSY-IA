// Barrel typographie / palette — point d'entrée stable pour les écrans.
//
// Historiquement la palette et la typo vivaient dans `design.ts`. Les écrans
// importent désormais `{ palettes, type }` depuis ce module ; on ré-exporte
// donc tout depuis `design.ts` (source unique, pas de cycle).

export { palettes, warm, type, type Palette } from './design'
