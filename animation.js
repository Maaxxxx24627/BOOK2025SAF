if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js")
            .then((registration) => console.log("✅ Service Worker enregistré :", registration))
            .catch((error) => console.error("❌ Erreur Service Worker :", error));
    });
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("📜 Script chargé");

    let fileInput = document.getElementById("pdf-upload");
    let tocContainer = document.getElementById("toc-container");
    let toggleTocButton = document.getElementById("toggle-toc");
    let searchButton = document.getElementById("search-button");
    let searchInput = document.getElementById("search-input");

    let flipbook = document.getElementById("flipbook");
    let prevPageBtn = document.getElementById("prev-page");
    let nextPageBtn = document.getElementById("next-page");
    let goToPageBtn = document.getElementById("go-to-page");
    let pageInput = document.getElementById("page-input");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

    let pdfDoc = null;
    let searchResults = [];
    let pageNum = 1;

    // Événement pour afficher/cacher le sommaire
    if (toggleTocButton) {
        toggleTocButton.addEventListener("click", function () {
            tocContainer.style.display = tocContainer.style.display === "none" ? "block" : "none";
        });
    }

    //  Navigation dans le Flipbook
    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener("click", () => $("#flipbook").turn("previous"));
        nextPageBtn.addEventListener("click", () => $("#flipbook").turn("next"));
    }

    //  Aller à une page spécifique
    if (goToPageBtn && pageInput) {
        goToPageBtn.addEventListener("click", goToPage);
        pageInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") goToPage();
        });

        function goToPage() {
            let targetPage = parseInt(pageInput.value, 10);
            let totalPages = $("#flipbook").turn("pages");

            if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
                alert(`❌ Numéro invalide. Entrez un nombre entre 1 et ${totalPages}`);
                return;
            }

            console.log(`📖 Aller à la page ${targetPage}...`);
            $("#flipbook").turn("page", targetPage);
            pageInput.value = "";
        }
    }

    // 🔹 Recherche dans le PDF
    if (searchButton && searchInput) {
        searchButton.addEventListener("click", searchInPDF);
        searchInput.addEventListener("input", searchInPDF);
    }

    function searchInPDF() {
        const query = searchInput.value.toLowerCase().trim();
        const suggestionList = document.getElementById("suggestion-list");
        suggestionList.innerHTML = "";

        if (query.length === 0 || searchResults.length === 0) return;

        let matches = searchResults.filter(entry => entry.text.includes(query));
        console.log(`🔎 Résultats pour "${query}":`, matches.map(m => `Page ${m.page}`));

        matches.forEach(match => {
            let listItem = document.createElement("li");
            listItem.textContent = `Page ${match.page}`;
            listItem.addEventListener("click", () => $("#flipbook").turn("page", match.page));
            suggestionList.appendChild(listItem);
        });
    }

    // Chargement du PDF
    fileInput.addEventListener("change", async function (event) {
        const file = event.target.files[0];

        if (!file || file.type !== "application/pdf") {
            alert("❌ Veuillez sélectionner un fichier PDF valide.");
            return;
        }

        console.log("📥 PDF détecté. Chargement en cours...");
        await loadPDF(file);
        console.log("🚀 Extraction du texte...");
        await extractTextFromPDF();
        console.log("📖 Génération du sommaire...");
        generateTOC();
        console.log("🔄 Affichage des pages...");
        await loadPagesInOrder();
    });

    async function loadPDF(file) {
        console.log("📥 Début du chargement du PDF...");
        const fileReader = new FileReader();
    
        return new Promise((resolve, reject) => {
            fileReader.onload = async function () {
                const typedArray = new Uint8Array(this.result);
    
                try {
                    pdfDoc = await pdfjsLib.getDocument(typedArray).promise;
                    console.log("✅ PDF chargé avec", pdfDoc.numPages, "pages.");
                    resolve(); // ✅ Indique que le PDF est bien chargé
                } catch (error) {
                    console.error("❌ Erreur lors du chargement du PDF :", error);
                    reject(error);
                }
            };
    
            fileReader.readAsArrayBuffer(file);
        });
    }
    

    async function extractTextFromPDF() {
        if (!pdfDoc) return;
        searchResults = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            let page = await pdfDoc.getPage(i);
            let textContent = await page.getTextContent();
            let extractedText = textContent.items.map(item => item.str.trim()).join(" ");
            searchResults.push({ text: extractedText.toLowerCase(), page: i });
        }

        console.log("✅ Texte extrait !");
    }

    async function generateTOC() {
        console.log("📖 Génération du sommaire...");

        if (!pdfDoc) return;
        let tocList = document.getElementById("toc-list");
        tocList.innerHTML = "";

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            let page = await pdfDoc.getPage(i);
            let textContent = await page.getTextContent();

            textContent.items.forEach(item => {
                if (item.height > 10) {
                    let listItem = document.createElement("li");
                    listItem.textContent = `Page ${i} - ${item.str}`;
                    listItem.addEventListener("click", () => $("#flipbook").turn("page", i));
                    tocList.appendChild(listItem);
                }
            });
        }
    }
    console.log("📄 Vérification de pdfDoc avant `loadPagesInOrder()`:", pdfDoc);
    console.log("📄 Nombre de pages détecté :", pdfDoc ? pdfDoc.numPages : "pdfDoc est NULL !");
    
    async function loadPagesInOrder() {
        console.log("🔄 Chargement des pages en images...");
    
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            let existingPage = document.querySelector(`#flipbook .page[data-page='${i}']`);
            if (existingPage) {
                console.warn(`⚠ La page ${i} existe déjà, elle ne sera pas ajoutée.`);
                continue; // ✅ Empêche l'ajout en double
            }
    
            let page = await pdfDoc.getPage(i);
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            let viewport = page.getViewport({ scale: 2 });
    
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    
            let img = document.createElement("img");
            img.src = canvas.toDataURL();
    
            let pageDiv = document.createElement("div");
            pageDiv.classList.add("page");
            pageDiv.setAttribute("data-page", i);
            pageDiv.appendChild(img);
            flipbook.appendChild(pageDiv);
        }
    
        console.log("✅ Toutes les pages ont été ajoutées !");
        $("#flipbook").turn({ width: 1000, height: 700, autoCenter: true, display: "double" });
    }
    
});
