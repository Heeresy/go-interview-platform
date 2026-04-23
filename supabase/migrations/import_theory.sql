-- Non-destructive cleanup and import script

-- Ensure the questions table has a unique constraint on description for upserting
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_description_unique') THEN
        ALTER TABLE public.questions ADD CONSTRAINT questions_description_unique UNIQUE (description);
    END IF;
END $$;

-- Ensure Categories exist
INSERT INTO public.categories (name, slug)
VALUES ('Общее', 'общее')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Go', 'go')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Go Advanced', 'go-advanced')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Architecture', 'architecture')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Algorithms', 'algorithms')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Infrastructure', 'infrastructure')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Networking', 'networking')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.categories (name, slug)
VALUES ('Databases', 'databases')
ON CONFLICT (name) DO NOTHING;

-- Insert or Update Questions using dynamic category lookup
INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$SOLID, расшифровка каждой буквы + подробные примеры из Go$T$, $D$SOLID, расшифровка каждой буквы + подробные примеры из Go$D$, 3, $A$SOLID — это принципы проектирования, которые делают код гибким и поддерживаемым.
* **S (Single Responsibility - Единая ответственность)**: У структуры или пакета должна быть только одна причина для изменения.
  * *Пример*: У вас есть структура `User`. Функция генерации для него JWT-токена не должна лежать в репозитории, который сохраняет пользователя в БД. Разделите логику на `UserRepository` (работа с БД) и `AuthService` (генерация токенов).
* **O (Open/Closed - Открытость/Закрытость)**: Программные сущности открыты для расширения, но закрыты для модификации. 
  * *Пример*: Если вы хотите добавить новый способ оплаты (Crypto), вы не должны переписывать старый класс `PaymentProcessor` (добавляя туда кучу `if/else`). Вы создаете интерфейс `Payer`, реализуете метод `Pay()` для `CryptoPayer` и просто передаете его в процессор.
* **L (Liskov Substitution - Подстановка Барбары Лисков)**: Функции, использующие базовый тип (интерфейс), должны иметь возможность использовать его подтипы, не зная об этом, и логика не должна ломаться.
  * *Пример*: Если интерфейс `Bird` имеет метод `Fly()`, и вы создаете структуру `Penguin`, которая реализует `Fly()` так, что программа падает с ошибкой ("пингвины не летают") — это нарушение. Нужно разделить интерфейсы на `Bird` и `FlyingBird`.
* **I (Interface Segregation - Разделение интерфейса)**: Много специализированных интерфейсов лучше, чем один "толстый" (God object).
  * *Пример*: Не делайте интерфейс `Worker` с методами `Work()` и `Eat()`. Робот может работать, но не ест. Сделайте два интерфейса: `Workable` и `Feedable`.
* **D (Dependency Inversion - Инверсия зависимостей)**: Модули верхнего уровня (бизнес-логика) не должны зависеть от модулей нижнего уровня (базы данных, API). Оба должны зависеть от абстракций (интерфейсов).
  * *Пример*: Ваш сервис `OrderService` не должен внутри себя вызывать `sql.Open(...)`. Он должен принимать в конструктор интерфейс `OrderStorage`. Тогда для тестов вы легко подмените реальную БД на мок-объект.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Паттерны из Gang of Four: какие виды бывают + 4 подробных примера$T$, $D$Паттерны из Gang of Four: какие виды бывают + 4 подробных примера$D$, 2, $A$Паттерны делятся на 3 категории: **Порождающие** (как создавать объекты), **Структурные** (как собирать объекты в большие структуры) и **Поведенческие** (как объекты общаются друг с другом).
1. **Builder / Строитель (Порождающий)**: Позволяет создавать сложные объекты пошагово. Полезно, когда у структуры много опциональных параметров.
   * *Пример в Go*: Функциональные опции. `NewServer(host, WithTimeout(10), WithLogger(log))`.
2. **Factory Method / Фабричный метод (Порождающий)**: Создает объекты через общий интерфейс, позволяя подклассам (или другим пакетам) решать, какой именно класс создавать.
   * *Пример*: Функция `NewDatabase(type string) DB`, которая в зависимости от строки "postgres" или "mysql" возвращает нужную реализацию интерфейса `DB`.
3. **Strategy / Стратегия (Поведенческий)**: Выносит набор алгоритмов в отдельные классы и делает их взаимозаменяемыми во время выполнения.
   * *Пример*: Приложение такси. Есть интерфейс `RouteCalculator`. В зависимости от пробок мы можем подставить стратегию `FastestRoute` или `ShortestRoute`. Код самого приложения не меняется.
4. **Adapter / Адаптер (Структурный)**: Позволяет объектам с несовместимыми интерфейсами работать вместе (работает как переходник для розетки).
   * *Пример*: Вы скачали стороннюю библиотеку для отправки SMS, но её методы не совпадают с вашим интерфейсом `Notifier`. Вы пишете структуру `SmsAdapter`, которая реализует `Notifier`, а внутри себя вызывает методы сторонней библиотеки.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое хеш-таблица, сет, стек, очередь и для чего они нужны на практике?$T$, $D$Что такое хеш-таблица, сет, стек, очередь и для чего они нужны на практике?$D$, 2, $A$* **Хеш-таблица (Map/Dictionary)**: Структура данных, которая хранит пары "ключ-значение". Особенность: поиск, вставка и удаление происходят за время O(1) (мгновенно, независимо от размера словаря).
  * *Зачем*: Идеально для кешей, подсчета частоты элементов, быстрого поиска пользователя по ID в памяти.
* **Сет (Set / Множество)**: Хранит только уникальные элементы (без дубликатов). Поиск и добавление тоже за O(1).
  * *Зачем*: Нужно отфильтровать список ID, оставив только уникальные, или быстро проверить "состоит ли пользователь в группе".
* **Стек (Stack)**: Работает по принципу LIFO (Last In, First Out — последним пришел, первым ушел). Представьте стопку тарелок: берем всегда верхнюю.
  * *Зачем*: Реализация кнопок "Отмена/Назад" (Ctrl+Z), обход деревьев в глубину, хранение истории вызовов функций (Call Stack в программировании).
* **Очередь (Queue)**: Работает по принципу FIFO (First In, First Out — первым пришел, первым ушел). Как очередь в магазине.
  * *Зачем*: Обработка фоновых задач (сначала обрабатываем те письма, которые поступили раньше), брокеры сообщений (RabbitMQ), обход графов в ширину.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое TCP/IP, в чем его фундаментальные отличия от UDP?$T$, $D$Что такое TCP/IP, в чем его фундаментальные отличия от UDP?$D$, 2, $A$**TCP (Transmission Control Protocol)** — это протокол, который гарантирует, что данные будут доставлены в целости и в правильном порядке.
* **Как работает**: Сначала устанавливается соединение (Тройное рукопожатие: "Привет, ты тут?" -> "Да, я тут" -> "Ок, шлю данные"). Каждому пакету присваивается номер. Если пакет потерялся, TCP запрашивает его заново.
* **Где используется**: Сайты (HTTP/HTTPS), пересылка файлов, почта, базы данных. Там, где важен каждый байт.

**UDP (User Datagram Protocol)** — это протокол без гарантий доставки.
* **Как работает**: Просто берет пакет и "кидает" его по адресу без проверок связи и порядка. Нет накладных расходов на установку соединения, поэтому он работает быстрее.
* **Где используется**: Онлайн-игры (шутеры), стриминг видео/аудио, DNS. Там, где потеря пары кадров не критична, а вот задержка (пинг) — критична.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает HTTP запрос под капотом? Коды ошибок и HTTP методы$T$, $D$Как работает HTTP запрос под капотом? Коды ошибок и HTTP методы$D$, 2, $A$**Жизненный цикл:**
1. Браузер берет домен (например, google.com) и через DNS узнает его IP-адрес.
2. Устанавливает TCP-соединение с этим IP на порт 80 (или 443 для HTTPS).
3. Отправляет текстовый блок (Request), где указан метод, путь, заголовки (метаданные) и тело (если есть).
4. Сервер парсит текст, выполняет логику и возвращает текстовый ответ (Response) со статус-кодом.

**Методы (CRUD семантика):**
* `GET`: Получить данные (безопасный, не меняет состояние).
* `POST`: Создать новую сущность или выполнить сложное действие.
* `PUT`: Полностью обновить сущность (перезаписать).
* `PATCH`: Частично обновить (поменять только имя).
* `DELETE`: Удалить сущность.

**Статус-коды:**
* `1xx` (Информационные): Запрос принят, продолжай (например, при вебсокетах).
* `2xx` (Успех): `200 OK`, `201 Created` (создано).
* `3xx` (Перенаправление): `301/302` (сходи по другому адресу), `304 Not Modified` (возьми из кеша браузера).
* `4xx` (Ошибка клиента): Ты прислал плохой запрос. `400 Bad Request` (ошибка валидации), `401 Unauthorized` (нет токена), `403 Forbidden` (нет прав), `404 Not Found`.
* `5xx` (Ошибка сервера): Мы упали. `500 Internal Server Error` (паника или баг), `502 Bad Gateway`, `503 Service Unavailable`.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Отличия HTTP и HTTPS. Как работает рукопожатие HTTPS?$T$, $D$Отличия HTTP и HTTPS. Как работает рукопожатие HTTPS?$D$, 2, $A$HTTPS — это защищенная версия HTTP. Данные передаются внутри зашифрованного туннеля (TLS/SSL), поэтому провайдер не может перехватить пароли или прочитать трафик.
**Как работает TLS-хендшейк (упрощенно):**
1. Клиент и сервер "здороваются" и выбирают алгоритм шифрования.
2. Сервер присылает свой публичный ключ (асимметричная криптография) и SSL-сертификат (чтобы доказать, что он реальный владелец домена).
3. Клиент генерирует секретный сессионный ключ, зашифровывает его публичным ключом сервера и отправляет обратно.
4. Сервер расшифровывает сообщение своим приватным ключом (который есть только у него).
5. Теперь у обоих есть общий сессионный ключ. Дальнейшее общение идет с помощью симметричного шифрования (оно работает гораздо быстрее асимметричного).$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$HTTP/1 и HTTP/2: в чем фундаментальные отличия? Зачем обновляли протокол?$T$, $D$HTTP/1 и HTTP/2: в чем фундаментальные отличия? Зачем обновляли протокол?$D$, 2, $A$**HTTP/1.1** — это текстовый протокол. Его главная проблема — Head-of-line blocking (блокировка начала очереди). По одному TCP-соединению можно было отправлять запросы только строго по очереди. Если сервер долго генерирует большую картинку, остальные скрипты и стили ждут. Приходилось открывать браузеру по 6 параллельных TCP-соединений.

**HTTP/2** решает эти проблемы:
1. **Бинарный, а не текстовый**: Машинам проще и быстрее его парсить.
2. **Мультиплексирование**: Главная фича. Внутри одного TCP-соединения данные бьются на мелкие кадры (фреймы). Можно одновременно скачивать картинку, стили и JSON вперемешку по одному каналу связи. Никто никого не ждет.
3. **Сжатие заголовков (HPACK)**: В HTTP/1 заголовки (куки и прочее) передавались как текст в каждом запросе, занимая много трафика. HTTP/2 сжимает их.
4. **Server Push**: Сервер может сам отправить клиенту данные, которые клиент еще даже не запросил (но сервер знает, что они понадобятся).$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое идемпотентность в HTTP запросах? Как её реализовать на бэкенде?$T$, $D$Что такое идемпотентность в HTTP запросах? Как её реализовать на бэкенде?$D$, 2, $A$**Идемпотентность** — это математическое свойство: сколько бы раз ты ни выполнил операцию, результат состояния системы будет таким же, как после первого выполнения (умножение на 1). 
В HTTP: `GET`, `PUT` (перезапись), `DELETE` (удаление удаленного ничего не меняет) — идемпотентны по стандарту. `POST` — нет (два POST = два списания денег).

**Как реализовать для неидемпотентных операций (например, платежей):**
1. Клиент генерирует уникальный UUID для операции и шлет его в заголовке `Idempotency-Key: <uuid>`.
2. Бэкенд проверяет этот ключ в базе данных или Redis.
3. Если ключа нет, бэкенд сохраняет ключ со статусом "в процессе", выполняет платеж, сохраняет результат по этому ключу и отдает клиенту.
4. Если клиент моргает интернетом и присылает тот же `Idempotency-Key` снова, бэкенд видит его в БД и просто возвращает прошлый сохраненный ответ (например, `200 OK, Transaction ID 123`), не производя повторного списания денег.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Отличия REST и gRPC. Что и когда нужно использовать?$T$, $D$Отличия REST и gRPC. Что и когда нужно использовать?$D$, 2, $A$**REST (Representational State Transfer):**
* Архитектурный стиль поверх HTTP.
* Данные обычно в JSON.
* Текстовый, человекочитаемый (легко дебажить в браузере или Postman).
* **Когда использовать:** Для общения с фронтендом (React/Vue/мобилки) и интеграции с внешними публичными сервисами (открытые API).

