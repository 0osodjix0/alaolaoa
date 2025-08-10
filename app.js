// 1. Инициализация карты
function initYandexMap() {
  // Загрузка API Яндекс Карт
  const script = document.createElement('script');
  script.src = 'https://api-maps.yandex.ru/2.1/?apikey=188ce352-ffb7-429a-81df-0a96d598921e&lang=ru_RU';
  script.onload = () => {
    ymaps.ready(() => {
      const map = new ymaps.Map('map', {
        center: [55.751244, 37.618423], // Москва
        zoom: 12,
        controls: ['zoomControl']
      });

      // Добавляем мастеров на карту
      loadMasters(map);
    });
  };
  document.head.appendChild(script);
}

// 2. Загрузка данных мастеров
async function loadMasters(map) {
  try {
    const response = await fetch('/api/masters');
    const masters = await response.json();
    
    masters.forEach(master => {
      createMasterPlacemark(map, master);
    });
  } catch (error) {
    console.error('Ошибка загрузки мастеров:', error);
  }
}

// 3. Создание кастомной метки мастера
function createMasterPlacemark(map, master) {
  // Создаем HTML-содержимое для балуна
  const balloonContent = createMasterBalloonContent(master);
  
  // Создаем метку
  const placemark = new ymaps.Placemark(
    [master.lat, master.lng],
    {
      balloonContent: balloonContent,
      hintContent: master.name
    },
    {
      iconLayout: 'default#image',
      iconImageHref: 'https://cdn-icons-png.flaticon.com/512/4474/4474187.png',
      iconImageSize: [40, 40],
      iconImageOffset: [-20, -40]
    }
  );
  
  // Добавляем метку на карту
  map.geoObjects.add(placemark);
  
  // Открываем балун при клике
  placemark.events.add('click', () => {
    placemark.balloon.open();
  });
}

// 4. Создание содержимого балуна (аналог инфоокна)
function createMasterBalloonContent(master) {
  const balloon = document.createElement('div');
  balloon.className = 'yandex-balloon';
  
  balloon.innerHTML = `
    <div class="master-header">
      <h3>${master.name}</h3>
      <div class="rating">${master.rating} ★ (${master.reviewsCount})</div>
    </div>
    
    <div class="description">"${master.description}"</div>
    
    <div class="services">
      <h4>📋 Услуги и цены:</h4>
      <ul>
        ${master.services.map(service => `
          <li>
            <span class="service-name">${service.name}</span>
            <span class="service-price">${service.price} ₽</span>
          </li>
        `).join('')}
      </ul>
    </div>
    
    <div class="schedule">
      <h4>🕒 График:</h4>
      <p>${master.schedule}</p>
    </div>
    
    <div class="address">
      <h4>📍 Адрес:</h4>
      <p>${master.address}</p>
    </div>
    
    <div class="contacts">
      <h4>📲 Контакты:</h4>
      <p>${master.contacts}</p>
    </div>
    
    <div class="reviews">
      <h4>Отзывы (${master.reviews.length}):</h4>
      ${master.reviews.slice(0, 2).map(review => `
        <div class="review">
          <div class="review-header">
            <span class="author">${review.author}</span>
            <span class="review-rating">${review.rating} ★</span>
          </div>
          <p class="text">${review.text}</p>
        </div>
      `).join('')}
      ${master.reviews.length > 2 ? 
        `<button class="show-all-reviews">Показать все отзывы</button>` : ''}
    </div>
    
    <button class="book-button">Записаться</button>
  `;
  
  // Обработчики событий
  balloon.querySelector('.book-button').addEventListener('click', () => {
    showBookingForm(master);
  });
  
  if (balloon.querySelector('.show-all-reviews')) {
    balloon.querySelector('.show-all-reviews').addEventListener('click', () => {
      showAllReviews(master);
    });
  }
  
  return balloon.innerHTML;
}

