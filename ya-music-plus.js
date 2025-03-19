/**
* Расширение для браузера Y.Music plus
* Добавляет на панель управления кнопку поиска позиции в плейлисте и кнопку автопрокрутки.
*/

const DEFAULT_DEBUG = 1; // уровень дебага по умолчанию (0 - минимально)

// Функция инициализации расширения, входным параметром должена быть передана jQuery
function _init($) {
	let debug = DEFAULT_DEBUG; // отвечает за уровень вывода отлад/инфо (0 - минимально)
	let gCurId = 0; // id текущего трека (на который была сделана последняя фокусировка)
	let gAutoFocus = false; // активирован режим автопрокрутки списка
	let gLocate = false; // активирован режим поиска позиции в списке
	let gDoingFocus = false; // активен процесс фокусировки (флаг для исключения двойного исполнения)

	// Функция для обновления состояния переменной debug из DOM модели <html debug="значение">
	let _popDebug = () => { debug = parseInt($('html').attr('debug') ?? DEFAULT_DEBUG); }

	// Функция для получения id текущего проигрываемого трека
	let _getCurTrackId = () => $('.track__name .d-link').attr('href')?.split('/')?.[4];

	// Добавляем свои стили
	$('html').append('<style>.player-controls__btn.is-active {color:#ffcb0d; opacity:1}</style>');

	// Контейнер для доп. кнопок управления в проигрывателе
	let $controlsBox = $('.bar .player-controls__seq-controls');

	// Создаем и интегрируем кнопку режима автопрокрутки списка
	let $btnF = $('<div class="player-controls__btn deco-player-controls__button" title="Автопрокрутка списка">'
		+ '<div class="d-icon" style="margin:8px 0;font-size:20px;">F<small style="font-size:.4em;position:relative;left:-6px;">ocus</small></div></div>');
	$controlsBox.prepend($btnF);
	$btnF._pushStatus = () => gAutoFocus? $btnF.addClass('is-active') : $btnF.removeClass('is-active'); // функция обновления статуса кнопки
	$btnF._popStatus = () => { gAutoFocus = $btnF.hasClass('is-active'); return $btnF; }; // функция обновления переменной на основе статуса кнопки
	$btnF.on('click', () => { $btnF.toggleClass('is-active')._popStatus(); });
	$btnF._pushStatus();

	// Создаем и интегрируем кнопку режима поиска позиции в списке
	let $btnL = $('<div class="player-controls__btn deco-player-controls__button" title="Поиск позиции в списке">'
		+ '<div class="d-icon" style="margin:8px 0;font-size:9px;">'
		+ '<span style="display:inline-block;position:relative;top:1px;left:10px;transform:scaleX(2.2);">▲<br>▼</span></div></div>');
	$controlsBox.prepend($btnL);
	$btnL._pushStatus = () => gLocate? $btnL.addClass('is-active') : $btnL.removeClass('is-active'); // функция обновления статуса кнопки
	$btnL._popStatus = () => { gLocate = $btnL.hasClass('is-active'); return $btnL; }; // функция обновления переменной на основе статуса кнопки
	$btnL._off = () => $btnL.removeClass('is-active')._popStatus(); // функция выключения кнопки
	$btnL.on('click', () => {
		$btnL.toggleClass('is-active')._popStatus();
		// Если режим активирован, то запускаем процедуру поиска
		if (gLocate) {
			let id = _getCurTrackId();
			if (id) _autoFocus(id, 1);
			else $btnL._off();
		}
	});
	$btnL._pushStatus();

	// Функция для прокрутки списка на трек с указанным id (фокусировка)
	// Если указан doScroll, то страница будет прокручиваться до конца вниз (1) или вверх (-1)
	// иначе поиск происходит в пределах текущего загруженного списка треков
	function _autoFocus(toId, doScroll) {
		// Проверяем что активен режим автопрокрутки или режим поиска и ставим флаг процесса фокусировки
		// иначе снимаем флаг и завершаем работу
		if (gAutoFocus || gLocate) {
			gDoingFocus = true;
		} else {
			gDoingFocus = false;
			return;
		}

		let $target = null; // искомый трек в списке

		// Берем список треков и ищем среди них трек с нужным id
		// let $playlistBox = $('.lightlist_tracks');
		let $playlistBox = $('.centerblock');
		let $tracks = $playlistBox.find('.d-track');
		if (debug > 3) console.log('tracks count:', $tracks.length); // debug
		$tracks.each( function(i) {
			if (!$target) {
				let $this = $(this);
				if ($this.attr('data-item-id') == toId) {
					$target = $this;
				}
			}
		});

		// Если трек найден, то позиционируем его в центр экрана,
		// иначе просто ждем или прокручиваем стриницу, если активен режим поиска
		if ($target) {
			gCurId = toId;
			if (debug) console.log('(->)', toId, $target.find('a.d-track__title').text()?.trim?.()); // info
			window.scroll(0, Math.max(0, $target.offset().top - window.screen.height/2 + 40));

			// Если был активен режим поиска, то выключаем его
			if (gLocate) $btnL._off();

			// Снимаем флаг процесса фокусировки
			gDoingFocus = false;

		} else {

			// Проверяем в каком режиме запущен процесс и надо ли прокручивать страницу для поиска
			if (!doScroll) {
				// Процесс был запущен в режиме простой фокусировки
				// Повторный запуск
				setTimeout(_autoFocus, 100, toId);

			} else if (gLocate) {
				// Проверяем что список треков не пуст и прокручиваем страницу
				if ($tracks.length) {
					// Если дошли до низа, то меняем направление
					if ((window.innerHeight + window.pageYOffset) >= $playlistBox.height())
						doScroll = -1;
					// Если дошли до верха, то отключаем режим поиска
					if (window.pageYOffset < 300 && doScroll == -1)
						$btnL._off();
					// Прокрутка страницы на высоту экрана
					window.scrollBy(0, window.screen.height * doScroll);
				}

				// Повторный запуск
				setTimeout(_autoFocus, 100, toId, doScroll);

			} else {
				// Процесс был запущен в режиме поиска, но кнопка деактивирована
				// Снимаем флаг процесса фокусировки
				gDoingFocus = false;
			}
		}
	}

	// Функция для проверки состояния с периодом 1 сек
	(function _onInterval() {
		// Обновляем состояние переменной debug
		_popDebug();
		// console.log('debug:', debug); // debug
		if (debug > 5) console.log('gAutoFocus:', gAutoFocus ?? 'undef', 'gLocate:', gLocate ?? 'undef'); // debug

		// Проверяем что активен режим автопрокрутки и неактивен режим поиска,
		// затем сверяем текущий сохранненый и реальный id трека и, если они не равны,
		// то запускаем фокусировку
		if (gAutoFocus && !gLocate && !gDoingFocus) {
			let id = _getCurTrackId();
			if (debug > 1) console.log('onInterval, id:', id, ', cur:', gCurId); // debug
			if (id && gCurId != id) {
				// Если активен шафл режим, то запустить поиск
				if ($('.player-controls__btn.player-controls__btn_shuffle.player-controls__btn_on').length)
					$btnL.click();
				else
					_autoFocus(id);
			}
		}

		// Повторный запуск через 1 сек
		setTimeout(_onInterval, 1000);
	})();
}

(function _main() {
	// Получаем информацию о манифесте
	const manifest = (chrome?.runtime ?? browser?.runtime)?.getManifest?.();

	// Выводим приветствие в консоль
	console.log('Y.Music plus version', manifest?.version, 'is running', manifest);

	// Проверяем доступность jQuery и запускаем инициализацию расширения
	if (typeof window.jQuery == 'undefined') {
		console.warn('jQuery is undefined!', window);
		// setTimeout(_main, 1000);
	} else {
		_init(window.jQuery);
	}
})();
