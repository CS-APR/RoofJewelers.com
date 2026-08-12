//Coded by APR

import { inventory, data, page, getParams, findByProperty } from "./state.js";

import { initializeCarousel, getProductStatus, renderProductPage } from "./main.js";

import { renderCategoryPath, getSubCategories, trackCategoryPath,
        loadCategoryDescription, moneyFormat } from "./ui.js";

import { runSearch, rebuildActiveInventory, getCurrentInventory} from "./search.js";

import { getDiscount, addCartListners } from "./cart.js";

//******* functions to get the catalog/featured inventory ********/
    export function getCategoryInventory(){ //gets the items specific to the category
        const slug = getParams().get("slug");
        const category = findByProperty(data.navigation, "slug", slug);

        if(!category) {
            window.location.href = "404page.html";
            return;
        }

        inventory.catInventory = inventory.inventory.filter(item => 
            (getProductCategory(item, category.id) && !item.Hidden) ||
            (item.Brand === category.id)
        );        
        
        searchCategoryInventory(category.children);
        inventory.activeInventory = inventory.catInventory;
        console.log("fetching cat inv", inventory.activeInventory);
    }
    export function searchCategoryInventory(category){//recursive function to load category inventory to include items in children
        if (!category) return;

        for(const child of category) {
            for (const item of inventory.inventory){
                if(getProductCategory(item, child.id)) inventory.catInventory.push(item);
            }
            searchCategoryInventory(child.children);
        } 
    }
    export function getFeaturedInventory(){//gets the items in inventory marked as featured
        inventory.featuredInventory = inventory.inventory.filter(item => item.Featured);
        return inventory.featuredInventory.length;
    }
//******* end of functions to get the catalog/featured inventory ********/

//functions for the use of the attribute side bar
    export function getSortedInventory(resetPage){
        if (resetPage) page.currentPage   = 1;

        const priceChecked = [...document.querySelectorAll(".sortPrice:checked")];
        const viewChecked = [...document.querySelectorAll(".sortView:checked")];
        const filterPool = getCurrentInventory();

        if (priceChecked.length === 0 &&
                viewChecked.length === 0) {//show everything 
            inventory.sortedInventory = [...filterPool];
        } else {
            console.log("getting sorted");
            inventory.sortedInventory = filterPool.filter(item => {
                const priceMatch = priceChecked.length === 0 || priceChecked.some(box => {
                    const min = Number(box.dataset.min) || 0;
                    const max = box.dataset.max ? Number(box.dataset.max) : Infinity;
                    return isItemInRange(item, min, max);
                });

                const viewMatch = viewChecked.length === 0 || viewChecked.some(box => {
                    return isItemInStock(item);
                });

                return priceMatch && viewMatch;
            });
        } //end else

        rebuildActiveInventory();
    }

    export async function renderAtributeTab(){ //loads the html for the attribute side tab
        const price = document.getElementById("price-sort");
        if (!price) return false;

        const view = document.getElementById("view-sort");
        const tab = document.getElementById("attribute-content");

        view.innerHTML = `
            <fieldset>
                <legend> Sort by Availability </legend>

                <div class="viewOption">
                    <input type="checkbox" class="sortView" id="inStock">
                    <label for="inStock"> In-Stock </label>
                </div>
            </fieldset>
        `;
        
        price.innerHTML = `
            <fieldset>
                <legend> Sort by price </legend>

                <div>
                    <input type="checkbox" class="sortPrice" id="0to100"
                        data-min="0" data-max="100">
                    <label for="0to100"> $0 to $100 </label>
                </div>
                <div>
                    <input type="checkbox" class="sortPrice" id="100to500"
                        data-min="100" data-max="500">
                    <label for="100to500"> $100 to $500 </label>
                </div>
                <div>
                    <input type="checkbox" class="sortPrice" id="500to1000"
                        data-min="500" data-max="1000">
                    <label for="500to1000"> $500 to $1000 </label>
                </div>
                <div>
                    <input type="checkbox" class="sortPrice" id="1000to5000"
                        data-min="1000" data-max="5000">
                    <label for="1000to5000"> $1000 to $5000 </label>
                </div>
                <div>
                    <input type="checkbox" class="sortPrice" id="5000up"
                        data-min="5000">
                    <label for="5000up"> $5000+ </label>
                </div>
            </fieldset>
        `;     
        checkListeners("sortPrice");
        checkListeners("sortView");
    }
    export function isItemInRange(item, min = 0, max = Infinity){
        const price = getDiscount(item);

        return price >= min && price <= max;
    }
    export function isItemInStock(item) {
        return item.Stock > 0;
    }
    export function checkListeners(className) {
        console.log("appliing listner to sort");
        document.addEventListener("change", event =>{
            console.log("sorting");
            if (!event.target.classList.contains(className)) return;
            page.resetPage = true;
            getSortedInventory(page.resetPage);
        });
    }

