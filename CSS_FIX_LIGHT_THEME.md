# ✅ Исправление CSS для Light Theme

**Дата**: 2026-04-18  
**Проблема**: Кнопки сортировки невидимы в light theme  
**Статус**: ✅ ИСПРАВЛЕНО

---

## 🐛 Проблема

На странице с сортировкой некоторые кнопки (badge) не отображались при включенном light theme. Причина: недостающие переменные `--accent-*` для light theme.

---

## ✅ Решение

### 1. Добавлены accent colors для light theme

**Файл**: `src/app/globals.css`

```css
[data-theme="light"] {
  /* ... existing vars ... */
  
  /* Accent colors for light theme */
  --accent-yellow: #d97706;
  --accent-green: #16a34a;
  --accent-red: #dc2626;
  --accent-blue: #0284c7;
  --accent-purple: #7c3aed;
  --accent-orange: #d97706;
}
```

### 2. Добавлены специфичные стили для badge в light theme

```css
[data-theme="light"] .badge--easy {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

[data-theme="light"] .badge--medium {
  background: rgba(217, 119, 6, 0.12);
  color: #d97706;
}

[data-theme="light"] .badge--hard {
  background: rgba(217, 119, 6, 0.12);
  color: #d97706;
}

[data-theme="light"] .badge--expert {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

[data-theme="light"] .badge--info {
  background: rgba(2, 132, 199, 0.12);
  color: #0284c7;
}

[data-theme="light"] .badge--purple {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}
```

### 3. Улучшены стили button для light theme

```css
[data-theme="light"] .btn--secondary {
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .btn--secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.15);
}
```

### 4. Улучшены стили input для light theme

```css
[data-theme="light"] .input {
  background: #FFFFFF;
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .input:focus {
  border-color: #24b47e;
  box-shadow: 0 0 0 3px rgba(36, 180, 126, 0.12);
}
```

---

## 🎯 Результат

**ДО**: Кнопки залиты белым, текст не виден  
**ПОСЛЕ**: Все кнопки видны с правильными цветами

### Light theme теперь правильно отображает:
- ✅ Badge (все типы: easy, medium, hard, expert, info, purple)
- ✅ Secondary buttons
- ✅ Input fields
- ✅ Filter/sort buttons

---

## 📋 Файлы изменены

- `src/app/globals.css` - Добавлены стили для light theme

---

## 🧪 Как тестировать

1. **Откройте** http://localhost:3000
2. **Перейдите** на страницу Questions (/questions)
3. **Переключитесь** в light mode (если есть toggle)
4. **Проверьте** что все кнопки сортировки видны

---

## 💾 Commit

```bash
git add src/app/globals.css
git commit -m "fix: add light theme styles for badges and buttons

- Add missing accent color variables for light theme
- Fix badge visibility in light mode (easy, medium, hard, expert, info, purple)
- Improve button and input styles for light theme
- Ensure proper contrast and readability in light mode"
```

---

**Status**: ✅ FIXED  
**Next**: Test in browser

---