**gRPC (Google Remote Procedure Call):**
* Фреймворк от Google, работающий строго поверх HTTP/2.
* Данные в бинарном формате Protobuf. Контракты (типы полей, методы) жестко описаны в `.proto` файлах.
* **Плюсы**: Гораздо быстрее парсится (нет оверхеда JSON), строгая типизация (меньше ошибок), поддерживает двунаправленный стриминг.
* **Когда использовать:** Идеально для общения микросервисов друг с другом внутри вашей закрытой серверной сети.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличается поток (thread) от процесса (process)?$T$, $D$Чем отличается поток (thread) от процесса (process)?$D$, 2, $A$* **Процесс** — это программа, запущенная в ОС. Операционная система выделяет каждому процессу **изолированную память**. Если процесс A упадет с ошибкой памяти, процесс B продолжит работать. Процессы тяжеловесны (долго создавать, сложно обмениваться данными между ними).
* **Поток** — это единица выполнения команд *внутри* процесса. У одного процесса может быть много потоков. Главное отличие: потоки разделяют общую память своего родительского процесса. 
* **Итог**: Потоки быстрее создавать и переключать, им легко обмениваться переменными. Но из-за общей памяти возникают ошибки синхронизации (гонки данных), когда два потока пытаются изменить одну переменную одновременно.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Назови 10 базовых команд Linux и что они делают (подробно для бэкендера)$T$, $D$Назови 10 базовых команд Linux и что они делают (подробно для бэкендера)$D$, 2, $A$1. **`ls` (с флагами `-la`)**: Вывод списка файлов. Флаг `-l` дает подробную инфу (права, владелец, размер), а `-a` показывает скрытые файлы (начинаются с точки, например конфигурации `.env`).
2. **`grep` (часто `grep -r` или `| grep`)**: Мощный поиск текста по регулярным выражениям. Незаменимо для поиска ошибок в логах: `cat app.log | grep "panic"`.
3. **`tail` (особенно `tail -f`)**: Выводит конец файла. С флагом `-f` (follow) "цепляется" за файл и позволяет читать логи в реальном времени, по мере их записи приложением.
4. **`awk`**: Язык обработки текста. Топ для парсинга логов. Например, вытащить только 3-ю колонку (IP адреса) из лога Nginx: `awk '{print $3}' access.log`.
5. **`top` / `htop`**: Интерактивный мониторинг процессов. Показывает, кто съел всё CPU или RAM на сервере. `htop` удобнее, так как он цветной и позволяет убивать зависшие процессы (кнопка F9).
6. **`chmod` и `chown`**: Управление правами. `chown user:group file` меняет владельца файла. `chmod 755 file` меняет права доступа (чтение/запись/исполнение). Часто нужно, чтобы разрешить бинарнику выполняться.
7. **`tar`**: Консольный архиватор. Создать архив: `tar -czvf archive.tar.gz /folder`. Распаковать: `tar -xzvf archive.tar.gz`.
8. **`curl`**: Инструмент для передачи данных по сети. Идеально для бэкендера, чтобы быстро дернуть REST API или проверить доступность порта без запуска Postman.
9. **`ss` (или устаревший `netstat`)**: Анализ сетевых соединений и открытых портов. `ss -tulpn` покажет, поднялось ли ваше Go-приложение и слушает ли оно нужный порт 8080.
10. **`systemctl`**: Управление службами (демонами) через systemd. Запуск, остановка, чтение статуса фоновых программ: `systemctl restart my-go-app`.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Git flow? (Подробный разбор модели ветвления)$T$, $D$Что такое Git flow? (Подробный разбор модели ветвления)$D$, 2, $A$**Git flow** — это строгая модель ветвления, которая помогает упорядочить работу в команде и избежать хаоса при релизах. Она определяет четкие роли для разных веток:
* **`master` (или `main`)**: Главная ветка. Код здесь всегда должен быть стабильным и готовым к деплою на прод. В неё никогда не пушат напрямую.
* **`develop`**: Ветка для интеграции. Сюда сливаются все новые, протестированные фичи. Отражает состояние кода для следующего релиза (часто это пре-прод среда).
* **`feature/...` (например, feature/auth)**: Создаются от `develop`. Здесь разработчик делает конкретную задачу. После завершения открывается Merge/Pull Request обратно в `develop`.
* **`release/...` (например, release/v1.2.0)**: Создается от `develop`, когда накопилось достаточно фич для релиза. Здесь код только тестируется и правятся мелкие баги. Новые фичи сюда не добавляют. По готовности сливается в `master` (с тегом версии) И обязательно обратно в `develop`.
* **`hotfix/...` (например, hotfix/memory-leak)**: Экстренная ветка. Создается строго **от `master`**, если на проде случился критический баг (продакшн лежит). Фиксится, тестируется и сливается обратно в `master` (с новым тегом, например v1.2.1) И обязательно в `develop`, чтобы баг не вернулся в следующем плановом релизе.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое observability (наблюдаемость)?$T$, $D$Что такое observability (наблюдаемость)?$D$, 2, $A$Это способность понимать внутреннее состояние системы по её внешним данным (особенно важно в микросервисах, где запрос проходит через 5 разных серверов). Стоит на "трёх китах":
1. **Логи (Logs)**: Детальная текстовая запись событий ("Пользователь X залогинился", "БД вернула ошибку Y"). Инструменты: ELK stack (Elasticsearch, Logstash, Kibana).
2. **Метрики (Metrics)**: Агрегированные числа и счетчики ("RPS сейчас 500", "Использование CPU 80%", "Количество 500-х ошибок за минуту"). По метрикам строят графики и алерты. Инструменты: Prometheus, Grafana.
3. **Трейсы (Traces)**: Позволяют отследить путь одного конкретного запроса через все микросервисы. Каждому запросу на входе выдается `TraceID`, который передается по цепочке. Инструменты: Jaeger, OpenTelemetry.$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Проблемы с многопоточностью: data race, race condition, deadlock. В чем разница?$T$, $D$Проблемы с многопоточностью: data race, race condition, deadlock. В чем разница?$D$, 4, $A$* **Data race (Гонка данных)**: Специфическая ошибка работы с памятью. Происходит, когда два потока/горутины обращаются к одной переменной одновременно без использования мьютексов/каналов, и хотя бы один поток записывает в неё данные. В Go это часто приводит к повреждению памяти или панике. Ловится флагом `go run -race`.
* **Race condition (Состояние гонки)**: Логическая ошибка бизнес-логики. Доступ к памяти может быть защищен мьютексами (Data race нет), но итоговый результат зависит от того, в каком порядке потоки успели взять мьютекс. *Пример*: Две транзакции одновременно проверяют баланс пользователя ($100) и пытаются списать $100. Обе видят, что денег хватает, и обе списывают. Баланс уходит в минус.
* **Deadlock (Взаимная блокировка)**: Программа зависает намертво. Горутина 1 захватила `Mutex A` и ждет `Mutex B`. Горутина 2 захватила `Mutex B` и ждет `Mutex A`. Обе будут ждать вечно.

---$A$, true
FROM public.categories 
WHERE name = 'Общее'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Слайсы, отличие от массива под капотом в Go$T$, $D$Слайсы, отличие от массива под капотом в Go$D$, 3, $A$* **Массив (Array)**: Блок памяти фиксированного размера. Длина — это часть его типа (т.е. `[3]int` и `[5]int` — это разные типы). Вы не можете изменить размер массива во время работы программы.
* **Слайс (Slice)**: Это просто "обертка" (структура) поверх скрытого массива. Занимает всего 24 байта (на 64-бит системах) и состоит из трех полей:
  1. `array` (указатель на базовый массив, где лежат реальные данные).
  2. `len` (текущая длина — сколько элементов сейчас доступно слайсу).
  3. `cap` (емкость — сколько элементов вмещает скрытый массив до того, как потребуется выделить новую память).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как передаются параметры функции в Go? А мапа?$T$, $D$Как передаются параметры функции в Go? А мапа?$D$, 2, $A$Главное правило: **В Go ВСЕ параметры передаются по значению (копируются)**. Никаких исключений нет.
* Если передаешь `int` — копируется число.
* Если передаешь указатель `*int` — копируется *адрес памяти* (число). Сам объект не копируется, поэтому через скопированный указатель можно поменять оригинал.
* **Мапы, каналы, слайсы**: Под капотом это структуры, внутри которых лежат указатели (дескрипторы). При передаче в функцию копируется сама эта маленькая структура-дескриптор, а внутренние указатели продолжают ссылаться на старые данные. Поэтому изменения *внутри* мапы будут видны снаружи.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает функция append при разных значениях len и cap?$T$, $D$Как работает функция append при разных значениях len и cap?$D$, 2, $A$`append` добавляет элемент в конец слайса.
1. **Если `len < cap` (в базовом массиве еще есть место)**: `append` просто записывает элемент в свободную ячейку и возвращает новый дескриптор слайса с увеличенным `len`.
2. **Если `len == cap` (места нет)**: 
   * Go просит у операционной системы новый кусок памяти большего размера.
   * Копирует все старые элементы в новый массив.
   * Добавляет новый элемент.
   * Возвращает новый слайс, указывающий на новый базовый массив. Старый массив удалится сборщиком мусора (если на него нет других ссылок).
   * *Как растет `cap`*: До 256 элементов емкость удваивается (х2). После 256 рост замедляется по формуле (добавляется примерно 25% + константа), чтобы экономить память на больших массивах.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает мапа (map) под капотом в Go (начиная с версии 1.24)?$T$, $D$Как работает мапа (map) под капотом в Go (начиная с версии 1.24)?$D$, 4, $A$В версии Go 1.24 старая архитектура мапы (с бакетами по 8 элементов и связными списками через overflow-указатели) была полностью заменена на реализацию, основанную на алгоритме **SwissTable** (разработанном в Google). 

**Главные изменения и как это работает теперь:**

1. **Плоские массивы и кэш процессора:**
Данные больше не раскиданы по памяти через указатели. Теперь мапа использует **открытую адресацию** (Open Addressing) и хранит все ключи и значения в едином "плоском" непрерывном массиве. Это дает колоссальный прирост скорости, так как процессору гораздо легче подгружать такие данные в свой L1/L2 кэш (CPU Cache Locality), избегая промахов кэша (cache misses).

2. **Метаданные (Control Bytes):**
Мапа теперь разделена на две части: массив с данными (ключи/значения) и массив с метаданными (control bytes).
Хеш ключа делится на две части:
* Нижние биты определяют индекс стартовой группы.
* Верхние 7 бит (H2) сохраняются в специальный 1-байтовый "слот" метаданных. Этот байт также хранит состояние слота: `empty` (пустой), `deleted` (удален) или заполнен.

3. **SWAR/SIMD магия (Быстрый поиск):**
Вместо того чтобы в цикле перебирать ключи, Go использует побитовую магию — SWAR (SIMD within a register). 
Процессор берет сразу 8 байт метаданных (помещая их в одно 64-битное число `uint64`) и за **одну** процессорную инструкцию проверяет сразу 8 слотов на совпадение с верхними 7 битами нашего ключа. 
*Только если* эти 7 бит совпали, Go идет в массив данных и сравнивает сам ключ целиком. Это исключает тяжелые операции сравнения строк/структур.

4. **Разрешение коллизий без указателей (Probing):**
Связных списков (`overflow`-бакетов) больше нет. Если стартовая группа из 8 слотов полностью занята, мапа использует **пробирование** (probing) — она математически вычисляет индекс следующей группы в массиве и прыгает туда, пока не найдет свободное место или нужный ключ.

5. **Эвакуация (Рост мапы):**
Как и раньше, при заполнении мапы происходит аллокация нового, в 2 раза большего массива. Перенос данных (эвакуация) работает инкрементально (по частям при каждой записи/удалении), чтобы не блокировать программу долгими паузами "Stop the World". Важное отличие: удаленные элементы теперь могут перезаписываться на лету (благодаря статусу `deleted` в метаданных), что уменьшает фрагментацию.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как сделать сет (set) из мапы в Go? Почему именно так, а не иначе?$T$, $D$Как сделать сет (set) из мапы в Go? Почему именно так, а не иначе?$D$, 2, $A$В Go нет встроенной структуры данных Set (множество уникальных элементов). Идиоматичный способ её реализации — это использование мапы, где значениями выступает пустая структура: `map[T]struct{}` (например, `map[string]struct{}`).

**Почему используется пустая структура, а не `map[T]bool`?**
Главная причина — **оптимизация памяти**. Тип `bool` занимает 1 байт памяти. Если в вашем множестве миллион элементов, вы потратите лишний мегабайт просто на значения, которые по факту всегда равны `true`. 
Пустая структура `struct{}` уникальна тем, что занимает ровно **0 байт**. Таким образом, мапа будет тратить память только на хранение самих ключей и внутреннее устройство бакетов, вообще не выделяя места под значения.

**Паттерны использования:**
* Инициализация: `mySet := make(map[string]struct{})`
* Добавление элемента: `mySet["apple"] = struct{}{}`
* Проверка наличия (быстрая фильтрация за O(1)): 
  ```go
  if _, exists := mySet["apple"]; exists {
      // элемент есть в множестве
  }
  ```$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое хеш-функция? Как резолвятся коллизии в Go?$T$, $D$Что такое хеш-функция? Как резолвятся коллизии в Go?$D$, 2, $A$* **Хеш-функция** берет данные любой длины (строку, структуру) и математически превращает их в число фиксированной длины (хеш). Идеальная функция выдает разные числа для разных данных.
* **Коллизия** возникает, когда два *разных* ключа (например, "apple" и "banana") выдают *одинаковый* хеш.
* **Решение в Go (метод цепочек/переполнения)**: Если для ключа "banana" выпал бакет №5, а там уже лежат 8 элементов от других коллизий (бакет полон), Go создает новый `overflow`-бакет (бакет переполнения) и связывает его со старым бакетом №5 с помощью указателя (как связный список). При поиске Go пройдет по бакету №5, не найдет ключ и по указателю перейдет искать в overflow-бакет.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Интерфейс Error. Как правильно работать с ошибками?$T$, $D$Интерфейс Error. Как правильно работать с ошибками?$D$, 3, $A$Ошибка в Go — это любой тип, который реализует простой интерфейс: `type error interface { Error() string }`.
**Правила работы:**
1. **Не игнорируй**: Всегда проверяй `if err != nil`.
2. **Оборачивание (Wrapping)**: Добавляй контекст на каждом уровне функции, чтобы вместо "not found" в логе было "failed to load user 123: not found". Делается так: `fmt.Errorf("failed to load user %d: %w", id, err)`. Глагол `%w` сохраняет оригинальную ошибку внутри новой.
3. **Проверка**: 
   * `errors.Is(err, sql.ErrNoRows)` — проверяет, есть ли в цепочке оберток конкретная ошибка.
   * `errors.As(err, &myCustomErr)` — пытается извлечь из цепочки ошибку конкретного типа (полезно, если ошибка содержит доп. поля вроде `StatusCode`).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое каналы, какие виды бывают? Что будет при записи/чтении из закрытых?$T$, $D$Что такое каналы, какие виды бывают? Что будет при записи/чтении из закрытых?$D$, 2, $A$Канал (`chan`) — это механизм для безопасной передачи данных между горутинами. Под капотом это кольцевой буфер, защищенный мьютексом, плюс очереди ожидания (кто хочет записать, кто хочет прочесть).
