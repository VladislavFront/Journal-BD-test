document.addEventListener('DOMContentLoaded', () => {
    const searchInputs = document.querySelectorAll('.header-search__input');
    
    if (searchInputs.length === 0) return;

    // Стиль для маркера
    const style = document.createElement('style');
    style.textContent = 'mark { background-color: var(--icon-color-dark); color: var(--text-color-dark); border-radius: 3px; padding: 0 2px;}';
    document.head.appendChild(style);

    // Контекст для поиска (главный контент страницы)
    const context = document.querySelector('main') || document.querySelector('.content') || document.body;
    const instance = new Mark(context);

    // Навешиваем логику на все найденные поисковые строки
    searchInputs.forEach(searchInput => {
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });

        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const searchText = val.trim();

            // Синхронизируем текст во всех поисковых строках
            searchInputs.forEach(el => { if (el !== searchInput) el.value = val; });

            // Запускаем подсветку
            instance.unmark({
                done: () => {
                    if (searchText.length >= 1) {
                        instance.mark(searchText, {
                            separateWordSearch: false,
                            diacritics: true,
                            accuracy: "partially"
                        });
                    }
                }
            });
        });
    });
});
