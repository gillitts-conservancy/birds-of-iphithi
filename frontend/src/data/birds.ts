// Bird data file - Edit this file to add/modify birds
// Each bird requires: speciesNumber (unique), commonName, scientificName, photoUrl
// Notes field is optional and can be edited by users in the app

export interface Bird {
  speciesNumber: number;
  commonName: string;
  scientificName: string;
  photoUrl: string;
  notes?: string;
}

// Sample birds data - sorted by speciesNumber
// Replace this with your actual iPhithi species list
export const birdsData: Bird[] = [
  {
    speciesNumber: 1,
    commonName: "Common Ostrich",
    scientificName: "Struthio camelus",
    photoUrl: "https://picsum.photos/seed/bird1/400/300",
  },
  {
    speciesNumber: 2,
    commonName: "Egyptian Goose",
    scientificName: "Alopochen aegyptiaca",
    photoUrl: "https://picsum.photos/seed/bird2/400/300",
  },
  {
    speciesNumber: 3,
    commonName: "Hadada Ibis",
    scientificName: "Bostrychia hagedash",
    photoUrl: "https://picsum.photos/seed/bird3/400/300",
  },
  {
    speciesNumber: 4,
    commonName: "African Fish Eagle",
    scientificName: "Haliaeetus vocifer",
    photoUrl: "https://picsum.photos/seed/bird4/400/300",
  },
  {
    speciesNumber: 5,
    commonName: "Crowned Lapwing",
    scientificName: "Vanellus coronatus",
    photoUrl: "https://picsum.photos/seed/bird5/400/300",
  },
  {
    speciesNumber: 6,
    commonName: "Laughing Dove",
    scientificName: "Spilopelia senegalensis",
    photoUrl: "https://picsum.photos/seed/bird6/400/300",
  },
  {
    speciesNumber: 7,
    commonName: "Lilac-breasted Roller",
    scientificName: "Coracias caudatus",
    photoUrl: "https://picsum.photos/seed/bird7/400/300",
  },
  {
    speciesNumber: 8,
    commonName: "Pied Kingfisher",
    scientificName: "Ceryle rudis",
    photoUrl: "https://picsum.photos/seed/bird8/400/300",
  },
  {
    speciesNumber: 9,
    commonName: "Fork-tailed Drongo",
    scientificName: "Dicrurus adsimilis",
    photoUrl: "https://picsum.photos/seed/bird9/400/300",
  },
  {
    speciesNumber: 10,
    commonName: "Cape Glossy Starling",
    scientificName: "Lamprotornis nitens",
    photoUrl: "https://picsum.photos/seed/bird10/400/300",
  },
];
