document.addEventListener('DOMContentLoaded', async () => {

    console.log('payment.js запущен');

    const paymentContainer = document.querySelector('.payment-container');
    const payBtn = document.getElementById('paymentBtn');

    let bookingData = null;

    function formatDateTime(dateStr, timeStr) {
        const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        const date = new Date(dateStr);
        return `${timeStr}, ${date.getDate()} ${months[date.getMonth()]}`;
    }

    function formatSeats(seats) {
        return seats.map(seat => `${seat.row} ряд ${seat.seat} место`).join(', ');
    }

    function getHallNumber(hallName) {
        const match = hallName.match(/\d+/);
        return match ? match[0] : hallName;
    }

    try {
        const saved = localStorage.getItem('finalBooking');
        if (!saved) {
            throw new Error('Нет данных о бронировании');
        }
        bookingData = JSON.parse(saved);
        console.log('Данные бронирования:', bookingData);

        document.getElementById('bookingFilm').textContent = bookingData.filmName;
        document.getElementById('bookingSeats').textContent = formatSeats(bookingData.seats);
        document.getElementById('bookingHall').textContent = getHallNumber(bookingData.hallName);
        document.getElementById('bookingTime').textContent = formatDateTime(bookingData.date, bookingData.time);
        document.getElementById('bookingPrice').textContent = `${bookingData.totalPrice} рублей`;

    } catch (error) {
        console.error(error);
        if (paymentContainer) {
            paymentContainer.innerHTML = '<div class="error-message">Ошибка: данные о билетах не найдены.</div>';
        }
        return;
    }

    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            const originalText = payBtn.textContent;
            payBtn.textContent = 'Отправка...';
            payBtn.disabled = true;

            try {
                const tickets = bookingData.seats.map(seat => ({
                    row: seat.row,
                    place: seat.seat,
                    coast: seat.price
                }));

                const result = await api.buyTicket(
                    Number(bookingData.sessionId),
                    bookingData.date,
                    tickets
                );

                if (!result) {
                    throw new Error('Сервер вернул пустой ответ');
                }

                let ticketsArray = null;

                if (result.tickets) {
                    ticketsArray = result.tickets;
                } else if (Array.isArray(result)) {
                    ticketsArray = result;
                } else if (result.result && Array.isArray(result.result)) {
                    ticketsArray = result.result;
                } else {
                    throw new Error('Сервер не вернул билеты');
                }

                const ticketData = {
                    ...bookingData,
                    bookingCode: ticketsArray[0]?.id || Math.random().toString(36).substring(2, 10).toUpperCase(),
                    serverTickets: ticketsArray
                };

                localStorage.setItem('ticketData', JSON.stringify(ticketData));
                window.location.href = 'ticket.html';

            } catch (error) {
                console.error('Ошибка:', error);

                let userMessage = 'Произошла ошибка при бронировании. Попробуйте ещё раз.';
                if (error.message.includes('Не возможно забронировать место')) {
                    userMessage = 'Выбранные места уже заняты. Пожалуйста, вернитесь и выберите другие места.';
                }

                alert(userMessage);
                payBtn.textContent = originalText;
                payBtn.disabled = false;
            }
        });
    }
});