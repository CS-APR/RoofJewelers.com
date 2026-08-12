// Coded by APR

import { inventory, page, data, getParams, findByProperty } from "./state.js";

import { updateValues, renderCatalog, renderAtributeTab } from "./catalog.js";

import { closeAccount } from "./account.js";
import { closeCart } from "./cart.js";

    export function closeSearch() {
        document.getElementById("searchBox")?.classList.remove("open");
    }

    export function initializeSearch(){
        const search = document.getElementById("search");
        const searchBox = document.getElementById("searchBox");
        const execute = document.getElementById("execute");
        const searchBar = document.getElementById("searchBar");

        if(!search || !searchBox) return;

        search.onclick = function(event){
            event.stopPropagation();
            closeAccount();
            closeCart();
            searchBox.classList.toggle("open");
        };

        document.addEventListener("click",
            function(){ 
                closeAccount();
                closeSearch();
                closeCart()
            }
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

    export function runSearch(){ //main function to search through inventory
        const slug = getParams().get("slug");
        const category = findByProperty(data.navigation, "slug", slug);
        const catName = document.getElementById("cat-name");

        if(!slug){
            window.location.href =
                "catalog.html?slug=showroom&search=" +
                encodeURIComponent(getSearchPrompt());
            return;
        }

        const prompt = getSearchPrompt();

        inventory.sortedInventory = null;
        inventory.searchResults = null;
        page.currentPage = 1;//reset page

        if (prompt.trim() === "") {//when empty search is run
            rebuildActiveInventory();
            renderAtributeTab();
            catName.textContent = category.title;
            return;
        }

        searchItem(prompt);

        page.resetPage = true;

        catName.textContent = category.title + " search results for: \"" + prompt + "\"";
    }

    export function getSearchPrompt(){
        return document.getElementById("searchBar").value;
    }

    export function searchItem(prompt){ 
        const lowerPrompt = prompt.toLowerCase();
        const searchPool = inventory.catInventory.length > 0 ? inventory.catInventory : inventory.inventory; 
        const terms = lowerPrompt.split(" ");

        //item number search
        const itemMatches = searchPool.filter(item => 
            item["Item#"].toLowerCase().includes(lowerPrompt)
        );
        if (itemMatches.length) {
            inventory.searchResults = itemMatches;
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
        inventory.searchResults = rankedResults.map( result => result.item);

        rebuildActiveInventory(); 
    }

    export function rebuildActiveInventory(){
        console.log("recieved inventory", inventory.activeInventory);
        if(inventory.sortedInventory !== null){
            inventory.activeInventory = inventory.sortedInventory;
        } else if(inventory.searchResults !== null){
            inventory.activeInventory = inventory.searchResults;
        } else {
            const isCatalogPage = getParams().has("slug");
            inventory.activeInventory = isCatalogPage ? inventory.catInventory : inventory.inventory;
        }

        updateValues(inventory.activeInventory);
        renderCatalog(inventory.activeInventory);
        console.log("rebuilt inventory", inventory.activeInventory);
    }

    export function getCurrentInventory(){
        if(inventory.searchResults !== null) return inventory.searchResults;

        const isCatalogPage = getParams().has("slug");
        if (isCatalogPage) return inventory.catInventory;

        return inventory.inventory;
    }