* **Небуферизованный (`make(chan int)`)**: Синхронный. Горутина, пытающаяся записать, блокируется ("засыпает"), пока другая горутина не придет читать из канала.
* **Буферизованный (`make(chan int, 5)`)**: Асинхронный. Можно записать 5 элементов без блокировки. Блокировка записи случится только если буфер заполнится. Блокировка чтения — если буфер пуст.

**Аксиомы закрытия (`close(ch)`):**
1. Запись в закрытый канал -> **PANIC**.
2. Закрытие уже закрытого канала -> **PANIC**.
3. Чтение из закрытого канала -> Ошибки не будет. Ты получишь оставшиеся в буфере данные. Если канал пуст — вернется "zero value" (ноль для интов) и флаг закрытия: `val, ok := <-ch` (ok будет false).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Мьютексы (Mutex), RWMutex, WaitGroup — зачем нужны и когда применять?$T$, $D$Мьютексы (Mutex), RWMutex, WaitGroup — зачем нужны и когда применять?$D$, 4, $A$Все они лежат в пакете `sync`.
* `sync.Mutex` (Lock / Unlock): Классический семафор. Если одна горутина вызвала `Lock()`, все остальные горутины, вызвавшие `Lock()`, остановятся и будут ждать, пока первая не вызовет `Unlock()`. Нужен для защиты общих переменных (например, инкремент счетчика).
* `sync.RWMutex` (Lock/Unlock + RLock/RUnlock): Разделяет чтение и запись. Если горутины делают `RLock()` (чтение), они могут делать это *одновременно*. Но если кто-то захочет сделать `Lock()` (запись), он дождется завершения всех читателей и никого не пустит, пока не запишет. Идеально для кешей (много читают, редко пишут).
* `sync.WaitGroup` (Add / Done / Wait): Синхронизатор. Позволяет главной горутине дождаться завершения пачки дочерних фоновых задач перед выходом из программы.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое sync.Pool, пример реального использования?$T$, $D$Что такое sync.Pool, пример реального использования?$D$, 5, $A$`sync.Pool` — это потокобезопасный "бассейн" (кеш) для временных объектов. Его главная задача — снимать нагрузку со сборщика мусора (GC).
* В Go аллокация памяти в куче (heap) стоит дорого. Если вы часто создаете временные объекты и тут же их выбрасываете, GC будет работать без перерыва.
* С помощью `Pool.Get()` вы берете старый, уже выделенный объект, очищаете его, используете и через `Pool.Put()` возвращаете обратно.
* *Реальный пример*: HTTP-сервер получает тысячу JSON-запросов в секунду. Вместо того, чтобы на каждый запрос делать `make([]byte, 4096)` для чтения тела, сервер берет готовый `[]byte` из пула, читает в него, и возвращает в пул. Профит в производительности огромен.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$sync.Map — в чем отличие от обычной мапы с мьютексом?$T$, $D$sync.Map — в чем отличие от обычной мапы с мьютексом?$D$, 4, $A$`sync.Map` — это мапа из стандартной библиотеки со встроенной потокобезопасностью.
Отличие от "обычная `map` + `sync.RWMutex`" кроется в оптимизации под капотом. У `sync.Map` внутри сразу две мапы: read-only (читается атомарно без мьютекса) и dirty (защищена мьютексом).
**Когда использовать `sync.Map`:**
1. Если ключи только добавляются один раз и потом миллион раз читаются (append-only кеш).
2. Если множество горутин одновременно пишут/читают значения по *непересекающимся* наборам ключей.
Во всех остальных случаях (частые обновления значений ключей) классическая `map` с мьютексом будет работать быстрее.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое errgroup, как использовать?$T$, $D$Что такое errgroup, как использовать?$D$, 2, $A$Это внешний пакет `golang.org/x/sync/errgroup`. Он расширяет идею `sync.WaitGroup`.
*Обычный WaitGroup* не умеет обрабатывать ошибки от горутин (нужно городить каналы для ошибок).
*Errgroup* запускает горутины через метод `Go()`. Особенности:
1. Метод `Wait()` ждет всех и возвращает *первую возникшую ошибку*.
2. Можно привязать к ней `context`. Если хотя бы одна горутина вернет ошибку, контекст автоматически отменится (`context.Canceled`), тем самым прерывая работу остальных параллельных горутин (чтобы они не делали пустую работу, если запрос уже завален).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает планировщик (Scheduler) в Go? (Важно!)$T$, $D$Как работает планировщик (Scheduler) в Go? (Важно!)$D$, 3, $A$В ОС есть потоки (Threads). Переключение между ними стоит дорого для процессора. Go делает свои "виртуальные потоки" (Goroutines), которые весят копейки (2 КБ) и переключаются мгновенно в пользовательском пространстве.
Планировщик Go базируется на модели **G-M-P**:
* **G (Goroutine)**: Сама горутина, её стек инструкций.
* **M (Machine)**: Реальный поток операционной системы.
* **P (Processor)**: Логический процессор. Их количество обычно равно количеству ядер CPU (`GOMAXPROCS`). У каждого P есть свой "конвейер" — Локальная Очередь Горутин (LRQ).

*Как это работает*: P берет горутину (G) из очереди и запускает её на потоке (M). Если горутина "засыпает" (ждет канал или таймер), P снимает её и берет следующую.
**Work Stealing (Кража работы)**: Если один P обработал все горутины в своей очереди, он лезет в очередь к соседнему P и "ворует" оттуда половину задач, чтобы ядра не простаивали.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое netpoller в Go? Как работает?$T$, $D$Что такое netpoller в Go? Как работает?$D$, 2, $A$Netpoller — это часть рантайма, которая спасает нас от блокировки системных потоков при работе с сетью (I/O).
В других языках: если поток пытается прочитать из сокета сети, а данных еще нет, поток ОС блокируется. 
В Go: горутина пытается прочитать сеть. Данных нет. Планировщик открепляет горутину от потока (M) и паркует её в `Netpoller`. Поток ОС не блокируется и идет выполнять другие горутины. `Netpoller` через подсистему ОС (epoll в Linux) ждет сетевые пакеты в фоне. Как только пакет пришел, Netpoller "будит" горутину и возвращает в очередь к процессору (P). В итоге 1 поток ОС может обрабатывать тысячи сетевых соединений.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает Garbage Collector (Сборщик мусора) в Go? (Важно!)$T$, $D$Как работает Garbage Collector (Сборщик мусора) в Go? (Важно!)$D$, 5, $A$GC в Go — это неблокирующий алгоритм Concurrent Mark and Sweep (Пометь и Очисти) с Трехцветной маркировкой. Он работает параллельно с вашей программой, не замораживая её на секунды.
*Трехцветная маркировка (Mark):*
* **Белые объекты**: Потенциальный мусор (в начале GC все объекты белые).
* **Серые объекты**: GC нашел на них ссылку (они нужны), но еще не просканировал то, на что они ссылаются дальше по цепочке.
* **Черные объекты**: Полностью проверенные объекты (они нужны, их удалять нельзя).
К концу фазы Mark серых не остается. Белые удаляются на фазе Sweep (Очистка).

Чтобы программа не поменяла ссылки во время маркировки, на время включается механизм **Write Barrier** (он следит за всеми изменениями указателей). Чтобы включить Write Barrier, Go делает микро-паузу "Stop the World" на доли миллисекунд (ваше приложение даже не заметит паузы).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Stack (Стек) и Heap (Куча) в Go? Как работает Escape Analysis (Эскейп-анализ)?$T$, $D$Что такое Stack (Стек) и Heap (Куча) в Go? Как работает Escape Analysis (Эскейп-анализ)?$D$, 5, $A$В Go (как и во многих языках) оперативная память программы логически делится на две основные области: Стек и Кучу.

**1. Stack (Стек)**
* **Что это**: Область памяти, выделяемая индивидуально для *каждой горутины*. В Go она стартует всего с 2 КБ и может динамически расти и уменьшаться.
* **Как работает**: По принципу LIFO (последним пришел — первым ушел). Представь стопку тарелок. Когда функция вызывается, её локальные переменные "кладутся" на вершину стека. Когда функция завершается, её данные мгновенно "снимаются" со стека.
* **Плюсы**: Невероятно быстрый. Выделение и очистка памяти — это просто сдвиг одного указателя процессора. **Стек не нуждается в сборщике мусора (GC)**.
* **Что там лежит**: Аргументы функций, адреса возврата и локальные переменные, которые не "утекают" из функции.

**2. Heap (Куча)**
* **Что это**: Область памяти, **общая** для всего приложения и всех горутин. 
* **Как работает**: Память выделяется хаотично, там, где есть свободное место. 
* **Минусы**: Медленнее стека (нужно искать свободные блоки, использовать блокировки/мьютексы при выделении). Данные в куче остаются лежать там, пока их не удалит Garbage Collector.
* **Что там лежит**: Глобальные переменные и данные, которые должны "пережить" функцию, в которой были созданы.

**3. Escape Analysis (Анализ побега/утечки)**
Разработчик в Go не управляет памятью напрямую (как `malloc` в C). Компилятор сам решает, куда положить переменную. Процесс принятия этого решения на этапе компиляции называется *Escape Analysis*. 
**Главное правило Go**: Компилятор всегда пытается положить переменную в Стек. Но переменная "сбегает" (escapes) в Кучу, если:
1. **Возврат по указателю**: Функция создает переменную и возвращает указатель на неё (`return &user`). Функция завершилась, её стек стерт, но указатель ушел наружу — значит, данные обязаны жить в Куче.
2. **Размер неизвестен заранее**: Если вы делаете слайс переменной длины `make([]int, n)` (где `n` вычисляется во время работы), он пойдет в кучу.
3. **Слишком большой размер**: Если структура весит мегабайты, она не влезет в компактный стек.
4. **Интерфейсы**: Любое присвоение переменной в `interface{}` (или `any`), например при передаче в `fmt.Println()`, часто приводит к утечке в кучу, так как тип становится динамическим.

*Как проверить на собеседовании*: Команда `go build -gcflags="-m"` покажет, какие переменные и почему "сбежали" в кучу.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как максимально подробно работает Garbage Collector (GC) в Go? (Фазы, Триггеры, Барьер записи)$T$, $D$Как максимально подробно работает Garbage Collector (GC) в Go? (Фазы, Триггеры, Барьер записи)$D$, 5, $A$Сборщик мусора в Go — это **Concurrent Mark and Sweep** (Параллельный алгоритм пометки и очистки) с использованием **Трехцветной маркировки**. 
Его главная цель — минимальные паузы (Stop The World), обычно они занимают менее 1 миллисекунды.

**Механизм трехцветной маркировки (Tricolor Algorithm):**
В начале цикла все объекты в куче считаются **Белыми** (кандидаты на удаление).
1. **Серые**: GC находит "Корневые объекты" (глобальные переменные и переменные в стеках активных горутин) и красит их в серый цвет. Серый значит: "Объект живой, но я еще не проверил, на что он ссылается внутри себя". Серые объекты кладутся в рабочую очередь.
2. **Черные**: GC берет серый объект из очереди, красит все объекты, на которые он ссылается, в серый цвет, а сам исходный объект красит в **Черный**. Черный значит: "Объект живой и полностью проверен".
3. **Белые (Очистка)**: Когда серых объектов не останется, все Черные живут дальше, а все Белые (до которых GC так и не смог добраться) объявляются мусором и удаляются.

**4 Фазы работы GC в Go:**
1. **Sweep Termination (Stop The World 1)**: Очень короткая пауза. GC убеждается, что предыдущий цикл очистки завершен и останавливает все горутины.
2. **Mark Setup + Включение Write Barrier**: Включается барьер записи (о нем ниже). Горутины снова запускаются.
3. **Concurrent Mark (Фоновая пометка)**: GC забирает себе **25% мощности процессора** (например, 1 из 4 ядер P) и начинает закрашивать объекты (Белые -> Серые -> Черные). Приложение в это время продолжает работать на остальных 75% ядер!
4. **Mark Termination (Stop The World 2)**: Еще одна миллисекундная пауза. GC докрашивает последние объекты, отключает Write Barrier и вычисляет статистику для следующего запуска. После этого горутины снова работают. Очистка (Sweep) белых объектов происходит позже, лениво (по мере того, как программе нужна новая память).

**Что такое Write Barrier (Барьер записи)?**
Так как программа (ее называют Mutator) работает *одновременно* с GC, может возникнуть фатальная проблема: 
Представьте, что GC уже проверил объект А (сделал его Черным). В этот момент ваша бизнес-логика берет и создает ссылку из Черного объекта А на Белый объект Б. GC к Черному объекту больше не вернется! В итоге живой объект Б останется Белым и будет ошибочно удален.
**Решение**: На время маркировки Go включает Write Barrier. Это микро-перехватчик: если вы пытаетесь записать указатель на Белый объект в Черный объект, барьер записи мгновенно перекрашивает Белый объект в Серый, спасая его от удаления.

