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
    ["Stevens", 1.2],
    ["LittleIndia", 1.0]
  ],
  Orchard: [
    ["Newton", 1.2],
    ["Somerset", 1.0],
    ["OrchardBoulevard", 1.0],
    ["GreatWorld", 1.4]
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




  
  //Start here haven't add the right data from here onwards
  Stevens: [
    ["Caldecott", 3.0],
    ["Napier", 1.0],
    ["BotanicGardens", 1.5],
    ["Newton", 1.2]
  ],
  Napier: [
    ["Stevens", 1.0],
    ["OrchardBoulevard", 1.2]
  ],
  OrchardBoulevard: [
    ["Napier", 1.2],
    ["Orchard", 1.0]
  ],
  GreatWorld: [
    ["Orchard", 1.4],
    ["Havelock", 1.0]
  ],
  Havelock: [
    ["GreatWorld", 1.0],
    ["OutramPark", 1.0]
  ],
  Maxwell: [
    ["OutramPark", 0.6],
    ["ShentonWay", 1.0]
  ],
  ShentonWay: [
    ["Maxwell", 1.0],
    ["MarinaBay", 0.7]
  ],
  GardensByTheBay: [
    ["MarinaBay", 1.7],
    ["TanjongRhu", 1],
  ],
  TanjongRhu: [
    ["GardensByTheBay", 1],
    ["KatongPark", 1.2]
  ],
  KatongPark: [
    ["TanjongRhu", 1.2],
    ["TanjongKatong", 1.0],
  ],
  TanjongKatong: [
    ["KatongPark", 1.0],
    ["MarineParade", 1.4]
  ],
  MarineParade: [
    ["TanjongKatong", 1.4],
    ["MarineTerrace", 1.2]
  ],
  MarineTerrace: [
    ["MarineParade", 1.2],
    ["Siglap", 1.0]
  ],
  Siglap: [
    ["MarineTerrace", 1.0],
    ["Bayshore", 1.2]
  ],
  Bayshore: [
    ["Siglap", 1],
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
    ["Esplanade", 1.0]
  ],
  Esplanade: [
    ["BrasBasah", 1.0],
    ["Promenade", 1.0]
  ],
  Promenade: [
    ["Esplanade", 1.0],
    ["NicollHighway", 1.2],
    ["Bayfront", 1.0]
  ],
  Bayfront: [
    ["Promenade", 1.0],
    ["MarinaBay", 0.8],
  ],
  NicollHighway: [
    ["Promenade", 1.2],
    ["Stadium", 1.0]
  ],
  Stadium: [
    ["NicollHighway", 1.0],
    ["Mountbatten", 1.4]
  ],
  Mountbatten: [
    ["Stadium", 1.4],
    ["Dakota", 1.0]
  ],
  Dakota: [
    ["Mountbatten", 1.0],
    ["PayaLebar", 1.0]
  ],
  MacPherson: [
    ["PayaLebar", 1.2],
    ["TaiSeng", 1.0],
    ["Mattar", 1.0],
    ["Ubi", 1.0]
  ],
  TaiSeng: [
    ["MacPherson", 1.0],
    ["Bartley", 1.2]
  ],
  Bartley: [
    ["TaiSeng", 1.2],
    ["Serangoon", 1.0]
  ],
  Serangoon: [
    ["Bartley", 1.0],
    ["LorongChuan", 1.2],
    ["Woodleigh", 1.0],
    ["Kovan", 1.4]
  ],
  LorongChuan: [
    ["Serangoon", 1.2],
    ["Bishan", 1.7]
  ],
  Marymount: [
    ["Bishan", 1.6],
    ["Caldecott", 1.2]
  ],
  BotanicGardens: [
    ["Caldecott", 3.9],
    ["FarrerRoad", 1],
    ["TanKahKee", 1],
    ["Stevens", 1.5]
  ],
  FarrerRoad: [
    ["BotanicGardens", 1],
    ["HollandVillage", 1.4]
  ],
  HollandVillage: [
    ["FarrerRoad", 1.4],
    ["BuonaVista", 0.9]
  ],
  OneNorth: [
    ["BuonaVista", 0.8],
    ["KentRidge", 1.2]
  ],
  KentRidge: [
    ["OneNorth", 1.2],
    ["HawParVilla", 1.4]
  ],
  HawParVilla: [
    ["KentRidge", 1.4],
    ["PasirPanjang", 1.0]
  ],
  PasirPanjang: [
    ["HawParVilla", 1.0],
    ["LabradorPark", 1.2]
  ],
  LabradorPark: [
    ["PasirPanjang", 1.2],
    ["TelokBlangah", 1.0]
  ],
  TelokBlangah: [
    ["LabradorPark", 1.0],
    ["HarbourFront", 1.2]
  ],
  HarbourFront: [
    ["TelokBlangah", 1.2],
    ["OutramPark", 2.6],
  ],






  //NE Line
  Chinatown: [
    ["OutramPark", 0.7],
    ["ClarkeQuay", 0.8],
    ["TelokAyer", 0.6],
    ["FortCanning", 0.9]
  ],
  ClarkeQuay: [
    ["Chinatown", 0.8],
    ["DhobyGhaut", 1.4]
  ],
  LittleIndia: [
    ["DhobyGhaut", 1.0],
    ["FarrerPark", 1.0],
    ["Newton", 1.0],
    ["Rochor", 0.8]
  ],
  FarrerPark: [
    ["LittleIndia", 1.0],
    ["BoonKeng", 1.2]
  ],
  BoonKeng: [
    ["FarrerPark", 1.2],
    ["PotongPasir", 1.4]
  ],
  PotongPasir: [
    ["BoonKeng", 1.4],
    ["Woodleigh", 1.0]
  ],
  Woodleigh: [
    ["PotongPasir", 1.0],
    ["Serangoon", 1.0]
  ],
  Kovan: [
    ["Serangoon", 1.4],
    ["Hougang", 1.2]
  ],
  Hougang: [
    ["Kovan", 1.2],
    ["Buangkok", 1.4]
  ],
  Buangkok: [
    ["Hougang", 1.4],
    ["Sengkang", 1.2]
  ],
  Sengkang: [
    ["Buangkok", 1.2],
    ["Punggol", 1.4]
  ],
  Punggol: [
    ["Sengkang", 1.4],
    ["PunggolCoast", 1.2]
  ],
  PunggolCoast: [
    ["Punggol", 1.2]
  ],







  //DT Line
  BukitPanjang: [
    ["Cashew", 1.2],
  ],
  Cashew: [
    ["BukitPanjang", 1.2],
    ["Hillview", 1.4]
  ],
  Hillview: [
    ["Cashew", 1.4],
    ["Hume", 1.2]
  ],
  Hume: [
    ["Hillview", 1.2],
    ["BeautyWorld", 1.0]
  ],
  BeautyWorld: [
    ["Hume", 1.0],
    ["KingAlbertPark", 1.2]
  ],
  KingAlbertPark: [
    ["BeautyWorld", 1.2],
    ["SixthAvenue", 1.0]
  ],
  SixthAvenue: [
    ["KingAlbertPark", 1.0], 
    ["TanKahKee", 1.2]
  ],
  TanKahKee: [
    ["SixthAvenue", 1.2],
    ["BotanicGardens", 1.0]
  ],
  Rocher: [
    ["LittleIndia", 1],
    ["Bugis", 0.8]
  ],
  Downtown:[
    ["Bayfront", 1],
    ["TelokAyer", 1]
  ],
  TelokAyer:[
    ["Downtown", 1],
    ["Chinatown", 1]
  ],
  FortCanning: [
    ["Chinatown", 1],
    ["Bencoolen", 1],
  ],
  Bencoolen: [
    ["FortCanning", 1],
    ["JalanBesar", 1]
  ],
  JalanBesar: [
    ["Bencoolen", 1],
    ["Bendemeer", 1]
  ],
  Bendemeer: [
    ["JalanBesar", 1],
    ["GeylangBahru", 1]
  ],
  GeylangBahru: [
    ["Bendemeer", 1],
    ["Mattar", 1]
  ],
  Mattar: [
    ["GeylangBahru", 1],
    ["MacPherson", 1]
  ],
  Ubi: [
    ["MacPherson", 1],
    ["KakiBukit", 1]
  ],
  KakiBukit: [
    ["Ubi", 1],
    ["BedokNorth", 1.2]
  ],
  BedokNorth: [
    ["KakiBukit", 1.2],
    ["BedokReservoir", 1.4]
  ],
  BedokReservoir: [
    ["BedokNorth", 1.4],
    ["TampinesWest", 1.2]
  ],
  TampinesWest: [
    ["BedokReservoir", 1.2],
    ["Tampines", 1.3]
  ],
  TampinesEast: [
    ["Tampines", 1.4],
    ["UpperChangi", 1.2]
  ],
  UpperChangi: [
    ["TampinesEast", 1.2],
    ["Expo", 0.9]
  ],
  // Xilin: [
  //   ["Expo", 1],
  //   ["SungeiBedok", 1.8]
  // ]

};
