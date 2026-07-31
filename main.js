//Coded by APR 2026

// helper functions
    async function loadHTML(id, file){ //takes the tag's id for insertion and the html file to be inserted
        const response = await fetch(file);

        const data = await response.text();

        document.getElementById(id).innerHTML = data;
    }

    async function loadJSON(file){
        const response = await fetch(file);
        return await response.json();
    }
    async function generateJson(){
        navigation = await loadJSON("data/navigation.json");
        inventory = await loadJSON("data/inventory.json"); //all inventory
        CONFIG = await loadJSON("data/config.json");
        imageManifest = await loadJSON("data/imageManifest.json");
    }

    //link building helper
    function buildLink(item, includePage = false){
        if(item.lslug) return `infoPage.html?lslug=${item.lslug}`;
        if(item.slug){
            let url = `catalog.html?slug=${item.slug}`;

            if(includePage && item.slug === categorySlug && currentCatalogPage != null) 
                url += `&page=${currentCatalogPage}`;
            return url;
        }
        if(item.link) return item.link;
        return "#";
    }

    function getParams(){
        return new URLSearchParams(window.location.search);
    }

    function getProductCategory(product, categoryId){
        return (product.Category || []).includes(categoryId);
    }

//rule to open outside links in a new tab and not track where the user came from
function setupExternalLinks(){
    const links = document.querySelectorAll("a");

    links.forEach(link => {
        const href = link.getAttribute("href");

        // skip empty links
        if(!href) return;

        // external link
        if(
            href.startsWith("http") &&
            !href.includes(window.location.hostname)
        ){
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
    });
}

//functions for the navigation bar
    /*function to load navigation bar */
    function createMenu(items, topLevel = true, addSearch = true){
        var html = "";
        items.forEach(item => {
            /*item has dropdown*/
            if (item.showInNav === false) {
                if (item.children) html += createMenu(item.children, true, false);
                return;
            }

            const itemClass = topLevel ? "tabitem" : "dropdownitem";
            const dropdownClass = topLevel ? "dropdown" : "subdropdown";

            if(item.children.length > 1){
                html += `
                    <div class="${itemClass}">
                        <a href="${buildLink(item)}"> ${item.title}</a>

                        <div class="${dropdownClass}"> ${createMenu(item.children, false, false)} </div>
                    </div>                
                `;
            }
            /* no children link */
            else {
                if(topLevel) html += `<div class="${itemClass}"> <a href="${buildLink(item)}"> ${item.title} </a> </div>`;
                else html += `<a href="${buildLink(item)}">${item.title}</a>`;              
            }        
        });
        if (addSearch){//search icon and bar
            html += `
                <div class="tabitem">
                    <div id="search"> 
                        <span> &#8981 </span> 
                        
                        <div id="searchBox">
                            <div> <input type="text" placeholder="Search" id="searchBar"> </div>
                            <div id="execute"> Go </div>
                        </div>
                    </div>             
                </div>
            `;
        }

        return html;
    }

//functions for the use of the search bar
    function initializeSearch(){
        const search = document.getElementById("search");
        const searchBox = document.getElementById("searchBox");
        const execute = document.getElementById("execute");
        const searchBar = document.getElementById("searchBar");

        if(!search || !searchBox) return;

        search.onclick = function(event){
            event.stopPropagation();

            searchBox.classList.toggle("open");
        };

        document.addEventListener("click",
            function(){ searchBox.classList.remove("open"); }
        );
        searchBox.onclick = function(event){
            event.stopPropagation();
        };

        execute.addEventListener("click",
            function(){ runSearch(); }
        );
        searchBar.addEventListener(//allows for enter key to execute search
            "keydown",
            function(event){
                if(event.key === "Enter") runSearch();
            }
        );
    }

    function runSearch(){ //main function to search through inventory
        const params = getParams();
        const slug = params.get("slug");

        var category = findByProperty(navigation, "slug", slug);
        var catName = document.getElementById("cat-name");

        if(!slug){
            window.location.href =
                "catalog.html?slug=showroom&search=" +
                encodeURIComponent(getSearchPrompt());
            return;
        }

        var prompt = getSearchPrompt();
        searchResults = [];
        currentPage = 1;//reset page
        rebuildActiveInventory();

        if (prompt.trim() === "") {//when empty search is run
            sortedInventory = null;
            searchResults = null;
            currentPage = 1;
            rebuildActiveInventory();
            renderAtributeTab();
            catName.textContent = category.title;
            return;
        }

        searchItem(prompt);

        resetPage = true;

        catName.textContent = category.title + " search results for: \"" + prompt + "\"";
    }
    function getSearchPrompt(){
        return document.getElementById("searchBar").value;
    }

    function searchItem(prompt){ 
        const lowerPrompt = prompt.toLowerCase();
        const searchPool = catInventory.length > 0 ? catInventory : inventory; 
        const terms = lowerPrompt.split(" ");

        //item number search
        const itemMatches = searchPool.filter(item => 
            item["Item#"].toLowerCase().includes(lowerPrompt)
        );
        if (itemMatches.length) {
            searchResults = itemMatches;
            rebuildActiveInventory();
            return;
        }

        //ranked search
        const rankedResults = [];
        for (const item of searchPool) { 
            const itemName = (item["Product Name"] || "").toLowerCase(); 
            const itemDesc = (item["Description"] || "").toLowerCase();

            var score = 0;
            const itemWords = itemName.split(/\s+/);
            
            var matches = terms.every(term => { 
                var singular = term;
                
                if (term.endsWith("ies")) singular = term.slice(0, -3) + "y"; 
                else if (term.endsWith("es")) singular = term.slice(0, -2);
                else if (term.endsWith("s")) singular = term.slice(0,-1); 
                if (term == "carat") term = "ct";
                if (term == "karat") term = "k";
                
                const found = ( itemName.includes(term) || 
                itemName.includes(singular) || 
                itemDesc.includes(term) || 
                itemDesc.includes(singular) ); 

                if(found){
                    if (itemWords.includes(term)) score += 1000; 
                    if (itemName.includes(lowerPrompt)) score += 90;
                    if (itemName.includes(term) ) score += 80;
                    if (itemName.includes(singular) ) score += 60;
                    if (itemDesc.includes(term) ) score += 40;
                    if (itemDesc.includes(singular) ) score += 20;
                }

                return found;
            }) 
            if(matches) rankedResults.push({item, score}); 
        } 
        rankedResults.sort( (a,b) => b.score - a.score );
        searchResults = rankedResults.map( result => result.item);

        rebuildActiveInventory(); 
    }

    function rebuildActiveInventory(){
        if(sortedInventory !== null){
            activeInventory = sortedInventory;
        } else if(searchResults !== null){
            activeInventory = searchResults;
        } else {
            const isCatalogPage = getParams().has("slug");
            activeInventory = isCatalogPage ? catInventory : inventory;
        }

        updateValues(activeInventory);
        renderCatalog(activeInventory);
    }

    function getCurrentInventory(){
        if(searchResults !== null) return searchResults;

        const isCatalogPage = getParams().has("slug");
        if (isCatalogPage) return catInventory;

        return inventory;
    }

//functions for the use of config.json file
    function applyConfig(){
        const elements = document.querySelectorAll("[data-config]");

        elements.forEach(element => {
            const key = element.dataset.config;

            if(CONFIG[key]) element.textContent = CONFIG[key];       
        });

        const links = document.querySelectorAll("[data-config-link]");

        links.forEach(link => {
            const key = link.dataset.configLink;

            if(CONFIG[key]) link.href = CONFIG[key];
        });
    }

//find by functions
    function findByProperty(items, property, value){
        for (const item of items) {
            if (item[property] === value) return item;

            if (item.children && item.children.length > 0) {
                const result = findByProperty(item.children, property, value);

                if (result) return result;
            }
        }

        return null;
    }

// render page functions
    function renderCatalogPage(category){//loads category page subheader
        document.getElementById("cat-name").textContent = category.title;
        loadCategoryDescription(category);

        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }
    function renderInfoPage(category){
        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }

//catalog page subheader funtions
    //functions for treepath
    function trackCategoryPath(items, slug, path = []){
        for (const item of items) {
            const newpath = [...path,item];

            if (item.slug === slug) return newpath;

            if (item.children && item.children.length > 0) {
                const result = trackCategoryPath(item.children, slug, newpath);
                if (result) return result;
            }
        }
        return null;
    }
    function renderCategoryPath(path){ //builds tree bar for category page
        const isProductPage = getParams().has("item");

        var html = ` <a href="index.html">Home</a> `;

        path.forEach((item, index) => {
            const islast = index === path.length - 1;

            html += `&nbsp;>&nbsp;`;

            if (!isProductPage && islast) {
                html+= `<strong>${item.title}</strong>`;
                return;
            }

            const href = buildLink(item, true);

            html += href ? `<a href="${href}">${item.title}</a>` : `${item.title}`;
        });

        if (isProductPage) html += "&nbsp;>";

        document.getElementById("tree-bar").innerHTML = html;       
    }

    const categoryDescription = {//array storing the desriptions for categories
            "engagement-rings": `
                Starting a new life with your true love can be exciting and wonderful! That journey begins with the perfect proposal. A diamond engagement ring is the symbol of your love that's given to last a lifetime. Let us help you select the perfect engagement ring to begin your journey!
            
                Roof Jewelers has bridal sets, single solitaires, semi-mounts, and more! We can even design a custom ring based on your ideas. 
            `,
            "estate": `
                Love the styles of days gone by? At Roof Jewelers we have a wide selection of estate and vintage jewelry; to see these beautiful pieces for yourself drop by our showroom. We have an entire vault of estate jewelry and inventory changes frequently, so a much larger selection may be found in-store than can be made available online.

                You know the saying, "They don't make things like they used to." This is your chance to get the highest quality fine jewelry that you can't find anywhere else.      
            `,
            "citizen": `All Citizen Watches come with a five year movement warranty.`,
            "thorsten-rings": `Thorsten Rings is a cutting-edge brand specializing in bands crafted from durable ceramics and alternative metals, with many unique styles and inlays, come find the piece that speaks to you.
`
    }
    function loadCategoryDescription(category){
        const description = document.getElementById("cat-description");
        description.innerText = categoryDescription[category.slug] || "";
    }

    //functions for category boxes
    function getSubCategories(category){
        var html = "";
        if(category.children) {
            html += `
                    <h3 id="cat-header">CATEGORIES</h3>              
                `;
            const children = category.children;

            for (const child of children) {
                var href = buildLink(child);
                if (href){
                    html += `
                        <div><a href="${href}">${child.title}</a></div>
                    `;
                }
            }
            document.getElementById("categories").innerHTML = html;
        } else {
            return html;
        }    
    }

//catalog page inventory display functions
    let navigation;
    let inventory;
    let CONFIG;
    let imageManifest;
    
    let catInventory = []; //category specific inventory
    let visibleProducts = []; //products vissible to user when on catalog page
    let sortedInventory = null; //invetory with filters applied
    let featuredInventory; //array for featured inventory
    let searchResults = null;
    let activeInventory = []; //inventory in use used to allow repurposing of functions
    let currentPage = 1;
    let currentCatalogPage = null;
    let categorySlug = null;
    const base = 12; //catalog default display count
    let displayCount = base;
    let start = 0;
    let end = 0;
    let pageCount = 0;//change inventory to category inventory when made
    let isRendering = false;
    let pendingPage = null;
    let resetPage = false;

//******* functions to get the catalog/featured inventory ********/
    function getCategoryInventory(){ //gets the items specific to the category
        const slug = getParams().get("slug");
        const category = findByProperty(navigation, "slug", slug);

        if(!category) {
            window.location.href = "404page.html";
            return;
        }

        catInventory = inventory.filter(item => 
            (getProductCategory(item, category.id) && !item.Hidden) ||
            (item.Brand === category.id)
        );        
        
        searchCategoryInventory(category.children);
        activeInventory = catInventory;
    }
    function searchCategoryInventory(category){//recursive function to load category inventory to include items in children
        if (!category) return;

        for(const child of category) {
            for (const item of inventory){
                if(getProductCategory(item, child.id)) catInventory.push(item);
            }
            searchCategoryInventory(child.children);
        } 
    }
    function getFeaturedInventory(){//gets the items in inventory marked as featured
        featuredInventory = inventory.filter(item => item.Featured);
        return featuredInventory.length;
    }
//******* end of functions to get the catalog/featured inventory ********/

//functions for the use of the attribute side bar
    function getSortedInventory(resetPage){
        if (resetPage) currentPage = 1;

        const checked = [...document.querySelectorAll(".sortPrice:checked")];
        const filterPool = getCurrentInventory();

        if (checked.length === 0) {//show everything 
            sortedInventory = [...filterPool];
        } else {
            sortedInventory = filterPool.filter(item =>
                checked.some(box => {
                    const min = Number(box.dataset.min) || 0;
                    const max = box.dataset.max ? Number(box.dataset.max) : Infinity;
                    return isItemInRange(item, min, max);
                })
            );
        } //end else

        rebuildActiveInventory();
    }

    async function renderAtributeTab(){ //loads the html for the attribute side tab
        var sort = document.getElementById("price-sort");

        if (!sort) return false;

        var tab = document.getElementById("attribute-content");

        
        sort.innerHTML = `
            <fieldset id="sortPrice">
                <legend> Sort by price </legend>

                <div class="priceOption">
                    <input type="checkbox" class="sortPrice" id="0to100"
                        data-min="0" data-max="100">
                    <label for="0to100"> $0 to $100 </label>
                </div>
                <div class="priceOption">
                    <input type="checkbox" class="sortPrice" id="100to500"
                        data-min="100" data-max="500">
                    <label for="100to500"> $100 to $500 </label>
                </div>
                <div class="priceOption">
                    <input type="checkbox" class="sortPrice" id="500to1000"
                        data-min="500" data-max="1000">
                    <label for="500to1000"> $500 to $1000 </label>
                </div>
                <div class="priceOption">
                    <input type="checkbox" class="sortPrice" id="1000to5000"
                        data-min="1000" data-max="5000">
                    <label for="1000to5000"> $1000 to $5000 </label>
                </div>
                <div class="priceOption">
                    <input type="checkbox" class="sortPrice" id="5000up"
                        data-min="5000">
                    <label for="5000up"> $5000+ </label>
                </div>
            </fieldset>
        `;     
        priceCheckListeners();
    }
    function isItemInRange(item, min = 0, max = Infinity){
        const price = item.Price;

        return price >= min && price <= max;
    }
    function priceCheckListeners() {
        document.addEventListener("change", event =>{
            if (!event.target.classList.contains("sortPrice")) return;
            resetPage = true;
            getSortedInventory(resetPage);
        });
    }

//end of attribute side bar specific functions

//******** catalog page functions *********/
    function updateValues(inventoryArray){ //products vissible in a category
        if(currentCatalogPage != null){
            currentPage = currentCatalogPage;
            currentCatalogPage = null;
        }
        start = (currentPage - 1)*displayCount;
        end = currentPage*displayCount;
        visibleProducts = inventoryArray.slice(start,end);
        pageCount = Math.ceil(inventoryArray.length/displayCount);
    }  

    function pageClicks(event){ //updates catalog display when page bar is interacted with
        if(event.target.id === "prev"){
            if (currentPage != 1) {
                currentPage--;
                requestPage(currentPage);
            }
        }
        else if(event.target.id === "next"){
            if (currentPage != pageCount) {
                currentPage++;
                requestPage(currentPage);
            }
        }
        else if(event.target.classList.contains("pageNumbers")){
            currentPage = parseInt(event.target.textContent);
            requestPage(currentPage);
        }
    }
    function displayChange(event){ //updates ammount of items shown when display count is changed
        if (event.target.id === "showcount"){
            displayCount = parseInt(event.target.value);
            currentPage = 1;
            updateCatalogContent();
        }
    }
    function attachListeners(){ //add the listner functions to the proper buttons
        document.addEventListener("click", pageClicks);
        document.addEventListener("change", displayChange);
    }

    async function initilalizeCatolog(){ //runs functions for the catolog page
        await getCategoryInventory(); //gets category specific inventory
        rebuildActiveInventory(); //sets active inventory
        attachListeners(); //attches listners to pagebar and display count
    }

    //catalog display settings
    function renderSettings(inventoryArray){ //sort bar, product count, display option count
        if (inventoryArray.length > 0) start+=1;
        var html = `
            <div id="productCount">
                <p><strong>Products</strong> ${start}-${Math.min(end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p> 
            </div>
            <div class="dropdown-container">
                <p>Show: </p>
                <select id="showcount">
                    <option value="${base*1}" ${displayCount === base*1 ? "selected" : ""}> ${base*1} Per Page </option>
                    <option value="${base*2}" ${displayCount === base*2 ? "selected" : ""}> ${base*2} Per Page </option>
                    <option value="${base*3}" ${displayCount === base*3 ? "selected" : ""}> ${base*3} Per Page </option>
                    <option value="${base*4}" ${displayCount === base*4 ? "selected" : ""}> ${base*4} Per Page </option>
                </select>
            </div>
        `;
        
        document.getElementById("content-settings").innerHTML = html;
    }

    //quick view functions
    function quickViewBtnListners(){
        document.addEventListener("click", function(event){
            if (!event.target.classList.contains("quickViewBtn")) return;

            const itemNumber = event.target.dataset.item;
            const product = findByProperty(inventory, "Item#", itemNumber);
            const container = document.getElementById("quickViewContainer");

            renderProductPage(product, container);

            container.hidden = false;
        });

        const container = document.getElementById("quickViewContainer");
        const window = document.getElementById("quickViewWindow");
        const close = document.getElementById("closeQuickView");
        if (container) {
            container.addEventListener("click", function(event){
                if (event.target === container || event.target === close) container.hidden = true;
            });
        }
    }
    function laodQuickViewHtml(){
        let qvContainer = document.getElementById("quickViewContainer");
        if(!qvContainer) return;
        var html = `
            <div id="quickViewWindow">
                <div id="productContainer">
                    <button id="closeQuickView">&times;</button>
                    <div id="productInfo">
                        <div id="name">
                            <h1 id="productName"></h1>
                        </div>
                        <div id="image"> 
                            <img id="productImg" src="" onerror="this.src='images/img-placeholder.svg'">
                            <div id="imgBar"></div>
                        </div>
                        <div id="namePrice">
                        <h3>Description:</h3>                   
                        <div>
                            <p id="descriptionScroll"></p>
                        </div>                            
                            <div id="priceDiv"></div>
                        </div>
                    </div>
                    <div id="productStatus">
                        <h3 id="itemID"></h3>
                        <br>
                        <h3 id="availibility"></h3>
                        <h3 id="quantity"></h3>
                    </div>
                </div>
            </div>
        `;

        qvContainer.innerHTML = html;
    }

    function renderProductCards(products, containerId, featured = false){ //pulls product img, name and price to a card for display
        //var price = 0;
        var html = "";

        //fade content out
        const container = document.getElementById(containerId);
        if (!container) return;
        container.style.opacity = "0";

        const params = getParams();
        const slug = params.get("slug");

        for (const item of products){
            let price = item.Price;
            if (price == 0) price = item.Retail;

            if (price == 0) price = "Price Not Available";
            else {
                if (item.Brand === "brands-citizen") price = item.Retail * 0.75;
                price = moneyFormat(price);
            }

            const href = featured
                ? `productPage.html?item=${item["Item#"]}&category=${item["Category"]}`
                : `productPage.html?item=${item["Item#"]}&category=${slug}&page=${currentPage}`;

            let ribbonText = "";
            let ribbonClass = "ribbon";
            if (getProductStatus(item) == "Out of Stock") {
                ribbonText = "Sold Out";
                ribbonClass += "-sold";
            } else if (item.Featured) {
                ribbonText = "Featured";
                ribbonClass += "-featured";
            }          

            html += `
                <div class="item-card">
                    <span class="${ribbonClass}">${ribbonText}</span>
                    <button class="quickViewBtn" data-item="${item["Item#"]}">Quick View</button>
                    <div class="item-card1">
                        <a href="${href}">
                            <img src="inventory/inventory-images/${item["Product Image"]}" 
                                onerror="this.src='images/img-placeholder.svg'">
                        </a>
                    </div>
                    <div class="item-card2">
                        ${item["Product Name"]} <br>
                        <span class="price">${price}</span>
                    </div>
                </div>           
            `;
        }

        container.style.opacity = "0";
        container.innerHTML = html;
        
        requestAnimationFrame(() => {//fade in
            container.style.opacity = "1";
        });
    }
    function renderProducts(){
        renderProductCards(visibleProducts, "product-content");
    }

    function loadFeaturedHtml(){
        if (!document.getElementById("featured")) return;
        if (!getFeaturedInventory()) return;

        var html = `
            <h2 id="featured-title"> Featured Selection </h2>

            <div id="featured-carousel">
                <div id="featured-viewport">
                    <div id="featured-track"></div>
                </div>
            </div>
            <div id="button-track"></div>
        `;
        document.getElementById("featured").innerHTML = html;
    }
    function loadFeaturedButtons(){
        if (!document.getElementById("featured-track")) return;

        const track = document.getElementById("featured-track").children;
        var html = "";
        if (track.length >= 4) {
            html = `
                <span class="arrow" id="fLeft" style="transform: rotateY(180deg);">&nbsp&#10148;</span>
                <span class="arrow" id="fRight">&nbsp&#10148;</span>
            `;
        }
        document.getElementById("button-track").innerHTML = html;
    }
    function renderFeaturedProducts(){
        const cardWidth = window.innerWidth <= 500 ? 185 /* 175 + gap */ : 270;
        const cardView = window.innerWidth <= 500 ? 2 : 4;

        loadFeaturedHtml();
        renderProductCards(featuredInventory, "featured-track", true);
        loadFeaturedButtons();

        initializeCarousel({
            'track': document.getElementById("featured-track"),
            'lbtn': document.getElementById("fLeft"),
            'rbtn': document.getElementById("fRight"),
            'slideWidth': cardWidth,
            'unit': 'px',
            'loop': false,
            'cloneCount': 0,
            'viewCount': cardView
        });     
    }

    //page bar helper
    function getPageNumberButton(page){
        return `
            <div class="pageNumbers ${page === currentPage ? "currentPage" : ""}">
                ${page}
            </div>
        `;
    }
    function renderPageBar(){// page navigation for categories
        const pageBar = document.getElementById("pageBar");

        pageBar.innerHTML = "";

        const mobile = window.innerWidth <= 500;

        const maxPageView = mobile ? 3 : 7;
        const edgePages = mobile ? 1 : 2;
        const middlePages = mobile ? 1 : maxPageView - edgePages;

        if (pageCount <= 1) return;

        var html = "";
       
        //fist two page buttons
        html += ` <div id="prev"> < Prev </div> `;
        if (pageCount <= maxPageView) {
            for (var i = 1; i <= pageCount; i++) html += getPageNumberButton(i);
        } else {
            for (var i = 1; i <= edgePages; i++) html += getPageNumberButton(i);
        }
            
        if (pageCount > maxPageView){
            var startMiddle, endMiddle;

            /* near beginning */
            if(currentPage <= edgePages + 1){
                startMiddle = edgePages + 1;
                endMiddle = edgePages + middlePages;
            }

            /* near end */
            else if(currentPage >= pageCount - edgePages){
                startMiddle = pageCount - middlePages - edgePages + 1;
                endMiddle = pageCount - edgePages;
            }

            /* middle */
            else{
                const half = Math.floor(middlePages / 2);
                startMiddle = currentPage - half;
                endMiddle = startMiddle + middlePages - 1;

                if (startMiddle < edgePages + 1){
                    startMiddle = edgePages + 1;
                    endMiddle = startMiddle + middlePages - 1;
                }
                if (endMiddle > pageCount - edgePages){
                    endMiddle = pageCount - edgePages;
                    startMiddle = endMiddle - middlePages + 1;
                }
            }

            //elipse once deep enough into pages
            if (startMiddle > edgePages + 1) html += ` <div>...</div> `;
    
            //sliding middle
            for (var j = startMiddle; j <= endMiddle; j++) html += getPageNumberButton(j);
            
            //elispse when not too deep
            if (endMiddle < pageCount - edgePages) html += ` <div>...</div> `;
            
            //back edge buttons
            for (var i = pageCount - edgePages + 1; i <= pageCount; i++) html += getPageNumberButton(i);
        }

        //next button
        html += ` <div id="next">Next ></div> `;
        document.getElementById("pageBar").innerHTML = html;       
    }

    //render all
    function renderCatalog(inventoryArray){
        renderSettings(inventoryArray);
        renderProducts();
        renderPageBar();
    }

    //update functions
    function updateSettings(inventoryArray){
        var html = `<p><strong>Products</strong> ${start +1}-${Math.min(end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p>`;
        document.getElementById("productCount").innerHTML = html;
    }   
    function updateCatalogContent(){
        updateValues(activeInventory);
        renderProducts();
        renderPageBar();
        updateSettings(activeInventory);
    }
    async function requestPage(page){ //prevents page lag from spam requests
        if (isRendering) pendingPage = page;
        else {
            isRendering = true;
            currentPage = page;
            await updateCatalogContent();
            while (pendingPage != null) {
                currentPage = pendingPage;
                pendingPage = null;
                await updateCatalogContent();
            }
            isRendering = false;
        }
    }
//********* end of catalog page functions *********/

//********* generic carousel **********/
    function initializeCarousel({track, lbtn, rbtn, slideWidth, unit, loop = false, cloneCount, viewCount, container = document}){
        if (!track) return;
        console.log("running: ", track.children);
        console.log(track);

        let index = 0;
        let slides = track.children;

        if (loop){
            for (var i = 0; i < cloneCount; i++) {
                track.appendChild(slides[i].cloneNode(true));
            }
        }
        function shift(direction){
            index += direction;

            track.style.transition = "transform 1s ease-in-out";
            track.style.transform = `translateX(-${index * slideWidth}${unit})`;
        }

        track.addEventListener("click",
            function(event){
                if(event.target.classList.contains("pImg")) {
                    container.querySelector("#productImg").src = event.target.src;
                }
            }
        );

        if (rbtn && lbtn){
            lbtn.addEventListener("click", () => {
                pauseAutoPlay();
                if(!loop){
                    if (index > 0) shift(-1);
                    return;
                }
                if(index === 0){ /*if at first slide turns off animation jumps to clone at the end and then moves back after turning animation on*/
                    /* jump instantly to cloned slide */
                    track.style.transition = "none";

                    index = slides.length - cloneCount;

                    track.style.transform = `translateX(-${index * slideWidth}${unit})`;

                    setTimeout(() => { shift(-1); },20);
                } else {
                    shift(-1);
                }
            });

            rbtn.addEventListener("click", () => {
                pauseAutoPlay();
                if (!loop){
                    if (index == slides.length - viewCount) return;                 
                }
                shift(1);

                if (loop && index === slides.length - cloneCount) {
                    setTimeout(() => {
                        track.style.transition = "none";
                        index = 0;
                        track.style.transform = `translateX(0${unit})`;
                    }, 1000);
                }
            });
        }

        let autoPlay;
        let restartTimer;
        function startAutoPlay(delay = 6000) {
            clearInterval(autoPlay);/*stops autoplay*/ 
            autoPlay = setInterval(() => {
                shift(1);

                if (loop && index === slides.length - cloneCount){
                    setTimeout(() => {
                        track.style.transition = "none";
                        index = 0;
                        track.style.transform = `translateX(0${unit})`;
                    }, 1000);
                }             
            }, delay);
        }
        function pauseAutoPlay(delay = 8000) {
            clearInterval(autoPlay);
            clearTimeout(restartTimer);
            restartTimer = setTimeout(() => {
                startAutoPlay();
            },delay);
        }
        return {startAutoPlay, pauseAutoPlay};
    }

    async function loadHomeSlideShow() {
        const track = document.getElementById("track");
        if (!track) return;

        const slides = await loadJSON("data/slideshow.json");

        track.innerHTML = slides.map(slide => `
            <section class="slide">
            ${ slide.link ?
                `<a href="${slide.link}">
                    <img src="images/slideShow/active/${slide.image}">
                </a>`
                : `<img src="images/slideShow/active/${slide.image}">`
            }
            </section>
        `).join("");
    }


//******** render function for product page
    const money = new Intl.NumberFormat('en-US', {style: 'currency',currency: 'USD'});
    function moneyFormat(value){
        return money.format(value);
    }
    function getProductPriceHtml(product){
        //watch discount
        var price = product["Price"];
        if(product["Brand"] === "brands-citizen") price = product["Retail"] * 0.75;
        
        const retail = moneyFormat(product["Retail"]);
        const sellingPrice = moneyFormat(price);
        const saved = moneyFormat(product["Retail"] - price);
        
        if (product["Retail"] > price) {
            return `
                <h3> Retail: ${retail} </h3>
                <h1> Price: ${sellingPrice}</h1>
                <h3> You Save: ${saved}</h3>
            `;
        } 
        if (product["Retail"] > 0){
            return `
                <h1> Price: ${retail}</h1>
            `;
        } 
        if (price > 0) {
            return `
                <h1> Price: ${sellingPrice}</h1>
            `;
        }
        return `
            <h1> Price Not Availible </h1>
        `;  
    }
    function getImageLibHtml(imageHtml, imageCount){
        if (imageCount > 3){//loads the image thumbnails below the main
            return `
                <span class="arrow" id="pLeft" style="transform: rotateY(180deg);">&nbsp&#10148;</span>
                    <div id="imgLibrary">
                        <div id="imgTrack">
                            ${imageHtml}
                        </div>
                    </div>
                <span class="arrow" id="pRight">&nbsp&#10148;</span>
            `;
        } 
        if (imageCount > 1) {
            return `
                <div id="imgTrack">
                    ${imageHtml}
                </div>       
            `;
        }
        return "";  
    }
    function getProductStatus(product) {
        if (product["Stock"] < 1) return "Out of Stock";
        return "In Stock";
    }

    function renderProductPage(product, container = document){
        const imgBar = container.querySelector("#imgBar");
        const images = (imageManifest[product["Item#"].toLowerCase()] || []).sort();

        let pTitle = container.querySelector("#page-title");
        if (pTitle) pTitle.textContent = "Roof Jewelers | "+product["Product Name"];

        container.querySelector("#productImg").src = "inventory/inventory-images/"+product["Product Image"];

        container.querySelector("#productName").textContent = product["Product Name"];
        container.querySelector("#descriptionScroll").textContent = product["Description"];
        container.querySelector("#priceDiv").innerHTML = getProductPriceHtml(product);

        const imageHtml = images.map(image => `
                <img class="pImg" src="inventory/inventory-images/${image}" onerror="this.src='images/img-placeholder.svg'">
            `
        ).join("");

        imgBar.innerHTML = getImageLibHtml(imageHtml, images.length);
        const imgInView = 3;
        
        initializeCarousel({
            'track': container.querySelector("#imgTrack"),
            'lbtn': container.querySelector("#pLeft"),
            'rbtn': container.querySelector("#pRight"),
            'slideWidth': 70,
            'unit': 'px',
            'loop': images.length > imgInView,
            'cloneCount': imgInView,
            'viewCount': imgInView,
            'container': container
        });

        container.querySelector("#itemID").textContent = "Item#: "+product["Item#"];
        container.querySelector("#availibility").textContent = "Availibility: "+getProductStatus(product);
        container.querySelector("#quantity").textContent = "Quantity: "+product["Stock"];
    }
//******** end product page fuctions *********/

//function for link standardization
function applyNavigation(navigation){ //primary use footer
    const elements = document.querySelectorAll("[data-navigation]");
        
    elements.forEach(element => {
        const id = element.dataset.navigation;
        const item = findByProperty(navigation, "id", id);      

        if(!item) return null;

        const href = buildLink(item);
        if(href) element.innerHTML = `<a href="${href}"> ${item.title} </a>`;      
    });  
}

function loadCopyright() {
    document.getElementById("copyright").innerHTML = `
        &#169; ${new Date().getFullYear()} Roof Jewelers. All Rights Reserved.
        `;
}

//page initilization functions
    /* load shared components */
    async function initializePage(){
        await generateJson();

        await loadHTML("header-placeholder", "header.html");

        await loadHTML("footer-placeholder", "footer.html");

        loadCopyright();

        document.getElementById("tabbar").innerHTML = createMenu(navigation);

        await setupExternalLinks();

        await applyConfig();
        await applyNavigation(navigation);

        document.querySelectorAll(".tabitem").forEach(tab => { //menudrop down direction
            tab.addEventListener("mouseenter", function(){
                const dropdown = this.querySelector(".dropdown");

                if(!dropdown) return;

                dropdown.classList.remove("left");

                const rect = dropdown.getBoundingClientRect();

                if(rect.right > window.innerWidth) dropdown.classList.add("left");
            });

        });
        document.querySelectorAll(".dropdownitem").forEach(item => { //submenu dropdown dirrection
            item.addEventListener("mouseenter", function(){
                const sub = this.querySelector(".subdropdown");

                if(!sub) return;

                sub.classList.remove("left");

                if(sub.getBoundingClientRect().right > window.innerWidth) sub.classList.add("left");
            });

        });

        const searchBar = document.getElementById("searchBar");
        var firstFocus = true;
        searchBar.addEventListener("focus",
            function(){
                if(firstFocus){
                    searchBar.select();
                    firstFocus = false;
                }
            }
        );
        searchBar.addEventListener("blur",
            function(){
                firstFocus = true;
            }
        );

        await getFeaturedInventory();

        renderFeaturedProducts();

        laodQuickViewHtml();
        quickViewBtnListners();

        await initializeSearch();

        const path = window.location.pathname;
        if (path.endsWith("index.html") || path === "/") {
            sessionStorage.removeItem("minPrice");
            sessionStorage.removeItem("maxPrice");
        }

        document.body.style.opacity = "1"; /* allows fade into website */
    }
    /* load info pages */
    const infoPageContent = {//info page code stored as a callable array 
            "jewelry-repair": `
                    <h1>Jewelry Repair</h1>
                    <div class="infobox">
                        <p>
                            As experts in jewelry repair, we at Roof Jewelers can fix all types of jewelry. 
                        </p>
                        <p>
                            We can repair chains, size rings, retip prongs, replace prongs, replace missing stones, 
                            set new stones, solder rings together, or basically weld or solder any small item in need 
                            of repair. Common ring repairs include basic sizing, adding a ring guard to make a ring 
                            smaller without changing its original shape, replacing a worn shank and repairing the 
                            prongs by retipping or replacement. We can also remount or restyle your existing ring 
                            to create a more modern look. 
                        </p>
                        <p>
                            Do you have a strand of pearls that needs to be restrung? Bring it to us!
                        </p>
                        <p>
                            Other repairs we typically perform: 
                        </p>
                            <ul>
                                <li>Replace posts on earrings</li>
                                <li>Convert earrings from post to clip-on, or from clip-on to post</li>
                                <li>Replace Omega backs or any type of ear wire</li>
                                <li>Rebuild hinges in bracelets and watches</li>
                                <li>Fix or replace broken catches</li>
                                <li>Engraving</li>
                            </ul>
                        
                        <h3>Notice for Hollow Jewelry Repairs:</h3>
                        <p>
                            Given the fragile nature of hollow jewelry we do not guarantee repairs made to certain 
                            pieces of hollow jewelry.
                        </p>
                    </div>
            `,
            "brands": `
                <h1>Brands We Carry</h1>
                <div class="infobox">
                    <ul>
                        <li><a href="/catalog.html?slug=citizen"> Citizen </a></li>
                        <li><a href="/catalog.html?slug=classic-of-new-york"> Classic of New York </a></li>
                        <li> Goldman Wedding Bands </li>
                        <li> Hadley-Roma Watch Bands </li>
                        <li> Inox - Men's Jewelry </li>
                        <li><a href="/catalog.html?slug=kiddie-kraft"> Kiddie Kraft </a></li>
                        <li><a href="/catalog.html?slug=lafonn"> Lafonn </a></li>
                        <li><a href="https://www.rembrandtcharms.com/" target="_blank"> Rembrandt Charms </a></li>
                        <li><a href="/catalog.html?slug=royal-chain"> Royal Chain </a></li>
                        <li><a href="/catalog.html?slug=southern-gates"> Southern Gates </a></li>
                        <li><a href="/catalog.html?slug=thorsten-rings"> Thorsten Rings </a></li>
                    </ul>                    
                </div>
            `,
            "about-us": `
                    <h1>About Us</h1>
                    <div class="infobox">
                        <p>
                            Family owned since 1943, Roof Jewelers is an integral part of the community; 
                            we get to know our customers and pride ourselves on providing the best in personal service.
                        </p>
                        <h2>History</h2>
                        <p>
                            Founded by Albert Roof in 1943 Roof Jewelers opened its first location on Taylor street in down 
                            town Columbia, SC, though our story dates back a little more, starting as a watch repair shop in 
                            the corner of his father's dry goods store Al Roof eventually grew the business enough to open 
                            his own store. Second generation, Bill Roof, ran the stores until March of 2017. Eighty plus 
                            years and four generations later, we're a full service jewelry store and still in the Roof family. 
                            Al's grandson, William, has worked in the store since 1980 and now runs the store with his son 
                            Alex (since 2020).
                        </p>
                        <p>
                            William is a qualified jeweler with the following specialized training and designations:
                        </p>
                            <ul>
                                <li>Graduate Gemologist, Gemological Institute of America (GIA)</li>
                                <li>Certified Laserstar Laser Welding Technician</li>
                                <li>GIA Certification for Pearls</li>
                            </ul>
                        <p>
                            We honor our legacy by providing some of the best jewelry and custom design work available.
                        </p>
                    </div>
            `,
            "loose-stones": `
                    <h1>Loose Diamonds</h1>
                    <div class="infobox">
                        <p>
                            Do you have a mounting and are looking for a diamond to go in it? At Roof Jewelers we have a 
                            large assortment of loose diamonds and other stones you can choose from; for more information on our 
                            currently available selection stop by our showroom at <span data-config="store-address"></span> or give us a call at <span data-config="store-phone"></span>.
                        </p>
                        <img src="images/certified-loose-diamonds-header.jpg" alt="" id="loose-stones-flyer">
                    </div>
            `,    
            "watch-repair": `
                    <h1>Watch Repair</h1>
                    <div class="infobox">
                        <ul>
                            <li>Battery Replacement</li>
                            <li>Watch Bands - Repair, Replace, Adjust</li>
                        </ul>
                        <h2>Battery Replacement</h2>
                        <p>
                            If it takes a button/coin battery, we can do it! Watches, key fobs, anything! 
                            Don't worry, if we don't carry your brand of watch, we can still put a new battery in!
                        </p>
                        <p>
                            There are two programs from which to choose: 
                        </p>
                            <ol>
                                <li>
                                    Better battery replacement: $20.00. We replace the battery and offer a one year warranty. 
                                    Should the battery fail at any time during the year period, we will replace it at no charge. 
                                    Lithium batteries are $20.00 without a warranty.
                                </li>
                                <li>
                                    Best battery replacement: $50.00. We replace the battery and offer a five year warranty. 
                                    Should the battery fail at any time during the five year period, we will replace it at no 
                                    charge.
                                </li>
                                <li>
                                    Alternatively, you may request a battery without a warranty: $15.00
                                </li>
                            </ol>
                        <p>
                            How does this work? We place a small sticker inside the watch with the date and the length of the 
                            warranty and supply you with as many batteries as you need during the warranty period; applies only 
                            to the watch with the warranty. 
                        </p>
                        <h3>Notice</h3>
                        <p>
                            Notice: There may be an added service charge for watch with screws in the back, battery straps, 
                            or for setting complicated watches (ie. digital or perpetual calendar watches).
                        </p>
                    </div>
            `,
            "class-rings": `
                    <h1>Class Rings</h1>
                    <div class="infobox">
                        <P>
                            Class rings are an important part of the school experience. At Roof Jewelers, we offer 
                            an exceptional value in class rings. With a highly customizable catalog to choose from you 
                            can pick out the perfect ring and have it on your hand very quickly!
                        </P>
                        <p>
                            To view a full catalog of available styles and designs stop by our showroom at 
                            <span data-config="store-address"></span>, <span data-config="store-city-state"></span>.                       
                        </p>
                        <img src="images/classringsrev.jpg" alt="">
                        <img src="images/classrings_001rev.jpg" alt="">
                        <img src="images/classrings_002rev.jpg" alt="">
                    </div>
            `,
            "store-hours": `
                    <h1>Store Hours</h1>
                    <div class="infobox">
                        <h2>Regular Hours</h2>
                            <ul>
                                <li>Monday - Friday | 10:00am - 6:00pm</li>
                                <li>Saturday | 10:00am - 1:00pm</li>
                                <li>Closed Sunday</li>
                            </ul>                    
                        <h2>Holiday Hours (Thanksgiving - Christmas)</h2>
                            <ul>
                                <li>Monday - Saturday | 10:00am - 6:00pm</li>
                                <li>Closed Sunday</li>
                            </ul>
                        <h2>Summer Hours (June, July & August)</h2>
                            <ul>
                                <li>Tuesday - Friday | 10:00am - 6:00pm</li>
                                <li>Closed Saturday, Sunday and Monday</li>
                            </ul>
                    </div>
            `,
            "faq": `
                <h1>Frequently Asked Questions</h1>
                <div class="infobox">
                    <h3>Do we repair jewelry?</h3>
                    <p>
                        Yes we do, and if you would like more information on the different repair and service options 
                        we offer see the Services & Repair tab in the navigation menu above.
                    </p>
                    <h3>Do we carry watches?</h3>
                    <p>
                        Yes, we carry Citizen brand watches.
                    </p>
                    <h3>Do we buy gold?</h3>
                    <p>
                        Yes, we buy gold, silver and platinum items for their scrap value.
                    </p>
                </div>
            `,
            "financing-options": `
                <h1>Financing Options</h1>
                <div class="infobox">
                    <h2>Snap Finance:</h2>
                    <p> Getting Started </p>
                    <ul>
                        <li>Apply: Text 56837 to 48078</li>
                        <li>Get Approved: Receive a decision in seconds, with approval amounts up to $5,000</li>
                        <li>Shop: Use your approved amount to take home what you need today!</li>
                    </ul>
                        
                    <p> To Apply, You Must </p>
                    <ul>
                        <li>Be at least 18 years of age</li>
                        <li>Have a monthly income of $750 or more</li>
                        <li>Have an active checking account (May need a credit/debit card to apply)</li>
                        <li>Have a valid email address and phone number</li>
                    </ul>
                    
                    <h2>In-Store Lay-A-Way</h2>
                    <p>
                        Shopping early for a gift a few months away but don't want it to be found before that special day? 
                        Use our convenient In-Store Lay-A-Way service to have your item saved for you for up to 90 days 
                        while you make weekly or monthly payments on the item until its yours.
                    </p>
                    <ul>
                        <li>Down payment: 25% or $25 whichever is greater.</li>
                        <li>Remaining balance is divided into three equal monthly payments; installments may be made more often.</li>
                        <li>Deposits on lay-a-way items are non-refundable after 10 days but may be used as store credit.</li>
                        <li>Merchandise will be returned to stock after 90 days, however any payments will remain as store credit.</li>
                        <li>Money may be forfeit after an extended period of time.</li>
                    </ul>                  
                </div>
            `,
            "services-and-repair": `
                <h1>Services & Repair Options</h1>
                <div class="infobox">
                    <ul>
                        <li><span data-navigation="services-and-repair-financing"></span></li>
                        <li><span data-navigation="services-and-repair-jewelry-repair"></span></li>
                        <li><span data-navigation="services-and-repair-jewelry-care"></span></li>
                        <li><span data-navigation="services-and-repair-watch-repair"></span></li>                                
                    </ul>                    
                </div>
            `
    }
    async function initializeInfoPage(){
        const params = getParams();
        const lslug = params.get("lslug");

        const category = findByProperty(navigation, "lslug", lslug);

        if(!category) {
            window.location.href = "404page.html";
            return;
        }

        document.getElementById("infocontainer").innerHTML = infoPageContent[lslug] || "";
        applyNavigation(navigation);
        renderInfoPage(category);
    }   
    //functions to populate the catalog page
    async function initilalizeCatologPage(){

        const slug = getParams().get("slug");
        const category = findByProperty(navigation, "slug", slug);
        const depthTrail = trackCategoryPath(navigation, slug);

        const search = getParams().get("search") || "";
        const pageParam = getParams().get("page");

        currentCatalogPage = pageParam !== null ? parseInt(pageParam) : null;

        const searchBar = document.getElementById("searchBar");

        if(!category) {
            window.location.href = "404page.html";
            return;
        }

        //sets page title, meta descriptions and content header
        await renderCatalogPage(category);

        //sub header function calls
        await renderCategoryPath(depthTrail);
        await getSubCategories(category);

        //catalog display function calls
        await initilalizeCatolog();  
        await renderAtributeTab();

        if (searchBar) {
            searchBar.value = search || "";
            if(search) runSearch();
        }
    }
    //function to load product page
    async function initializeProductPage(){
        const params = getParams();

        const itemNum = params.get("item");
        const page = params.get("page");
        currentCatalogPage = page;

        categorySlug = params.get("category");

        var depthTrail = trackCategoryPath(navigation, categorySlug);

        if (depthTrail === null) { //used for loading depthtrail of featured items
            categorySlug = findByProperty(navigation, "id", categorySlug);
            depthTrail = trackCategoryPath(navigation, categorySlug.slug);
        }

        const product = findByProperty(inventory, "Item#", itemNum);

        if (depthTrail !== null) renderCategoryPath(depthTrail);

        renderProductPage(product);
        renderFeaturedProducts();
    }