**Pacing (Как GC решает, когда запускаться):**
GC не работает по таймеру. Он запускается на основе роста кучи (Heap Pacing).
За это отвечает переменная окружения `GOGC` (по умолчанию равна 100).
*Если после последней очистки мусора объем живых объектов в куче составил 10 МБ, то следующий цикл GC запустится, когда куча вырастет еще на 100% (то есть достигнет 20 МБ).* Если поставить `GOGC=200`, сборщик будет запускаться реже (куча будет жрать больше RAM, но процессор будет меньше отвлекаться на GC). Если `GOGC=off`, сборщик мусора выключится полностью.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Context? Как использовать?$T$, $D$Что такое Context? Как использовать?$D$, 2, $A$`context.Context` — это стандартный паттерн Go для управления временем жизни запроса и передачи метаданных. Передается первым аргументом в функции `func do(ctx context.Context, ...)`.
**Зачем нужен:**
1. **Отмена (Cancellation)**: Клиент закрыл браузер, не дождавшись ответа. Контекст генерирует сигнал отмены (`ctx.Done()`). Вся цепочка микросервисов и запросов к БД, получив этот сигнал, прерывает работу, чтобы не тратить ресурсы сервера впустую. Создается через `context.WithCancel()`.
2. **Таймауты**: Ограничить время работы БД (например, 2 секунды). Через `context.WithTimeout()`.
3. **Метаданные**: Пробросить `trace_id` или `user_id` через слои приложения. Через `context.WithValue()`.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как сделать graceful shutdown (Изящное завершение) сервера?$T$, $D$Как сделать graceful shutdown (Изящное завершение) сервера?$D$, 2, $A$Если просто убить приложение (`Ctrl+C`), текущие HTTP-запросы оборвутся на середине операции (например, при оплате), база данных получит разорванные соединения.
**Как надо:**
1. Подписываемся на системные сигналы от ОС (`syscall.SIGTERM`, `os.Interrupt`) с помощью пакета `os/signal`.
2. Главная горутина блокируется (через канал), ожидая этого сигнала.
3. Получив сигнал, мы создаем контекст с таймаутом (например, 15 сек).
4. Вызываем встроенный метод `server.Shutdown(ctx)`. 
*Что делает Shutdown*: Перестает принимать *новые* запросы от клиентов, но дает *уже начатым* запросам время (15 сек), чтобы они спокойно завершили обработку и сохранили данные.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое padding и alignment (выравнивание памяти) в структурах в Go?$T$, $D$Что такое padding и alignment (выравнивание памяти) в структурах в Go?$D$, 2, $A$Процессоры не читают память по 1 байту. 64-битные процессоры читают память "машинными словами" по 8 байт. Для максимальной скорости процессору нужно, чтобы адреса переменных были кратны их размеру.
Если вы напишете структуру: `type S struct { a bool, b int64, c bool }`.
`bool` весит 1 байт, `int64` весит 8 байт. Между `a` и `b` компилятор автоматически вставит 7 "пустых" неиспользуемых байт (padding), чтобы выровнять `int64` по границе 8 байт. Структура "разбухнет" по памяти.
**Правило оптимизации**: При объявлении структуры всегда сортируйте её поля от наибольших (по размеру в байтах) к наименьшим.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализованы интерфейсы под капотом в Go?$T$, $D$Как реализованы интерфейсы под капотом в Go?$D$, 3, $A$Интерфейс "под капотом" в рантайме Go (это не просто контракт на бумаге, а реальная скрытая структура) занимает 16 байт и состоит из двух указателей:
1. Указатель на структуру с информацией о конкретном типе, который был присвоен интерфейсу (`itab` — содержит методы типа и метаданные).
2. Указатель на сами данные этого объекта в памяти.

Для пустого интерфейса `interface{}` (или `any`), у которого нет методов, используется структура `eface`, которая хранит только указатель на тип и указатель на данные.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое "типизированный nil" при работе с ошибками и интерфейсами?$T$, $D$Что такое "типизированный nil" при работе с ошибками и интерфейсами?$D$, 2, $A$Один из самых частых подвохов на собеседованиях. Интерфейс равен `nil` **только** если равны `nil` оба его внутренних указателя (и тип, и данные).
*Пример ошибки*: Функция возвращает интерфейс `error`. Внутри функции вы создаете переменную `var myErr *CustomError = nil`, и в конце возвращаете `return myErr`.
Снаружи, если кто-то проверит `if err != nil`, условие **выполнится**! Интерфейс `err` не равен `nil`, потому что он знает тип (`*CustomError`), несмотря на то, что сами данные `nil`. Чтобы избежать этого, всегда возвращайте явно `return nil`.$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие использовал логгеры? Какие использовал линтеры в Go?$T$, $D$Какие использовал логгеры? Какие использовал линтеры в Go?$D$, 5, $A$**Логгеры:**
В современном бэкенде нужен *структурированный логгинг* (JSON формат), чтобы логи было удобно искать в ELK/Kibana. 
* **`go.uber.org/zap`**: Самый популярный и один из самых быстрых логгеров от Uber. Он минимизирует аллокации памяти. Есть два режима: `SugaredLogger` (удобнее писать, чуть медленнее) и `Logger` (строго типизированный, супер-быстрый).
* **`rs/zerolog`**: Главный конкурент zap. Его фишка — zero-allocation (0 выделений памяти в куче) при генерации JSON.
* **`log/slog`**: Появился в стандартной библиотеке, начиная с Go 1.21. Теперь это стандарт де-факто "из коробки" для структурированного логирования, многие библиотеки переходят на него.

**Линтеры:**
Линтер — это программа, которая статически анализирует код и находит потенциальные баги, плохой стиль или неоптимальности до компиляции.
* **`golangci-lint`**: Это не один линтер, а мега-комбайн (runner), который запускает десятки разных линтеров параллельно и очень быстро. Именно его используют в CI/CD пайплайнах.
* *Внутри `golangci-lint` обычно включают:*
  * `go vet`: базовый поиск подозрительных конструкций (теневое копирование переменных и т.д.).
  * `staticcheck`: продвинутый поиск багов и неиспользуемого кода (умнее, чем go vet).
  * `errcheck`: ругается, если ты проигнорировал возврат ошибки из функции (не написал `if err != nil`).
  * `gosec`: поиск уязвимостей (хардкод паролей, SQL-инъекции).$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое lock-free структуры данных в Go и как они работают?$T$, $D$Что такое lock-free структуры данных в Go и как они работают?$D$, 4, $A$**Lock-free (неблокирующие) структуры** — это структуры данных, которые безопасны для параллельного использования (множеством горутин), но при этом **не используют классические мьютексы** (`sync.Mutex`), которые заставляют потоки ОС засыпать в ожидании.

**Как это работает под капотом:**
Вся магия строится на атомарных операциях самого процессора (в Go это пакет `sync/atomic`). В основе лежит механизм **CAS (Compare-And-Swap — Сравни и Замени)**.
* *Пример работы CAS*: Горутина хочет увеличить счетчик с 5 на 6. Она говорит процессору: "Проверь, лежит ли сейчас в ячейке памяти число 5. Если да — мгновенно запиши туда 6. Если там уже не 5 (другая горутина успела влезть) — ничего не делай и верни мне `false`".
* Это действие выполняется за 1 такт процессора, его невозможно прервать. Если CAS вернул `false`, горутина обычно просто запускает цикл `for` и пытается сделать это снова, пока не получится (это называется *Spin lock*).

**Примеры в Go:**
* `atomic.Int64.Add(1)` — lock-free инкремент счетчика.
* `atomic.Value` и `atomic.Pointer` — позволяют атомарно (без мьютексов) подменять целые структуры или интерфейсы (например, безопасно подменить конфигурацию приложения на лету, не блокируя тех, кто её читает).

**Плюсы и минусы:**
* *Плюс*: Работают невероятно быстро, так как нет накладных расходов на переключение контекста ОС при ожидании блокировки мьютекса.
* *Минус*: Писать сложные lock-free структуры (например, очереди) — это адская задача для гениев, малейшая ошибка приведет к повреждению памяти. Поэтому обычно используют готовые (или пакет `atomic`), а в 99% бизнес-логики лучше и безопаснее взять обычный мьютекс.


---$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое транзакция?$T$, $D$Что такое транзакция?$D$, 2, $A$**Транзакция** — это логическая единица работы с базой данных, состоящая из одного или серии SQL-запросов. База гарантирует, что эти запросы выполнятся по принципу "Всё или ничего". 
Если вы списываете деньги со счета А (запрос 1) и начисляете на счет Б (запрос 2), транзакция гарантирует, что если сервер отрубится на втором запросе, деньги со счета А вернутся назад (произойдет Rollback).$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое триггеры в базах данных? Зачем нужны и почему их часто избегают в современном бэкенде?$T$, $D$Что такое триггеры в базах данных? Зачем нужны и почему их часто избегают в современном бэкенде?$D$, 2, $A$**Триггер** — это специальная функция в базе данных, которая вызывается *автоматически* (срабатывает) при наступлении определенного события (`INSERT`, `UPDATE`, `DELETE`) для конкретной таблицы. Триггер может сработать ДО (`BEFORE`) или ПОСЛЕ (`AFTER`) самого изменения.

**Зачем их используют:**
* Ведение логов аудита: например, при `UPDATE` пользователя триггер автоматически берет старые данные строки и молча копирует их в таблицу `users_audit`.
* Сложная валидация на уровне БД, которую нельзя описать простыми `CHECK` констрейнтами.

**Почему разработчики бэкенда их не любят (архитектурная проблема):**
1. **"Скрытая магия"**: Разработчик смотрит в код на Go, видит простой `UPDATE` и не понимает, почему параллельно меняются еще три таблицы. Бизнес-логика "утекает" из кода в базу данных.
2. **Сложность тестирования и дебага**: Код приложения легко покрыть unit-тестами, отследить в трейсах и дебаггере, а тестировать триггеры внутри СУБД гораздо сложнее.
3. **Производительность**: Неэффективный или тяжелый триггер может незаметно, но критически замедлить обычные операции записи в базу.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие агрегатные функции в SQL ты знаешь? (Базовые и продвинутые)$T$, $D$Какие агрегатные функции в SQL ты знаешь? (Базовые и продвинутые)$D$, 2, $A$**Агрегатные функции** — это функции, которые вычисляют одиночный результат на основе целого набора строк (часто используются в связке с оператором `GROUP BY`).

**Базовые (стандарт SQL):**
* `COUNT()` — количество строк. *Важный нюанс*: `COUNT(*)` считает все строки, а `COUNT(column_name)` считает только те строки, где колонка не равна `NULL`.
* `SUM()` — сумма всех значений в числовой колонке.
* `AVG()` — среднее арифметическое.
* `MIN()` и `MAX()` — минимальное и максимальное значение.

**Продвинутые (особенно крутые фишки в PostgreSQL):**
* `STRING_AGG(column, ', ')` — склеивает текстовые значения из нескольких строк в одну большую строку (с указанным разделителем).
* `ARRAY_AGG(column)` — собирает значения из нескольких строк в массивы PostgreSQL. 
* *Пример использования `ARRAY_AGG`*: Очень удобно, когда нужно одним запросом достать пользователя и сразу собрать все ID его покупок в один массив, чтобы драйвер Go (например, pgx) мгновенно распарсил это в слайс `[]int`, избегая проблемы N+1 запросов.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$ACID: каждая буква подробно$T$, $D$ACID: каждая буква подробно$D$, 4, $A$Это требования, которым должна соответствовать транзакционная БД (Postgres, MySQL).
* **A (Atomicity - Атомарность)**: "Всё или ничего". Транзакция не может выполниться наполовину. При ошибке все изменения откатываются.
* **C (Consistency - Согласованность)**: База переходит от одного "правильного" состояния к другому. Если у колонки есть ограничение (NOT NULL, или ограничение внешнего ключа), транзакция, нарушающая его, будет отменена.
* **I (Isolation - Изолированность)**: Параллельные транзакции не должны влиять друг на друга. Одна транзакция не должна видеть "грязные" (еще не зафиксированные) данные другой транзакции (регулируется уровнями изоляции).
* **D (Durability - Долговечность)**: Если транзакция завершена (Commit), изменения сохранены физически на жестком диске. Даже если сгорит блок питания на сервере в ту же секунду, при перезапуске данные останутся.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$CAP theorem: каждый пункт подробно$T$, $D$CAP theorem: каждый пункт подробно$D$, 2, $A$CAP-теорема гласит, что в распределенной системе (состоящей из нескольких серверов/нод) невозможно обеспечить одновременно три свойства, нужно выбрать два:
* **C (Consistency - Согласованность)**: Каждое чтение даст самую последнюю (актуальную) запись. Все ноды БД "видят" одни и те же данные синхронно.
* **A (Availability - Доступность)**: Любой запрос получает успешный ответ, даже если некоторые ноды упали (но нет гарантии, что данные самые свежие).
* **P (Partition tolerance - Устойчивость к разделению)**: Система продолжает работать, даже если между нодами пропала сеть (они перестали "видеть" друг друга).

