// УК ПСБ, снимок официальных раскрытий на 27.11.2026. См. DATA-SOURCES.md.
export type FundProfile = 'cash' | 'bonds' | 'mixed' | 'shares' | 'fx' | 'gold'
export interface FundWeight { name: string; share: number }
export interface FundDisclosure {
  id: string
  formed: string
  minRub: number
  name: string
  strategy: string
  profile: FundProfile
  ticker: string | null
  currency: string
  kid: string
  published: string
  kidDate: string
  url: string
  annualFee: number | null
  feeCap: boolean
  entryFee: string
  exitFee: string
  history: Partial<Record<number, number>>
  historyDate: string | null
  holdings: FundWeight[]
  sectors: FundWeight[]
  sectorDate: string | null
  distributes: boolean
}
export const fundDisclosures: FundDisclosure[] = [
  {
    "minRub": 10,
    "formed": "2004-12-21",
    "id": "0258-74112789",
    "name": "Финансовая подушка",
    "strategy": "Облигации, РЕПО и рублёвые депозиты",
    "profile": "cash",
    "ticker": null,
    "currency": "Рублёвые депозиты; валютные доли всего фонда в этом раскрытии не приведены.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/09d/ithjpuv5rh8kx8qvklphoyu63hkfxuao/15.-OPIF-Finansovaya-podushka_23112026.pdf",
    "published": "2026-11-24",
    "kidDate": "2026-11-23",
    "url": "https://www.upravlyaem.ru/funds/Finansovaya-podushka/",
    "annualFee": 1.44,
    "feeCap": true,
    "entryFee": "Не взимается",
    "exitFee": "Не взимается",
    "history": {
      "6": 6.44,
      "12": 15.45,
      "36": 65.36,
      "60": 82.46
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Дебиторская задолженность по сделкам РЕПО: НКО НКЦ (АО)", "share": 35.74 },
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 5.82 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A0JS3W6", "share": 3.03 },
      { "name": "АО \"Атомэнергопром\", облигации российских хоз. обществ, ISIN RU000A10F7T3", "share": 2.85 },
      { "name": "ПАО ДОМ.РФ, облигации российских хоз. обществ, ISIN RU000A10GEC3", "share": 2.63 }
    ],
    "sectors": [
      { "name": "РЕПО", "share": 33.99 },
      { "name": "Финансы", "share": 20.41 },
      { "name": "Электроэнергетика", "share": 12.1 },
      { "name": "Гос. бумаги", "share": 9.78 },
      { "name": "Телеком", "share": 7.02 },
      { "name": "Нефть и газ", "share": 5.27 },
      { "name": "Транспорт", "share": 3.42 },
      { "name": "Ритейл", "share": 2.58 },
      { "name": "Металлургия", "share": 2.19 },
      { "name": "Банки", "share": 1.37 },
      { "name": "Горнодобыча", "share": 0.84 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2011-03-23",
    "id": "2004-94173468",
    "name": "Оборонный",
    "strategy": "Облигации российских эмитентов в рублях",
    "profile": "bonds",
    "ticker": null,
    "currency": "Преимущественно рублёвые облигации.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/933/ceq4jqbm5depkn87ecqz6xxndfk37vb8/11.-OPIF-PROMSVYAZ-_-Oboronnyy_09112026.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/oboronnyi/",
    "annualFee": 1.94,
    "feeCap": true,
    "entryFee": "не взимается",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 5.85,
      "12": 13.97,
      "36": 63.41,
      "60": 87.43
    },
    "historyDate": null,
    "holdings": [
      { "name": "АО РОСЭКСИМБАНК, облигации российских хоз. обществ, ISIN RU000A1077V4", "share": 8.34 },
      { "name": "АО \"Атомэнергопром\", облигации российских хоз. обществ, ISIN RU000A10F7T3", "share": 7.85 },
      { "name": "ПАО \"Россети\", облигации российских хоз. обществ, ISIN RU000A109528", "share": 7.3 },
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 7.13 },
      { "name": "ПАО \"Ростелеком\", облигации российских хоз. обществ, ISIN RU000A10DCJ9", "share": 5.63 }
    ],
    "sectors": [
      { "name": "Электроэнергетика", "share": 28.59 },
      { "name": "Финансы", "share": 18.94 },
      { "name": "Транспорт", "share": 11.45 },
      { "name": "Гос. бумаги", "share": 9.37 },
      { "name": "Телеком", "share": 8.98 },
      { "name": "Нефть и газ", "share": 8.84 },
      { "name": "Банки", "share": 8.1 },
      { "name": "Технологии", "share": 4.36 },
      { "name": "Металлургия", "share": 1.37 },
      { "name": "РЕПО", "share": 0.21 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2005-07-31",
    "id": "0335-76034355",
    "name": "Просто. Облигации",
    "strategy": "Рублёвый долг российских эмитентов",
    "profile": "bonds",
    "ticker": null,
    "currency": "Преимущественно рублёвые облигации.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/30b/pz5397dfgv8alelcd2fscq9bdcqduwqk/10.-OPIF-Prosto.-Obligatsii_05112026.pdf",
    "published": "2026-11-10",
    "kidDate": "2026-11-05",
    "url": "https://www.upravlyaem.ru/funds/bonds/",
    "annualFee": 1.94,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 4.61,
      "12": 13.54,
      "36": 59.36,
      "60": 81.92
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Минфин России, государственные облигации, ISIN RU000A10D533", "share": 12.76 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10D517", "share": 9.06 },
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 8.44 },
      { "name": "ОАО \"РЖД\", облигации российских хоз. обществ, ISIN RU000A10DJR7", "share": 6.32 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10BVH7", "share": 4.85 }
    ],
    "sectors": [
      { "name": "Гос. бумаги", "share": 43.06 },
      { "name": "Финансы", "share": 17.47 },
      { "name": "Транспорт", "share": 9.72 },
      { "name": "Банки", "share": 8.05 },
      { "name": "Телеком", "share": 6.75 },
      { "name": "Нефть и газ", "share": 6.24 },
      { "name": "Металлургия", "share": 4.3 },
      { "name": "Электроэнергетика", "share": 3.35 },
      { "name": "Технологии", "share": 1.12 },
      { "name": "РЕПО", "share": 0.16 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2005-07-30",
    "id": "0336-76034510",
    "name": "Просто. Акции",
    "strategy": "Ликвидные акции индекса Мосбиржи",
    "profile": "shares",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/753/81r5gf6nzl3nouh6zgq7hxiro7cxakbb/9.-OPIF-Prosto.-Aktsii_09112026.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/shares/",
    "annualFee": 3.64,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": -1.33,
      "12": 4.11,
      "36": -2.6,
      "60": -3.37
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "ПАО Сбербанк, акции обыкновенные, ISIN RU0009029540", "share": 9.64 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 9.53 },
      { "name": "МКПАО \"Озон\", акции обыкновенные, ISIN RU000A10CW95", "share": 9.5 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 7.95 },
      { "name": "ПАО \"Татнефть\" им. В.Д. Шашина, акции обыкновенные, ISIN RU0009033591", "share": 7.75 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 32.38 },
      { "name": "Ритейл", "share": 13.84 },
      { "name": "Технологии", "share": 13.13 },
      { "name": "Финансы", "share": 11.25 },
      { "name": "Банки", "share": 10.46 },
      { "name": "Недвижимость", "share": 3.74 },
      { "name": "Металлургия", "share": 3.36 },
      { "name": "Химия", "share": 2.94 },
      { "name": "Транспорт", "share": 2.76 },
      { "name": "Фармацевтика", "share": 2.3 },
      { "name": "Электроэнергетика", "share": 1.79 },
      { "name": "РЕПО", "share": 1.72 },
      { "name": "Медицина", "share": 0.28 },
      { "name": "Пищепром", "share": 0.1 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2005-07-30",
    "id": "0337-76034438",
    "name": "Просто. Баланс",
    "strategy": "Облигации и акции в рублях",
    "profile": "mixed",
    "ticker": null,
    "currency": "Рублёвые акции и облигации.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/441/s5f6n6419xbe59p9zy38iysy45q6whw0/14.-OPIF-Prosto.-Balans_09112026.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/balanced/",
    "annualFee": 3.39,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 0.02,
      "12": 6.86,
      "36": 16.37,
      "60": 26.41
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 8.46 },
      { "name": "ПАО Сбербанк, акции обыкновенные, ISIN RU0009029540", "share": 8.22 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 6.85 },
      { "name": "МКПАО \"Озон\", акции обыкновенные, ISIN RU000A10CW95", "share": 6.27 },
      { "name": "АО \"Атомэнергопром\", облигации российских хоз. обществ, ISIN RU000A10EJQ7", "share": 5.04 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 29.34 },
      { "name": "Финансы", "share": 17.91 },
      { "name": "Банки", "share": 17.26 },
      { "name": "Ритейл", "share": 8.01 },
      { "name": "Гос. бумаги", "share": 7.37 },
      { "name": "Электроэнергетика", "share": 5.79 },
      { "name": "Технологии", "share": 4.09 },
      { "name": "Телеком", "share": 2.88 },
      { "name": "Металлургия", "share": 2.57 },
      { "name": "Недвижимость", "share": 1.21 },
      { "name": "Химия", "share": 1.09 },
      { "name": "Транспорт", "share": 0.91 },
      { "name": "Строительство", "share": 0.65 },
      { "name": "Фармацевтика", "share": 0.63 },
      { "name": "РЕПО", "share": 0.41 },
      { "name": "Медицина", "share": 0.1 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2004-12-21",
    "id": "0257-74113429",
    "name": "Перспективные вложения",
    "strategy": "Ликвидные акции широкого рынка",
    "profile": "shares",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/6c0/9c4wcz1tb05n80ywropq04vz1i20f5l4/13.-OPIF-Perspektivnye-vlozheniya_09112026.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/kapital-perspective/",
    "annualFee": 3.64,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": -2.24,
      "12": 3.79,
      "36": -4.64,
      "60": -8.15
    },
    "historyDate": null,
    "holdings": [
      { "name": "МКПАО \"Озон\", акции обыкновенные, ISIN RU000A10CW95", "share": 9.55 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 8.63 },
      { "name": "ПАО Сбербанк, акции обыкновенные, ISIN RU0009029540", "share": 8.26 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 8.18 },
      { "name": "ПАО \"Татнефть\" им. В.Д. Шашина, акции обыкновенные, ISIN RU0009033591", "share": 8.1 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 34.35 },
      { "name": "Ритейл", "share": 13.38 },
      { "name": "Технологии", "share": 12.98 },
      { "name": "Банки", "share": 12.58 },
      { "name": "Финансы", "share": 11.93 },
      { "name": "Металлургия", "share": 4.58 },
      { "name": "Недвижимость", "share": 2.54 },
      { "name": "Фармацевтика", "share": 1.92 },
      { "name": "Электроэнергетика", "share": 1.69 },
      { "name": "Химия", "share": 1.43 },
      { "name": "РЕПО", "share": 0.89 },
      { "name": "Транспорт", "share": 0.87 },
      { "name": "Телеком", "share": 0.77 },
      { "name": "Медицина", "share": 0.09 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2021-10-19",
    "id": "4614",
    "name": "Окно возможностей",
    "strategy": "Акции индекса широкого рынка",
    "profile": "shares",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/f6a/tvrdwwlo5fd2hcv6oqot16glerjpkzb5/12.-OPIF-Okno-vozmozhnostey_12112026.pdf",
    "published": "2026-11-17",
    "kidDate": "2026-11-12",
    "url": "https://www.upravlyaem.ru/funds/promsvyaz-okno-vozmozhnostey/",
    "annualFee": 4.19,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": -2.6,
      "12": 3.94,
      "36": -6.9,
      "60": 18.63
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "ПАО Сбербанк, акции обыкновенные, ISIN RU0009029540", "share": 9.77 },
      { "name": "ПАО \"Группа Позитив\", акции обыкновенные, ISIN RU000A103X66", "share": 9.09 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 8.47 },
      { "name": "ПАО ДОМ.РФ, акции обыкновенные, ISIN RU000A0ZZFU5", "share": 8.07 },
      { "name": "ПАО \"ПРОМОМЕД\", акции обыкновенные, ISIN RU000A108JF7", "share": 6.31 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 26.49 },
      { "name": "Технологии", "share": 17.09 },
      { "name": "Банки", "share": 12.05 },
      { "name": "Фармацевтика", "share": 10.73 },
      { "name": "Электроэнергетика", "share": 9.37 },
      { "name": "Финансы", "share": 8.99 },
      { "name": "Ритейл", "share": 6.43 },
      { "name": "РЕПО", "share": 3.42 },
      { "name": "Транспорт", "share": 2.34 },
      { "name": "Химия", "share": 0.96 },
      { "name": "Металлургия", "share": 0.7 },
      { "name": "Пищепром", "share": 0.51 },
      { "name": "Телеком", "share": 0.47 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2023-03-17",
    "id": "5210",
    "name": "Дивидендные акции",
    "strategy": "Акции широкого рынка с потенциалом дохода",
    "profile": "shares",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/cc5/ik0toyf2fa1madd8xizehjyy4vwvnso8/5.-OPIF-Dividendnye-aktsii_09112026.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/dividendnye-aktsii/",
    "annualFee": 3.64,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": -2.79,
      "12": 4.0,
      "36": -11.95
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "ПАО Сбербанк, акции обыкновенные, ISIN RU0009029540", "share": 9.6 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 9.54 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 7.75 },
      { "name": "ПАО \"Татнефть\" им. В.Д. Шашина, акции обыкновенные, ISIN RU0009033591", "share": 7.68 },
      { "name": "ПАО \"Газпром\", акции обыкновенные, ISIN RU0007661625", "share": 7.6 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 44.03 },
      { "name": "Банки", "share": 12.38 },
      { "name": "Технологии", "share": 9.02 },
      { "name": "Финансы", "share": 8.8 },
      { "name": "Металлургия", "share": 5.75 },
      { "name": "Ритейл", "share": 5.18 },
      { "name": "Электроэнергетика", "share": 5.13 },
      { "name": "РЕПО", "share": 3.63 },
      { "name": "Фармацевтика", "share": 2.55 },
      { "name": "Транспорт", "share": 1.85 },
      { "name": "Телеком", "share": 0.78 },
      { "name": "Химия", "share": 0.67 },
      { "name": "Горнодобыча", "share": 0.44 },
      { "name": "Пищепром", "share": 0.21 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": true
  },
  {
    "minRub": 100,
    "formed": "2022-11-22",
    "id": "5132",
    "name": "Недра России",
    "strategy": "Акции из индекса широкого рынка",
    "profile": "shares",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/038/7y5sc4f7htppyxftu51dj7bfjyur5bqr/8.-OPIF-Nedra-Rossii_09112026_.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/nedra-rossii/",
    "annualFee": 3.64,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": -5.01,
      "12": 0.48,
      "36": -14.47
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 9.72 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 9.42 },
      { "name": "ПАО \"Татнефть\" им. В.Д. Шашина, акции обыкновенные, ISIN RU0009033591", "share": 9.12 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 9.04 }
    ],
    "sectors": [
      { "name": "Нефть и газ", "share": 58.37 },
      { "name": "Металлургия", "share": 18.39 },
      { "name": "Химия", "share": 9.44 },
      { "name": "Электроэнергетика", "share": 9.15 },
      { "name": "РЕПО", "share": 2.13 },
      { "name": "Горнодобыча", "share": 1.21 },
      { "name": "Транспорт", "share": 1.1 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2023-01-27",
    "id": "5223",
    "name": "Курс на Восток",
    "strategy": "Облигации с валютной экспозицией",
    "profile": "fx",
    "ticker": null,
    "currency": "КИД указывает CNY, USD, EUR, GBP, CHF или привязку выплат к ним. Доли по валютам не приведены.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/6f5/69sa3jb931e8jaiqti15ikwf3dminfrl/6.-OPIF-Kurs-na-Vostok_12112026.pdf",
    "published": "2026-11-17",
    "kidDate": "2026-11-12",
    "url": "https://www.upravlyaem.ru/funds/kurs-na-vostok/",
    "annualFee": 1.44,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 7.99,
      "12": 4.45,
      "36": 2.01
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Минфин России, государственные облигации, ISIN RU000A10DQA8", "share": 29.09 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10FAK6", "share": 21.75 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10A877", "share": 7.93 },
      { "name": "ООО \"Газпром капитал\", облигации российских хоз. обществ, ISIN RU000A10F728", "share": 5.85 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10A844", "share": 5.8 }
    ],
    "sectors": [
      { "name": "Гос. бумаги", "share": 68.86 },
      { "name": "Финансы", "share": 10.47 },
      { "name": "Горнодобыча", "share": 6.55 },
      { "name": "Нефть и газ", "share": 6.15 },
      { "name": "Металлургия", "share": 3.88 },
      { "name": "Химия", "share": 3.55 },
      { "name": "Электроэнергетика", "share": 0.57 },
      { "name": "РЕПО", "share": 0.01 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2004-12-21",
    "id": "0259-74113501",
    "name": "Мировой баланс",
    "strategy": "Облигации в рублях и с валютной экспозицией",
    "profile": "fx",
    "ticker": null,
    "currency": "КИД указывает RUB, CNY, USD и облигации с привязкой выплат к валюте. Доли не приведены.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/92b/5034rhb475ftrzocbacsutxvy2oo5180/7.-OPIF-Mirovoy-balans_23112026.pdf",
    "published": "2026-11-24",
    "kidDate": "2026-11-23",
    "url": "https://www.upravlyaem.ru/funds/Mirovoy-balans/",
    "annualFee": 3.39,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 6.86,
      "12": 7.92,
      "36": 30.04,
      "60": 31.81
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": " Минфин России, государственные облигации, ISIN RU000A10FAK6                                  22.13 Минфин России, государственные облигации, ISIN RU000A10DQA8                                  14.59 Минфин России, государственные облигации, ISIN RU000A10A877                                   9.23 Минфин России, государственные облигации, ISIN RU000A10A802", "share": 9.04 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10D533", "share": 8.74 }
    ],
    "sectors": [
      { "name": "Гос. бумаги", "share": 80.47 },
      { "name": "Химия", "share": 6.6 },
      { "name": "Горнодобыча", "share": 5.86 },
      { "name": "Нефть и газ", "share": 3.12 },
      { "name": "Металлургия", "share": 1.19 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": false
  },
  {
    "minRub": 100,
    "formed": "2022-08-05",
    "id": "5007",
    "name": "Финансовый поток",
    "strategy": "Корпоративные облигации с выплатами по паям",
    "profile": "bonds",
    "ticker": null,
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/407/hg94v51m0ec7kvwjkkpq6t2a1qvj4b5e/16.-OPIF-Finansovyy-potok_09112026_.pdf",
    "published": "2026-11-12",
    "kidDate": "2026-11-09",
    "url": "https://www.upravlyaem.ru/funds/finansovyy-potok/",
    "annualFee": 1.94,
    "feeCap": true,
    "entryFee": "от 0% до 1,5%",
    "exitFee": "от 0% до 2,0%",
    "history": {
      "6": 5.23,
      "12": 13.23,
      "36": 36.38
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "АО РОСЭКСИМБАНК, облигации российских хоз. обществ, ISIN RU000A1077V4", "share": 8.94 },
      { "name": "ПАО \"Ростелеком\", облигации российских хоз. обществ, ISIN RU000A10DCJ9", "share": 8.44 },
      { "name": "АО \"Авто Финанс Банк\", облигации российских хоз. обществ, ISIN RU000A107HR8", "share": 7.94 },
      { "name": "АО \"Атомэнергопром\", облигации российских хоз. обществ, ISIN RU000A10F7T3", "share": 6.5 },
      { "name": "ОАО \"РЖД\", облигации российских хоз. обществ, ISIN RU000A10DJR7", "share": 6.15 }
    ],
    "sectors": [
      { "name": "Финансы", "share": 20.87 },
      { "name": "Банки", "share": 17.26 },
      { "name": "Нефть и газ", "share": 16.43 },
      { "name": "Транспорт", "share": 11.44 },
      { "name": "Электроэнергетика", "share": 10.05 },
      { "name": "Телеком", "share": 8.43 },
      { "name": "Металлургия", "share": 6.64 },
      { "name": "Гос. бумаги", "share": 4.87 },
      { "name": "Технологии", "share": 3.97 },
      { "name": "РЕПО", "share": 0.39 }
    ],
    "sectorDate": "2026-10-30",
    "distributes": true
  },
  {
    "minRub": 1000000,
    "formed": "2024-05-24",
    "id": "6170",
    "name": "ПСБ — Денежный рынок",
    "strategy": "Обратное РЕПО с центральным контрагентом",
    "profile": "cash",
    "ticker": "PSMM",
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/96b/lbxfqgvavghsx4dvn32kltosguacbjz1/1.-BPIF-PSB_-Denezhnyy-rynok_13112026.pdf",
    "published": "2026-11-18",
    "kidDate": "2026-11-13",
    "url": "https://www.upravlyaem.ru/funds/denezhnyy-rynok/",
    "annualFee": 0.76,
    "feeCap": true,
    "entryFee": "не взимается",
    "exitFee": "не взимается",
    "history": {
      "6": 6.98,
      "12": 15.15
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Минфин России, государственные облигации, ISIN RU000A1025B5", "share": 46.96 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A0JS3W6", "share": 45.94 },
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 7.11 },
      { "name": "Права требования к брокеру Банк ГПБ (АО)", "share": 0.0 }
    ],
    "sectors": [],
    "sectorDate": null,
    "distributes": false
  },
  {
    "minRub": 1000,
    "formed": "2025-04-14",
    "id": "6919",
    "name": "ПСБ — Золотой рынок",
    "strategy": "Требования на денежный эквивалент золота",
    "profile": "gold",
    "ticker": "PSGM",
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/341/hkg6h13qdhegigsk2zn0n07zyjayxz68/2.-BPIF-PSB_-Zolotoy-rynok_13112026.pdf",
    "published": "2026-11-18",
    "kidDate": "2026-11-13",
    "url": "https://www.upravlyaem.ru/funds/zolotoy-rynok/",
    "annualFee": 1.23,
    "feeCap": false,
    "entryFee": "не взимается",
    "exitFee": "не взимается",
    "history": {
      "6": -8.74,
      "12": -2.4
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Право требования к НКО НКЦ (АО) на эквивалент золота", "share": 100 },
      { "name": "Права требования к брокеру Банк ГПБ (АО)", "share": 0 }
    ],
    "sectors": [],
    "sectorDate": null,
    "distributes": false
  },
  {
    "minRub": 1000,
    "formed": "2024-11-18",
    "id": "6626",
    "name": "ПСБ — Рублевые облигации",
    "strategy": "Рублёвые облигации российских эмитентов",
    "profile": "bonds",
    "ticker": "PSRB",
    "currency": "Преимущественно рублёвые облигации.",
    "kid": "https://www.upravlyaem.ru/upload/iblock/48f/ho16e9raczyu923w7ydqif9uhzlug1f6/4.-BPIF-PSB_-Rublevye-obligatsii_13112026.pdf",
    "published": "2026-11-18",
    "kidDate": "2026-11-13",
    "url": "https://www.upravlyaem.ru/funds/rublevye-obligatsii/",
    "annualFee": 1.98,
    "feeCap": true,
    "entryFee": "не взимается",
    "exitFee": "не взимается",
    "history": {
      "6": 5.34,
      "12": 14.03
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "Минфин России, государственные облигации, ISIN RU000A10D533", "share": 17.49 },
      { "name": "Минфин России, государственные облигации, ISIN RU000A10D517", "share": 12.54 },
      { "name": "ВЭБ.РФ, облигации государственных корпораций, ISIN RU000A10F504", "share": 8.39 },
      { "name": "АО РОСЭКСИМБАНК, облигации российских хоз. обществ, ISIN RU000A1077V4", "share": 6.82 }
    ],
    "sectors": [],
    "sectorDate": null,
    "distributes": false
  },
  {
    "minRub": 1000,
    "formed": "2025-07-16",
    "id": "7155",
    "name": "ПСБ — Российские акции",
    "strategy": "Акции крупных российских компаний",
    "profile": "shares",
    "ticker": "PSRE",
    "currency": "",
    "kid": "https://www.upravlyaem.ru/upload/iblock/11e/8938k8nj4p46817symmjew7euhcl4y1y/3.-BPIF-PSB_-Rossiyskie-aktsii_13112026.pdf",
    "published": "2026-11-18",
    "kidDate": "2026-11-13",
    "url": "https://www.upravlyaem.ru/funds/rossiyskie-aktsii/",
    "annualFee": 2.48,
    "feeCap": false,
    "entryFee": "не взимается",
    "exitFee": "не взимается",
    "history": {
      "6": 0.77,
      "12": 7.31
    },
    "historyDate": "2026-10-30",
    "holdings": [
      { "name": "МКПАО \"Озон\", акции обыкновенные, ISIN RU000A10CW95", "share": 9.35 },
      { "name": "ПАО \"ЛУКОЙЛ\", акции обыкновенные, ISIN RU0009024277", "share": 7.69 },
      { "name": "ПАО \"НОВАТЭК\", акции обыкновенные, ISIN RU000A0DKVS5", "share": 7.48 },
      { "name": "Права требования к брокеру Банк ГПБ (АО)", "share": 7.33 },
      { "name": "ПАО \"Татнефть\" им. В.Д. Шашина, акции обыкновенные, ISIN RU0009033591", "share": 7.23 }
    ],
    "sectors": [],
    "sectorDate": null,
    "distributes": false
  }
]
