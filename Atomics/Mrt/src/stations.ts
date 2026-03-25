export const graph: Record<string, [string, number][]> = {
  // NS line
  JurongEast: [
    ["BukitBatok", 2.4],
    ["ChineseGarden", 2.1],
    ["Clementi", 3.5]
  ],
  BukitBatok: [
    ["JurongEast", 2.4],
    ["BukitGombak", 1.2]
  ],
  BukitGombak: [
    ["BukitBatok", 1.2],
    ["ChoaChuKang", 3.3]
  ],
  ChoaChuKang: [
    ["BukitGombak",3.3],
    ["YewTee",1.4],
    ["SouthView", 0.6]
  ],
  YewTee: [
    ["ChoaChuKang", 1.4],
    ["Kranji", 4.1]
  ],
  Kranji: [
    ["YewTee", 4.1],
    ["Marsiling", 1.7]
  ],
  Marsiling: [
    ["Kranji", 1.7],
    ["Woodlands", 1.5]
  ],
  Woodlands:[
    ["Marsiling",1.5],
    ["Admiralty", 1.7],
    ["WoodlandsSouth", 1.4],
    ["WoodlandsNorth",1.4]
  ],
  Admiralty: [
    ["Sembawang", 2.4],
    ["Woodlands", 1.7]
  ],
  Sembawang: [
    ["Admiralty", 2.4],
    ["Canberra", 1.5],
  ],
  Canberra: [
    ["Sembawang", 1.5],
    ["Yishun", 1.7],
  ],
  Yishun: [
    ["Canberra", 1.7],
    ["Khatib", 1.4],
  ],
  // ...continues to Bishan


  // EW line
  Clementi: [
    ["JurongEast", 3.5],
    ["Dover", 1.7]
  ],
  Dover: [
    ["Clementi",1.7],
    ["BuonaVista", 1.4]
  ],
  BuonaVista: [
    ["Dover", 1.4],
    ["Commonwealth", 1.1],
    ["OneNorth", 0.8],
    ["HollandVillage", 0.9]
  ],


  // TE line
  WoodlandsNorth: [
    ["Woodlands", 1.4]
  ],
  WoodlandsSouth: [
    ["Woodlands", 1.4],
    ["Springleaf", 4.4]
  ],
  Springleaf: [
    ["WoodlandsSouth", 4.4],
    ["Lentor",2.6]
  ],
  Lentor: [
    ["Springleaf", 2.6],
    ["Mayflower", 1.7]
  ],
  Mayflower: [
    ["Lentor", 1.7],
    ["BrightHill", 1.1]
  ],
  BrightHill: [
    ["Mayflower", 1.1],
    ["UpperThomson", 1.4]
  ],
  UpperThomson: [
    ["BrightHill", 1.4],
    ["Caldecott", 2.2]
  ],
  Caldecott: [
    ["UpperThomson", 2.2],
    ["Marymount", 1.2],
    ["BotanicGardens", 3.9]
  ],


  //CC line
  BotanicGardens: [
    ["Caldecott", 3.9],
    ["FarrerRoad", 1]
  ],
  FarrerRoad: [
    ["BotanicGardens", 1],
    ["HollandVillage", 1.4]
  ],
  HollandVillage: [
    ["FarrerRoad", 1.4],
    ["BuonaVista", 0.9]
  ],
};