Так как сбои сети (P) в реальном мире неизбежны, архитекторам всегда приходится выбирать между:
1. **CP** (Консистентность важнее, например, в банках). Если сеть упала, система откажет в обслуживании, чтобы не выдать ошибочные балансы.
2. **AP** (Доступность важнее, например, лайки ВКонтакте). Если сеть упала, вы увидите старое количество лайков, но сайт не "упадет".$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Для чего нужны индексы, какие бывают в Postgres?$T$, $D$Для чего нужны индексы, какие бывают в Postgres?$D$, 2, $A$База данных хранит таблицы в файлах. Без индекса, чтобы найти пользователя `id=500`, базе придется прочитать все строки с самого начала (Sequential Scan), что убьет диск на миллионных таблицах.
**Индекс** — это отдельная структура данных (копия части таблицы), оптимизированная для быстрого поиска.
* **B-Tree (Сбалансированное дерево)**: Индекс по умолчанию. Отлично ищет точные совпадения (`WHERE id=5`), а также диапазоны (`> 10`, `< 100`) и сортировки (`ORDER BY`). Скорость поиска логарифмическая `O(log N)`.
* **Hash**: Подходит *только* для точного равенства (`=`). Не поддерживает сортировку. Используется редко.
* **GIN (Generalized Inverted Index)**: Специальный индекс для сложных структур. Необходим для полнотекстового поиска, поиска внутри массивов и запросов к полям JSONB.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое EXPLAIN и EXPLAIN ANALYZE?$T$, $D$Что такое EXPLAIN и EXPLAIN ANALYZE?$D$, 2, $A$Спецкоманды для профилирования запросов.
* `EXPLAIN SELECT ...` — БД анализирует запрос и показывает "План выполнения". Она не выполняет запрос, а прогнозирует, какие индексы она использует и сколько времени (в условных единицах 'cost') это займет.
* `EXPLAIN ANALYZE SELECT ...` — БД **реально выполняет запрос**, замеряет время и выдает отчет: "Я планировала потратить 5ms, но по факту индекс не сработал и я потратила 500ms на Sequential Scan". Главный инструмент оптимизации медленных запросов.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое миграция БД? Как и с помощью чего её делать (особенно в Go)?$T$, $D$Что такое миграция БД? Как и с помощью чего её делать (особенно в Go)?$D$, 2, $A$**Миграция** — это процесс управления изменениями схемы базы данных. Грубо говоря, это "Git для вашей базы". 
Вместо того чтобы вручную вводить `CREATE TABLE` на сервере, вы описываете все изменения в виде файлов-скриптов.

**Как это работает:**
Миграции пишутся парами:
1. **Up-скрипт**: Накатывает изменения (например, создает таблицу или добавляет индекс).
2. **Down-скрипт**: Откатывает изменения (удаляет таблицу/индекс), возвращая базу в предыдущее состояние.
В самой БД создается служебная таблица (например, `schema_migrations`), где хранится номер (версия) последней успешно примененной миграции. При деплое новой версии приложения скрипт миграции проверяет эту таблицу и накатывает только новые файлы.

**Инструменты в Go:**
* **`golang-migrate/migrate`**: Стандарт индустрии. Может запускаться как утилита из консоли (в CI/CD) или вызываться прямо из кода приложения при его старте.
* **`pressly/goose`**: Тоже очень популярен. Его фишка в том, что он позволяет писать скрипты миграций не только на чистом SQL, но и прямо на языке Go (это спасает, когда при миграции нужно вытянуть старые данные, прогнать их через сложную бизнес-логику и записать по-новому).$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое jsonb в PostgreSQL? Какой индекс к нему подходит? Для чего нужно?$T$, $D$Что такое jsonb в PostgreSQL? Какой индекс к нему подходит? Для чего нужно?$D$, 2, $A$**JSONB** — это бинарный формат хранения JSON-данных в PostgreSQL.
Отличие от обычного типа `JSON`: тип `JSON` просто сохраняет текст "как есть" (с пробелами и дубликатами ключей). Тип `JSONB` при сохранении парсит текст, валидирует, убирает пробелы и сохраняет в бинарном дереве. Из-за этого запись идет чуть дольше, но зато база "понимает" структуру, и поиск работает фантастически быстро.

**Для чего нужно:**
Используется для хранения неструктурированных или динамических данных, когда схема заранее не известна (Schemaless).
* *Примеры*: Кастомные настройки пользователя в профиле (`{"theme": "dark", "push": false}`), метаданные игрового персонажа (где инвентарь может быть очень разным), динамические характеристики товаров в магазине (у телефона — память, у куртки — размер). Это спасает от необходимости создавать 100 колонок, из которых 95 будут `NULL`.

**Какой индекс к нему подходит:**
Классический `B-Tree` индекс здесь не поможет (он может искать только точное совпадение всей JSON-строки целиком).
Для JSONB используется **GIN** (Generalized Inverted Index).
Он позволяет мгновенно искать документы по наличию конкретного ключа или значения внутри JSON (например, найти всех пользователей, у которых внутри JSON-объекта `settings` поле `theme` равно `"dark"` с помощью оператора `@>`).$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Виды блокировок: Оптимистичные и пессимистичные$T$, $D$Виды блокировок: Оптимистичные и пессимистичные$D$, 2, $A$Это два подхода решения проблемы параллельного изменения одних и тех же данных.
* **Пессимистичная (Pessimistic Lock)**: Вы говорите БД "Заблокируй строку от других, пока я работаю". `SELECT * FROM users WHERE id=1 FOR UPDATE`. Пока ваша транзакция не завершится, любой другой скрипт, попытавшийся сделать UPDATE этой строки, "повиснет" в ожидании. Надежно, но снижает производительность.
* **Оптимистичная (Optimistic Lock)**: Никаких реальных блокировок в БД. В таблицу добавляется поле `version` (число). При чтении вы запоминаете версию (например, v=1). Выполняете апдейт: `UPDATE users SET name='John', version=2 WHERE id=1 AND version=1`. Если запрос ответил, что обновлено 0 строк — значит, между вашим чтением и записью кто-то другой успел изменить версию. Вы перечитываете данные и повторяете попытку (Retry). Это быстрее для систем, где конфликты случаются редко.$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое нормализация в базах данных? 4 нормальные формы (1НФ - 3НФ и BCNF) подробно.$T$, $D$Что такое нормализация в базах данных? 4 нормальные формы (1НФ - 3НФ и BCNF) подробно.$D$, 2, $A$**Нормализация** — это процесс проектирования схемы БД, который устраняет дублирование данных и защищает от аномалий при обновлении, вставке или удалении.

**Формы (каждая следующая включает правила предыдущих):**

1. **1НФ (Первая нормальная форма) — Атомарность.**
   * Правило: В одной ячейке таблицы может лежать только одно неделимое значение. Никаких списков через запятую.
   * *Пример ошибки*: Колонка `tags` со значением `"go, postgres, linux"`. 
   * *Решение*: Вынести теги в отдельную таблицу связи (many-to-many).

2. **2НФ (Вторая нормальная форма) — Нет частичных зависимостей.**
   * Актуально только для таблиц с **составным** первичным ключом.
   * Правило: Любое не-ключевое поле должно зависеть от *всего* составного ключа, а не от одной его части.
   * *Пример ошибки*: Таблица `Order_Items` с ключом `(OrderID, ProductID)`. В ней есть колонки `Quantity` и `ProductName`. Имя продукта зависит только от `ProductID`, а не от номера заказа.
   * *Решение*: Вынести `ProductName` в отдельную таблицу `Products`.

3. **3НФ (Третья нормальная форма) — Нет транзитивных зависимостей.**
   * Правило: Грубо говоря, "Все колонки зависят от ключа, всего ключа и **ни от чего, кроме ключа**". Не-ключевые атрибуты не должны зависеть друг от друга.
   * *Пример ошибки*: Таблица `Users` имеет колонки `(ID, Name, DepartmentID, DepartmentName)`. Колонка `DepartmentName` зависит от `DepartmentID`, а не от `ID` юзера. Если отдел переименуют, придется обновлять миллион юзеров.
   * *Решение*: Вынести `DepartmentName` в отдельную таблицу `Departments`.

4. **BCNF (Нормальная форма Бойса-Кодда) — Усиленная 3НФ.**
   * Работает с редкими краевыми случаями, когда в таблице есть *несколько потенциальных составных ключей, которые пересекаются*.
   * Правило: Любой детерминант (атрибут, от которого зависят другие) должен быть потенциальным ключом.
   * *Пример ошибки*: Таблица `(Студент, Предмет, Преподаватель)`. Студент+Предмет определяют Преподавателя. Но Преподаватель ведет только один предмет, поэтому Преподаватель определяет Предмет. Возникает циклическая зависимость, где часть ключа (`Предмет`) зависит от не-ключа (`Преподаватель`). 
   * *Решение*: Разбить на таблицы `(Преподаватель, Предмет)` и `(Студент, Преподаватель)`.

**Важное замечание для собеседования (отличие Middle от Junior):**
В HighLoad проектах строгая 3НФ часто убивает производительность, так как требует делать множество `JOIN` при каждом чтении. Поэтому на практике часто применяют осознанную **денормализацию** — намеренно дублируют данные (например, сохраняют `user_name` прямо в таблицу комментариев), чтобы отдавать страницу одним быстрым `SELECT` без джоинов.

---$A$, true
FROM public.categories 
WHERE name = 'Databases'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Зачем нужен REDIS? Что такое cache hit и cache miss? Когда использование кеша — это плохо?$T$, $D$Зачем нужен REDIS? Что такое cache hit и cache miss? Когда использование кеша — это плохо?$D$, 2, $A$**Redis (Remote Dictionary Server)** — это сверхбыстрая In-Memory (работающая в оперативной памяти) NoSQL база данных типа "ключ-значение".
**Зачем нужен (главные юзкейсы):**
1. **Кеширование**: Сохранение результатов тяжелых SQL-запросов или API-ответов.
2. **Сессии**: Хранение сессий пользователей (так как Redis очень быстрый и поддерживает TTL - время жизни ключа).
3. **Rate Limiting**: Ограничение количества запросов от одного IP (например, 10 запросов в секунду).
4. **Лидерборды**: Благодаря структуре `Sorted Set` (ZSET), Redis умеет за O(log(N)) сортировать миллионы игроков по очкам.

**Что такое Cache Hit и Cache Miss:**
* **Cache Hit (Попадание в кеш)**: Приложение запрашивает данные, находит их в Redis и мгновенно возвращает клиенту (база данных "отдыхает").
* **Cache Miss (Промах кеша)**: Приложение запрашивает данные, но их нет в Redis (еще не положили или истек TTL). Приложению приходится делать тяжелый запрос в основную БД (Postgres), ждать ответ, *сохранять его в кеш* и только потом отдавать клиенту. 
*Метрика успешности кеша — Hit Ratio (процент попаданий). Хороший показатель — выше 80-90%.*

**Когда использование кеша — это ПЛОХО (или опасно):**
1. **Критичность консистентности (строгие данные)**: Нельзя кешировать баланс банковского счета во время транзакции. Если вы покажете пользователю закешированный (устаревший) баланс, это приведет к финансовым ошибкам и скандалам.
2. **Данные меняются чаще, чем читаются**: Если профиль юзера обновляется 10 раз в секунду, а читается 1 раз в день, кеширование просто добавит лишнюю работу бэкенду (постоянная перезапись кеша).
3. **Проблема инвалидации (Cache Invalidation)**: Удалить или обновить кеш, когда оригинальные данные изменились — сложнейшая архитектурная задача. Если у вас нет четкой стратегии инвалидации, пользователи будут видеть "протухшие" (старые) данные.
4. **Cache Stampede (Эффект толпы)**: Если у вас истекает время жизни (TTL) очень популярного ключа (например, "главная страница магазина в черную пятницу"), то в одну миллисекунду 10 000 пользователей получат *Cache Miss*. Все 10 000 потоков одновременно пойдут в Postgres за данными, и база мгновенно "ляжет".$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Зачем нужна Kafka? Отличия от RabbitMQ (Topic, Partition)$T$, $D$Зачем нужна Kafka? Отличия от RabbitMQ (Topic, Partition)$D$, 2, $A$**Apache Kafka** — это распределенный лог (журнал) сообщений. Её главная фишка в том, что она сохраняет сообщения на жесткий диск (в отличие от очередей в памяти), и сообщения не удаляются после прочтения (пока не истечет срок жизни, например, 7 дней). Несколько разных сервисов могут читать одни и те же данные независимо.
* **Topic (Топик)**: Категория или поток сообщений (например, "user_events").
* **Partition (Партиция)**: Чтобы топик мог переваривать миллионы сообщений, он разбивается на куски (партиции), которые раскидываются по разным серверам. Запись/Чтение партиций идет параллельно. Kafka гарантирует порядок сообщений строго *внутри одной партиции*.
* **Consumer Group**: Группа микросервисов одного типа (например, 3 запущенных копии `NotificationService`). Kafka автоматически раздаст им разные партиции, чтобы они балансировали нагрузку и не отправляли дважды одно и то же уведомление.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Docker? Отличия от виртуализации$T$, $D$Что такое Docker? Отличия от виртуализации$D$, 2, $A$**Docker** решает проблему "На моем компе работает, а на сервере нет". Он упаковывает программу и все её зависимости (библиотеки ОС, конфиги) в стандартизированный контейнер.
**Отличие от Виртуальных Машин (VM):**
* В VM (VirtualBox, VMWare) "железо" виртуализируется аппаратно. В каждую виртуалку ставится свое полноценное ядро ОС (Windows, Ubuntu), что отнимает гигабайты оперативки и запускается минутами.
* В Docker (контейнеризация) контейнеры делят одно общее ядро Linux хост-машины, изолируясь через механизмы namespaces и cgroups. Контейнер весит мегабайты и стартует за миллисекунды.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое мультистейдж (multi-stage) сборка в Docker? Зачем нужна для Go?$T$, $D$Что такое мультистейдж (multi-stage) сборка в Docker? Зачем нужна для Go?$D$, 2, $A$В Go программа компилируется в бинарный файл, который содержит всё необходимое и не требует самого Go на сервере.
Если мы используем образ `golang:1.20` в Dockerfile, итоговый образ весит около 1 ГБ (потому что внутри компилятор, тулзы, исходники ОС).
**Multi-stage** позволяет использовать один `Dockerfile` с несколькими инструкциями `FROM`:
1. Этап "builder": берем образ `golang`, закидываем исходники, собираем бинарник `app`.
2. Этап "prod": берем абсолютно пустой образ `scratch` (весит 0 байт) или `alpine` (5 МБ). И просто копируем в него *только бинарник* из этапа "builder". В итоге на сервер деплоится контейнер весом всего 15-20 МБ. Это супер-секьюрно (нет шелла, нет утилит, хакеру не за что зацепиться).$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Protobuf и как его использовать? Как безопасно изменять прото-контракт?$T$, $D$Что такое Protobuf и как его использовать? Как безопасно изменять прото-контракт?$D$, 2, $A$**Protobuf (Protocol Buffers)** — это механизм бинарной сериализации данных от Google. В отличие от JSON (текстового), он передает данные в виде плотного потока байтов, что делает его в разы быстрее и меньше по объему передаваемого трафика.

