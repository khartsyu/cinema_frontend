document.addEventListener('DOMContentLoaded', async () => {

  console.log('hall.js запущен');

  const hallScheme = document.getElementById('hallScheme');
  const bookBtn = document.getElementById('hallBtn');

  let selectedSeats = [];
  let sessionData = null;
  let hallMatrix = [];
  let priceStandart = 250;
  let priceVip = 350;

  try {
    const saved = localStorage.getItem('selectedSession');
    if (!saved) throw new Error('Нет данных о сеансе');
    sessionData = JSON.parse(saved);

    document.getElementById('filmTitle').textContent = sessionData.filmName;
    document.getElementById('sessionTime').textContent = sessionData.time;
    document.getElementById('hallName').textContent = sessionData.hallName;
  } catch (error) {
    alert('Ошибка: выберите сеанс на главной странице');
    window.location.href = 'index.html';
    return;
  }

  async function loadHallConfig() {
    try {
      hallScheme.innerHTML = '<div class="loading-message">Загрузка схемы зала...</div>';

      const matrix = await api.getHallConfig(sessionData.sessionId, sessionData.date);

      if (!matrix || !Array.isArray(matrix)) {
        throw new Error('Неверный формат данных');
      }

      hallMatrix = matrix;
      console.log('Схема зала:', hallMatrix);

      renderHall();
    } catch (error) {
      console.error(error);
      hallScheme.innerHTML = '<div class="error-message">Ошибка загрузки схемы зала</div>';
    }
  }

  function renderHall() {
    if (!hallMatrix.length) {
      hallScheme.innerHTML = '<div class="error-message">Схема зала пуста</div>';
      return;
    }

    let html = '';

    for (let r = 0; r < hallMatrix.length; r++) {
      const row = hallMatrix[r];
      const rowNum = r + 1;

      html += `<div class="hall__row"><div class="hall__seats">`;

      for (let s = 0; s < row.length; s++) {
        const type = row[s];
        const seatNum = s + 1;

        let seatClass = '';
        let available = false;
        let price = 0;

        if (type === 'standart') {
          seatClass = 'seat--free';
          available = true;
          price = priceStandart;
        } else if (type === 'vip') {
          seatClass = 'seat--vip';
          available = true;
          price = priceVip;
        } else if (type === 'taken') {
          seatClass = 'seat--taken';
          available = false;
        } else {
          seatClass = 'seat--empty';
          available = false;
        }

        const isSelected = selectedSeats.some(s => s.row === rowNum && s.seat === seatNum);
        if (isSelected) seatClass = 'seat--selected';

        const attrs = available ? `data-row="${rowNum}" data-seat="${seatNum}" data-type="${type}" data-price="${price}"` : '';

        html += `<div class="seat ${seatClass}" ${attrs}></div>`;
      }

      html += `</div></div>`;
    }

    hallScheme.innerHTML = html;

    document.querySelectorAll('.seat[data-row]').forEach(seat => {
      seat.removeEventListener('click', handleSeatClick);
      seat.addEventListener('click', handleSeatClick);
    });
  }

  function handleSeatClick(e) {
    const seat = e.currentTarget;
    const row = parseInt(seat.dataset.row);
    const seatNum = parseInt(seat.dataset.seat);
    const type = seat.dataset.type;
    const price = parseInt(seat.dataset.price);

    const index = selectedSeats.findIndex(s => s.row === row && s.seat === seatNum);

    if (index !== -1) {
      selectedSeats.splice(index, 1);
      seat.classList.remove('seat--selected');
      seat.classList.add(type === 'vip' ? 'seat--vip' : 'seat--free');
    } else {
      selectedSeats.push({ row, seat: seatNum, type, price });
      seat.classList.remove('seat--free', 'seat--vip');
      seat.classList.add('seat--selected');
    }

    localStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
  }

  function setupBookButton() {
    if (!bookBtn) return;
    bookBtn.addEventListener('click', () => {
      if (selectedSeats.length === 0) {
        alert('Выберите места для бронирования');
        return;
      }

      const booking = {
        sessionId: sessionData.sessionId,
        filmName: sessionData.filmName,
        hallName: sessionData.hallName,
        date: sessionData.date,
        time: sessionData.time,
        seats: selectedSeats,
        totalPrice: selectedSeats.reduce((sum, s) => sum + s.price, 0)
      };

      localStorage.setItem('finalBooking', JSON.stringify(booking));
      window.location.href = 'payment.html';
    });
  }

  await loadHallConfig();
  setupBookButton();
});