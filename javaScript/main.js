//Coded by APR 2026

import { moneyFormat, showToast, applyNavigation, renderCategoryPath, 
        trackCategoryPath } from "./ui.js";

import { shopping, inventory, data, page,
        findByProperty, buildLink, getParams } from "./state.js";

import { removeCartList, moveToList, moveToCart, cartQuantityAdj, 
        figureTotal, addToCartList, updateCartCount, loadCart,
        loadWishlist, loadCartDisplay, getDiscount, addCartListners,
        cartItemListner, closeCart, initializeCart } from "./cart.js";

import { closeAccount, initializeAccount } from "./account.js";

import { closeSearch, initializeSearch } from "./search.js";

import { initilalizeCatologPage, getFeaturedInventory, renderFeaturedProducts,
        quickViewBtnListners, loadProductViewHtml } from "./catalog.js";

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
        data.navigation = await loadJSON("data/navigation.json");
        inventory.inventory = await loadJSON("data/inventory.json"); //all inventory
        data.CONFIG = await loadJSON("data/config.json");
        data.imageManifest = await loadJSON("data/imageManifest.json");
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
            html += loadSearchNav();
            html += loadCartNav();
            html += loadAccountNav();    
        }

        return html;
    }

    function loadSearchNav() {
        return `
            <div class="tabitem">
                <div id="search"> 
                    <span> &#8981 </span> 
                        
                    <div id="searchBox">
                        <div> <input type="text" placeholder="Search" id="searchBar"></div>
                        <div id="execute"> Go </div>
                    </div>
                </div>             
            </div>
        `;
    }
    function loadCartNav() {
        return `
            <div class="tabitem">
                <div id="cartButton">
                    <svg id="cartIcon" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 
                        12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 
                        1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 
                        8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" 
                        clip-rule="evenodd" />
                    </svg>
                    <div id="cartCount"></div>
                    <div id="cartNavBox">
                        <a href="cart.html">View Cart</a>
                        <a href="wishlist.html">View Wishlist</a>
                    </div>
                </div>
            </div>
        `;
    }
    function loadAccountNav(){
        return `
            <div class="tabitem">
                <div id="accountButton">
                    <svg id="accountIcon" viewBox="0 0 24 24">
                        <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 
                        8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 
                        0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
                    </svg>
                    <div id="accountBox">
                        <div>Signed out</div>
                        <div></div>
                    </div>
                </div>
            </div>
        `;
    }

//functions for the use of config.json file
    function applyConfig(){
        const elements = document.querySelectorAll("[data-config]");

        elements.forEach(element => {
            const key = element.dataset.config;

            if(data.CONFIG[key]) element.textContent = data.CONFIG[key];       
        });

        const links = document.querySelectorAll("[data-config-link]");

        links.forEach(link => {
            const key = link.dataset.configLink;

            if(data.CONFIG[key]) link.href = data.CONFIG[key];
        });
    }

// render page functions
    
    function renderInfoPage(category){
        document.getElementById("page-title").textContent = "Roof Jewelers | " + category.title;
        document.querySelector('meta[name="description"]').content = category.description;
    }

//catalog page subheader funtions
    //functions for treepath
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

//catalog page inventory display functions