**Как использовать:**
1. Пишете контракт в файле `.proto`, описывая структуры данных (`message`) и методы (`service`).
2. Запускаете компилятор `protoc` (с плагинами `protoc-gen-go` и `protoc-gen-go-grpc`).
3. Он генерирует готовый Go-код (структуры и интерфейсы), который вы используете в приложении (не нужно писать маппинг руками).

**Как безопасно изменять контракт (Обратная совместимость):**
В микросервисах нельзя обновить все серверы и клиенты в одну секунду. Контракт должен поддерживать старых клиентов.
* **Можно**: Добавлять новые поля. Старые клиенты их просто проигнорируют, а новые прочитают.
* **НЕЛЬЗЯ менять тип поля** (например, `int32` на `string`). Это сломает парсинг.
* **НЕЛЬЗЯ менять номер (тег) поля**. Protobuf при кодировании/декодировании ориентируется именно на номера (вида `id = 1;`), а не на текстовые названия полей.
* **НЕЛЬЗЯ переиспользовать номера удаленных полей**. Если поле `age = 2;` больше не нужно, вы его удаляете, но **обязаны** добавить его номер и имя в `reserved` (например, `reserved 2; reserved "age";`). Иначе кто-то в будущем случайно создаст новое поле `password = 2;`, и старый клиент прочитает чужой пароль как возраст (скрытый и опасный баг).

**Как поднимать версию (Breaking Changes):**
Если изменения несовместимы (нужно удалить метод или поменять типы), создается новая мажорная версия. 
Было `package api.v1;` (в директории `v1`), мы создаем рядом копию в `v2` с контрактом `package api.v2;`. Бэкенд временно реализует поддержку обеих версий, пока все фронтенды/клиенты не переедут на эндпоинты `v2`, после чего `v1` удаляется.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое метаданные в gRPC? Для чего нужны и как с ними работать в Go?$T$, $D$Что такое метаданные в gRPC? Для чего нужны и как с ними работать в Go?$D$, 5, $A$**Метаданные в gRPC** — это полный аналог HTTP-заголовков (Headers). Это пары "ключ-значение", которые передаются вместе с запросом или ответом, но не являются частью самого тела бизнес-запроса (Payload).

**Для чего нужны (инфраструктурная информация):**
* Передача токенов авторизации (JWT, Bearer).
* Идентификаторы распределенной трассировки (`trace_id`, `span_id` для Jaeger/OpenTelemetry).
* Мета-информация о клиенте (версия приложения, User-Agent).

**Особенности и нюансы (Middle+):**
* Все ключи метаданных автоматически приводятся к нижнему регистру (lowercase).
* Одному ключу может соответствовать несколько значений (в Go это представляется как слайс `map[string][]string`).
* **Передача бинарных данных**: По умолчанию в метаданных можно передавать только ASCII-строки. Если нужно передать бинарник (например, криптографическую подпись), ключ должен **обязательно заканчиваться на суффикс `-bin`** (например, `signature-bin`). gRPC под капотом сам безопасно закодирует эти данные в Base64 при отправке и раскодирует при получении.

**Как работать в Go (через Context):**
Данные метаданных не прописываются в структурах `.proto`, они передаются скрыто, через `context.Context`.
* *Клиент (отправка)*: Добавляет данные в исходящий контекст: `ctx = metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer token")`.
* *Сервер (чтение)*: Извлекает данные из входящего контекста: `md, ok := metadata.FromIncomingContext(ctx)`. Обычно это делается не в самих ручках контроллеров, а в **gRPC Interceptor'ах** (аналог middleware), чтобы проверять токен централизованно до входа в бизнес-логику.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как сделать распределенную транзакцию? Что такое Сага (Saga)?$T$, $D$Как сделать распределенную транзакцию? Что такое Сага (Saga)?$D$, 2, $A$В монолите мы делаем всё в одной базе данных через `BEGIN...COMMIT`. В микросервисах данные размазаны по разным БД. Как оформить заказ, списать деньги и забронировать товар атомарно?
Используют паттерн **Saga**.
Это последовательность локальных транзакций. Каждый сервис выполняет свою работу в своей БД и публикует событие в брокер (Kafka/RabbitMQ).
*Если шаг падает (например, банк отклонил карту)*, запускается обратная цепочка (компенсирующие транзакции). Сервис заказов ловит событие "Отказ оплаты" и меняет статус заказа на "Отменен", а сервис склада делает "+1" к остаткам товара.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое stateful и stateless микросервисы? В чем их плюсы и минусы?$T$, $D$Что такое stateful и stateless микросервисы? В чем их плюсы и минусы?$D$, 2, $A$Это два фундаментальных подхода к проектированию архитектуры сервисов.

**Stateless (Без состояния):**
* **Что это**: Сервис не сохраняет никаких данных о прошлых запросах клиента ни в оперативной памяти, ни на локальном диске. Каждый новый HTTP-запрос должен содержать всю необходимую информацию для его обработки (например, JWT-токен).
* **Плюсы (Масштабируемость)**: Это идеальный вариант для бэкенда на Go. Если нагрузка выросла, вы просто запускаете еще 10 таких же контейнеров за Load Balancer'ом. Любой запрос может быть обработан любым из 10 контейнеров. Если один контейнер упадет с ошибкой — никто этого не заметит, трафик пойдет на оставшиеся 9.
* **Пример**: Обычный REST API сервис (авторизация, профиль, генерация отчетов), который берет данные из запроса, лезет в БД, и отдает ответ.

**Stateful (С состоянием):**
* **Что это**: Сервис хранит данные сессии или состояние системы локально (в памяти или на своем диске) между запросами. Следующий запрос от того же клиента имеет смысл только если он попадет на тот же самый сервер, который хранит его контекст.
* **Минусы (Сложность)**: Их невероятно сложно масштабировать. Нужны механизмы "Sticky Sessions" (прилипания сессий на балансировщике), репликация данных, выборы "Мастера" (Leader election), консенсус-алгоритмы (Raft). Если сервер упадет, состояние пользователя будет потеряно.
* **Примеры**: Базы данных (PostgreSQL), кеши (Redis), брокеры сообщений (Kafka), игровые серверы мультиплеера (которые держат в RAM текущую позицию всех игроков на карте).$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Паттерны микросервисов (уметь рассказать подробно хотя бы 3)$T$, $D$Паттерны микросервисов (уметь рассказать подробно хотя бы 3)$D$, 2, $A$Паттерны решают типовые боли распределенных систем. Назовем 4 самых популярных:

1. **API Gateway (Шлюз API)**
   * *Суть*: Единая точка входа для всех клиентов (веб, мобилки). Фронтенд не ходит к каждому из 50 микросервисов напрямую (что вызвало бы хаос с CORS, IP-адресами и версионированием).
   * *Зачем нужен*: Он инкапсулирует внутреннюю архитектуру. Gateway занимается маршрутизацией (routing), агрегацией данных (собрать профиль из 3 сервисов и отдать фронту), авторизацией (проверяет JWT один раз на входе), Rate Limiting'ом и терминацией SSL.

2. **Circuit Breaker (Предохранитель)**
   * *Суть*: Механизм защиты от каскадных сбоев. Работает как электрический предохранитель.
   * *Как работает*: Сервис А вызывает Сервис Б. Вдруг Сервис Б начинает тормозить (отвечать по 30 секунд). Если Сервис А продолжит слать запросы, у него быстро закончатся свободные потоки/горутины (они все повиснут в ожидании), и Сервис А тоже упадет. 
   Circuit Breaker считает ошибки и таймауты. Если их слишком много, он "размыкает цепь" (переходит в состояние Open). Теперь все запросы от А к Б сразу, без ожидания, возвращают ошибку (или заглушку из кеша). Это дает Сервису Б время "остыть" и восстановиться, не получая нового трафика.

3. **Strangler Fig (Паттерн "Фиговое дерево" / Душитель)**
   * *Суть*: Паттерн безопасной миграции огромного легаси Монолита на Микросервисы (без переписывания всего кода с нуля, что обычно заканчивается провалом бизнеса).
   * *Как работает*: Перед Монолитом ставится API Gateway. Все новые фичи пишутся уже как отдельные микросервисы, и Gateway перенаправляет трафик к ним. Старые функции по одной выпиливаются из монолита в сервисы, а Gateway меняет роутинг. Со временем микросервисы разрастаются, "обвивая" монолит, пока от него ничего не останется, и его можно будет безопасно удалить.

4. **Transactional Outbox (Паттерн Outbox) - *Крутой бонус для Middle+***
   * *Суть*: Решает проблему надежной отправки сообщений в Kafka. 
   * *Проблема*: Если вы делаете `COMMIT` в Postgres, а потом шлете событие "Заказ создан" в Kafka, но Kafka недоступна — система становится неконсистентной (заказ в базе есть, а письмо на почту не ушло).
   * *Решение*: Вы сохраняете заказ в таблицу `orders` и событие в таблицу `outbox` в рамках **одной единой транзакции БД**. Затем отдельный фоновый процесс (Outbox Relay / Debezium) читает таблицу `outbox` и гарантированно, с ретраями перекладывает события в Kafka.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое чистая архитектура (Clean Architecture)?$T$, $D$Что такое чистая архитектура (Clean Architecture)?$D$, 2, $A$Подход к структурированию проекта так, чтобы бизнес-логика была независима от баз данных, фреймворков и API. 
Приложение делится на "луковицу" (слои):
* В самом центре — **Entities** (сущности бизнес-логики).
* Вокруг них — **Use Cases** (сценарии взаимодействия).
* Внешние слои — **Delivery/Transport** (обработчики HTTP, gRPC) и **Infrastructure/Repositories** (драйверы баз данных).
**Главное правило зависимостей**: Исходный код внутренних слоев не должен импортировать ничего из внешних слоев. Внутренний слой описывает интерфейс `UserRepository`, а внешний слой БД его реализует (Инверсия зависимостей).$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое DDD (Domain-Driven Design)? Основы и главные понятия.$T$, $D$Что такое DDD (Domain-Driven Design)? Основы и главные понятия.$D$, 2, $A$**DDD (Проектирование на основе предметной области)** — это подход к разработке сложного ПО, где фокус смещается с технологий (баз данных, фреймворков) на бизнес-логику и реальные процессы компании.

**Ключевые понятия (Стратегические):**
* **Ubiquitous Language (Единый язык)**: Разработчики, аналитики и бизнес-заказчики должны использовать одни и те же термины в общении и в коде. Если бизнес называет это "Заказ", в коде это должно быть `Order`, а не `Deal` или `Purchase`.
* **Bounded Context (Ограниченный контекст)**: Разделение системы на логические границы. В контексте "Доставка" объект `User` — это курьер с машиной, а в контексте "Биллинг" тот же `User` — это налогоплательщик с реквизитами. В DDD это будут разные структуры в разных сервисах.

**Ключевые понятия (Тактические):**
* **Entities (Сущности)**: Объекты, имеющие уникальный ID (например, `User`). Если у пользователя изменится имя, он останется тем же пользователем.
* **Value Objects (Объекты-значения)**: Объекты без ID, определяемые только своими свойствами (например, `Money` или `Address`). Если вы меняете поле в объекте-значении, вы просто создаете новый объект. Они иммутабельны (неизменяемы).
* **Aggregates (Агрегаты)**: Кластер связанных объектов, которые рассматриваются как единое целое для изменения данных. У агрегата есть "Корень" (Aggregate Root), через который идет всё общение. Например, `Order` — корень, а `OrderItem` — часть агрегата. Нельзя изменить цену товара в заказе в обход самого заказа.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как правильно перейти от монолита к микросервисам? (Стратегия)$T$, $D$Как правильно перейти от монолита к микросервисам? (Стратегия)$D$, 2, $A$Переход "одним днем" (Big Bang) почти всегда ведет к провалу. Правильный путь — это эволюция.

**Этапы перехода:**
1. **Подготовка монолита**: Прежде чем "пилить" код на разные серверы, разделите его на **модули** внутри самого монолита (Modular Monolith). Убедитесь, что модули общаются через интерфейсы, а не лезут во внутренности друг друга.
2. **Разделение баз данных**: Самый сложный шаг. Микросервис не может считаться независимым, если он делит общую БД с монолитом. Сначала выделите данные модуля в отдельные таблицы или схемы, а затем в отдельную БД.
3. **Паттерн Strangler Fig (Душитель)**: Выносите функционал по одной фиче. Поставьте API Gateway перед монолитом. Новую логику пишите в микросервисе, а Gateway перенаправляйте туда трафик. Старый код в монолите постепенно удаляется.
4. **Общие библиотеки (Shared Libs) — ловушка**: Избегайте создания огромных общих библиотек со всей бизнес-логикой. Это создаст жесткую связность (если вы обновите библиотеку для одного сервиса, придется пересобирать все 50). Копирование небольшого куска кода иногда лучше, чем общая зависимость.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое OpenAPI? В чем его отличие от Swagger?$T$, $D$Что такое OpenAPI? В чем его отличие от Swagger?$D$, 2, $A$Часто эти термины используют как синонимы, но это не так.
* **OpenAPI (OAS)** — это **стандарт/спецификация**. Это описание того, как должен выглядеть ваш контракт API в формате YAML или JSON. Например: "Путь /users принимает GET и возвращает массив объектов с полями id и name".
* **Swagger** — это **набор инструментов**, которые работают с этой спецификацией.
  * *Swagger UI*: Визуализация (та самая страничка в браузере, где можно нажать "Try it out").
  * *Swagger Editor*: Редактор для написания YAML файлов спецификации.
  * *Swagger Codegen*: Инструмент, который по YAML-файлу может автоматически сгенерировать клиентский код на Go, Java или TypeScript.

