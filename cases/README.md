# Дела

Каждое разбирательство создаёт здесь отдельную папку. Папку и файлы создаёт Секретарь; вручную менять материалы дела не следует.

Первое разбирательство создаёт пять файлов, этап 2 дописывает новые, этап 3 добавляет производный `verdict.html`:

```text
cases/<дата>-<slug>/
  case.md            идея V1, контекст, допущения, границы, критерий успеха
  transcript.md      дословно: позиции сторон V1 и раунды дебатов
  verdict.md         вердикт V1 Судьи (неизменяем после контрольной точки)
  report.md          отчёт Секретаря по V1
  log.json           статус, тайминги, события, verify, stage2
  idea-v2.md         утверждённая V2
  reconstruction.md  черновик Архитектора, рецензия Аудитора, итоговая редакция
  transcript-v2.md   дословно: позиции сторон V2 и раунды повторного суда
  verdict-v2.md      вердикт V2 со сверкой с V1
  comparison.md      сравнение V1/V2 с полным текстом вердикта V2
  verdict.html       автономный HTML-отчёт (этап 3), создаётся генератором
```

Структура и правила — в [`../docs/protocol.md`](../docs/protocol.md). Проверка регламента:

```powershell
node scripts/tribunal.mjs status --case "cases\<id>"
node scripts/tribunal.mjs verify --case "cases\<id>"
node scripts/tribunal.mjs verify --case "cases\<id>" --hearing 2
node scripts/tribunal.mjs report-html --case "cases\<id>"
```

`verdict.html` — производный файл: его создаёт генератор из `case.md`, `transcript.md`, `verdict.md`, `report.md`, `log.json` и (при наличии) материалов V2. Вручную его не редактируют; Markdown/JSON остаются источником истины.

Версия V1 не перезаписывается: на контрольной точке фиксируются хеши `case.md`, `transcript.md`, `verdict.md`, `report.md`, и `verify --hearing 2` проверяет их неизменность.
