# DYNAMIC INVEST · Private Wealth & Financial Intelligence

DYNAMIC INVEST объединяет учёт частного капитала, финансовую математику и исследование официальных данных в одном локальном терминале. В этой ветке находится незавершённая сборка **5.0 ULTRA**. На [публичной демонстрации](https://vladislavly07.github.io/DYNAMIC-INVEST/) опубликована базовая 1.0.

![Обзор капитала в 5.0 ULTRA](docs/screenshots/dashboard-1440.png)

[Конструктор](docs/screenshots/constructor.png) · [Налоги](docs/screenshots/tax.png) · [Архив](docs/screenshots/archive.png) · [Сценарии](docs/screenshots/strategy.png) · [Презентация](docs/screenshots/presentation.png) · [1024 px](docs/screenshots/dashboard-1024.png) · [768 px](docs/screenshots/dashboard-768.png) · [360 px](docs/screenshots/dashboard-360.png)

## Что доступно

- Несколько портфелей, ограничение бюджета, сохранение договорных параметров, резервные копии, JSON и CSV.
- Прогноз капитала, календарь выплат, детализация до события и отдельные записи для дохода, переоценки, номинала, комиссии и условного налога.
- Обычные банковские проценты и расчёт НДФЛ 2023–2026. Формулы, исключения и источники доступны в разделе «Налоги».
- Исторические данные Банка России, начальный архив банковских публикаций и симуляция официальных ценовых ориентиров.
- Сравнение сценариев, цели, лестница, экран рисков, частная модель консультации, бизнес-воронка и локальный аналитик.

## Запуск

Требуется Node.js 24.

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Локальный маршрут `/DYNAMIC-INVEST/`. При наличии системного Chromium можно задать `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Переменная `DI_SCREENSHOTS` указывает папку снимков при браузерном прогоне.

## Данные и ограничения

Подтверждённые наблюдения ЦБ отделены от каталога, пользовательских оценок и сценариев. Каталог ПСБ остаётся частичным, новые условия без проверенного интервала действия не публикуются как текущие. В банковской модели нет всех специальных налоговых и договорных правил. [Источники](DATA-SOURCES.md) · [Формулы](FINANCIAL-FORMULAS.md) · [Налоговая методика](TAX-METHODOLOGY.md).

## Сопровождение

[Руководство](USER-GUIDE.md) · [Архитектура](ARCHITECTURE.md) · [Дизайн](DESIGN-SYSTEM.md) · [Безопасность](SECURITY.md) · [Публикация](DEPLOYMENT.md) · [Приёмка](ACCEPTANCE-CHECKLIST.md) · [Статус](IMPLEMENTATION-STATUS.md) · [Продолжение](NEXT-STEPS.md)
