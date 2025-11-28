// modal.js

function openModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
}

// Закрытие модального окна по клику вне контента
document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Улучшение доступности: закрытие по Esc
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach((modal) => {
            if (modal.style.display === "flex") {
                closeModal(modal.id);
            }
        });
    }
});
