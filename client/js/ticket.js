document.addEventListener('DOMContentLoaded', () => {

    console.log('ticket.js запущен');

    let ticketData = null;

    try {
        const saved = localStorage.getItem('ticketData');
        if (!saved) {
            const fallback = localStorage.getItem('finalBooking');
            if (!fallback) {
                throw new Error('Нет данных о билете');
            }
            ticketData = JSON.parse(fallback);
            ticketData.bookingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        } else {
            ticketData = JSON.parse(saved);
        }

        console.log('Данные билета:', ticketData);

    } catch (error) {
        console.error(error);
        const container = document.querySelector('.ticket-container');
        if (container) {
            container.innerHTML = '<div class="error-message">Ошибка: данные билета не найдены. Вернитесь на главную страницу.</div>';
        }
        return;
    }

    // Функция форматирования даты
    function formatDateTime(dateStr, timeStr) {
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

        const date = new Date(dateStr);
        const day = date.getDate();
        const month = months[date.getMonth()];

        return `${timeStr}, ${day} ${month}`;
    }

    // Функция форматирования мест
    function formatSeats(seats) {
        if (!seats || !Array.isArray(seats)) return 'Места не указаны';
        return seats.map(seat => `${seat.row} ряд ${seat.seat} место`).join(', ');
    }

    // Функция получения номера зала
    function getHallNumber(hallName) {
        if (!hallName) return '?';
        const match = hallName.match(/\d+/);
        return match ? match[0] : hallName;
    }

    // Инфо о билете
    const filmElem = document.getElementById('ticketFilm');
    const hallElem = document.getElementById('ticketHall');
    const dateTimeElem = document.getElementById('ticketDateTime');
    const seatsElem = document.getElementById('ticketSeats');
    const priceElem = document.getElementById('ticketPrice');
    const codeElem = document.getElementById('ticketCode');

    if (filmElem) filmElem.textContent = ticketData.filmName || 'Не указано';
    if (hallElem) hallElem.textContent = getHallNumber(ticketData.hallName);
    if (dateTimeElem) dateTimeElem.textContent = formatDateTime(ticketData.date, ticketData.time);
    if (seatsElem) seatsElem.textContent = formatSeats(ticketData.seats);
    if (priceElem) priceElem.textContent = `${ticketData.totalPrice || 0} рублей`;
    if (codeElem) codeElem.textContent = ticketData.bookingCode || 'Нет кода';

    // Формируем текст для QR-кода
    const qrText = `Фильм: ${ticketData.filmName || 'Не указан'}
Зал: ${getHallNumber(ticketData.hallName)}
Дата и время: ${formatDateTime(ticketData.date, ticketData.time)}
Места: ${formatSeats(ticketData.seats)}
Стоимость: ${ticketData.totalPrice || 0} руб.
Код бронирования: ${ticketData.bookingCode || 'Нет кода'}

Билет действителен строго на свой сеанс`;

    console.log('Текст для QR-кода:', qrText);

    // Генерируем QR-код
    const qrContainer = document.getElementById('qrcode');

    if (!qrContainer) {
        console.error('Контейнер #qrcode не найден');
        return;
    }

    if (typeof QRCreator !== 'undefined') {
        try {
            const qrcode = QRCreator(qrText, {
                mode: -1,
                eccl: 0,
                version: -1,
                mask: -1,
                image: 'PNG',
                modsize: 4,
                margin: 2
            });

            if (qrcode.error) {
                console.error('Ошибка генерации QR-кода:', qrcode.error);
                qrContainer.innerHTML = '<p class="error-message">Ошибка генерации QR-кода</p>';
            } else {
                qrContainer.appendChild(qrcode.result);
                console.log('QR-код успешно сгенерирован');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            qrContainer.innerHTML = '<p class="error-message">Ошибка генерации QR-кода</p>';
        }
    } else {
        console.error('Библиотека QRCreator не загружена');
        qrContainer.innerHTML = '<p class="error-message">Библиотека QR-кода не загружена. Проверьте подключение QRCreator.js</p>';
    }
});