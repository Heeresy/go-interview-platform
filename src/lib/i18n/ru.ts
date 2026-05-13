/**
 * Russian translation dictionary for UI Redesign 2026.
 *
 * Единый источник всех пользовательских строк новых экранов (Req 24.1, 24.2).
 * Ключи плоские (dot-notation используется только как смысловая группировка),
 * значения — непустые человеко-понятные строки на русском языке.
 *
 * Подстановка переменных: шаблоны вида `{varName}` заменяются на значения из
 * второго аргумента `t()`. Любая неразрешённая переменная остаётся в строке
 * как есть (без silent drop), чтобы рассинхрон между кодом и словарём был
 * заметен при ревью.
 *
 * Инвариант (Property 12): для любого ключа `k`, `t(k)` возвращает непустую
 * строку, отличную от `k`, без подстроки `"MISSING"`.
 */
export const ru = {
  // a11y
  'a11y.skipToMain': 'Перейти к основному контенту',
  'a11y.openMenu': 'Открыть меню',
  'a11y.closeMenu': 'Закрыть меню',
  'a11y.openCommandPalette': 'Открыть командную палитру',
  'a11y.toggleTheme': 'Переключить тему',
  'a11y.toggleSidebar': 'Свернуть или развернуть боковую панель',
  'a11y.notifications': 'Уведомления',
  'a11y.profileMenu': 'Меню профиля',

  // common buttons / actions
  'common.retry': 'Повторить',
  'common.cancel': 'Отмена',
  'common.close': 'Закрыть',
  'common.save': 'Сохранить',
  'common.continue': 'Продолжить',
  'common.back': 'Назад',
  'common.next': 'Далее',
  'common.submit': 'Отправить',
  'common.loading': 'Загрузка…',
  'common.tryAgain': 'Попробовать снова',

  // states
  'state.loading': 'Загружаем данные',
  'state.empty.title': 'Пока пусто',
  'state.empty.description': 'Здесь появятся данные, когда они станут доступны.',
  'state.error.title': 'Что-то пошло не так',
  'state.error.description': 'Не удалось загрузить данные. Попробуйте ещё раз.',
  'state.error.network': 'Сеть недоступна. Проверьте соединение и повторите попытку.',
  'state.error.server': 'Сервер временно недоступен. Попробуйте позже.',
  'state.error.unknown': 'Произошла неизвестная ошибка.',

  // navigation
  'nav.dashboard': 'Дашборд',
  'nav.questions': 'Вопросы',
  'nav.tasks': 'Задачи',
  'nav.trainer': 'Тренажёр',
  'nav.mock': 'Мок-интервью',
  'nav.profile': 'Профиль',
  'nav.status': 'Статус',
  'nav.signOut': 'Выйти',

  // command palette
  'commandPalette.placeholder': 'Введите команду или путь',
  'commandPalette.group.nav': 'Навигация',
  'commandPalette.group.action': 'Действия',
  'commandPalette.action.createMock': 'Создать мок-интервью',
  'commandPalette.action.startTrainer': 'Начать тренировку',
  'commandPalette.action.signOut': 'Выйти из аккаунта',
  'commandPalette.empty': 'Ничего не найдено',

  // theme
  'theme.dark': 'Тёмная тема',
  'theme.light': 'Светлая тема',

  // font / multi-language gate
  'font.multiLangRenderFailed':
    'Не удалось единообразно отобразить текст на русском и английском языках. Обновите страницу или попробуйте позже.',

  // motion / reveal fallback
  'motion.revealFallback':
    'Некоторые анимации отключены, содержимое показано целиком.',

  // landing
  'landing.hero.title': 'Готовьтесь к интервью системно',
  'landing.hero.subtitle':
    'Вопросы, задачи, адаптивный тренажёр и мок-интервью в одной платформе.',
  'landing.cta.primary': 'Начать бесплатно',
  'landing.cta.secondary': 'Войти',
  'landing.features.title': 'Возможности',
  'landing.features.speed.title': 'Скорость',
  'landing.features.speed.description':
    'Мгновенная загрузка, плавные переходы и моментальная обратная связь в каждом взаимодействии.',
  'landing.features.ai.title': 'AI',
  'landing.features.ai.description':
    'Интеллектуальные подсказки, оценка ответов и контекстная помощь во время решения задач.',
  'landing.features.adaptivity.title': 'Адаптивность',
  'landing.features.adaptivity.description':
    'Программа подстраивается под ваш уровень — задачи становятся сложнее по мере роста навыков.',
  'landing.modules.title': 'Разделы платформы',
  'landing.modules.questions.title': 'Вопросы',
  'landing.modules.questions.description':
    'База из сотен вопросов с AI-оценкой ответов и эталонными решениями.',
  'landing.modules.questions.alt': 'Скриншот раздела «Вопросы»',
  'landing.modules.tasks.title': 'Задачи',
  'landing.modules.tasks.description':
    'Coding-задачи с Monaco-редактором, запуском тестов и детальной диагностикой.',
  'landing.modules.tasks.alt': 'Скриншот раздела «Задачи»',
  'landing.modules.trainer.title': 'Тренажёр',
  'landing.modules.trainer.description':
    'Адаптивная прогрессия уровней: чем лучше результат, тем сложнее задачи.',
  'landing.modules.trainer.alt': 'Скриншот раздела «Тренажёр»',
  'landing.modules.mock.title': 'Мок-интервью',
  'landing.modules.mock.description':
    'Маркетплейс мок-интервью с рейтингами, комментариями и отслеживанием прогресса.',
  'landing.modules.mock.alt': 'Скриншот раздела «Мок-интервью»',
  'landing.modules.cta': 'Открыть раздел',
  'landing.socialProof.title': 'Нам доверяют',
  'landing.socialProof.subtitle':
    'Инженеры готовятся к интервью с помощью нашей платформы.',
  'landing.socialProof.company.acme': 'Acme',
  'landing.socialProof.company.nova': 'Nova',
  'landing.socialProof.company.pulse': 'Pulse',
  'landing.socialProof.company.orbit': 'Orbit',
  'landing.socialProof.company.lumen': 'Lumen',
  'landing.ctaSection.title': 'Готовы начать?',
  'landing.cta.title': 'Готовы пройти интервью уверенно?',
  'landing.cta.subtitle':
    'Создайте аккаунт за минуту и получите доступ ко всем разделам платформы.',
  'landing.footer.copyright': '© {year} GO Interview Platform',
  'landing.footer.product': 'Продукт',
  'landing.footer.product.features': 'Возможности',
  'landing.footer.product.modules': 'Разделы',
  'landing.footer.resources': 'Ресурсы',
  'landing.footer.resources.status': 'Статус',
  'landing.footer.resources.login': 'Войти',
  'landing.footer.legal': 'Правовая информация',
  'landing.footer.legal.privacy': 'Конфиденциальность',
  'landing.footer.legal.terms': 'Условия',
  'landing.footer.github': 'GitHub',
  'landing.footer.docs': 'Документация',
  'landing.footer.githubAriaLabel': 'Открыть репозиторий GitHub в новой вкладке',
  'landing.footer.docsAriaLabel': 'Открыть документацию в новой вкладке',

  // auth
  'auth.login.title': 'Вход в аккаунт',
  'auth.login.emailLabel': 'Электронная почта',
  'auth.login.passwordLabel': 'Пароль',
  'auth.login.submit': 'Войти',
  'auth.login.error': 'Не удалось войти. Проверьте данные и попробуйте ещё раз.',
  'auth.login.redirectFailed':
    'Не удалось перейти в кабинет. Попробуйте ещё раз.',
  'auth.logout': 'Выйти',

  // dashboard cards
  'dashboard.progress.title': 'Ваш прогресс',
  'dashboard.progress.label': 'Общий прогресс',
  'dashboard.progress.questions': 'Вопросов решено: {solved} из {total}',
  'dashboard.progress.tasks': 'Задач решено: {solved} из {total}',
  'dashboard.nextTask.title': 'Следующая задача',
  'dashboard.nextTask.cta': 'Начать',
  'dashboard.nextTask.difficulty': 'Сложность: {level}',
  'dashboard.nextTask.empty.title': 'Нет рекомендованной задачи',
  'dashboard.nextTask.empty.description':
    'Откройте раздел задач, чтобы выбрать что-то подходящее.',
  'dashboard.activity.title': 'Активность за 7 дней',
  'dashboard.activity.total': 'Всего действий: {count}',
  'dashboard.activity.empty': 'Нет активности за последние 7 дней.',
  'dashboard.activity.day.mon': 'Пн',
  'dashboard.activity.day.tue': 'Вт',
  'dashboard.activity.day.wed': 'Ср',
  'dashboard.activity.day.thu': 'Чт',
  'dashboard.activity.day.fri': 'Пт',
  'dashboard.activity.day.sat': 'Сб',
  'dashboard.activity.day.sun': 'Вс',
  'dashboard.activity.barAriaLabel': '{day}: {count} действий',
  'dashboard.leaderboard.title': 'Лидерборд',
  'dashboard.trainer.title': 'Тренажёр',
  'dashboard.mock.title': 'Мок-интервью',
  'dashboard.greeting': 'Привет, {name}',

  // questions
  'questions.list.title': 'Вопросы',
  'questions.filters.search': 'Поиск по вопросам',
  'questions.detail.answerPlaceholder': 'Напишите свой ответ…',
  'questions.detail.evaluate': 'Оценить ответ',
  'questions.detail.aiHint': 'Получить подсказку',
  'questions.detail.draftSaved': 'Черновик сохранён',
  'questions.detail.draftSaving': 'Сохраняем…',
  'questions.detail.description': 'Описание',
  'questions.detail.hint.title': 'Подсказка',
  'questions.detail.hint.show': 'Показать подсказку',
  'questions.detail.hint.hide': 'Скрыть подсказку',
  'questions.detail.difficulty': 'Сложность: {level}',

  // questions — AI evaluation panel
  'questions.detail.eval.empty.title': 'Оцените свой ответ',
  'questions.detail.eval.empty.description':
    'Оцените свой ответ, чтобы увидеть результат',
  'questions.detail.eval.loading': 'Оцениваем ответ…',
  'questions.detail.eval.title': 'Результат оценки',
  'questions.detail.eval.scoreLabel': 'Оценка',
  'questions.detail.eval.scoreValue': '{score} из 100',
  'questions.detail.eval.passed': 'Засчитано',
  'questions.detail.eval.failed': 'Не засчитано',
  'questions.detail.eval.passedHint': 'Отличный ответ',
  'questions.detail.eval.failedHint': 'Нужно набрать 85% для зачёта',
  'questions.detail.eval.feedbackTitle': 'Обратная связь от AI',
  'questions.detail.eval.error': 'Не удалось получить оценку. Попробуйте ещё раз.',
  // task 17.5: ключи `questions.detail.evaluation.*` для AiEvaluationPanel.
  'questions.detail.evaluation.score': 'Оценка',
  'questions.detail.evaluation.strengths': 'Сильные стороны',
  'questions.detail.evaluation.improvements': 'Что улучшить',
  'questions.detail.evaluation.empty': 'Отправьте ответ на оценку',

  // questions — community thread
  'questions.community.title': 'Обсуждение сообщества',
  'questions.community.subtitle':
    'Комментарии и ответы других участников по этому вопросу.',
  'questions.community.loadingLabel': 'Загружаем комментарии сообщества',
  'questions.community.empty.title': 'Комментариев пока нет',
  'questions.community.empty.description':
    'Будьте первым, кто поделится своим решением или мыслями по этому вопросу.',
  'questions.community.error': 'Не удалось загрузить комментарии сообщества.',
  'questions.community.unknownAuthor': 'Аноним',
  'questions.community.avatarAlt': 'Аватар автора {name}',
  'questions.community.placeholder':
    'Поделитесь своим мнением или решением…',
  'questions.community.submit': 'Отправить',
  'questions.community.submitError':
    'Не удалось отправить комментарий. Попробуйте ещё раз.',
  'questions.community.emptyError': 'Введите текст комментария.',

  // tasks
  'tasks.list.title': 'Задачи',
  'tasks.filters.search': 'Поиск по задачам',
  'tasks.filters.category': 'Категория',
  'tasks.filters.category.all': 'Все',
  'tasks.detail.back': 'Все задачи',
  'tasks.detail.notFound.title': 'Задача не найдена',
  'tasks.detail.notFound.description':
    'Возможно, задача была удалена или ссылка устарела.',
  'tasks.detail.editor.fileName': 'main.go',
  'tasks.detail.editor.reset': 'Сбросить',
  'tasks.detail.run.extended': 'Расширенные тесты',
  'tasks.filters.difficulty': 'Сложность',
  'tasks.filters.difficulty.1': 'Лёгкий',
  'tasks.filters.difficulty.2': 'Средний',
  'tasks.filters.difficulty.3': 'Выше среднего',
  'tasks.filters.difficulty.4': 'Сложный',
  'tasks.filters.difficulty.5': 'Экспертный',
  'tasks.detail.run': 'Запустить тесты',
  'tasks.execution.compileError': 'Ошибка компиляции',
  'tasks.execution.runtimeError': 'Ошибка выполнения',
  'tasks.execution.timeout': 'Превышен лимит времени. Запустите тесты ещё раз.',
  'tasks.execution.success': 'Пройдено тестов: {passed} из {total}',
  'tasks.execution.idle.title': 'Результаты выполнения',
  'tasks.execution.idle.description': 'Нажмите «Запустить тесты», чтобы увидеть результаты выполнения здесь.',
  'tasks.execution.running': 'Выполняем тесты…',
  'tasks.execution.compileError.line': 'Строка {line}',
  'tasks.execution.compileError.type': 'Тип: {type}',
  'tasks.execution.runtimeError.failedTest': 'Неудачный тест: {name}',
  'tasks.execution.runtimeError.stderr': 'stderr',

  // trainer
  'trainer.header.level': 'Уровень {level}',
  'trainer.header.solved': 'Решено: {count}',
  'trainer.levelUp.title': 'Новый уровень!',
  'trainer.empty.title': 'Нет вопросов для этого уровня',
  'trainer.empty.description':
    'Попробуйте позже или выберите другой уровень в настройках сессии.',
  'trainer.feedback.title': 'Результат',
  'trainer.feedback.score': '{score} из 100',
  'trainer.continue': 'Продолжить',

  // mock
  'mock.list.title': 'Мок-интервью',
  'mock.create.title': 'Создать мок-интервью',
  'mock.create.step': 'Шаг {current} из {total}',
  'mock.create.step1.heading': 'Название и категория',
  'mock.create.step2.heading': 'Сложность и длительность',
  'mock.create.step3.heading': 'Проверьте и создайте',
  'mock.create.titleLabel': 'Название',
  'mock.create.titlePlaceholder': 'Например, «Frontend Senior — Round 1»',
  'mock.create.titleError': 'Введите название мок-интервью.',
  'mock.create.categoryLabel': 'Категория',
  'mock.create.categoryPlaceholder': 'Выберите категорию',
  'mock.create.categoryError': 'Выберите категорию из списка.',
  'mock.create.difficultyLabel': 'Сложность',
  'mock.create.difficultyError': 'Выберите уровень сложности.',
  'mock.create.durationLabel': 'Длительность, мин',
  'mock.create.durationPlaceholder': 'Например, 60',
  'mock.create.durationError': 'Длительность должна быть от 5 до 240 минут.',
  'mock.create.reviewLabel.title': 'Название',
  'mock.create.reviewLabel.category': 'Категория',
  'mock.create.reviewLabel.difficulty': 'Сложность',
  'mock.create.reviewLabel.duration': 'Длительность',
  'mock.create.reviewDurationValue': '{value} мин',
  'mock.create.submit': 'Создать',
  'mock.create.submitError': 'Не удалось создать мок-интервью. Попробуйте ещё раз.',
  'mock.rating.saved': 'Оценка сохранена',
  'mock.comment.saved': 'Комментарий добавлен',
  'mock.filters.search': 'Поиск по мок-интервью',
  'mock.filters.difficulty': 'Сложность',
  'mock.filters.category': 'Категория',
  'mock.filters.rating': 'Рейтинг от',
  'mock.filters.rating.any': 'Любой',
  'mock.filters.rating.min': 'От {value}',
  'mock.card.rating': 'Рейтинг: {value}',
  'mock.card.commentCount': 'Комментариев: {count}',
  'mock.card.ratingAriaLabel': 'Средний рейтинг {value} из 5',
  'mock.card.commentsAriaLabel': '{count} комментариев',
  'mock.detail.description': 'Описание',
  'mock.detail.averageRatingAriaLabel': 'Средний рейтинг {value} из 5',
  'mock.detail.commentsTitle': 'Комментарии',
  'mock.detail.rate': 'Оцените мок-интервью',
  'mock.detail.comments': 'Комментарии',
  'mock.detail.empty.comments': 'Пока нет комментариев. Будьте первым.',
  'mock.rating.title': 'Ваша оценка',
  'mock.rating.label': 'Поставьте оценку от 1 до 5',
  'mock.rating.starAriaLabel': 'Оценка {value} из 5',
  'mock.rating.confirmation': 'Оценка сохранена',
  'mock.comment.placeholder': 'Поделитесь впечатлениями…',
  'mock.comment.submit': 'Опубликовать',
  'mock.comment.empty': 'Пока нет комментариев. Будьте первым.',
  'mock.comment.error': 'Не удалось опубликовать комментарий. Попробуйте ещё раз.',
  'mock.comment.emptyError': 'Введите текст комментария.',

  // profile
  'profile.header.title': 'Профиль',
  'profile.stats.title': 'Статистика',
  'profile.achievements.title': 'Достижения',
  'profile.achievements.unlocked': 'Получено',
  'profile.achievements.locked': 'Ещё не открыто',
  'profile.achievements.empty.title': 'Пока нет достижений',
  'profile.achievements.empty.description':
    'Решайте задачи и проходите мок-интервью, чтобы открывать достижения.',
  'profile.activity.title': 'История активности',
  'profile.activity.empty.title': 'Пока нет активности',
  'profile.activity.empty.description':
    'Здесь появятся события, как только вы начнёте решать задачи или проходить интервью.',
  'profile.charts.title': 'Прогресс',
  'profile.charts.empty.title': 'Пока нет данных для графика',
  'profile.charts.empty.description':
    'Решайте задачи и проходите интервью — здесь появится график прогресса.',
  'profile.charts.tooltip.value': 'Значение: {value}',
  'profile.charts.tooltip.date': 'Дата: {date}',
  'profile.charts.aria.label': 'График прогресса по {count} точкам',
  'profile.charts.aria.point': '{date}: {value}',
  'profile.charts.bars.title': 'Решено по месяцам',
  'profile.charts.bars.aria.label':
    'Столбчатая диаграмма решённых задач по месяцам',
  'profile.charts.bars.tooltip': '{month}: решено {value}',
  'profile.charts.bars.barAria': '{month}, решено: {value}',
  'profile.charts.line.title': 'Накопительный счёт',
  'profile.charts.line.aria.label':
    'Линия накопительного счёта по времени',
  'profile.charts.line.tooltip': '{date}: {value}',
  'profile.charts.line.pointAria': '{date}, значение: {value}',

  // status
  'status.title': 'Статус сервисов',
  'status.operational': 'Работает штатно',
  'status.degraded': 'Ограниченная работоспособность',
  'status.outage': 'Сбой',
  'status.unknown': 'Статус недоступен',
} as const;

/**
 * Тип словаря: константный объект со всеми ключами.
 */
export type Translations = typeof ru;

/**
 * Типизированный ключ словаря.
 *
 * Использование: `t("a11y.skipToMain")` — TypeScript проверит существование ключа.
 */
export type TranslationKey = keyof Translations;

/**
 * Переменные подстановки: строки или числа.
 */
export type TranslationVars = Record<string, string | number>;

const VAR_PATTERN = /\{(\w+)\}/g;

/**
 * Возвращает локализованную строку по типизированному ключу.
 *
 * Подстановка: шаблоны `{varName}` заменяются на `String(vars[varName])`.
 * Неразрешённые переменные (ключ отсутствует в `vars` или значение равно
 * `undefined`) остаются в строке как есть — это делает проблему видимой на UI,
 * а не маскирует её тихим удалением.
 *
 * @param key типизированный ключ словаря
 * @param vars карта переменных для подстановки (опционально)
 */
export function t<K extends TranslationKey>(
  key: K,
  vars?: TranslationVars,
): string {
  const template = ru[key];
  if (!vars) return template;
  return template.replace(VAR_PATTERN, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}
