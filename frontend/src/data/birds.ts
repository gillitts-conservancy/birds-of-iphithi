// Bird data file - Edit this file to add/modify birds
// Each bird requires: speciesNumber (unique), commonName, scientificName, photoUrl
// Notes field is optional and can be edited by users in the app

export type BirdColor =
  | 'black'
  | 'brown'
  | 'white'
  | 'grey'
  | 'green'
  | 'yellow'
  | 'red'
  | 'blue';

export type BirdSize = 'small' | 'medium' | 'large';

export type BirdHabitat = 'garden' | 'trees' | 'grassland' | 'wetland' | 'open-sky';

export interface Bird {
  speciesNumber: number;
  commonName: string;
  scientificName: string;
  photoUrl: string;
  primaryColors: BirdColor[];
  size: BirdSize;
  habitats: BirdHabitat[];
  notes?: string;
}

// Test birds data - arranged by Roberts species number
// NOTE: primaryColors + size are placeholders for now (not provided in the bird list doc)
export const birdsData: Bird[] = [
  {
    speciesNumber: 94,
    commonName: 'Hadeda Ibis',
    scientificName: 'Bostrychia hagedash',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/hadeda_ibis.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['garden', 'grassland', 'wetland'],
  },
  {
    speciesNumber: 118,
    commonName: 'Spur-winged Goose',
    scientificName: 'Plectropterus gambensis',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/spurwing_goose.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['wetland', 'grassland'],
  },
  {
    speciesNumber: 127,
    commonName: 'Yellow-billed Kite',
    scientificName: 'Milvus aegyptius',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/Yellow-billed-kite.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['open-sky', 'grassland', 'trees'],
  },
  {
    speciesNumber: 224,
    commonName: 'Common Moorhen',
    scientificName: 'Gallinula chloropus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/common_moorhen.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['wetland'],
  },
  {
    speciesNumber: 371,
    commonName: 'Purple-crested Turaco',
    scientificName: 'Tauraco porphyreolophus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/purple-crested_turaco.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 377,
    commonName: 'Red-chested Cuckoo',
    scientificName: 'Cuculus solitarius',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/red-chested_cuckoo.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 384,
    commonName: 'Emerald Cuckoo',
    scientificName: 'Chrysococcyx cupreus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/emerald_cuckoo.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees'],
  },
  {
    speciesNumber: 424,
    commonName: 'Speckled Mousebird',
    scientificName: 'Colius striatus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/speckled_mousebird.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['garden', 'trees'],
  },
  {
    speciesNumber: 435,
    commonName: 'Brown-hooded Kingfisher',
    scientificName: 'Halcyon albiventris',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/brown-hooded_kingfisher.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden', 'wetland'],
  },
  {
    speciesNumber: 455,
    commonName: 'Trumpeter Hornbill',
    scientificName: 'Bycanistes bucinator',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/trumpeter-hornbill.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees'],
  },
  {
    speciesNumber: 464,
    commonName: 'Black-collared Barbet',
    scientificName: 'Lybius torquatus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/black-collared_barbet.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 466,
    commonName: 'White-eared Barbet',
    scientificName: 'Stactolaema leucotis',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/White-eared-barbet.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 482,
    commonName: 'Cardinal Woodpecker',
    scientificName: 'Dendropicos fuscescens',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/cardinal_woodpecker.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 545,
    commonName: 'Black-headed Oriole',
    scientificName: 'Oriolus larvatus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/black-headed_oriole.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
  {
    speciesNumber: 577,
    commonName: 'Olive Thrush',
    scientificName: 'Turdus olivaceus',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/olive_thrush.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['garden', 'trees'],
  },
  {
    speciesNumber: 807,
    commonName: 'Thick-billed Weaver',
    scientificName: 'Amblyospiza albifrons',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/thick-billed_weaver.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['wetland', 'grassland'],
  },
  {
    speciesNumber: 810,
    commonName: 'Spectacled Weaver',
    scientificName: 'Ploceus ocularis',
    photoUrl:
      'https://ctfamboviakrzkwgnjtd.supabase.co/storage/v1/object/public/bird-images/spectacled_weaver.webp',
    primaryColors: ['brown'],
    size: 'medium',
    habitats: ['trees', 'garden'],
  },
];
