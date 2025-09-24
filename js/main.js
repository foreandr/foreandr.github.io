function renderProjects() {
    const container = document.getElementById("projects");
    db.projects.forEach(p => {
        const div = document.createElement("div");
        div.className = "project";
        div.innerHTML = `<h2>${p.title}</h2><p>${p.description}</p>`;
        container.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("greeting").textContent = greetUser("Andre");
    renderProjects();
});
