// api.js - полная версия с корректными эндпоинтами

class API {
    constructor() {
        this.baseUrl = 'https://shfe-diplom.neto-server.ru/';
    }

    // ========== БАЗОВЫЕ МЕТОДЫ ==========

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            const data = await response.json();

            if (data.success) {
                return data.result;
            } else {
                console.error(`Ошибка API (${endpoint}):`, data.error);
                return null;
            }
        } catch (error) {
            console.error(`Ошибка соединения (${endpoint}):`, error);
            return null;
        }
    }

    async post(endpoint, formData) {
        try {
            console.log(`=== POST запрос к: ${endpoint} ===`);
            for (let pair of formData.entries()) {
                console.log(`Параметр: ${pair[0]} = ${pair[1]}`);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            console.log(`Ответ сервера (${endpoint}):`, data);

            if (data.success) {
                return data.result;
            } else {
                console.error(`Ошибка API (${endpoint}):`, data.error);
                return null;
            }
        } catch (error) {
            console.error(`Ошибка соединения (${endpoint}):`, error);
            return null;
        }
    }

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                return data.result;
            } else {
                console.error(`Ошибка API (${endpoint}):`, data.error);
                return null;
            }
        } catch (error) {
            console.error(`Ошибка соединения (${endpoint}):`, error);
            return null;
        }
    }

    // ========== КЛИЕНТСКАЯ ЧАСТЬ ==========

    async getAllData() {
        return this.get('alldata');
    }

    async getHallConfig(seanceId, date) {
        const url = `hallconfig?seanceId=${seanceId}&date=${date}`;
        return this.get(url);
    }

    async buyTicket(seanceId, ticketDate, tickets) {
        const formData = new FormData();
        formData.append('seanceId', seanceId);
        formData.append('ticketDate', ticketDate);
        formData.append('tickets', JSON.stringify(tickets));
        return this.post('ticket', formData);
    }

    // ========== АДМИНСКАЯ ЧАСТЬ ==========

    // Авторизация
    async login(login, password) {
        const formData = new FormData();
        formData.append('login', login);
        formData.append('password', password);
        return this.post('login', formData);
    }

    // Управление залами
    async addHall(hallName) {
        const formData = new FormData();
        formData.append('hallName', hallName);
        return this.post('hall', formData);
    }

    async deleteHall(hallId) {
        return this.delete(`hall/${hallId}`);
    }

    async updateHallConfig(hallId, rowCount, placeCount, config) {
        console.log('updateHallConfig вызван:', { hallId, rowCount, placeCount, config });

        const formData = new FormData();
        formData.append('rowCount', rowCount);
        formData.append('placeCount', placeCount);
        formData.append('config', JSON.stringify(config));

        return this.post(`hall/${hallId}`, formData);
    }

    // Управление ценами
    async updatePrice(hallId, priceStandart, priceVip) {
        const formData = new FormData();
        formData.append('priceStandart', priceStandart);
        formData.append('priceVip', priceVip);
        return this.post(`price/${hallId}`, formData);
    }

    // Управление продажами
    async toggleSales(hallId, hallOpen) {
        const formData = new FormData();
        formData.append('hallOpen', hallOpen);
        return this.post(`open/${hallId}`, formData);
    }

    // Управление фильмами
    async addFilm(filmName, filmDuration, filmDescription, filmOrigin = '', filePoster = null) {
        const formData = new FormData();
        formData.append('filmName', filmName);
        formData.append('filmDuration', filmDuration);
        formData.append('filmDescription', filmDescription);
        formData.append('filmOrigin', filmOrigin);
        if (filePoster) {
            formData.append('filePoster', filePoster);
        }
        return this.post('film', formData);
    }

    async deleteFilm(filmId) {
        return this.delete(`film/${filmId}`);
    }

    // Управление сеансами
    async addSession(seanceHallid, seanceFilmid, seanceTime) {
        const formData = new FormData();
        formData.append('seanceHallid', seanceHallid);
        formData.append('seanceFilmid', seanceFilmid);
        formData.append('seanceTime', seanceTime);
        return this.post('seance', formData);
    }

    async deleteSession(seanceId) {
        return this.delete(`seance/${seanceId}`);
    }

    async addFilm(filmName, filmDuration, filmDescription, filmOrigin = '', filePoster = null) {
        const formData = new FormData();
        formData.append('filmName', filmName);
        formData.append('filmDuration', filmDuration);
        formData.append('filmDescription', filmDescription);
        formData.append('filmOrigin', filmOrigin);
        if (filePoster) {
            formData.append('filePoster', filePoster);
        }
        return this.post('film', formData);
    }
}

const api = new API();