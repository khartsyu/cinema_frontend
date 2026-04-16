document.addEventListener('DOMContentLoaded', async () => {

    function isSessionPassed(sessionTime, sessionDate) {

        const now = new Date();

        const [year, month, day] = sessionDate.split('-');
        const [hours, minutes] = sessionTime.split(':');
        const sessionDateTime = new Date(year, month - 1, day, hours, minutes);

        return sessionDateTime < now;
    }
    console.log('main.js запущен');

    const moviesList = document.getElementById('moviesList');
    const datesList = document.getElementById('datesList');

    if (!moviesList) {
        console.error('Элемент #moviesList не найден в HTML');
        return;
    }

    if (!datesList) {
        console.error('Элемент #datesList не найден в HTML');
        return;
    }

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    let allData = null;

    function formatDateForAPI(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getNext7Days() {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push(date);
        }
        return days;
    }

    function formatDateForDisplay(date, isToday = false) {
        const days = ['Вс,', 'Пн,', 'Вт,', 'Ср,', 'Чт,', 'Пт,', 'Сб,'];
        const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

        if (isToday) {
            return {
                day: 'Сегодня',
                date: `${days[date.getDay()]} ${date.getDate()}`
            };
        }

        return {
            day: days[date.getDay()],
            date: `${date.getDate()}`
        };
    }

    function renderDates() {
        const dates = getNext7Days();

        datesList.innerHTML = dates.map((date, index) => {
            const isToday = index === 0;
            const isActive = formatDateForAPI(date) === formatDateForAPI(currentDate);
            const formatted = formatDateForDisplay(date, isToday);
            const isSaturday = date.getDay() === 6;

            return `
                <li class="date__item ${isActive ? 'date__item--active' : ''} ${isSaturday ? 'date__item--saturday' : ''}" 
                    data-date="${formatDateForAPI(date)}">
                    <span class="date__day">${formatted.day}</span>
                    <span class="date__date">${formatted.date}</span>
                </li>
            `;
        }).join('');

        const moreButton = `
            <li class="date__item date__item--more" id="showMoreDates">
                <span>&gt;</span>
            </li>
        `;
        datesList.insertAdjacentHTML('beforeend', moreButton);

        document.querySelectorAll('.date__item[data-date]').forEach(item => {
            item.addEventListener('click', () => {
                const newDate = new Date(item.dataset.date);
                if (!isNaN(newDate.getTime())) {
                    currentDate = newDate;
                    renderDates();
                    renderMovies();
                }
            });
        });

        const moreBtn = document.getElementById('showMoreDates');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                console.log('Показать больше дат');
            });
        }
    }

    function renderMovies() {
        if (!allData) {
            moviesList.innerHTML = '<li class="movie__card">Нет данных</li>';
            return;
        }

        const dateStr = formatDateForAPI(currentDate);

        moviesList.innerHTML = allData.films.map(film => {
            const filmSeances = allData.seances.filter(seance => {
                if (seance.seance_filmid !== film.id) return false;

                const hall = allData.halls.find(h => h.id === seance.seance_hallid);
                return hall && hall.hall_open === 1;
            });


            const sessionsByHall = {};

            filmSeances.forEach(seance => {
                const hall = allData.halls.find(h => h.id === seance.seance_hallid);
                const hallName = hall ? hall.hall_name : `Зал ${seance.seance_hallid}`;

                if (!sessionsByHall[hallName]) {
                    sessionsByHall[hallName] = [];
                }
                sessionsByHall[hallName].push(seance);
            });

            let sessionsHtml = '';

            for (const [hallName, seances] of Object.entries(sessionsByHall)) {
                const timeButtonsHtml = seances.map(seance => {
                    const passed = isSessionPassed(seance.seance_time, dateStr);

                    return `
                    <li>
                        <button class="movie__time-btn ${passed ? 'movie__time-btn--disabled' : ''}" 
                                data-session-id="${seance.id}" 
                                data-session-time="${seance.seance_time}" 
                                data-film-id="${film.id}" 
                                data-hall-id="${seance.seance_hallid}"
                                ${passed ? 'disabled' : ''}>
                            ${seance.seance_time}
                        </button>
                    </li>
                `;
                }).join('');

                sessionsHtml += `
                <div class="movie__hall">
                    <span class="movie__hall-name">${hallName}</span>
                    <ul class="movie__time-list">
                        ${timeButtonsHtml}
                    </ul>
                </div>
            `;
            }

            if (sessionsHtml === '') {
                sessionsHtml = '<div class="movie__hall">Нет сеансов</div>';
            }

            return `
            <li class="movie__card">
                <div class="movie__row">
                    <div class="movie__poster">
                        <img src="${film.film_poster || 'image/no-poster.jpg'}" alt="Постер фильма ${film.film_name}">
                    </div>
                    <div class="movie__info">
                        <h3 class="movie__title">${film.film_name}</h3>
                        <p class="movie__description">${film.film_description || 'Описание отсутствует'}</p>
                        <span class="movie__duration">${film.film_duration} мин</span>
                        <span class="movie__country">${film.film_origin || 'Страна не указана'}</span>
                    </div>
                </div>
                <div class="movie__sessions">
                    ${sessionsHtml}
                </div>
            </li>
        `;
        }).join('');

        addTimeButtonsHandlers();
    }

    function addTimeButtonsHandlers() {
        const timeButtons = document.querySelectorAll('.movie__time-btn');
        console.log(`Найдено кнопок: ${timeButtons.length}`);

        timeButtons.forEach(btn => {
            btn.removeEventListener('click', handleTimeClick);
            btn.addEventListener('click', handleTimeClick);
        });
    }

    function handleTimeClick(event) {
        const btn = event.currentTarget;
        if (btn.disabled) return;
        const sessionId = btn.dataset.sessionId;
        const sessionTime = btn.dataset.sessionTime;
        const filmId = btn.dataset.filmId;
        const hallId = btn.dataset.hallId;

        const filmCard = btn.closest('.movie__card');
        const filmTitle = filmCard.querySelector('.movie__title').textContent;
        const hallName = btn.closest('.movie__hall').querySelector('.movie__hall-name').textContent;

        const selectedDate = formatDateForAPI(currentDate);

        const sessionData = {
            sessionId: sessionId,
            filmId: filmId,
            filmName: filmTitle,
            hallId: hallId,
            hallName: hallName,
            date: selectedDate,
            time: sessionTime
        };

        localStorage.setItem('selectedSession', JSON.stringify(sessionData));
        console.log('Выбран сеанс:', sessionData);

        window.location.href = 'hall.html';
    }

    moviesList.innerHTML = '<li class="movie__card">Загрузка фильмов...</li>';

    allData = await api.getAllData();

    if (!allData) {
        moviesList.innerHTML = '<li class="movie__card">Ошибка загрузки данных с сервера</li>';
        return;
    }

    console.log('Данные с сервера:', allData);
    console.log('Фильмы:', allData.films);
    console.log('Залы:', allData.halls);
    console.log('Сеансы:', allData.seances);

    if (!allData.films || allData.films.length === 0) {
        moviesList.innerHTML = '<li class="movie__card">Фильмы не найдены</li>';
        return;
    }

    renderDates();
    renderMovies();

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = '../admin/login.html';
        });
    }

    console.log('Инициализация завершена');
});