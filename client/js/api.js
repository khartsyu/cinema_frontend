class API {
    constructor() {
        this.baseUrl = 'https://shfe-diplom.neto-server.ru/';
    }

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

    async getAllData() {
        return this.get('alldata');
    }

    async getHallConfig(seanceId, date) {
        const url = `hallconfig?seanceId=${seanceId}&date=${date}`;
        return this.get(url);
    }


    async buyTicket(seanceId, ticketDate, tickets) {
        console.log('=== buyTicket вызван ===');
        console.log('seanceId:', seanceId);
        console.log('ticketDate:', ticketDate);
        console.log('tickets:', tickets);

        const formData = new FormData();
        formData.append('seanceId', seanceId);
        formData.append('ticketDate', ticketDate);
        formData.append('tickets', JSON.stringify(tickets));

        for (let pair of formData.entries()) {
            console.log(`FormData: ${pair[0]} = ${pair[1]}`);
        }

        const result = await this.post('ticket', formData);
        console.log('=== buyTicket результат ===', result);
        return result;
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

            console.log(`ПОЛНЫЙ ОТВЕТ СЕРВЕРА (${endpoint}):`, JSON.stringify(data, null, 2));

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
}

const api = new API();