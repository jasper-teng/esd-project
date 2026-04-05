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
  Khatib: [
    ["Yishun", 1.4],
    ["YioChuKang",4.9],
  ],
  YioChuKang: [
    ["Khatib", 4.9],
    ["AngMoKio", 1.5],
  ],
  AngMoKio: [
    ["YioChuKang", 1.5],
    ["Bishan", 2.4],
  ],
  Bishan: [
    ["AngMoKio", 2.4],
    ["Braddell", 1.2],
    ["Marymount", 1.6],
    ["LorongChuan", 1.7]
  ],
  Braddell: [
    ["Bishan", 1.2],
    ["ToaPayoh", 0.9]
  ],
  ToaPayoh: [
    ["Braddell", 0.9],
    ["Novena", 1.5]
  ],
  Novena: [
    ["ToaPayoh", 1.5],
    ["Newton", 1.2]
  ],
  Newton: [
    ["Novena", 1.2],
    ["Orchard", 1.2],
    ["Stevens", 1.6],
    ["LittleIndia", 1.4]
  ],
  Orchard: [
    ["Newton", 1.2],
    ["Somerset", 1.0],
    ["OrchardBoulevard", 1.0],
    ["GreatWorld", 1.0]
  ],
  Somerset: [
    ["Orchard", 1.0],
    ["DhobyGhaut", 0.8]
  ],
  DhobyGhaut: [
    ["Somerset", 0.8],
    ["CityHall", 1.0],
    ["ClarkeQuay", 1.4],
    ["LittleIndia", 1.0],
    ["BrasBasah", 0.6]
  ],
  CityHall: [
    ["DhobyGhaut", 1.0],
    ["RafflesPlace", 1.0],
    ["Bugis", 1.0]
  ],
  RafflesPlace: [
    ["CityHall", 1.0],
    ["MarinaBay", 1.0],
    ["TanjongPagar", 1.2]
  ],
  MarinaBay: [
    ["RafflesPlace", 1.0],
    ["MarinaSouthPier", 1.4],
    ["Bayfront", 0.8],
    ["ShentonWay", 0.7],
    ["GardensByTheBay", 1.7],
  ],
  MarinaSouthPier: [
    ["MarinaBay", 1.4]
  ],






  // EW line
  TuasLink: [
    ["TuasWestRoad", 1.3]
  ],
  TuasWestRoad: [
    ["TuasLink", 1.3],
    ["TuasCrescent", 1.4]
  ],
  TuasCrescent:  [
    ["TuasWestRoad", 1.4],
    ["GulCircle", 1.7]
  ],
  GulCircle:  [
    ["TuasCrescent", 1.7],
    ["JooKoon", 2.3]
  ],
  JooKoon: [
    ["GulCircle", 2.3],
    ["Pioneer", 2.6]
  ],
  Pioneer: [
    ["JooKoon", 2.6],
    ["BoonLay", 0.9]
  ],
  BoonLay: [
    ["Pioneer", 0.9],
    ["Lakeside", 1.8]
  ],
  Lakeside: [
    ["BoonLay", 1.8],
    ["ChineseGarden", 1.4]
  ],
  ChineseGarden: [
    ["Lakeside", 1.4],
    ["JurongEast", 2.1]
  ],
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
  Commonwealth: [
    ["BuonaVista", 1.1],
    ["Queenstown", 1.2]
  ],
  Queenstown: [
    ["Commonwealth", 1.2],
    ["Redhill", 1.4]
  ],
  Redhill: [
    ["Queenstown", 1.4],
    ["TiongBahru", 1.2]
  ],
  TiongBahru: [
    ["Redhill", 1.2],
    ["OutramPark", 1.5]
  ],
  OutramPark: [
    ["TiongBahru", 1.5],
    ["TanjongPagar", 1.0],
    ["Chinatown", 0.7],
    ["HarbourFront", 2.6],
    ["Havelock", 1.0],
    ["Maxwell", 0.6]
  ],
  TanjongPagar: [
    ["OutramPark", 1.0],
    ["RafflesPlace", 1.2],
  ],
  Bugis: [
    ["CityHall", 1.0],
    ["Lavender", 1.1],
    ["Rochor", 0.8],
    ["Promenade", 0.9]
  ],
  Lavender: [
    ["Bugis", 1.1],
    ["Kallang", 1.1]
  ],
  Kallang: [
    ["Lavender", 1.1],
    ["Aljunied", 1.4]
  ],
  Aljunied: [
    ["Kallang", 1.4],
    ["PayaLebar", 1.2]
  ],
  PayaLebar: [
    ["Aljunied", 1.2],
    ["Eunos", 1.1],
    ["MacPherson", 1.1],
    ["Dakota", 1.2]
  ],
  Eunos: [
    ["PayaLebar", 1.1],
    ["Kembangan", 1.1]
  ],
  Kembangan: [
    ["Eunos", 1.1],
    ["Bedok", 2.0]
  ],
  Bedok: [
    ["Kembangan", 2.0],
    ["TanahMerah", 1.9]
  ],
  TanahMerah: [
    ["Bedok", 1.9],
    ["simei", 2.5],
    ["Expo", 1.9]
  ],
  Simei: [
    ["TanahMerah", 2.5],
    ["Tampines", 1.4]
  ],
  Tampines: [
    ["Simei", 1.4],
    ["PasirRis", 2.4],
    ["TampinesWest", 1.3],
    ["TampinesEast", 1.4]
  ],
  PasirRis: [
    ["Tampines", 2.4]
  ],
  Expo: [
    ["TanahMerah", 1.9],
    ["ChangiAirport", 4.5],
    ["UpperChangi", 0.9],
    // ["Xilin", 1.4]
  ],
  ChangiAirport: [
    ["Expo", 4.5]
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
    ["Stevens", 3.0],
    ["Marymount", 1.2],
    ["BotanicGardens", 3.9],
  ],
  Stevens: [
    ["Caldecott", 3.0],
    ["Napier", 1.7],
    ["BotanicGardens", 1.1],
    ["Newton", 1.6]
  ],
  Napier: [
    ["Stevens", 1.7],
    ["OrchardBoulevard", 0.9]
  ],
  OrchardBoulevard: [
    ["Napier", 0.9],
    ["Orchard", 1.0]
  ],
  GreatWorld: [
    ["Orchard", 1.0],
    ["Havelock", 0.7]
  ],
  Havelock: [
    ["GreatWorld", 0.7],
    ["OutramPark", 1.0]
  ],
  Maxwell: [
    ["OutramPark", 0.6],
    ["ShentonWay", 0.8]
  ],
  ShentonWay: [
    ["Maxwell", 0.8],
    ["MarinaBay", 0.7]
  ],
  GardensByTheBay: [
    ["MarinaBay", 1.7],
    ["TanjongRhu", 2.8],
  ],
  TanjongRhu: [
    ["GardensByTheBay", 2.8],
    ["KatongPark", 1.5]
  ],
  KatongPark: [
    ["TanjongRhu", 1.5],
    ["TanjongKatong", 1.3],
  ],
  TanjongKatong: [
    ["KatongPark", 1.3],
    ["MarineParade", 1.0]
  ],
  MarineParade: [
    ["TanjongKatong", 1.0],
    ["MarineTerrace", 1.2]
  ],
  MarineTerrace: [
    ["MarineParade", 1.2],
    ["Siglap", 1.6]
  ],
  Siglap: [
    ["MarineTerrace", 1.6],
    ["Bayshore", 1.4]
  ],
  Bayshore: [
    ["Siglap", 1.4],
    // ["BedokSouth", 1.4]
  ],
  // BedokSouth: [
  //   ["Bayshore", 1.4],
  //   ["SungeiBedok", 1.6]
  // ],
  // SungeiBedok: [
  //   ["BedokSouth", 1.6],
  //   ["Xilin", 1.8]
  // ],






  //CC line
  BrasBasah: [
    ["DhobyGhaut", 0.6],
    ["Esplanade", 0.7]
  ],
  Esplanade: [
    ["BrasBasah", 0.7],
    ["Promenade", 0.8]
  ],
  Promenade: [
    ["Esplanade", 0.8],
    ["NicollHighway", 0.8],
    ["Bayfront", 1.3],
    ["Bugis", 0.9]
  ],
  Bayfront: [
    ["Promenade", 1.3],
    ["MarinaBay", 0.8],
  ],
  NicollHighway: [
    ["Promenade", 0.8],
    ["Stadium", 1.5]
  ],
  Stadium: [
    ["NicollHighway", 1.5],
    ["Mountbatten", 1.4]
  ],
  Mountbatten: [
    ["Stadium", 0.9],
    ["Dakota", 0.7]
  ],
  Dakota: [
    ["Mountbatten", 0.7],
    ["PayaLebar", 1.2]
  ],
  MacPherson: [
    ["PayaLebar", 1.2],
    ["TaiSeng", 1.0],
    ["Mattar", 0.8],
    ["Ubi", 1.1]
  ],
  TaiSeng: [
    ["MacPherson", 1.0],
    ["Bartley", 1.3]
  ],
  Bartley: [
    ["TaiSeng", 1.3],
    ["Serangoon", 1.3]
  ],
  Serangoon: [
    ["Bartley", 1.3],
    ["LorongChuan", 0.9],
    ["Woodleigh", 1.2],
    ["Kovan", 1.7]
  ],
  LorongChuan: [
    ["Serangoon", 0.9 ],
    ["Bishan", 1.7]
  ],
  Marymount: [
    ["Bishan", 1.6],
    ["Caldecott", 1.2]
  ],
  BotanicGardens: [
    ["Caldecott", 3.9],
    ["FarrerRoad", 1.0],
    ["TanKahKee", 1.1],
    ["Stevens", 1.1]
  ],
  FarrerRoad: [
    ["BotanicGardens", 1.0],
    ["HollandVillage", 1.4]
  ],
  HollandVillage: [
    ["FarrerRoad", 1.4],
    ["BuonaVista", 0.9]
  ],
  OneNorth: [
    ["BuonaVista", 0.8],
    ["KentRidge", 0.8]
  ],
  KentRidge: [
    ["OneNorth", 0.8],
    ["HawParVilla", 1.4]
  ],
  HawParVilla: [
    ["KentRidge", 1.4],
    ["PasirPanjang", 1.3]
  ],
  PasirPanjang: [
    ["HawParVilla", 1.3],
    ["LabradorPark", 1.4]
  ],
  LabradorPark: [
    ["PasirPanjang", 1.4],
    ["TelokBlangah", 0.8]
  ],
  TelokBlangah: [
    ["LabradorPark", 0.8],
    ["HarbourFront", 1.5]
  ],
  HarbourFront: [
    ["TelokBlangah", 1.5],
    ["OutramPark", 2.6],
  ],






  //NE Line
  Chinatown: [
    ["OutramPark", 0.7],
    ["ClarkeQuay", 0.6],
    ["TelokAyer", 0.6],
    ["FortCanning", 1.0]
  ],
  ClarkeQuay: [
    ["Chinatown", 0.6],
    ["DhobyGhaut", 1.4]
  ],
  LittleIndia: [
    ["DhobyGhaut", 1.0],
    ["FarrerPark", 0.8],
    ["Newton", 1.4],
    ["Rochor", 0.5]
  ],
  FarrerPark: [
    ["LittleIndia", 0.8],
    ["BoonKeng", 1.2]
  ],
  BoonKeng: [
    ["FarrerPark", 1.2],
    ["PotongPasir", 1.6]
  ],
  PotongPasir: [
    ["BoonKeng", 1.6],
    ["Woodleigh", 0.9]
  ],
  Woodleigh: [
    ["PotongPasir", 0.9],
    ["Serangoon", 1.2]
  ],
  Kovan: [
    ["Serangoon", 1.7],
    ["Hougang", 1.5]
  ],
  Hougang: [
    ["Kovan", 1.5],
    ["Buangkok", 1.3]
  ],
  Buangkok: [
    ["Hougang", 1.3],
    ["Sengkang", 1.1]
  ],
  Sengkang: [
    ["Buangkok", 1.1],
    ["Punggol", 1.7]
  ],
  Punggol: [
    ["Sengkang", 1.7],
    ["PunggolCoast", 1.6]
  ],
  PunggolCoast: [
    ["Punggol", 1.6]
  ],






  //DT Line
  BukitPanjang: [
    ["Cashew", 1.2],
  ],
  Cashew: [
    ["BukitPanjang", 1.2],
    ["Hillview", 0.9]
  ],
  Hillview: [
    ["Cashew", 0.9],
    ["Hume", 1.0]
  ],
  Hume: [
    ["Hillview", 1.0],
    ["BeautyWorld", 1.7]
  ],
  BeautyWorld: [
    ["Hume", 1.7],
    ["KingAlbertPark", 1.2]
  ],
  KingAlbertPark: [
    ["BeautyWorld", 1.2],
    ["SixthAvenue", 1.6]
  ],
  SixthAvenue: [
    ["KingAlbertPark", 1.6], 
    ["TanKahKee", 1.3]
  ],
  TanKahKee: [
    ["SixthAvenue", 1.3],
    ["BotanicGardens", 1.1]
  ],
  Rocher: [
    ["LittleIndia", 0.5],
    ["Bugis", 0.8]
  ],
  Downtown:[
    ["Bayfront", 0.9],
    ["TelokAyer", 0.6]
  ],
  TelokAyer:[
    ["Downtown", 0.6],
    ["Chinatown", 0.6]
  ],
  FortCanning: [
    ["Chinatown", 1.0],
    ["Bencoolen", 1.0],
  ],
  Bencoolen: [
    ["FortCanning", 1.0],
    ["JalanBesar", 0.9]
  ],
  JalanBesar: [
    ["Bencoolen", 0.9],
    ["Bendemeer", 1.3]
  ],
  Bendemeer: [
    ["JalanBesar", 1.3],
    ["GeylangBahru", 1.4]
  ],
  GeylangBahru: [
    ["Bendemeer", 1.4],
    ["Mattar", 1.5]
  ],
  Mattar: [
    ["GeylangBahru", 1.5],
    ["MacPherson", 0.8]
  ],
  Ubi: [
    ["MacPherson", 1.1],
    ["KakiBukit", 1.2]
  ],
  KakiBukit: [
    ["Ubi", 1.2],
    ["BedokNorth", 1.1]
  ],
  BedokNorth: [
    ["KakiBukit", 1.1],
    ["BedokReservoir", 1.8]
  ],
  BedokReservoir: [
    ["BedokNorth", 1.8],
    ["TampinesWest", 1.7]
  ],
  TampinesWest: [
    ["BedokReservoir", 1.7],
    ["Tampines", 1.3]
  ],
  TampinesEast: [
    ["Tampines", 1.4],
    ["UpperChangi", 2.6]
  ],
  UpperChangi: [
    ["TampinesEast", 2.6],
    ["Expo", 0.9]
  ],
  // Xilin: [
  //   ["Expo", 1],
  //   ["SungeiBedok", 1.8]
  // ]

};
