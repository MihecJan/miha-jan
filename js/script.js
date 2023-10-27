"use strict";

const handleProjectViewModeSwitch = e => {
    const cardID = e.currentTarget.parentElement.id;
    const btn = document.querySelector("#" + cardID + " .toggle-view-btn");
    const modeText = document.querySelector("#" + cardID + " .toggle-view-mode");
    const image = document.querySelector("#" + cardID + " .image");
    const mode = btn.getAttribute("data-mode");

    if (mode === "desktop") {
        btn.setAttribute("data-mode", "mobile");
        btn.textContent = "📱";
        modeText.textContent = "Mobile";
        image.classList.remove("desktop");
        image.classList.add("mobile");
    }
    else {
        btn.setAttribute("data-mode", "desktop");
        btn.textContent = "🖥️";
        modeText.textContent = "Desktop";
        image.classList.remove("mobile");
        image.classList.add("desktop");
    }
}

document.addEventListener("DOMContentLoaded", () => {

    const projectBtn = document.getElementById("project_btn");
    projectBtn.addEventListener("click", () => {
        const projectsEl = document.getElementById("projects");
        const y = projectsEl.getBoundingClientRect().top + window.scrollY;
        window.scroll({
            top: y,
            behavior: "smooth"
        });
    })

    const toggleView = document.querySelectorAll(".toggle-view-btn");
    toggleView.forEach(btn => {
        btn.addEventListener("click", e => handleProjectViewModeSwitch(e));
    });
});