// 5. Форма записи
function showBookingForm(master) {
  const modal = document.createElement('div');
  modal.className = 'yandex-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Запись к ${master.name}</h2>
      
      <div class="form-group">
        <label>Выберите услугу:</label>
        <select class="service-select">
          <option value="">-- Выберите --</option>
          ${master.services.map(service => `
            <option value="${service.id}">${service.name} - ${service.price} ₽</option>
          `).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Выберите дату:</label>
        <input type="date" class="date-input" min="${getCurrentDate()}" 
               max="${getFutureDate(Config.MAX_BOOKING_DAYS)}">
      </div>
      
      <div class="form-group">
        <label>Выберите время:</label>
        <div class="time-slots">
          <!-- Слоты будут загружены после выбора даты -->
          <p>Пожалуйста, выберите дату сначала</p>
        </div>
      </div>
      
      <div class="form-group">
        <label>Ваше имя:</label>
        <input type="text" class="name-input" placeholder="Как к вам обращаться?">
      </div>
      
      <div class="form-group">
        <label>Телефон:</label>
        <input type="tel" class="phone-input" placeholder="+7 (___) ___-__-__">
      </div>
      
      <button class="submit-booking" disabled>Подтвердить запись</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Обработчики событий
  modal.querySelector('.close').addEventListener('click', () => {
    modal.remove();
  });
  
  // Закрытие при клике вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Логика выбора даты и времени
  setupBookingFormLogic(modal, master);
}

// 6. Логика формы записи
function setupBookingFormLogic(modal, master) {
  const serviceSelect = modal.querySelector('.service-select');
  const dateInput = modal.querySelector('.date-input');
  const timeSlots = modal.querySelector('.time-slots');
  const nameInput = modal.querySelector('.name-input');
  const phoneInput = modal.querySelector('.phone-input');
  const submitButton = modal.querySelector('.submit-booking');
  
  let selectedService = null;
  let selectedDate = null;
  let selectedTime = null;
  
  // Выбор услуги
  serviceSelect.addEventListener('change', () => {
    selectedService = serviceSelect.value;
    updateSubmitButton();
  });
  
  // Выбор даты
  dateInput.addEventListener('change', () => {
    selectedDate = new Date(dateInput.value);
    loadAvailableTimeSlots(selectedDate, master, timeSlots);
    updateSubmitButton();
  });
  
  // Обновление кнопки подтверждения
  function updateSubmitButton() {
    if (selectedService && selectedDate && selectedTime && 
        nameInput.value && phoneInput.value) {
      submitButton.disabled = false;
    } else {
      submitButton.disabled = true;
    }
  }
  
  // Отправка формы
  submitButton.addEventListener('click', async () => {
    const bookingData = {
      masterId: master.id,
      serviceId: selectedService,
      dateTime: selectedTime.toISOString(),
      clientName: nameInput.value,
      clientPhone: phoneInput.value
    };
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      if (response.ok) {
        showBookingSuccess(master, selectedDate, selectedTime);
        modal.remove();
      } else {
        throw new Error('Ошибка сервера');
      }
    } catch (error) {
      showError('Ошибка при записи. Пожалуйста, попробуйте позже.');
    }
  });
  
  // Валидация полей
  nameInput.addEventListener('input', updateSubmitButton);
  phoneInput.addEventListener('input', updateSubmitButton);
}

// 7. Загрузка доступных временных слотов
async function loadAvailableTimeSlots(date, master, container) {
  container.innerHTML = '<p>Загрузка доступного времени...</p>';
  
  try {
    // Получаем расписание мастера на выбранный день
    const response = await fetch(`/api/schedule?masterId=${master.id}&date=${date.toISOString()}`);
    const schedule = await response.json();
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем слоты времени
    schedule.availableSlots.forEach(slot => {
      const slotElement = document.createElement('div');
      slotElement.className = 'time-slot';
      slotElement.textContent = slot.time;
      
      slotElement.addEventListener('click', () => {
        // Удаляем выделение у других слотов
        document.querySelectorAll('.time-slot').forEach(el => {
          el.classList.remove('selected');
        });
        
        // Выделяем выбранный слот
        slotElement.classList.add('selected');
        selectedTime = new Date(slot.datetime);
        updateSubmitButton();
      });
      
      container.appendChild(slotElement);
    });
    
    if (schedule.availableSlots.length === 0) {
      container.innerHTML = '<p>Нет доступных слотов на эту дату</p>';
    }
  } catch (error) {
    container.innerHTML = '<p>Ошибка загрузки расписания</p>';
    console.error('Ошибка загрузки расписания:', error);
  }
}

// 8. Вспомогательные функции
function getCurrentDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function showBookingSuccess(master, date, time) {
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  alert(`✅ Запись успешно оформлена!\n\nМастер: ${master.name}\nДата: ${date.toLocaleDateString('ru-RU', options)}\n\nМы уведомим мастера о вашей записи.`);
}

function showError(message) {
  alert(`❌ ${message}`);
}

// 9. Инициализация карты при загрузке страницы
document.addEventListener('DOMContentLoaded', initYandexMap);

// 10. Пример структуры данных мастера (для тестирования)
const exampleMaster = {
  id: 1,
  name: "💅 Вика Nails",
  description: "Красота в деталях — я за то, чтобы ваши руки говорили о вас больше, чем слова",
  rating: 4.8,
  reviewsCount: 42,
  lat: 55.741244,
  lng: 37.628423,
  services: [
    { id: 1, name: "Классический маникюр", price: 900 },
    { id: 2, name: "Аппаратный маникюр", price: 1100 },
    { id: 3, name: "Маникюр + покрытие гель-лак", price: 1500 },
    { id: 4, name: "Дизайн (1 ноготь)", price: 50 },
    { id: 5, name: "Укрепление гелем", price: 400 },
    { id: 6, name: "Снятие покрытия", price: 300 }
  ],
  schedule: "Пн–Сб: 10:00–20:00\nВс — по записи",
  address: "г. Москва, м. Таганская, ул. Яузская, 12, студия 'Nail Loft'",
  contacts: "Telegram / WhatsApp: +7 (999) 123-45-67\nInstagram: @vika_nails_official",
  reviews: [
    { author: "Анна", rating: 5, text: "Отличный мастер, очень аккуратно работает!" },
    { author: "Мария", rating: 4, text: "Хороший сервис, но немного задержали начало" }
  ]
};