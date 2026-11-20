/**
 * Universe default: saham likuid IDX (bank, komoditas, konsumer, teknologi, dll).
 * Bisa diubah dari halaman Pengaturan. Ticker yang tidak ada di Yahoo otomatis dilewati.
 */
export const DEFAULT_WATCHLIST: string[] = [
  // Bank
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS', 'BBTN', 'ARTO', 'BNGA', 'BJBR', 'BJTM', 'BTPS',
  // Batubara & energi
  'ADRO', 'AADI', 'ADMR', 'PTBA', 'ITMG', 'BUMI', 'DEWA', 'INDY', 'HRUM', 'MEDC', 'PGAS',
  'ELSA', 'AKRA', 'ENRG', 'RAJA', 'PTRO', 'CUAN', 'BREN', 'PGEO', 'ESSA', 'AMMN',
  // Logam & tambang
  'ANTM', 'INCO', 'MDKA', 'MBMA', 'NCKL', 'BRMS', 'TINS', 'PSAB', 'ARCI', 'EMAS',
  // Industri dasar & otomotif
  'TPIA', 'BRPT', 'ASII', 'UNTR', 'INKP', 'TKIM', 'SMGR', 'INTP', 'SMDR',
  // Telko, teknologi & media
  'TLKM', 'ISAT', 'EXCL', 'TOWR', 'MTEL', 'GOTO', 'BUKA', 'EMTK', 'WIFI', 'DCII', 'SCMA', 'MNCN',
  // Konsumer & ritel
  'ICBP', 'INDF', 'UNVR', 'MYOR', 'CPIN', 'JPFA', 'KLBF', 'SIDO', 'HMSP', 'GGRM',
  'AMRT', 'MIDI', 'MAPI', 'MAPA', 'ACES', 'ERAA',
  // Kesehatan
  'HEAL', 'MIKA', 'SILO',
  // Properti & konstruksi
  'CTRA', 'BSDE', 'PWON', 'SMRA', 'PANI', 'JSMR', 'TOTL', 'CMNP', 'ADHI', 'PTPP',
  // Perkebunan
  'AALI', 'LSIP', 'TAPG', 'DSNG', 'SSMS',
  // Lainnya
  'SRTG', 'AVIA',
];

/**
 * Daftar konstituen LQ45 di dalam universe screening
 */
export const LQ45_TICKERS: string[] = [
  'BBCA', 'BBRI', 'BMRI', 'BBNI', 'BRIS',
  'AMRT', 'ICBP', 'INDF', 'UNVR', 'ASII',
  'TLKM', 'EXCL', 'ISAT', 'TOWR', 'MAPI',
  'INKP', 'MDKA', 'ANTM', 'INCO', 'PTBA',
  'ADRO', 'ITMG', 'GOTO', 'BUKA', 'ACES',
  'SRTG', 'KLBF', 'SIDO', 'CPIN', 'JPFA',
  'SMGR', 'INTP', 'CTRA', 'SMRA', 'BSDE',
  'PWON', 'JSMR', 'PGEO', 'MBMA', 'ARTO',
  'BRPT', 'ESSA', 'TPIA', 'BRMS', 'BUMI',
];

/**
 * Saham syariah resmi: Daftar Efek Syariah OJK Periode I 2026
 * (KEP-21/D.04/2026, berlaku 1 Juni 2026, 622 saham) + DES insidentil JECX, JELI, BACH (Juli 2026).
 * Diperbarui tiap Mei & November. Bisa ditimpa dari halaman Atur tanpa deploy ulang.
 */
export const SYARIAH_SOURCE = 'DES OJK Periode I 2026 (berlaku 1 Jun 2026)';