//end of attribute side bar specific functions

//******** catalog page functions *********/
    function getProductCategory(product, categoryId){
        return (product.Category || []).includes(categoryId);
    }

    export function updateValues(inventoryArray){ //products vissible in a category
        if(page.currentCatalogPage != null){
            page.currentPage   = page.currentCatalogPage;
            page.currentCatalogPage = null;
        }
        data.start = (page.currentPage   - 1)*data.displayCount;
        data.end = page.currentPage  *data.displayCount;
        inventory.visibleProducts = inventoryArray.slice(data.start,data.end);
        page.pageCount = Math.ceil(inventoryArray.length/data.displayCount);
    }  

    export function pageClicks(event){ //updates catalog display when page bar is interacted with
        if(event.target.id === "prev"){
            if (page.currentPage   != 1) {
                page.currentPage  --;
                requestPage(page.currentPage  );
            }
        }
        else if(event.target.id === "next"){
            if (page.currentPage   != page.pageCount) {
                page.currentPage  ++;
                requestPage(page.currentPage  );
            }
        }
        else if(event.target.classList.contains("pageNumbers")){
            page.currentPage   = parseInt(event.target.textContent);
            requestPage(page.currentPage  );
        }
    }
    export function displayChange(event){ //updates ammount of items shown when display count is changed
        if (event.target.id === "showcount"){
            data.displayCount = parseInt(event.target.value);
            page.currentPage   = 1;
            updateCatalogContent();
        }
    }
    export function attachListeners(){ //add the listner functions to the proper buttons
        document.addEventListener("click", pageClicks);
        document.addEventListener("change", displayChange);
    }

    export async function initilalizeCatolog(){ //runs functions for the catolog page
        await getCategoryInventory(); //gets category specific inventory
        rebuildActiveInventory(); //sets active inventory
        attachListeners(); //attches listners to pagebar and display count
    }

    //catalog display settings
    export function renderSettings(inventoryArray){ //sort bar, product count, display option count
        if (inventoryArray.length > 0) data.start+=1;
        var html = `
            <div id="productCount">
                <p><strong>Products</strong> ${data.start}-${Math.min(data.end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p> 
            </div>
            <div class="dropdown-container">
                <p>Show: </p>
                <select id="showcount">
                    <option value="${data.base*1}" ${data.displayCount === data.base*1 ? "selected" : ""}> ${data.base*1} Per Page </option>
                    <option value="${data.base*2}" ${data.displayCount === data.base*2 ? "selected" : ""}> ${data.base*2} Per Page </option>
                    <option value="${data.base*3}" ${data.displayCount === data.base*3 ? "selected" : ""}> ${data.base*3} Per Page </option>
                    <option value="${data.base*4}" ${data.displayCount === data.base*4 ? "selected" : ""}> ${data.base*4} Per Page </option>
                </select>
            </div>
        `;
        
        document.getElementById("content-settings").innerHTML = html;
    }

    //quick view functions
    export function quickViewBtnListners(){
        document.addEventListener("click", function(event){
            if (!event.target.classList.contains("quickViewBtn")) return;

            const itemNumber = event.target.dataset.item;
            const product = findByProperty(inventory.inventory, "Item#", itemNumber);
            const container = document.getElementById("quickViewWindow");

            renderProductPage(product, container, true);

            document.getElementById("quickViewContainer").hidden = false;
        });

        const overlay = document.getElementById("quickViewContainer");
        if (overlay) {
            overlay.addEventListener("click", function(event){
                if (event.target === overlay || event.target.id === "closeQuickView") overlay.hidden = true;
            });
        }
    }
    export function loadProductViewHtml(container, quickview = false, product){
        //let qvContainer = document.getElementById("quickViewContainer");
        console.log(container);
        if(!container) return;
        var html = `
                <div id="productContainer">
                    ${quickview ? `<button id="closeQuickView">&times;</button>` : ""}
                    <div id="productInfo">
                        <div id="name">
                            <h1 id="productName"></h1>
                        </div>
                        <div id="image"> 
                            <img id="productImg" src="" onerror="this.src='images/img-placeholder.svg'">
                            ${!quickview ? `<div id="imgBar"></div>` : ""}
                        </div>
                        <div id="namePrice">
                            ${!quickview ? 
                            `<h3>Description:</h3>                   
                            <div>
                                <p id="descriptionScroll"></p>
                            </div>` : ""
                            }            
                            <div id="priceDiv"></div>
                        </div>
                        <div id="addCartList">
                            <div id="cartRow">
                                ${product["Stock"] > 0 && ((product["Price"] || product["Retail"]) > 0) ?
                                    `<div class="quantityControls">
                                        <label class="qLabel">Quantity:</label>
                                        <button class="decrease">-</button>
                                        <span class="cartQuantity">1</span>
                                        <button class="increase">+</button>
                                    </div>` : ""
                                }
                                ${product["Stock"] > 0 && ((product["Price"] || product["Retail"]) > 0) ?
                                    `<button id="addToCart">Add to Cart</button>` : ""
                                }
                            </div>
                            <button id="addToWish">Add to Wishlist</button>
                            ${quickview ? `
                                <a href="productPage.html?item=${product["Item#"].trim()}&category=${product["Category"]}&page=${page.currentPage  }">
                                    <button id="viewFull">View Product</button>
                                </a>` : ""}
                        </div>
                    </div>
                    <div id="productStatus">
                        <h3 id="itemID"></h3>
                        <br>
                        <h3 id="availibility"></h3>
                        <h3 id="quantity"></h3>
                    </div>
                </div>
        `;

        container.innerHTML = html;
        addCartListners(container, product);
    }

    export function renderProductCards(products, containerId, featured = false){ //pulls product img, name and price to a card for display
        console.log("attempting cards");
        console.log(products);
        var html = "";

        //fade content out
        const container = document.getElementById(containerId);
        if (!container) return;
        container.style.opacity = "0";

        const slug = getParams().get("slug");

        for (const item of products){
            let price = getDiscount(item);

            if (price <= 0) item.Retail <= 0 ? price = "Price Not Available" : price = item.Retail;

            if (typeof(price) != "string") price = moneyFormat(price);

            const href = featured
                ? `productPage.html?item=${item["Item#"]}&category=${item["Category"]}`
                : `productPage.html?item=${item["Item#"]}&category=${slug}&page=${page.currentPage  }`;

            let ribbonText = "";
            let ribbonClass = "ribbon";
            if (getProductStatus(item) == "Out-of-Stock") {
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

    export function loadFeaturedHtml(){
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
    export function loadFeaturedButtons(){
        if (!document.getElementById("featured-track")) return;

        const track = document.getElementById("featured-track").children;
        var html = "";
        if (track.length > 4) {
            html = `
                <span class="arrow" id="fLeft" style="transform: rotateY(180deg);">&nbsp&#10148;</span>
                <span class="arrow" id="fRight">&nbsp&#10148;</span>
            `;
        }
        document.getElementById("button-track").innerHTML = html;
    }
    export function renderFeaturedProducts(){
        const cardWidth = window.innerWidth <= 500 ? 185 /* 175 + gap */ : 270;
        const cardView = window.innerWidth <= 500 ? 2 : 4;

        loadFeaturedHtml();
        renderProductCards(inventory.featuredInventory, "featured-track", true);
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
    export function getPageNumberButton(targetPage){
        return `<div class="pageNumbers ${targetPage === page.currentPage ? "currentPage" : ""}"> ${targetPage} </div>`;
    }
    export function renderPageBar(){// page navigation for categories
        const pageBar = document.getElementById("pageBar");

        pageBar.innerHTML = "";

        const mobile = window.innerWidth <= 500;

        const maxPageView = mobile ? 3 : 7;
        const edgePages = mobile ? 1 : 2;
        const middlePages = mobile ? 1 : maxPageView - edgePages;

        if (page.pageCount <= 1) return;

        var html = "";
       
        //fist two page buttons
        html += ` <div id="prev"> < Prev </div> `;
        if (page.pageCount <= maxPageView) {
            for (var i = 1; i <= page.pageCount; i++) html += getPageNumberButton(i);
        } else {
            for (var i = 1; i <= edgePages; i++) html += getPageNumberButton(i);
        }
            
        if (page.pageCount > maxPageView){
            var startMiddle, endMiddle;

            /* near beginning */
            if(page.currentPage   <= edgePages + 1){
                startMiddle = edgePages + 1;
                endMiddle = edgePages + middlePages;
            }

            /* near end */
            else if(page.currentPage   >= page.pageCount - edgePages){
                startMiddle = page.pageCount - middlePages - edgePages + 1;
                endMiddle = page.pageCount - edgePages;
            }

            /* middle */
            else{
                const half = Math.floor(middlePages / 2);
                startMiddle = page.currentPage   - half;
                endMiddle = startMiddle + middlePages - 1;

                if (startMiddle < edgePages + 1){
                    startMiddle = edgePages + 1;
                    endMiddle = startMiddle + middlePages - 1;
                }
                if (endMiddle > page.pageCount - edgePages){
                    endMiddle = page.pageCount - edgePages;
                    startMiddle = endMiddle - middlePages + 1;
                }
            }

            //elipse once deep enough into pages
            if (startMiddle > edgePages + 1) html += ` <div>...</div> `;
    
            //sliding middle
            for (var j = startMiddle; j <= endMiddle; j++) html += getPageNumberButton(j);
            
            //elispse when not too deep
            if (endMiddle < page.pageCount - edgePages) html += ` <div>...</div> `;
            
            //back edge buttons
            for (var i = page.pageCount - edgePages + 1; i <= page.pageCount; i++) html += getPageNumberButton(i);
        }

        //next button
        html += ` <div id="next">Next ></div> `;
        document.getElementById("pageBar").innerHTML = html;       
    }

    //render
    export function renderProducts(){
        console.log("redering products");
        console.log(inventory.visibleProducts);
        renderProductCards(inventory.visibleProducts, "product-content");
    }

    export function renderCatalogPage(category){//loads category page subheader
        document.getElementById("cat-name").textContent = category.title;
        loadCategoryDescription(category);

        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }

    export function renderCatalog(inventoryArray){
        console.log("rendering catalog", inventoryArray);
        renderSettings(inventoryArray);
        renderProducts();
        renderPageBar();
    }

    //update functions
    export function updateSettings(inventoryArray){
        var html = `<p><strong>Products</strong> ${data.start +1}-${Math.min(data.end, inventoryArray.length)} of <strong>${inventoryArray.length}</strong></p>`;
        document.getElementById("productCount").innerHTML = html;
    }   
    export function updateCatalogContent(){
        updateValues(inventory.activeInventory);
        renderProducts();
        renderPageBar();
        updateSettings(inventory.activeInventory);
    }

    export async function requestPage(tartgetPage){ //prevents page lag from spam requests
        if (page.isRendering) page.pendingPage = tartgetPage;
        else {
            page.isRendering = true;
            page.currentPage = tartgetPage;
            await updateCatalogContent();
            while (page.pendingPage != null) {
                page.currentPage = page.pendingPage;
                page.pendingPage = null;
                await updateCatalogContent();
            }
            page.isRendering = false;
        }
    }
//********* end of catalog page functions *********/

    export async function initilalizeCatologPage(){

        const slug = getParams().get("slug");
        const category = findByProperty(data.navigation, "slug", slug);
        const depthTrail = trackCategoryPath(data.navigation, slug);

        const search = getParams().get("search") || "";
        const pageParam = getParams().get("page");

        page.currentCatalogPage = pageParam !== null ? parseInt(pageParam) : null;

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