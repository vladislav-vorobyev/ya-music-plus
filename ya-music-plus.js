/**
* Расширение для браузера Y.Music plus
* Добавляет на панель управления кнопку поиска позиции в плейлисте и кнопку автопрокрутки.
*/

const DEFAULT_DEBUG = 1; // уровень дебага по умолчанию (0 - минимально)

// Функция инициализации расширения, входным параметром должена быть передана jQuery
function _init($) {
	let debug = DEFAULT_DEBUG; // отвечает за уровень вывода отлад/инфо (0 - минимально)
	let gFocusId = 0; // id трека на который была сделана последняя фокусировка
	let gAutoFocus = false; // активирован режим автопрокрутки списка
	let gLocate = false; // активирован режим поиска позиции в списке
	let gScan = false; // активирован режим сканирования списка
	let gDoingFocus = false; // активен процесс фокусировки (флаг для исключения двойного исполнения)
	let gShowListId = 0; // id трека для которого был показан список плейлистов
	let gShowPlaylists = false; // активирован режим загрузки списка плейлистов для текущего трека
	let gTrackBoxHeight = 0; // высота рамки трека в плейлисте

	// Функция для проверки текущей активности скрипта
	let _isBusy = () => gDoingFocus || gLocate || gScan;

	// Функция для обновления состояния переменной debug из DOM модели <html debug="значение">
	let _popDebug = () => { debug = parseInt($('html').attr('debug') ?? DEFAULT_DEBUG); }

	// Функция для получения id текущего проигрываемого трека
	let _getCurTrackId = () => $('.track__name .d-link').attr('href')?.split('/')?.[4];

	// Функция для получения id трека из плейлиста
	let _getTrackId = ($track) => $track.attr('data-item-id');

	// Функция для получения контейнера с треками плейлиста
	let _playlistBox = () => $('.lightlist__cont'); // $('.centerblock') // $('.lightlist_tracks')

	// Функция для получения длинны плейлиста
	let _playlistCount = () => gTrackBoxHeight? Math.round(_playlistBox().outerHeight() / gTrackBoxHeight) : false;

	// Функции определения режима работы плеера
	let _shuffleMode = () => $('.player-controls__btn.player-controls__btn_shuffle.player-controls__btn_on').length? true : false;
	let _waveMode = () => $('.player-controls__btn.player-controls__btn_shuffle:visible').length? false : true;

	// Функции для прокрутки окна на позицию y
	let _scrollPlaylistTo = (y) => window.scroll(0, Math.max(0, y - window.screen.height/2 + 60));

	// Создаем массив треков текущего плейлиста и его функции
	let gTracks = [];
	gTracks._up = ($track) => { // добавление/обновление трека из DOM объекта
		let id = _getTrackId($track);
		if (id) {
			let top = $track.position()?.top;
			if (top >= 0) {
				gTrackBoxHeight = $track.outerHeight();
				let i = Math.round(top / gTrackBoxHeight);
				if (id != gTracks[i]?.id) {
					// обновление списка
					gTracks[i] = {id:id, top:top, height:gTrackBoxHeight};
				}
			}
		}
	}
	gTracks._byId = (id) => gTracks.filter((v) => v.id == id); // все треки по id
	gTracks._firstById = (id) => gTracks._byId(id)?.[0]; // первый из треков по id
	gTracks._count = () => Object.keys(gTracks).length - 4; // кол-во треков


	// Добавляем свои стили
	$('html').append('<style>.player-controls__btn.is-active {color:#ffcb0d; opacity:1}</style>');

	// Контейнер для доп. кнопок управления в проигрывателе
	let $controlsBox = $('.bar .player-controls__seq-controls');

	// Создаем и интегрируем кнопку режима загрузки списка плейлистов
	let $btnP = $('<div class="player-controls__btn deco-player-controls__button" title="Отображать список плейлистов">'
		+ '<div class="d-icon" style="margin:8px 0;font-size:20px;">L<small style="font-size:.6em;position:relative;left:-5px;top:-4px;">ist</small></div></div>');
	$controlsBox.prepend($btnP);
	$btnP._pushStatus = () => gShowPlaylists? $btnP.addClass('is-active') : $btnP.removeClass('is-active'); // функция обновления статуса кнопки
	$btnP._popStatus = () => { gShowPlaylists = $btnP.hasClass('is-active'); return $btnP; }; // функция обновления переменной на основе статуса кнопки
	$btnP.on('click', () => { $btnP.toggleClass('is-active')._popStatus(); });
	$btnP._pushStatus();

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
		// Если режим активирован, то откручиваем наверх и запускаем процедуру поиска
		if (gLocate) {
			let id = _getCurTrackId();
			if (id) { window.scrollTo(0,0); setTimeout(() => _autoFocus(id, 1), 1); }
			else $btnL._off();
		}
	});
	$btnL._pushStatus();

	// Создаем и интегрируем кнопку debug info
	let $btnD = $('<div class="player-controls__btn deco-player-controls__button" title="Debug Info">'
		+ '<div class="d-icon" style="margin:8px 0;font-size:20px;">D<small style="font-size:.4em;position:relative;left:-1px;">info</small></div></div>');
	$controlsBox.prepend($btnD);
	$btnD.on('click', () => {
		console.log('_getCurTrackId:', _getCurTrackId());
		console.log('_shuffleMode:', _shuffleMode());
		console.log('_waveMode:', _waveMode());
		console.log('_playlistBox:', _playlistBox());
		console.log('gTrackBoxHeight:', gTrackBoxHeight);
		console.log('_playlistCount:', _playlistCount());
		console.log('gTracks._count:', gTracks._count());
		console.log('gTracks:', gTracks);
	});


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

		// Берем список треков и ищем среди них трек с нужным id,
		// попутно сохраняем/обновляем треки в полном списке
		let $tracks = _playlistBox().find('.d-track');
		if (debug > 3) console.log('tracks count:', $tracks.length); // debug
		$tracks.each( function(i) {
			let $this = $(this);
			// Если трек с искомым id еще не найден и мы не в режиме сканирования, то сверяем id
			if (!$target && !gScan) {
				if (_getTrackId($this) == toId) {
					$target = $this;
				}
			}
			// обновляем полный список
			gTracks._up($this);
		});

		// Если не нашли и мы не в режиме сканирования, то проверим полный список
		if (!$target && !gScan) {
			let track = gTracks._firstById(toId);
			if (track) {
				// Трек найден в сохраненном списке => прокрутим страницу до этой позиции
				_scrollPlaylistTo(_playlistBox().offset().top + track.top);
				// Повторный запуск
				setTimeout(_autoFocus, 100, toId, doScroll);
				return;
			}
		}

		// Если трек найден, то позиционируем его в центр экрана,
		// иначе просто ждем, если не в режиме "волны", или прокручиваем страницу, если активен режим поиска
		if ($target) {
			gFocusId = toId;
			if (debug) console.log('(->)', toId, $target.find('a.d-track__title').text()?.trim?.()); // info
			_scrollPlaylistTo($target.offset().top);

			// Если был активен режим поиска, то выключаем его
			if (gLocate) $btnL._off();

			// Снимаем флаг процесса фокусировки
			gDoingFocus = false;

		} else {

			// Проверяем в каком режиме запущен процесс и надо ли прокручивать страницу для поиска
			if (gLocate) {
				// Проверяем что список треков не пуст и прокручиваем страницу
				if ($tracks.length) {
					// Если дошли до низа, то отключаем режим поиска и режим сканирования
					if ((window.innerHeight + window.pageYOffset) >= _playlistBox().outerHeight()) {
						gScan = false;
						$btnL._off();
					} else {
						// Прокрутка страницы на высоту экрана
						window.scrollBy(0, window.screen.height * doScroll);
					}
				}

				// Повторный запуск
				setTimeout(_autoFocus, 100, toId, 1);

			} else if (!doScroll && !_waveMode()) {
				// Процесс был запущен в режиме простой фокусировки
				// Повторный запуск
				setTimeout(_autoFocus, 100, toId);

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
		if (gAutoFocus && !_isBusy()) {
			let id = _getCurTrackId();
			if (debug > 1) console.log('onInterval, id:', id, ', cur:', gFocusId); // debug
			if (id && gFocusId != id) {
				// Если активен шафл режим, то при необходимости запустить поиск + сканирование
				if (_shuffleMode() && !_waveMode()) {
					if (gTracks._count() < _playlistCount()) {
						gScan = true;
						$btnL.click();
					} else {
						_autoFocus(id, 1);
					}
				} else {
					_autoFocus(id);
				}
			}
		}

		// Если активен режим загрузки списка плейлистов для текущего трека и неактивен режим поиска,
		// то сверяем текущий сохранненый и реальный id трека и, если они не равны,
		// то инициируем "клик" по кнопке "Добавить в плейлист"
		if (gShowPlaylists && !_isBusy()) {
			let id = _getCurTrackId();
			if (id && gShowListId != id) {
				gShowListId = id;
				// запускаем функцию для вызова списка
				_showPlaylists();
				// повторный запуск через 1 и 2 сек
				setTimeout(_showPlaylists, 1000);
				setTimeout(_showPlaylists, 2000);
			}
		}

		// Повторный запуск через 1 сек
		setTimeout(_onInterval, 1000);
	})();


	// Функция для вызова списка "Добавить в плейлист"
	function _showPlaylists() {
		// клик по кнопке вызова, если список не виден
		if ($('.d-addition__popup:visible').length == 0)
			$('.player-controls__track-controls .d-addition__opener').click();
	}
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