export const SYARIAH_TICKERS: string[] = `
  BANK BBMI BRIS BTPS JMAS PNBS SPOT AADI ABMM ADMR ADRO AKRA ARII ATLA BBRM
  BESS BOAT BSML BSSR BULL BUMI BYAN CANI CGAS COAL DEWA DSSA DWGL ELSA ENRG
  FIRE GEMS HRUM IATA INDY ITMA ITMG KKGI KOPI MAHA MBAP MCOL MEDC MKAP MYOH
  PGAS PKPK PSAT PSSI PTBA PTIS RAJA RATU RGAS RMKE RMKO RUIS SEMA SGER SICO
  SMMT SOCI SUNI TCPI TEBE TOBA TPMA UNIQ WINS WOWS ADMG AGII AKPI ALDO ALKA
  ANTM APLI ARCI ASPR AVIA AYLS BATR BLES BMSR BRMS BRNA CHEM CITA CLPI CTBN
  DGWG DKFT EKAD EPAC ESIP ESSA FASW FPNI FWCT GDST GGRP IFII IFSH IGAR INCI
  INKP INTD INTP IPOL ISSP KDSI KKES LMSH LTLS MBMA MDKA MDKI MINE NICE NICL
  NIKL OBMD OKAS PACK PBID PDPP PICO PPRI PSAB PTMR SAMF SBMA SMBR SMCB SMGA
  SMGR SMKL SMLE SOLA SPMA SULI TALF TBMS TINS TIRT TKIM TPIA TRST UNIC WTON
  YPAS AMFG AMIN APII ARNA ASGR BINO BLUE CAKK CCSI CRSN DYAN FOLK GPSO HEXA
  HOPE HYGN ICON IKAI IKBI IMPC JECC JTPE KBLI KBLM KIAS KING KOBX KOIN KONI
  KUAS LION MARK MFMI MHKI MLIA MUTU NAIK NTBK PADA PTMP SCCO SKRN SMIL SOSS
  SPTO TIRA TOTO UNTR VISI VOKS WIDI AALI ADES AGAR AISA AMMS ASHA AYAM BISI
  BOBA BRRC BUAH BUDI BWPT CAMP CEKA CLEO CMRY CPIN CPRO CSRA DAYA DEWI DMND
  DSFI DSNG EPMT EURO FISH FLMC FOOD FORE GOOD GRPM GULA GUNA GZCO HERO HOKI
  ICBP IKAN INDF JARR JAWA JPFA KEJU KINO KMDS LSIP MAIN MAXI MBTO MKTR MLPL
  MPPA MRAT MSJA MYOR NANO NASI NAYZ NEST NSSS PCAR PGUN PNGO PSDN PSGO PTPS
  RANC ROTI SDPC SGRO SIMP SIPD SKBM SKLT SMAR STAA STTP TAPG TCID TGKA TGUK
  TLDN UCID UDNG ULTJ UNVR VICI WAPO YUPI ACES AEGS ASLC AUTO BABY BAIK BAUT
  BAYU BELL BIKE BLTZ BMBL BMTR BOGA BOLT BRAM CINT CNMA CSAP CSMI DEPO DOOH
  DOSS DRMA EAST ECII ENAK ERAA ERAL ERTX ESTA FAST FILM GDYR GEMA GJTL GOLF
  GRPH GWSA HAJJ HRTA IDEA IIKP INDR INDS IPTV ISAP JGLE JIHD KAQI KICI KLIN
  KOTA KPIG LFLO LIVE LMAX LMPI LPIN LPPF MAPA MAPB MAPI MDIA MDIY MEJA MERI
  MGLV MICE MKNT MNCN MPMX MSIN MSKY OLIV PANR PART PDES PGLI PJAA PLAN PMJS
  PMUI POLU PSKT PTSP PZZA RAAM RALS SCNP SHID SLIS SMSM SNLK SOFA SOTS SPRE
  SSTM SWID TFCO TMPO TOOL TRIS TYRE UFOE VERN VKTR WOOD YELO ZONE BMHS CARE
  CHEK DGNS DVLA HALO HEAL IKPM IRRA KLBF LABS MDLA MEDS MERK MIKA MMIX MTMH
  OBAT OMED PEHA PEVE PRAY PRDA PRIM RSCH RSGK SAME SCPI SIDO SILO SOHO SURI
  TSPC SRTG PALM DEFI ADCP AMAN APLN ASPI ASRI ATAP BAPI BBSS BCIP BEST BIPP
  BKDP BKSL BSBK BSDE CITY CSIS CTRA DADA DILD DMAS DUTI ELTY EMDE FMII GMTD
  GPRA GRIA HBAT HOMI INPP IPAC JRPT KBAG KIJA KOCI LAND LPCK LPLI MKPI MMLP
  MSIE MTLA MTSM NZIA PAMG PLIN POLI PURI RBMS REAL RELF RISE ROCK RODA SAGE
  SATU SMDM SMRA UANG URBN VAST WINR AREA ATIC AWAN AXIO BELI CASH CHIP CYBR
  DCII DIVA DMMX ELIT GLVA HDIT IOTF IRSX JATI KIOS KREN LUCK MCAS MLPT MPIX
  MSTI MTDL NFCX PGJO PTSN RUNS TFAS TOSK TRON UVCR WGSH WIFI WIRG ZYRX ASLI
  BALI BDKR CASS CMNP DATA DGIK EXCL FIMP GHON GOLD HADE IBST IDPR INET IPCM
  ISAT JAST JKON JSMR KARW KEEN KETR KOKA MANG META MORA MPOW MTEL MTPS NRCA
  PORT POWR PPRE PTPP PTPW SMKM SSIA SUPR TAMA TLKM TOTL WEGE AKSI ASSA BIRD
  BLOG BLTA CMPP ELPI GIAA GTRA HAIS HATM HELI JAYA KJEN KLAS LAJU LOPI LRNA
  MIRA MITI NELY PJHB PPGL PURA RCCC SAFE SAPX SMDR TAXI TMAS TNCA TRJA TRUK
  WBSA WEHA GRHA ALDI BRAU INSA RINA JECX JELI BACH
`
  .trim()
  .split(/\s+/);

