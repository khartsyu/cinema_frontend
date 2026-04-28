document.addEventListener('DOMContentLoaded', async () => {

    console.log('admin.js запущен');

    // ===== ПРОВЕРКА АВТОРИЗАЦИИ =====
    const isAuth = localStorage.getItem('adminAuth') === 'true';
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!isAuth && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    if (isLoginPage) {
        const loginForm = document.getElementById('loginForm');
        const errorDiv = document.getElementById('errorMessage');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const login = document.getElementById('login').value;
                const password = document.getElementById('password').value;

                try {
                    const result = await api.login(login, password);
                    if (result) {
                        localStorage.setItem('adminAuth', 'true');
                        window.location.href = 'index.html';
                    } else {
                        errorDiv.textContent = 'Неверный логин или пароль';
                        errorDiv.classList.add('show');
                    }
                } catch (error) {
                    errorDiv.textContent = 'Ошибка соединения с сервером';
                    errorDiv.classList.add('show');
                }
            });
        }
        return;
    }

    // ===== АДМИН-ПАНЕЛЬ (index.html) =====
    let allData = null;
    let currentHallId = 1;
    let selectedFile = null;
    let dragData = null;

    // ===== КОНСТАНТЫ ДЛЯ TIMELINE =====
    const DAY_START_HOUR = 0;
    const DAY_END_HOUR = 24;
    const DAY_START_MINUTES = DAY_START_HOUR * 60;
    const DAY_END_MINUTES = DAY_END_HOUR * 60;
    const DAY_LENGTH = DAY_END_MINUTES - DAY_START_MINUTES;

    // ===== POPUP ЭЛЕМЕНТЫ =====
    const popupHall = document.getElementById('popupHallOverlay');
    const popupFilm = document.getElementById('popupFilmOverlay');
    const popupSeance = document.getElementById('popupSeanceOverlay');

    // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ POPUP =====
    function openPopup(type) {
        closeAllPopups();

        if (type === 'hall' && popupHall) {
            popupHall.style.display = 'flex';
        }
        if (type === 'film' && popupFilm) {
            popupFilm.style.display = 'flex';
        }
        if (type === 'seance' && popupSeance) {
            popupSeance.style.display = 'flex';
        }
    }

    function closeAllPopups() {
        if (popupHall) popupHall.style.display = 'none';
        if (popupFilm) popupFilm.style.display = 'none';
        if (popupSeance) popupSeance.style.display = 'none';

        const filmName = document.getElementById('filmName');
        const filmDuration = document.getElementById('filmDuration');
        const filmDescription = document.getElementById('filmDescription');
        const filmOrigin = document.getElementById('filmOrigin');

        if (filmName) filmName.value = '';
        if (filmDuration) filmDuration.value = '';
        if (filmDescription) filmDescription.value = '';
        if (filmOrigin) filmOrigin.value = '';

        selectedFile = null;
        const fileInput = document.getElementById('filmPoster');
        if (fileInput) fileInput.value = '';

        const uploadPosterBtn = document.getElementById('uploadPosterBtn');
        if (uploadPosterBtn) {
            uploadPosterBtn.textContent = 'Загрузить постер';
            uploadPosterBtn.style.backgroundColor = '';
        }

        const seanceTime = document.getElementById('seanceTime');
        if (seanceTime) seanceTime.value = '12:00';

        dragData = null;
    }

    document.querySelectorAll('.popup-close').forEach(btn => {
        btn.addEventListener('click', closeAllPopups);
    });

    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllPopups();
        });
    });

    document.querySelectorAll('.popup-cancel').forEach(btn => {
        btn.addEventListener('click', closeAllPopups);
    });

    // ===== ФУНКЦИИ ДЛЯ TIMELINE =====
    function timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    function getPositionPercent(time) {
        const minutes = timeToMinutes(time);
        return ((minutes - DAY_START_MINUTES) / DAY_LENGTH) * 100;
    }

    function adjustSeancesHeight() {
        document.querySelectorAll('.timeline__seances').forEach(container => {
            const hasSeances = container.querySelectorAll('.seance-card').length > 0;

            if (hasSeances) {
                let maxHeight = 0;
                container.querySelectorAll('.seance-card').forEach(card => {
                    const height = card.offsetHeight;
                    if (height > maxHeight) maxHeight = height;
                });
                container.style.minHeight = `${maxHeight + 20}px`;
            } else {
                container.style.minHeight = 'auto';
            }
        });
    }

    // ===== ПОЛУЧЕНИЕ ТЕКУЩЕЙ КОНФИГУРАЦИИ ИЗ DOM =====
    function getCurrentConfigFromDOM() {
        const config = [];
        const rows = document.querySelectorAll('.seats-row');

        rows.forEach(row => {
            const rowConfig = [];
            const seats = row.querySelectorAll('.seats');
            seats.forEach(seat => {
                rowConfig.push(seat.dataset.type);
            });
            config.push(rowConfig);
        });

        return config;
    }

    // ===== ОБРАБОТЧИКИ ИЗМЕНЕНИЯ РАЗМЕРОВ ЗАЛА =====
    function handleRowsChange() {
        const rowsInput = document.getElementById('rowsCount');
        const placesInput = document.getElementById('placesCount');

        const newRows = parseInt(rowsInput?.value) || 5;
        const currentPlaces = parseInt(placesInput?.value) || 8;

        const currentConfig = getCurrentConfigFromDOM();
        const newConfig = [];

        for (let i = 0; i < newRows; i++) {
            if (i < currentConfig.length) {
                newConfig.push([...currentConfig[i]]);
            } else {
                const newRow = [];
                for (let j = 0; j < currentPlaces; j++) {
                    newRow.push('standart');
                }
                newConfig.push(newRow);
            }
        }

        const hall = allData?.halls?.find(h => h.id === currentHallId);
        if (hall) {
            const tempHall = {
                ...hall,
                hall_rows: newRows,
                hall_places: currentPlaces,
                hall_config: newConfig
            };
            renderSeatsScheme(tempHall);
        }
    }

    function handlePlacesChange() {
        const rowsInput = document.getElementById('rowsCount');
        const placesInput = document.getElementById('placesCount');

        const currentRows = parseInt(rowsInput?.value) || 5;
        const newPlaces = parseInt(placesInput?.value) || 8;

        const currentConfig = getCurrentConfigFromDOM();
        const newConfig = [];

        for (let i = 0; i < currentConfig.length; i++) {
            const oldRow = currentConfig[i];
            const newRow = [];

            for (let j = 0; j < newPlaces; j++) {
                if (j < oldRow.length) {
                    newRow.push(oldRow[j]);
                } else {
                    newRow.push('standart');
                }
            }
            newConfig.push(newRow);
        }

        const hall = allData?.halls?.find(h => h.id === currentHallId);
        if (hall) {
            const tempHall = {
                ...hall,
                hall_rows: currentRows,
                hall_places: newPlaces,
                hall_config: newConfig
            };
            renderSeatsScheme(tempHall);
        }
    }

    // ===== ЗАГРУЗКА ДАННЫХ =====
    async function loadData() {
        try {
            allData = await api.getAllData();
            if (allData) {
                renderHalls();
                renderFilms();
                renderTimeline();
                updateHallSelects();
                updateSeanceSelects();
                updatePriceConfig();
                updateSalesStatus();
                initDeployButtons();
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // ===== УПРАВЛЕНИЕ ЗАЛАМИ =====
    function renderHalls() {
        const hallsList = document.querySelector('.admin-section__halls-list');
        if (!hallsList || !allData?.halls) return;

        hallsList.innerHTML = allData.halls.map(hall => `
            <li class="hall-tag" data-hall-id="${hall.id}">
                <span>- ${hall.hall_name}</span>
                <button class="hall-delete" data-hall-id="${hall.id}">
                    <img src="image/trash.png" alt="корзина">
                </button>
            </li>
        `).join('');

        document.querySelectorAll('.hall-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const hallId = parseInt(btn.dataset.hallId);
                if (confirm('Удалить зал? Все сеансы в нём будут удалены.')) {
                    const result = await api.deleteHall(hallId);
                    if (result) {
                        allData.halls = allData.halls.filter(h => h.id !== hallId);
                        allData.seances = allData.seances.filter(s => s.seance_hallid !== hallId);
                        renderHalls();
                        renderTimeline();
                        updateHallSelects();
                        updateSeanceSelects();
                        updateSalesStatus();
                        alert('Зал удалён');
                    } else {
                        alert('Ошибка при удалении зала');
                    }
                }
            });
        });
    }

    const addHallBtn = document.querySelector('.admin-section .button');
    if (addHallBtn) {
        addHallBtn.addEventListener('click', () => openPopup('hall'));
    }

    // ===== КОНФИГУРАЦИЯ ЗАЛА =====
    function updateHallSelects() {
        if (!allData?.halls) return;

        const hallsOptions = allData.halls.map(hall => `
            <label class="hall-radio__item">
                <input type="radio" name="hallConfig" value="${hall.id}" class="hall-radio__input">
                <span class="hall-radio__text">${hall.hall_name}</span>
            </label>
        `).join('');

        const priceOptions = allData.halls.map(hall => `
            <label class="hall-radio__item">
                <input type="radio" name="priceConfig" value="${hall.id}" class="hall-radio__input">
                <span class="hall-radio__text">${hall.hall_name}</span>
            </label>
        `).join('');

        const configSelect = document.querySelector('.config-form .hall-radio');
        const priceSelect = document.querySelector('.price-form .hall-radio');

        if (configSelect) configSelect.innerHTML = hallsOptions;
        if (priceSelect) priceSelect.innerHTML = priceOptions;

        document.querySelectorAll('.config-form .hall-radio__input').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    currentHallId = parseInt(e.target.value);
                    loadHallConfig(currentHallId);
                }
            });
        });

        document.querySelectorAll('.price-form .hall-radio__input').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    loadPriceConfig(parseInt(e.target.value));
                }
            });
        });

        if (allData.halls.length > 0) {
            const firstHallId = allData.halls[0].id;

            const configFirstRadio = document.querySelector('.config-form .hall-radio__input[value="' + firstHallId + '"]');
            if (configFirstRadio) {
                configFirstRadio.checked = true;
                currentHallId = firstHallId;
                loadHallConfig(currentHallId);
            }

            const priceFirstRadio = document.querySelector('.price-form .hall-radio__input[value="' + firstHallId + '"]');
            if (priceFirstRadio) {
                priceFirstRadio.checked = true;
                loadPriceConfig(firstHallId);
            }
        }
    }

    async function loadHallConfig(hallId) {
        const hall = allData?.halls?.find(h => h.id === hallId);
        if (!hall) return;

        const rowsInput = document.getElementById('rowsCount');
        const placesInput = document.getElementById('placesCount');

        if (rowsInput) rowsInput.value = hall.hall_rows;
        if (placesInput) placesInput.value = hall.hall_places;

        renderSeatsScheme(hall);

        if (rowsInput && placesInput) {
            rowsInput.removeEventListener('change', handleRowsChange);
            placesInput.removeEventListener('change', handlePlacesChange);

            rowsInput.addEventListener('change', handleRowsChange);
            placesInput.addEventListener('change', handlePlacesChange);
        }
    }

    function renderSeatsScheme(hall) {
        const seatsScheme = document.getElementById('seatsScheme');
        if (!seatsScheme) return;

        const config = hall.hall_config;
        if (!config || !Array.isArray(config)) return;

        const placesCount = config[0]?.length || 8;

        seatsScheme.innerHTML = config.map((row, rowIndex) => `
            <div class="seats-row">
                <div class="seats-seats" style="display: grid; grid-template-columns: repeat(${placesCount}, 26px); gap: 4px;">
                    ${row.map((seatType, seatIndex) => `
                        <div class="seats seats--${seatType}" 
                             data-row="${rowIndex + 1}" 
                             data-seat="${seatIndex + 1}"
                             data-type="${seatType}"></div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.seats-scheme .seats').forEach(seat => {
            seat.addEventListener('click', () => {
                let newType = 'standart';
                if (seat.dataset.type === 'standart') newType = 'vip';
                else if (seat.dataset.type === 'vip') newType = 'disabled';
                else if (seat.dataset.type === 'disabled') newType = 'standart';

                seat.dataset.type = newType;
                seat.className = `seats seats--${newType}`;
            });
        });
    }

    // ===== СОХРАНЕНИЕ КОНФИГУРАЦИИ ЗАЛА =====
    const saveConfigBtn = document.querySelector('.config-form .config-form__actions .button:last-child');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', async () => {
            const rowsInput = document.getElementById('rowsCount');
            const placesInput = document.getElementById('placesCount');

            const rows = parseInt(rowsInput?.value) || 10;
            const places = parseInt(placesInput?.value) || 8;

            if (rows <= 0) {
                alert('Количество рядов должно быть больше 0');
                return;
            }
            if (places <= 0) {
                alert('Количество мест в ряду должно быть больше 0');
                return;
            }

            const newConfig = [];
            const allRows = document.querySelectorAll('.seats-row');

            allRows.forEach((row) => {
                const rowConfig = [];
                const seats = row.querySelectorAll('.seats');
                seats.forEach(seat => {
                    let type = seat.dataset.type;
                    if (type === 'standart') type = 'standart';
                    else if (type === 'vip') type = 'vip';
                    else if (type === 'disabled') type = 'disabled';
                    else type = 'standart';
                    rowConfig.push(type);
                });
                newConfig.push(rowConfig);
            });

            while (newConfig.length < rows) {
                const newRow = [];
                for (let i = 0; i < places; i++) {
                    newRow.push('standart');
                }
                newConfig.push(newRow);
            }

            while (newConfig.length > rows) {
                newConfig.pop();
            }

            for (let i = 0; i < newConfig.length; i++) {
                while (newConfig[i].length < places) {
                    newConfig[i].push('standart');
                }
                while (newConfig[i].length > places) {
                    newConfig[i].pop();
                }
            }

            const result = await api.updateHallConfig(currentHallId, rows, places, newConfig);

            if (result) {
                const index = allData.halls.findIndex(h => h.id === currentHallId);
                if (index !== -1) {
                    allData.halls[index] = result;
                }
                renderSeatsScheme(result);
                alert('Конфигурация зала сохранена');
            } else {
                alert('Ошибка при сохранении конфигурации');
            }
        });
    }

    const cancelConfigBtn = document.querySelector('.config-form .config-form__actions .button--cancel');
    if (cancelConfigBtn) {
        cancelConfigBtn.addEventListener('click', () => loadHallConfig(currentHallId));
    }

    // ===== КОНФИГУРАЦИЯ ЦЕН =====
    async function loadPriceConfig(hallId) {
        const hall = allData?.halls?.find(h => h.id === hallId);
        if (!hall) return;

        const priceInputs = document.querySelectorAll('.price-form .config-form__input');
        if (priceInputs[0]) priceInputs[0].value = hall.hall_price_standart;
        if (priceInputs[1]) priceInputs[1].value = hall.hall_price_vip;
    }

    function updatePriceConfig() {
        const selectedRadio = document.querySelector('.price-form .hall-radio__input:checked');
        if (selectedRadio) {
            loadPriceConfig(parseInt(selectedRadio.value));
        } else if (allData?.halls?.length > 0) {
            loadPriceConfig(allData.halls[0].id);
        }
    }

    const savePriceBtn = document.querySelector('.price-form .config-form__actions .button:last-child');
    if (savePriceBtn) {
        savePriceBtn.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('.price-form .hall-radio__input:checked');
            const hallId = selectedRadio ? parseInt(selectedRadio.value) : allData?.halls[0]?.id;

            const priceInputs = document.querySelectorAll('.price-form .config-form__input');
            const priceStandart = parseInt(priceInputs[0]?.value) || 0;
            const priceVip = parseInt(priceInputs[1]?.value) || 0;

            if (priceStandart <= 0) {
                alert('Цена обычного билета должна быть больше 0');
                return;
            }
            if (priceVip <= 0) {
                alert('Цена VIP билета должна быть больше 0');
                return;
            }

            const result = await api.updatePrice(hallId, priceStandart, priceVip);
            if (result) {
                const index = allData.halls.findIndex(h => h.id === hallId);
                if (index !== -1) {
                    allData.halls[index] = result;
                }
                alert('Цены сохранены');
            } else {
                alert('Ошибка при сохранении цен');
            }
        });
    }

    // ===== УПРАВЛЕНИЕ ФИЛЬМАМИ =====
    function renderFilms() {
        const filmsList = document.querySelector('.films-list__items');
        if (!filmsList || !allData?.films) return;

        filmsList.innerHTML = allData.films.map(film => `
            <li class="film-card" data-film-id="${film.id}" draggable="true">
                <img class="film-card__img" src="${film.film_poster || 'image/no-poster.jpg'}" alt="Постер фильма">
                <div class="film-card__info">
                    <span class="film-card__title">${film.film_name}</span>
                    <span class="film-card__duration">${film.film_duration} минут</span>
                </div>
                <button class="film-delete" data-film-id="${film.id}">
                    <img src="image/trash.png" alt="корзина">
                </button>
            </li>
        `).join('');

        document.querySelectorAll('.film-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const filmId = parseInt(btn.dataset.filmId);
                if (confirm('Удалить фильм? Все сеансы с ним будут удалены.')) {
                    const result = await api.deleteFilm(filmId);
                    if (result) {
                        allData.films = allData.films.filter(f => f.id !== filmId);
                        allData.seances = allData.seances.filter(s => s.seance_filmid !== filmId);
                        renderFilms();
                        renderTimeline();
                        updateSeanceSelects();
                        alert('Фильм удалён');
                    } else {
                        alert('Ошибка при удалении фильма');
                    }
                }
            });
        });
    }

    const addFilmBtn = document.getElementById('addFilmBtn');
    if (addFilmBtn) {
        addFilmBtn.addEventListener('click', () => openPopup('film'));
    }

    // ===== ЗАГРУЗКА ПОСТЕРА =====
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const uploadPosterBtn = document.getElementById('uploadPosterBtn');
    if (uploadPosterBtn) {
        uploadPosterBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];

            if (selectedFile.size > 3 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер 3MB');
                selectedFile = null;
                fileInput.value = '';
                return;
            }

            if (uploadPosterBtn) {
                uploadPosterBtn.textContent = `📷 ${selectedFile.name}`;
                uploadPosterBtn.style.backgroundColor = '#e0f7fa';
            }
        }
    });

    // ===== ПОПУЛ ДЛЯ ФИЛЬМА =====
    document.getElementById('submitFilmBtn')?.addEventListener('click', async () => {
        const filmName = document.getElementById('filmName')?.value;
        const filmDuration = document.getElementById('filmDuration')?.value;
        const filmDescription = document.getElementById('filmDescription')?.value;
        const filmOrigin = document.getElementById('filmOrigin')?.value;

        if (!filmName || filmName.trim() === '') {
            alert('Введите название фильма');
            return;
        }
        if (!filmDuration || parseInt(filmDuration) <= 0) {
            alert('Продолжительность фильма должна быть больше 0');
            return;
        }

        const result = await api.addFilm(filmName, parseInt(filmDuration), filmDescription, filmOrigin, selectedFile);
        if (result) {
            closeAllPopups();
            if (result.films) {
                allData.films = result.films;
            }
            renderFilms();
            updateSeanceSelects();
            alert('Фильм добавлен');
        } else {
            alert('Ошибка при добавлении фильма');
        }
    });

    // ===== ПОПУЛ ДЛЯ ЗАЛА =====
    document.getElementById('submitHallBtn')?.addEventListener('click', async () => {
        const hallName = document.getElementById('hallName')?.value;
        if (!hallName || hallName.trim() === '') {
            alert('Введите название зала');
            return;
        }

        const result = await api.addHall(hallName);
        if (result) {
            closeAllPopups();
            if (result.halls) {
                allData.halls = result.halls;
            }
            renderHalls();
            updateHallSelects();
            updateSeanceSelects();
            updateSalesStatus();
            alert('Зал добавлен');
        } else {
            alert('Ошибка при добавлении зала');
        }
    });

    // ===== ДОБАВЛЕНИЕ КОРЗИНЫ =====
    function addTrashBins() {
    document.querySelectorAll('.trash-bin').forEach(bin => bin.remove());
    
    const halls = document.querySelectorAll('.timeline__hall');
    console.log('Найдено залов:', halls.length);
    
    halls.forEach((hall, index) => {
        const track = hall.querySelector('.timeline__track');
        if (!track) return;
        
        const trashBin = document.createElement('div');
        trashBin.className = 'trash-bin';
        trashBin.id = `trashBin_${index}`;
        trashBin.innerHTML = `
            <img class="trash-bin__icon" src="image/trash1.png" alt="Корзина">
            <span class="visually-hidden">Перетащите сюда сеанс для удаления</span>
        `;
        track.appendChild(trashBin);
        console.log(`Корзина добавлена в зал ${hall.querySelector('.timeline__hall-title')?.textContent}`);
    });
}

    // ===== ПОКАЗ POPUP ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ =====
    function showDeleteConfirm(seanceId, filmName) {
        const confirmPopup = document.getElementById('popupConfirmOverlay');
        if (!confirmPopup) {
            if (confirm(`Удалить сеанс "${filmName}"?`)) {
                performDelete(seanceId);
            }
            return;
        }

        const confirmMessage = document.getElementById('confirmMessage');
        const confirmOk = document.querySelector('.confirm-ok');
        const confirmCancel = document.querySelector('.confirm-cancel');

        confirmMessage.textContent = `Вы действительно хотите удалить сеанс фильма "${filmName}"?`;
        confirmPopup.style.display = 'flex';

        const onConfirm = async () => {
            await performDelete(seanceId);
            confirmPopup.style.display = 'none';
            cleanup();
        };

        const onCancel = () => {
            confirmPopup.style.display = 'none';
            cleanup();
        };

        const cleanup = () => {
            confirmOk.removeEventListener('click', onConfirm);
            confirmCancel.removeEventListener('click', onCancel);
        };

        confirmOk.addEventListener('click', onConfirm);
        confirmCancel.addEventListener('click', onCancel);
    }

    async function performDelete(seanceId) {
        const result = await api.deleteSession(seanceId);
        if (result) {
            allData.seances = allData.seances.filter(s => s.id !== seanceId);
            renderTimeline();
            alert('Сеанс удалён');
        } else {
            alert('Ошибка при удалении сеанса');
        }
    }

    // ===== TIMELINE (СЕАНСЫ) =====
    function renderTimeline() {
        const timelineContainer = document.querySelector('.timeline');
        if (!timelineContainer || !allData?.halls) return;

        timelineContainer.innerHTML = '';
        timelineContainer.innerHTML = allData.halls.map(hall => {
            const hallSeances = allData.seances?.filter(s => s.seance_hallid === hall.id) || [];
            hallSeances.sort((a, b) => a.seance_time.localeCompare(b.seance_time));

            const seancesHtml = hallSeances.map(seance => {
                const film = allData.films?.find(f => f.id === seance.seance_filmid);
                const filmName = film ? film.film_name : 'Неизвестный фильм';
                const leftPercent = getPositionPercent(seance.seance_time);

                return `
                    <div class="seance-card" draggable="true" 
                         data-seance-id="${seance.id}" 
                         data-film-id="${seance.seance_filmid}" 
                         data-time="${seance.seance_time}"
                         data-hall-id="${hall.id}"
                         style="left: ${leftPercent}%;">
                        ${filmName}
                    </div>
                `;
            }).join('');

            const timesHtml = hallSeances.map(seance => {
                const leftPercent = getPositionPercent(seance.seance_time);
                return `
                    <span class="timeline__time" style="left: ${leftPercent}%;">
                        ${seance.seance_time}
                    </span>
                `;
            }).join('');

            return `
                <div class="timeline__hall" data-hall-id="${hall.id}">
                    <h3 class="timeline__hall-title">${hall.hall_name}</h3>
                    <div class="timeline__track">
                        <div class="timeline__seances" data-hall-id="${hall.id}">
                            ${seancesHtml || '<div class="timeline__empty">Нет сеансов</div>'}
                        </div>
                        <div class="timeline__line"></div>
                        <div class="timeline__times">
                            ${timesHtml || '<span class="timeline__empty-time">Нет сеансов</span>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        setTimeout(() => {
            adjustSeancesHeight();
        }, 10);

        const oldTrash = document.getElementById('trashBin');
        if (oldTrash) oldTrash.remove();

        addTrashBins();
        initDragAndDrop();
        initSeanceDragAndDrop();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ DRAG & DROP ДЛЯ ФИЛЬМОВ =====
    function initDragAndDrop() {
        const filmCards = document.querySelectorAll('.film-card');
        const dropZones = document.querySelectorAll('.timeline__seances');

        filmCards.forEach(card => {
            card.setAttribute('draggable', 'true');

            card.addEventListener('dragstart', (e) => {
                const filmId = card.dataset.filmId;
                e.dataTransfer.setData('text/plain', filmId);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', async (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const filmId = e.dataTransfer.getData('text/plain');
                const hallId = zone.dataset.hallId;

                if (!filmId || !hallId) return;

                dragData = {
                    filmId: parseInt(filmId),
                    hallId: parseInt(hallId)
                };

                await updateSeanceSelects();
                prefillSeancePopup(dragData.filmId, dragData.hallId);
                openPopup('seance');
            });
        });
    }

    // ===== УДАЛЕНИЕ СЕАНСА =====
    function initSeanceDragAndDrop() {
        const trashBins = document.querySelectorAll('.trash-bin');
        if (trashBins.length === 0) {
            console.error('Корзины не найдены');
            return;
        }

        const seanceCards = document.querySelectorAll('.seance-card');
        console.log('Сеансов:', seanceCards.length);
        console.log('Корзин:', trashBins.length);

        let hoverTimer = null;
        let currentSeanceData = null;
        let currentHallId = null;

        seanceCards.forEach(card => {
            card.setAttribute('draggable', 'true');

            card.addEventListener('dragstart', (e) => {
                const seanceId = card.dataset.seanceId;
                const filmName = card.textContent.trim();
                currentSeanceData = { seanceId, filmName };

                // Находим ID зала из карточки сеанса
                currentHallId = card.closest('.timeline__hall')?.dataset.hallId;

                e.dataTransfer.setData('text/plain', JSON.stringify({ seanceId, filmName }));

                // Показываем корзину ТОЛЬКО текущего зала
                trashBins.forEach(bin => {
                    const binHallId = bin.closest('.timeline__hall')?.dataset.hallId;
                    if (binHallId === currentHallId) {
                        bin.classList.add('visible');
                    }
                });
            });

            card.addEventListener('dragend', () => {
                trashBins.forEach(bin => {
                    bin.classList.remove('visible');
                    bin.classList.remove('drag-over');
                });
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
                currentSeanceData = null;
                currentHallId = null;
            });
        });

        // Обработчики для каждой корзины
        trashBins.forEach(trashBin => {
            trashBin.addEventListener('mouseenter', () => {
                if (currentSeanceData) {
                    hoverTimer = setTimeout(() => {
                        showDeleteConfirm(currentSeanceData.seanceId, currentSeanceData.filmName);
                        trashBins.forEach(bin => bin.classList.remove('visible'));
                    }, 300);
                }
            });

            trashBin.addEventListener('mouseleave', () => {
                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }
            });

            trashBin.addEventListener('dragover', (e) => {
                e.preventDefault();
                trashBin.classList.add('drag-over');
            });

            trashBin.addEventListener('dragleave', () => {
                trashBin.classList.remove('drag-over');
            });

            trashBin.addEventListener('drop', async (e) => {
                e.preventDefault();
                trashBin.classList.remove('drag-over');

                const dataText = e.dataTransfer.getData('text/plain');
                if (!dataText) return;

                const data = JSON.parse(dataText);
                if (!data.seanceId) return;

                if (hoverTimer) {
                    clearTimeout(hoverTimer);
                    hoverTimer = null;
                }

                showDeleteConfirm(data.seanceId, data.filmName);
                trashBins.forEach(bin => bin.classList.remove('visible'));
            });
        });
    }

    // ===== СЕТКА СЕАНСОВ (обновление select) =====
    async function updateSeanceSelects() {
        const hallSelect = document.getElementById('seanceHallid');
        const filmSelect = document.getElementById('seanceFilmid');

        if (hallSelect && allData?.halls) {
            hallSelect.innerHTML = '<option value="">Выберите зал</option>' +
                allData.halls.map(hall => `<option value="${hall.id}">${hall.hall_name}</option>`).join('');
        }

        if (filmSelect && allData?.films) {
            filmSelect.innerHTML = '<option value="">Выберите фильм</option>' +
                allData.films.map(film => `<option value="${film.id}">${film.film_name}</option>`).join('');
        }
    }

    // ===== ПРЕДЗАПОЛНЕНИЕ ПОПУПА СЕАНСА =====
    function prefillSeancePopup(filmId, hallId) {
        const hallSelect = document.getElementById('seanceHallid');
        const filmSelect = document.getElementById('seanceFilmid');

        if (hallSelect && hallId) {
            hallSelect.value = hallId;
        }

        if (filmSelect && filmId) {
            filmSelect.value = filmId;
        }

        const seanceTime = document.getElementById('seanceTime');
        if (seanceTime) {
            seanceTime.value = '12:00';
        }
    }

    // ===== ПОПУЛ ДЛЯ СЕАНСА =====
    document.getElementById('submitSeanceBtn')?.addEventListener('click', async () => {
        const seanceHallid = dragData?.hallId || document.getElementById('seanceHallid')?.value;
        const seanceFilmid = dragData?.filmId || document.getElementById('seanceFilmid')?.value;
        const seanceTime = document.getElementById('seanceTime')?.value;

        if (!seanceHallid) {
            alert('Выберите зал');
            return;
        }
        if (!seanceFilmid) {
            alert('Выберите фильм');
            return;
        }
        if (!seanceTime || seanceTime.trim() === '') {
            alert('Введите время сеанса');
            return;
        }

        const result = await api.addSession(parseInt(seanceHallid), parseInt(seanceFilmid), seanceTime);

        if (result) {
            closeAllPopups();
            if (result.seances) {
                allData.seances = result.seances;
            }
            renderTimeline();
            updateSeanceSelects();
            alert('Сеанс добавлен');
            dragData = null;
            document.getElementById('seanceTime').value = '12:00';
        } else {
            alert('Ошибка при добавлении сеанса');
        }
    });

    // ===== ОТКРЫТИЕ ПРОДАЖ =====
    function updateSalesStatus() {
        const salesSelect = document.querySelector('.sale-form .hall-radio');
        if (!salesSelect || !allData?.halls) return;

        salesSelect.innerHTML = allData.halls.map(hall => `
            <label class="hall-radio__item">
                <input type="radio" name="salesHall" value="${hall.id}" class="hall-radio__input">
                <span class="hall-radio__text">${hall.hall_name}</span>
            </label>
        `).join('');

        const statusText = document.querySelector('.sale-form__text');
        if (statusText) {
            const selectedRadio = document.querySelector('.sale-form .hall-radio__input:checked');
            if (selectedRadio) {
                const hall = allData.halls.find(h => h.id === parseInt(selectedRadio.value));
                if (hall) {
                    statusText.textContent = hall.hall_open === 1 ? 'Продажи открыты' : 'Продажи закрыты';
                }
            }
        }

        document.querySelectorAll('.sale-form .hall-radio__input').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const hall = allData.halls.find(h => h.id === parseInt(e.target.value));
                    if (statusText && hall) {
                        statusText.textContent = hall.hall_open === 1 ? 'Продажи открыты' : 'Продажи закрыты';
                    }
                }
            });
        });
    }

    const openSalesBtn = document.querySelector('.sale-form__btn');
    if (openSalesBtn) {
        openSalesBtn.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('.sale-form .hall-radio__input:checked');
            if (!selectedRadio) {
                alert('Выберите зал');
                return;
            }

            const hallId = parseInt(selectedRadio.value);
            const hall = allData?.halls?.find(h => h.id === hallId);
            if (!hall) return;

            const newStatus = hall.hall_open === 1 ? 0 : 1;
            const result = await api.toggleSales(hallId, newStatus);
            if (result) {
                const index = allData.halls.findIndex(h => h.id === hallId);
                if (index !== -1) {
                    allData.halls[index] = result;
                }
                updateSalesStatus();
                const statusText = newStatus === 1 ? 'открыты' : 'закрыты';
                alert(`Продажи для зала ${hall.hall_name} ${statusText}`);
            } else {
                alert('Ошибка при изменении статуса продаж');
            }
        });
    }

    // ===== РАЗВОРАЧИВАНИЕ СЕКЦИЙ =====
    function initDeployButtons() {
        document.querySelectorAll('.admin-section__deploy').forEach(btn => {
            btn.removeEventListener('click', btn._deployHandler);

            const handler = () => {
                const section = btn.closest('.admin-section');
                const content = section.querySelector('.admin-section__content');
                const before = section.querySelector('.admin-section__before');

                content.classList.toggle('collapsed');
                if (before) before.classList.toggle('collapsed');
                btn.classList.toggle('rotated');
            };

            btn._deployHandler = handler;
            btn.addEventListener('click', handler);
        });
    }

    // ===== ВЫХОД =====
    const logoutBtn = document.querySelector('.admin-header__logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('adminAuth');
            window.location.href = 'login.html';
        });
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    await loadData();
});