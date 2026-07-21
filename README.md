# Финворды

Интерактивный MVP словесной игры о финансах для WebView. Игрок ищет
финансовые термины в поле 6×6, получает краткие определения, подсказки,
обучающие предложения и награды.

**Играть:** https://robotrek1000.github.io/Finwords/

## Что реализовано

- два полностью проходимых уровня;
- выбор слов мышью и касанием без диагоналей;
- целевые и бонусные слова;
- определения терминов и предложения Course/Product;
- последовательные подсказки по буквам;
- обычный и золотой конверты с наградами;
- Home, Narrative, Game, Results, Appearance, Settings и Feedback;
- типизированный аналитический слой-заглушка;
- адаптивность для ширины 320–430 px;
- unit- и Playwright E2E-тесты.

## Стек

- React DOM 19;
- TypeScript;
- Vite;
- CSS Modules;
- Motion;
- Vitest и React Testing Library;
- Playwright.

## Локальный запуск

```bash
npm ci
npm run dev
```

Проверки:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Состояние MVP хранится только в памяти React и полностью сбрасывается после
перезагрузки страницы. Backend, WebView-мост и реальные внешние переходы будут
подключены после получения спецификаций.

## Публикация

Каждый push в ветку `main` запускает GitHub Actions: зависимости устанавливаются
через `npm ci`, затем выполняются lint, проверка TypeScript, unit/component-тесты
и production build. Успешная сборка автоматически публикуется в GitHub Pages.