export type StockSector =
  | 'bank'
  | 'batubara'
  | 'nikel'
  | 'energi'
  | 'telko'
  | 'konsumer'
  | 'properti'
  | 'semen'
  | 'ritel'
  | 'teknologi'
  | 'infrastruktur'
  | 'industri';

export interface TickerMeta {
  keywords: string[];
  sector: StockSector;
  sectorLabel: string;
}

export const TICKER_META: Record<string, TickerMeta> = {
  BBCA: { keywords: ['bbca', 'bca', 'bank central asia'], sector: 'bank', sectorLabel: 'bank' },
  BBRI: { keywords: ['bbri', 'bri', 'bank rakyat indonesia'], sector: 'bank', sectorLabel: 'bank' },
  BMRI: { keywords: ['bmri', 'bank mandiri', 'mandiri'], sector: 'bank', sectorLabel: 'bank' },
  BBNI: { keywords: ['bbni', 'bni', 'bank negara indonesia'], sector: 'bank', sectorLabel: 'bank' },
  BRIS: { keywords: ['bris', 'bsi', 'bank syariah indonesia'], sector: 'bank', sectorLabel: 'bank syariah' },
  ARTO: { keywords: ['arto', 'bank jago', 'jago'], sector: 'bank', sectorLabel: 'bank digital' },
  ADRO: { keywords: ['adro', 'adaro', 'alamtri'], sector: 'batubara', sectorLabel: 'batubara' },
  PTBA: { keywords: ['ptba', 'bukit asam'], sector: 'batubara', sectorLabel: 'batubara' },
  ITMG: { keywords: ['itmg', 'indo tambangraya'], sector: 'batubara', sectorLabel: 'batubara' },
  BUMI: { keywords: ['bumi', 'bumi resources'], sector: 'batubara', sectorLabel: 'batubara' },
  DEWA: { keywords: ['dewa', 'darma henwa'], sector: 'batubara', sectorLabel: 'batubara' },
  ANTM: { keywords: ['antm', 'antam', 'aneka tambang'], sector: 'nikel', sectorLabel: 'tambang & nikel' },
  INCO: { keywords: ['inco', 'vale indonesia', 'vale'], sector: 'nikel', sectorLabel: 'nikel' },
  MDKA: { keywords: ['mdka', 'merdeka copper'], sector: 'nikel', sectorLabel: 'tambang & nikel' },
  MBMA: { keywords: ['mbma', 'merdeka battery'], sector: 'nikel', sectorLabel: 'nikel' },
  NCKL: { keywords: ['nckl', 'trimegah bangun', 'harita nickel'], sector: 'nikel', sectorLabel: 'nikel' },
  BRMS: { keywords: ['brms', 'bumi resources minerals'], sector: 'nikel', sectorLabel: 'tambang emas/mineral' },
  BREN: { keywords: ['bren', 'barito renewables'], sector: 'energi', sectorLabel: 'energi' },
  PGEO: { keywords: ['pgeo', 'pertamina geothermal'], sector: 'energi', sectorLabel: 'energi' },
  ESSA: { keywords: ['essa', 'surya esa'], sector: 'energi', sectorLabel: 'energi & gas' },
  BRPT: { keywords: ['brpt', 'barito pacific'], sector: 'energi', sectorLabel: 'energi & petrokimia' },
  TPIA: { keywords: ['tpia', 'chandra asri'], sector: 'energi', sectorLabel: 'petrokimia' },
  TLKM: { keywords: ['tlkm', 'telkom indonesia', 'telkom'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  EXCL: { keywords: ['excl', 'xl axiata', 'xlsmart'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  ISAT: { keywords: ['isat', 'indosat'], sector: 'telko', sectorLabel: 'telekomunikasi' },
  TOWR: { keywords: ['towr', 'sarana menara', 'protelindo'], sector: 'telko', sectorLabel: 'menara telko' },
  ICBP: { keywords: ['icbp', 'indofood cbp'], sector: 'konsumer', sectorLabel: 'konsumer' },
  INDF: { keywords: ['indf', 'indofood'], sector: 'konsumer', sectorLabel: 'konsumer' },
  UNVR: { keywords: ['unvr', 'unilever'], sector: 'konsumer', sectorLabel: 'konsumer' },
  KLBF: { keywords: ['klbf', 'kalbe farma', 'kalbe'], sector: 'konsumer', sectorLabel: 'farmasi' },
  SIDO: { keywords: ['sido', 'sido muncul'], sector: 'konsumer', sectorLabel: 'konsumer & jamu' },
  CPIN: { keywords: ['cpin', 'charoen pokphand'], sector: 'konsumer', sectorLabel: 'poultry' },
  JPFA: { keywords: ['jpfa', 'japfa'], sector: 'konsumer', sectorLabel: 'poultry' },
  AMRT: { keywords: ['amrt', 'alfamart', 'sumber alfaria'], sector: 'ritel', sectorLabel: 'ritel' },
  MAPI: { keywords: ['mapi', 'mitra adiperkasa'], sector: 'ritel', sectorLabel: 'ritel' },
  ERAA: { keywords: ['eraa', 'erajaya'], sector: 'ritel', sectorLabel: 'ritel' },
  ACES: { keywords: ['aces', 'aspirasi hidup', 'ace hardware', 'azko'], sector: 'ritel', sectorLabel: 'ritel' },
  GOTO: { keywords: ['goto', 'gojek tokopedia'], sector: 'teknologi', sectorLabel: 'teknologi' },
  BUKA: { keywords: ['buka', 'bukalapak'], sector: 'teknologi', sectorLabel: 'teknologi' },
  SCMA: { keywords: ['scma', 'surya citra media'], sector: 'teknologi', sectorLabel: 'media' },
  CTRA: { keywords: ['ctra', 'ciputra'], sector: 'properti', sectorLabel: 'properti' },
  SMRA: { keywords: ['smra', 'summarecon'], sector: 'properti', sectorLabel: 'properti' },
  BSDE: { keywords: ['bsde', 'bumi serpong damai', 'bsd'], sector: 'properti', sectorLabel: 'properti' },
  PWON: { keywords: ['pwon', 'pakuwon'], sector: 'properti', sectorLabel: 'properti' },
  SMGR: { keywords: ['smgr', 'semen indonesia', 'sig'], sector: 'semen', sectorLabel: 'semen' },
  INTP: { keywords: ['intp', 'indocement'], sector: 'semen', sectorLabel: 'semen' },
  JSMR: { keywords: ['jsmr', 'jasa marga'], sector: 'infrastruktur', sectorLabel: 'infrastruktur' },
  TOTL: { keywords: ['totl', 'total bangun persada'], sector: 'infrastruktur', sectorLabel: 'konstruksi' },
  CMNP: { keywords: ['cmnp', 'citra marga'], sector: 'infrastruktur', sectorLabel: 'jalan tol' },
  ASII: { keywords: ['asii', 'astra international', 'astra'], sector: 'industri', sectorLabel: 'otomotif & industri' },
  INKP: { keywords: ['inkp', 'indah kiat'], sector: 'industri', sectorLabel: 'pulp & kertas' },
  TKIM: { keywords: ['tkim', 'tjiwi kimia'], sector: 'industri', sectorLabel: 'pulp & kertas' },
  SRTG: { keywords: ['srtg', 'saratoga'], sector: 'industri', sectorLabel: 'investasi' },
};

const SYARIAH_SET = new Set(SYARIAH_TICKERS.map((t) => t.toUpperCase()));
const LQ45_SET = new Set(LQ45_TICKERS.map((t) => t.toUpperCase()));

let overrideSet: Set<string> | null = null;

/** Pakai daftar dari Pengaturan (kalau diisi) menggantikan daftar bawaan. */
export function setSyariahOverride(list: string[] | null | undefined) {
  overrideSet = list && list.length ? new Set(list.map((t) => t.toUpperCase())) : null;
}

export function isSyariahTicker(ticker: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return (overrideSet || SYARIAH_SET).has(clean);
}

export function isLq45Ticker(ticker: string): boolean {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return LQ45_SET.has(clean);
}

export function getTickerMeta(ticker: string): TickerMeta {
  const clean = ticker.replace(/\.JK$/i, '').trim().toUpperCase();
  return (
    TICKER_META[clean] || {
      keywords: [clean.toLowerCase()],
      sector: 'industri',
      sectorLabel: 'pasar',
    }
  );
}