//********* generic carousel **********/
    export function initializeCarousel({track, lbtn, rbtn, slideWidth, unit, loop = false, cloneCount, viewCount, container = document}){
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
            if (!loop) return;
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
            if (!loop) return;
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

    function getProductPriceHtml(product){
        const price = getDiscount(product);
        
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
    export function getProductStatus(product) {
        if (product["Stock"] < 1) return "Out-of-Stock";
        return "In Stock";
    }

    export function renderProductPage(product, container = document, showclose = false){
        if (product == null) return;
        loadProductViewHtml(container, showclose, product);

        if (product["Stock"] < 2) {
            if (container.querySelector(".quantityControls")) container.querySelector(".quantityControls").hidden = true;
            container.querySelector("#addCartList").classList.add("stackButtons");
        }
        
        const imgBar = container.querySelector("#imgBar");
        const images = (data.imageManifest[product["Item#"].toLowerCase()] || []).sort();

        let pTitle = document.querySelector("#page-title");
        if (pTitle && !showclose) pTitle.textContent = "Roof Jewelers | "+product["Product Name"];

        container.querySelector("#productImg").src = "inventory/inventory-images/"+product["Product Image"];

        container.querySelector("#productName").textContent = product["Product Name"];
        if (container.querySelector("#descriptionScroll"))
            container.querySelector("#descriptionScroll").textContent = product["Description"];
        container.querySelector("#priceDiv").innerHTML = getProductPriceHtml(product);

        const imageHtml = images.map(image => `
                <img class="pImg" src="inventory/inventory-images/${image}" onerror="this.src='images/img-placeholder.svg'">
            `
        ).join("");

        if (imgBar) imgBar.innerHTML = getImageLibHtml(imageHtml, images.length);
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

        document.getElementById("tabbar").innerHTML = createMenu(data.navigation);

        await setupExternalLinks();

        await applyConfig(); 
        await applyNavigation(data.navigation);

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

        renderProductPage(null, document.getElementById("quickViewWindow"));
        quickViewBtnListners();

        await initializeSearch();
        await initializeAccount();
        await initializeCart();

        loadCart();
        loadWishlist();
        updateCartCount();
        const close = document.getElementById("toastClose");
        if (close) {
            close.addEventListener("click", () => {
                document.getElementById("toast").hidden = true;
                clearTimeout(toastTimer);
            });
        }

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
        const lslug = getParams().get("lslug");

        const category = findByProperty(data.navigation, "lslug", lslug);

        if(!category) {
            window.location.href = "404page.html";
            return;
        }

        document.getElementById("infocontainer").innerHTML = infoPageContent[lslug] || "";
        applyNavigation(data.navigation);
        renderInfoPage(category);
    }   

    //function to load product page
    async function initializeProductPage(){
        const params = getParams();

        const itemNum = params.get("item");
        const paramPage = params.get("page");
        page.currentCatalogPage = paramPage;

        data.categorySlug = params.get("category");

        var depthTrail = trackCategoryPath(data.navigation, data.categorySlug);

        if (depthTrail === null) { //used for loading depthtrail of featured items
            data.categorySlug = findByProperty(data.navigation, "id", data.categorySlug);
            depthTrail = trackCategoryPath(data.navigation, data.categorySlug.slug);
        }

        const product = findByProperty(inventory.inventory, "Item#", itemNum);

        if (depthTrail !== null) renderCategoryPath(depthTrail);

        renderProductPage(product, document.getElementById("productSuperContainer"));
        renderFeaturedProducts();
    }

//loads pages on start up
    document.addEventListener("DOMContentLoaded", async () => {
        await initializePage();

        const path = window.location.pathname;

        if (getParams().get("slug")) {
            await initilalizeCatologPage();
            
            const sideTab = document.getElementById("side-tab");

            document.getElementById("tab-handle").onclick = function(event){
                event.stopPropagation();
                sideTab.classList.toggle("open");          
            };
            document.addEventListener(
                "click", function(event){
                    if( !sideTab.contains(event.target) ) sideTab.classList.remove("open");  
                }
            );
            return;
        } 
        if (getParams().get("lslug")) {
            await initializeInfoPage();
            return;
        }
        if (getParams().get("item")) {
            await initializeProductPage();
            return;
        }

        if (path.endsWith("index.html")) {
            await loadHomeSlideShow();        
            const carousel = initializeCarousel({
                'track': document.getElementById("track"),
                'lbtn': document.getElementById("left"),
                'rbtn': document.getElementById("right"),
                'slideWidth': 100,
                'unit': '%',
                'loop': true,
                'cloneCount': 1,
                'viewCount': 1
            });
            carousel.startAutoPlay();
        }

        if (path.endsWith("wishlist.html")) {
            loadCartDisplay();
            cartItemListner();
        }

        if (path.endsWith("cart.html")) {
            loadCartDisplay();
            cartItemListner();
            figureTotal();
        }
    
    });