**Итог**: OpenAPI — это "чертеж" вашего API на бумаге, а Swagger — это "инструменты", которые помогают этот чертеж рисовать и использовать.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое CQRS? Для чего он нужен и какие дает преимущества?$T$, $D$Что такое CQRS? Для чего он нужен и какие дает преимущества?$D$, 2, $A$**CQRS (Command Query Responsibility Segregation)** — паттерн, при котором операции изменения данных (Команды) отделяются от операций чтения данных (Запросы).

**Суть**:
В обычном приложении у нас одна модель данных и один сервис для всего. В CQRS мы разделяем их:
* **Command Side (Запись)**: Оптимизирована для бизнес-логики, валидации и консистентности. Здесь мы только пишем (`CreateOrder`, `UpdateUser`).
* **Query Side (Чтение)**: Оптимизирована для быстрого отображения данных клиенту. Здесь только `Get...` запросы.

**Зачем это нужно (Middle+ нюансы):**
1. **Разная нагрузка**: Обычно чтений в 100 раз больше, чем записей. С CQRS мы можем масштабировать только "читающие" сервисы.
2. **Разные базы данных**: Это киллер-фича. Вы можете писать данные в надежную нормализованную реляционную БД (Postgres), а для чтения использовать NoSQL (Elasticsearch для поиска или Redis для мгновенных ответов). Данные между ними синхронизируются асинхронно через брокеры сообщений (события).
3. **Сложные выборки**: Когда фронтенду нужно собрать данные из 10 таблиц, проще иметь "подготовленную" (денормализованную) таблицу в БД для чтения, чем каждый раз делать тяжелые JOIN'ы в основной базе.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое JWT токен (JSON Web Token) и как он решает проблему сессий?$T$, $D$Что такое JWT токен (JSON Web Token) и как он решает проблему сессий?$D$, 2, $A$Исторически сессии хранили в базе данных или Redis. Клиент присылал cookie с `session_id`, бэкенд лез в БД проверять, есть ли такая сессия и какие у юзера права. При миллионах запросов это убивало БД (Stateful подход).
**JWT** решает это, перенося состояние на сторону клиента (Stateless).
Это строка, состоящая из 3 частей (Base64Url):
1. **Header**: Каким алгоритмом подписано.
2. **Payload (Полезная нагрузка)**: Json с данными (id пользователя, роль "admin", время истечения `exp`).
3. **Signature (Подпись)**: Сгенерирована на основе первых двух частей + Секретного ключа, который хранится только на сервере бэкенда.
Серверу больше не надо ходить в БД. Он берет токен, берет свой секретный ключ, пересчитывает подпись и сверяет с подписью в токене. Если совпадают — токен валиден и юзер подлинный (хакер не может подделать токен без серверного ключа).$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое лоад балансер (Load Balancer)? Уровни L4 и L7$T$, $D$Что такое лоад балансер (Load Balancer)? Уровни L4 и L7$D$, 2, $A$Программный или аппаратный компонент (например, Nginx или HAProxy), который стоит перед серверами и распределяет между ними входящий трафик.
Зачем нужен: Отказоустойчивость (перестает слать трафик на упавший сервер) и Масштабирование (можно поставить 10 серверов и раскидывать нагрузку поровну).
* **L4 балансировщик (Транспортный уровень)**: Балансирует на уровне TCP/IP адресов и портов. Очень быстрый, "глупый". Он не понимает, что внутри пакета лежит HTTP запрос к /api/users.
* **L7 балансировщик (Прикладной уровень)**: Понимает HTTP/HTTPS структуру. Может прочитать Cookie, заголовки, пути роутов. Может направлять запросы на `/video` к одним серверам, а запросы к `/api` — к другим. Занимает больше процессорного времени.$A$, true
FROM public.categories 
WHERE name = 'Architecture'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какую систему очередей выбрал бы для нового проекта и почему?$T$, $D$Какую систему очередей выбрал бы для нового проекта и почему?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём отличие Kafka от RabbitMQ?$T$, $D$В чём отличие Kafka от RabbitMQ?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как в Go реализуется наследование?$T$, $D$Как в Go реализуется наследование?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать параллельную обработку с ограничением количества горутин?$T$, $D$Как реализовать параллельную обработку с ограничением количества горутин?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как оптимизировать преобразование числа в строку за один проход?$T$, $D$Как оптимизировать преобразование числа в строку за один проход?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие объекты размещаются в куче?$T$, $D$Какие объекты размещаются в куче?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает http.Client в Go и почему нельзя создавать новый клиент на каждый запрос?$T$, $D$Как работает http.Client в Go и почему нельзя создавать новый клиент на каждый запрос?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое Docker?$T$, $D$Что такое Docker?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что происходит при записи в небуферизированный канал из нескольких горутин (блокировки, паника)?$T$, $D$Что происходит при записи в небуферизированный канал из нескольких горутин (блокировки, паника)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Расскажите об интерфейсах в Go. Чем они являются и как работают?$T$, $D$Расскажите об интерфейсах в Go. Чем они являются и как работают?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Приведите примеры агрегатных функций.$T$, $D$Приведите примеры агрегатных функций.$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как удалить элемент из слайса в Go?$T$, $D$Как удалить элемент из слайса в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает Select?$T$, $D$Как работает Select?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое API? Чем REST API отличается от других типов API?$T$, $D$Что такое API? Чем REST API отличается от других типов API?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Зачем использовать контекст в gRPC-запросах и что произойдёт при его отмене?$T$, $D$Зачем использовать контекст в gRPC-запросах и что произойдёт при его отмене?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать graceful shutdown (defer, контекст, обработка ошибок в группах горутин)?$T$, $D$Как реализовать graceful shutdown (defer, контекст, обработка ошибок в группах горутин)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как запустить HTTP-запросы асинхронно в Go?$T$, $D$Как запустить HTTP-запросы асинхронно в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать worker pool с ограничением по concurrency в Go?$T$, $D$Как реализовать worker pool с ограничением по concurrency в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как устроен слайс под капотом?$T$, $D$Как устроен слайс под капотом?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Есть ли в Go полиморфизм как принцип ООП?$T$, $D$Есть ли в Go полиморфизм как принцип ООП?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает Map в Go?$T$, $D$Как работает Map в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие есть уровни изоляции транзакций и как они работают?$T$, $D$Какие есть уровни изоляции транзакций и как они работают?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что произойдёт при попытке записи в неинициализированный канал?$T$, $D$Что произойдёт при попытке записи в неинициализированный канал?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему встраивание (embedding) — это не наследование?$T$, $D$Почему встраивание (embedding) — это не наследование?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Когда использовать context.WithTimeout, а когда context.WithDeadline?$T$, $D$Когда использовать context.WithTimeout, а когда context.WithDeadline?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие типы каналов существуют?$T$, $D$Какие типы каналов существуют?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем интерфейсы в Go отличаются от абстрактных классов в C# (отсутствие реализации, утиная типизация)$T$, $D$Чем интерфейсы в Go отличаются от абстрактных классов в C# (отсутствие реализации, утиная типизация)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать worker pool в Go?$T$, $D$Как реализовать worker pool в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое worker pool и в чём его отличие от семафора?$T$, $D$Что такое worker pool и в чём его отличие от семафора?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие бывают типы интерфейсов?$T$, $D$Какие бывают типы интерфейсов?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие типы данных можно создать с помощью make?$T$, $D$Какие типы данных можно создать с помощью make?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие существуют типы вызовов в gRPC?$T$, $D$Какие существуют типы вызовов в gRPC?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как правильно отменять горутины, которые выполняют долгие операции (например, запросы в БД)?$T$, $D$Как правильно отменять горутины, которые выполняют долгие операции (например, запросы в БД)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое MAC-адрес и зачем он нужен?$T$, $D$Что такое MAC-адрес и зачем он нужен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему существуют atomic.Value и atomic.Pointer?$T$, $D$Почему существуют atomic.Value и atomic.Pointer?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Можно ли передать функцию как параметр другой функции?$T$, $D$Можно ли передать функцию как параметр другой функции?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Каков срок жизни переменной в heap?$T$, $D$Каков срок жизни переменной в heap?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Зачем нужно закрывать тело HTTP-ответа в Go?$T$, $D$Зачем нужно закрывать тело HTTP-ответа в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое zero value у слайса?$T$, $D$Что такое zero value у слайса?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать идемпотентность при работе с Kafka?$T$, $D$Как реализовать идемпотентность при работе с Kafka?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое “fan-in” и “fan-out” в Go-конкурентности, и как их использовать для обработки задач?$T$, $D$Что такое “fan-in” и “fan-out” в Go-конкурентности, и как их использовать для обработки задач?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое профилирование и как его использовать в Go?$T$, $D$Что такое профилирование и как его использовать в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличается new от make?$T$, $D$Чем отличается new от make?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что делает sync.Cond и в каких случаях его предпочтительнее использовать вместо каналов?$T$, $D$Что делает sync.Cond и в каких случаях его предпочтительнее использовать вместо каналов?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как сделать структуру данных (например, префиксное дерево) потокобезопасной?$T$, $D$Как сделать структуру данных (например, префиксное дерево) потокобезопасной?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое context.Done() и почему одно закрытие видят все горутины?$T$, $D$Что такое context.Done() и почему одно закрытие видят все горутины?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает сборщик мусора в Go и что такое stop-the-world пауза?$T$, $D$Как работает сборщик мусора в Go и что такое stop-the-world пауза?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое сборщик мусора?$T$, $D$Что такое сборщик мусора?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое замыкания функций в контексте Go?$T$, $D$Что такое замыкания функций в контексте Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Зачем нужен контекст (context) в Go?$T$, $D$Зачем нужен контекст (context) в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое connection pool в базе данных и зачем он нужен?$T$, $D$Что такое connection pool в базе данных и зачем он нужен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что происходит со стеком при вызове функции?$T$, $D$Что происходит со стеком при вызове функции?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое inlining функции?$T$, $D$Что такое inlining функции?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем gRPC bidirectional stream отличается от обычного unary RPC? Приведи пример кейса.$T$, $D$Чем gRPC bidirectional stream отличается от обычного unary RPC? Приведи пример кейса.$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает readinessGate в Kubernetes и чем оно отличается от readinessProbe?$T$, $D$Как работает readinessGate в Kubernetes и чем оно отличается от readinessProbe?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает планировщик горутин (роль GOMAXPROCS, зависимость от ядер ОС)?$T$, $D$Как работает планировщик горутин (роль GOMAXPROCS, зависимость от ядер ОС)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Объясни, что такое striped locking и когда он эффективнее обычного mutex.$T$, $D$Объясни, что такое striped locking и когда он эффективнее обычного mutex.$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Интерфейс проверяется в compile-time или runtime?$T$, $D$Интерфейс проверяется в compile-time или runtime?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В каком случае интерфейс считается равным nil?$T$, $D$В каком случае интерфейс считается равным nil?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое FULL VACUUM и зачем он применяется?$T$, $D$Что такое FULL VACUUM и зачем он применяется?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает механизм memory barriers и почему Go вставляет их при работе с атомиками?$T$, $D$Как работает механизм memory barriers и почему Go вставляет их при работе с атомиками?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое type switch в Go?$T$, $D$Что такое type switch в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что делает функция make и чем она отличается от new?$T$, $D$Что делает функция make и чем она отличается от new?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое отражение (Reflection) в gRPC?$T$, $D$Что такое отражение (Reflection) в gRPC?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как в Go реализовать graceful shutdown для сервиса, у которого есть HTTP-сервер и фоновые воркеры?$T$, $D$Как в Go реализовать graceful shutdown для сервиса, у которого есть HTTP-сервер и фоновые воркеры?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое горутина? Как ее остановить?$T$, $D$Что такое горутина? Как ее остановить?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие антипаттерны существуют для аварийного завершения программы?$T$, $D$Какие антипаттерны существуют для аварийного завершения программы?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём суть трехстороннего рукопожатия в TCP?$T$, $D$В чём суть трехстороннего рукопожатия в TCP?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое mutex, какие они бывают и как их использовать?$T$, $D$Что такое mutex, какие они бывают и как их использовать?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как использовать JOIN, GROUP BY, HAVING в SQL?$T$, $D$Как использовать JOIN, GROUP BY, HAVING в SQL?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что происходит, когда в коде просят выделить 1 КБ памяти?$T$, $D$Что происходит, когда в коде просят выделить 1 КБ памяти?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему в HTTP3 используют UDP?$T$, $D$Почему в HTTP3 используют UDP?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В каком порядке перебираются элементы мапы?$T$, $D$В каком порядке перебираются элементы мапы?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Где размещается переменная — в стеке или в куче?$T$, $D$Где размещается переменная — в стеке или в куче?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что будет, если забыть закрыть resp.Body при выполнении HTTP-запроса?$T$, $D$Что будет, если забыть закрыть resp.Body при выполнении HTTP-запроса?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём принципиальное отличие TCP и UDP?$T$, $D$В чём принципиальное отличие TCP и UDP?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое секционирование таблиц (table partitioning) в PostgreSQL?$T$, $D$Что такое секционирование таблиц (table partitioning) в PostgreSQL?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему горутины в Go нельзя «убить» напрямую и как правильно останавливать фоновые задачи?$T$, $D$Почему горутины в Go нельзя «убить» напрямую и как правильно останавливать фоновые задачи?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Можно ли получить доступ к переменной, объявленной в вложенном блоке кода, из внешнего? А если она п$T$, $D$Можно ли получить доступ к переменной, объявленной в вложенном блоке кода, из внешнего? А если она публичная?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое палиндром и как его определить в Go?$T$, $D$Что такое палиндром и как его определить в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Есть ли в Go исключения (exception)?$T$, $D$Есть ли в Go исключения (exception)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Когда и как стоит использовать panic в Go?$T$, $D$Когда и как стоит использовать panic в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как извлечь отдельные цифры из числа?$T$, $D$Как извлечь отдельные цифры из числа?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое connection pooling и зачем он нужен в Postgres-клиентах на Go?$T$, $D$Что такое connection pooling и зачем он нужен в Postgres-клиентах на Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему линейный поиск может быть неэффективен?$T$, $D$Почему линейный поиск может быть неэффективен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать паттерн Saga в микросервисной архитектуре?$T$, $D$Как реализовать паттерн Saga в микросервисной архитектуре?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличается Read Committed от Repeatable Read?$T$, $D$Чем отличается Read Committed от Repeatable Read?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать параллельный запуск нескольких запросов к стороннему API?$T$, $D$Как реализовать параллельный запуск нескольких запросов к стороннему API?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие есть средства обобщённого программирования (generics) в Go?$T$, $D$Какие есть средства обобщённого программирования (generics) в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём разница между буферизированным и небуферизированным каналом? Какой из них быстрее передаст зна$T$, $D$В чём разница между буферизированным и небуферизированным каналом? Какой из них быстрее передаст значение?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как избежать лишних аллокаций памяти при конкатенации строк в цикле?$T$, $D$Как избежать лишних аллокаций памяти при конкатенации строк в цикле?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему Go runtime использует “work stealing” модель и как она работает?$T$, $D$Почему Go runtime использует “work stealing” модель и как она работает?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как повлияет тип получателя (по значению или по ссылке) на реализацию интерфейса двумя структурами?$T$, $D$Как повлияет тип получателя (по значению или по ссылке) на реализацию интерфейса двумя структурами?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что произойдёт, если из канала читать быстрее, чем в него пишут?$T$, $D$Что произойдёт, если из канала читать быстрее, чем в него пишут?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как обрабатывать ошибки в RESTful API (форматы ответов, коды статусов)?$T$, $D$Как обрабатывать ошибки в RESTful API (форматы ответов, коды статусов)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое выравнивание полей в структурах Go и как оно влияет на память?$T$, $D$Что такое выравнивание полей в структурах Go и как оно влияет на память?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Объясни разницу между индексами B-Tree, Hash и BRIN в Postgres. В каких случаях каждый оптимален?$T$, $D$Объясни разницу между индексами B-Tree, Hash и BRIN в Postgres. В каких случаях каждый оптимален?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему конкатенация строк в цикле неэффективна (создание новых массивов байт)?$T$, $D$Почему конкатенация строк в цикле неэффективна (создание новых массивов байт)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое отношение (relation) в PostgreSQL?$T$, $D$Что такое отношение (relation) в PostgreSQL?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как предотвратить списание средств с баланса при гонке транзакций?$T$, $D$Как предотвратить списание средств с баланса при гонке транзакций?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какой порядок выполнения SQL-запроса?$T$, $D$Какой порядок выполнения SQL-запроса?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличается транзакция в Postgres от batch-insert и когда выгоднее использовать каждое решение?$T$, $D$Чем отличается транзакция в Postgres от batch-insert и когда выгоднее использовать каждое решение?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что будет, если попытаться писать в закрытом канале?$T$, $D$Что будет, если попытаться писать в закрытом канале?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как балансируется нагрузка в gRPC?$T$, $D$Как балансируется нагрузка в gRPC?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём разница между IP и MAC адресацией?$T$, $D$В чём разница между IP и MAC адресацией?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Каково назначение папок в Go-проекте (cmd, adapters, delivery)?$T$, $D$Каково назначение папок в Go-проекте (cmd, adapters, delivery)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает nil в Go и что будет при вызове метода на nil-ресивере?$T$, $D$Как работает nil в Go и что будет при вызове метода на nil-ресивере?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое приватная переменная в Go? Как она объявляется и какова её область видимости?$T$, $D$Что такое приватная переменная в Go? Как она объявляется и какова её область видимости?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое транзакция в базе данных? + ACID$T$, $D$Что такое транзакция в базе данных? + ACID$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие проблемы могут возникнуть при использовании глобальной переменной-кеширования, и как их избежа$T$, $D$Какие проблемы могут возникнуть при использовании глобальной переменной-кеширования, и как их избежать?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как преобразовать целое число (int32) в строку без стандартных функций (используя руны)?$T$, $D$Как преобразовать целое число (int32) в строку без стандартных функций (используя руны)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как происходит маршрутизация в IP-сетях?$T$, $D$Как происходит маршрутизация в IP-сетях?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает планировщик задач в Go (кооперативная vs вытесняющая многозадачность)?$T$, $D$Как работает планировщик задач в Go (кооперативная vs вытесняющая многозадачность)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём разница между stack и heap?$T$, $D$В чём разница между stack и heap?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает авторизация через OAuth?$T$, $D$Как работает авторизация через OAuth?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как передавать данные между горутинами (каналы, sync-пакеты)?$T$, $D$Как передавать данные между горутинами (каналы, sync-пакеты)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое worker pool и зачем он нужен?$T$, $D$Что такое worker pool и зачем он нужен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему в Go можно наблюдать goroutine leak и как их диагностировать?$T$, $D$Почему в Go можно наблюдать goroutine leak и как их диагностировать?$D$, 3, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие ORM существуют для Go и в чём их преимущества?$T$, $D$Какие ORM существуют для Go и в чём их преимущества?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как очистить массив или слайс в Go?$T$, $D$Как очистить массив или слайс в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие протоколы прикладного уровня вы знаете и использовали?$T$, $D$Какие протоколы прикладного уровня вы знаете и использовали?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как синхронизировать параллельные вычисления в Go?$T$, $D$Как синхронизировать параллельные вычисления в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличаются errors.Is и errors.As в Go и когда их использовать?$T$, $D$Чем отличаются errors.Is и errors.As в Go и когда их использовать?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как сообщить компилятору, что тип реализует интерфейс?$T$, $D$Как сообщить компилятору, что тип реализует интерфейс?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое deadlock в базе данных и как его избежать?$T$, $D$Что такое deadlock в базе данных и как его избежать?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает zero-copy в Go и когда можно передавать данные между слоями без выделений памяти?$T$, $D$Как работает zero-copy в Go и когда можно передавать данные между слоями без выделений памяти?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое схемы (schemas) в PostgreSQL?$T$, $D$Что такое схемы (schemas) в PostgreSQL?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чем разница слайсов и массивов в Go?$T$, $D$В чем разница слайсов и массивов в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём отличие runtime.Goexit() от os.Exit() и когда их применяют?$T$, $D$В чём отличие runtime.Goexit() от os.Exit() и когда их применяют?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличается Kafka от RabbitMQ по модели гарантированной доставки сообщений?$T$, $D$Чем отличается Kafka от RabbitMQ по модели гарантированной доставки сообщений?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему нельзя хранить context в структуре надолго?$T$, $D$Почему нельзя хранить context в структуре надолго?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое анонимные структуры в Go и зачем они нужны?$T$, $D$Что такое анонимные структуры в Go и зачем они нужны?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как ООП реализовано в Go?$T$, $D$Как ООП реализовано в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем горутины отличаются от потоков ОС (легковесность, планировщик Go)?$T$, $D$Чем горутины отличаются от потоков ОС (легковесность, планировщик Go)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как обрабатываются ошибки и паники в Go?$T$, $D$Как обрабатываются ошибки и паники в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём разница между errors.Is, errors.As и errors.Join?$T$, $D$В чём разница между errors.Is, errors.As и errors.Join?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает функция append?$T$, $D$Как работает функция append?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как оптимизировать использование памяти в Go?$T$, $D$Как оптимизировать использование памяти в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает HTTP Keep-Alive и зачем он нужен?$T$, $D$Как работает HTTP Keep-Alive и зачем он нужен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем отличаются методы с value receiver и pointer receiver?$T$, $D$Чем отличаются методы с value receiver и pointer receiver?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие методы можно вызывать у nil-среза?$T$, $D$Какие методы можно вызывать у nil-среза?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем Mutex отличается от RWMutex (блокировка записи vs параллельное чтение)?$T$, $D$Чем Mutex отличается от RWMutex (блокировка записи vs параллельное чтение)?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое gRPC и для чего его используют?$T$, $D$Что такое gRPC и для чего его используют?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как с помощью context регулировать время ожидания в Go?$T$, $D$Как с помощью context регулировать время ожидания в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какой основной недостаток стандартного логгера в Go?$T$, $D$Какой основной недостаток стандартного логгера в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как каналы устроены в Go?$T$, $D$Как каналы устроены в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое команда rsync и как ее использовать для синхронизации?$T$, $D$Что такое команда rsync и как ее использовать для синхронизации?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие сложности бывают при интеграции с Kafka?$T$, $D$Какие сложности бывают при интеграции с Kafka?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Почему использование []rune эффективнее конкатенации строк?$T$, $D$Почему использование []rune эффективнее конкатенации строк?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Опишите шаги тестирования в Golang?$T$, $D$Опишите шаги тестирования в Golang?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое упаковка ошибок (error wrapping)?$T$, $D$Что такое упаковка ошибок (error wrapping)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает увеличение capacity слайса при добавлении элементов (правило удвоения до 1024 элементов$T$, $D$Как работает увеличение capacity слайса при добавлении элементов (правило удвоения до 1024 элементов)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как в Go реализовать middleware?$T$, $D$Как в Go реализовать middleware?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое SOLID-принципы?$T$, $D$Что такое SOLID-принципы?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какие операции возможны над слайсами?$T$, $D$Какие операции возможны над слайсами?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает Redis и зачем использовать TTL?$T$, $D$Как работает Redis и зачем использовать TTL?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое race condition и как его ловить в Go?$T$, $D$Что такое race condition и как его ловить в Go?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что произойдёт, если взять адрес элемента из мапы?$T$, $D$Что произойдёт, если взять адрес элемента из мапы?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое эвакуация в контексте мап?$T$, $D$Что такое эвакуация в контексте мап?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$В чём разница между zero value слайса и мапы?$T$, $D$В чём разница между zero value слайса и мапы?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как устроено хранение массивов и срезов в памяти? Что такое capacity?$T$, $D$Как устроено хранение массивов и срезов в памяти? Что такое capacity?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как работает механизм preemption (принудительного вытеснения) в Go runtime?$T$, $D$Как работает механизм preemption (принудительного вытеснения) в Go runtime?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как реализовать полиморфизм и инкапсуляцию без наследования (встраивание структур, интерфейсы)?$T$, $D$Как реализовать полиморфизм и инкапсуляцию без наследования (встраивание структур, интерфейсы)?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как минимизировать аллокации при работе с рунами и слайсами?$T$, $D$Как минимизировать аллокации при работе с рунами и слайсами?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Какова алгоритмическая сложность доступа по ключу для map?$T$, $D$Какова алгоритмическая сложность доступа по ключу для map?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем Docker отличается от виртуализации?$T$, $D$Чем Docker отличается от виртуализации?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что будет, если объявить слайс без инициализации?$T$, $D$Что будет, если объявить слайс без инициализации?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое фантомное чтение (phantom read)? Решает ли эту проблему Repeatable Read?$T$, $D$Что такое фантомное чтение (phantom read)? Решает ли эту проблему Repeatable Read?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как в Kafka реализовать exactly-once обработку? Какие подводные камни?$T$, $D$Как в Kafka реализовать exactly-once обработку? Какие подводные камни?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Объясни разницу между defer, panic и recover в Go$T$, $D$Объясни разницу между defer, panic и recover в Go$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Чем статическая типизация в Go отличается от утиной?$T$, $D$Чем статическая типизация в Go отличается от утиной?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое триггер и для чего он используется?$T$, $D$Что такое триггер и для чего он используется?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как устроен runtime в Go?$T$, $D$Как устроен runtime в Go?$D$, 4, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Есть ли в Go тип Set?$T$, $D$Есть ли в Go тип Set?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что произойдёт, если в горутине произойдёт panic?$T$, $D$Что произойдёт, если в горутине произойдёт panic?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Где объявлять интерфейсы в Go и как применять принцип инверсии зависимостей?$T$, $D$Где объявлять интерфейсы в Go и как применять принцип инверсии зависимостей?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как устроен Outbox-паттерн и зачем он нужен?$T$, $D$Как устроен Outbox-паттерн и зачем он нужен?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Что такое memory escape analysis и как понять, выделяется ли объект в heap?$T$, $D$Что такое memory escape analysis и как понять, выделяется ли объект в heap?$D$, 5, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как в Go передаются слайсы — по значению или по ссылке?$T$, $D$Как в Go передаются слайсы — по значению или по ссылке?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$Как индексы влияют на производительность?$T$, $D$Как индексы влияют на производительность?$D$, 2, $A$$A$, true
FROM public.categories 
WHERE name = 'Go'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;

